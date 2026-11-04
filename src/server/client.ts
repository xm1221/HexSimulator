/**
 * Minimal typed client for the HexSimulator HTTP protocol (v1).
 *
 * Only `GET /v1/health` and `POST /v1/rpc` are used; everything else is
 * ordinary fetch plumbing plus friendly error classification.
 */

import type {
  HealthResponse,
  PatternListPayload,
  RpcRequest,
  RpcResponse,
} from "./types.ts";

export interface ServerConfig {
  /** Base URL such as `http://127.0.0.1:8742` (or `.../v1`). */
  baseUrl: string;
  /** Optional bearer token; also accepted by the server as a JSON field. */
  token: string;
}

export class RpcError extends Error {
  readonly kind:
    | "invalid-url"
    | "mixed-content"
    | "private-network"
    | "network"
    | "cors"
    | "timeout"
    | "http-status"
    | "bad-json"
    | "aborted";

  readonly status?: number;
  readonly detail?: string;

  constructor(
    kind: RpcError["kind"],
    message: string,
    options: { status?: number; detail?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "RpcError";
    this.kind = kind;
    this.status = options.status;
    this.detail = options.detail;
  }
}

export interface NormalizedEndpoints {
  /** Origin + optional path prefix, without a trailing slash. */
  base: string;
  healthUrl: string;
  rpcUrl: string;
}

/**
 * Normalize a user-entered base URL.
 *
 * Accepts `host:port` (assumes `http://`), trailing slashes, and either a bare
 * origin (`http://127.0.0.1:8742`) or an already-versioned path
 * (`https://example.com/hex/v1`).
 */
export function normalizeEndpoints(raw: string): NormalizedEndpoints {
  let text = raw.trim();
  if (text === "") {
    throw new RpcError("invalid-url", "Server URL is empty");
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    text = `http://${text}`;
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch (error) {
    throw new RpcError("invalid-url", `Not a valid URL: ${raw}`, {
      cause: error,
    });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RpcError(
      "invalid-url",
      `Unsupported protocol ${url.protocol} (use http:// or https://)`,
    );
  }

  let path = url.pathname.replace(/\/+$/, "");
  if (path.endsWith("/v1")) {
    path = path.slice(0, -"/v1".length);
  }
  const base = `${url.origin}${path}`;

  return {
    base,
    healthUrl: `${base}/v1/health`,
    rpcUrl: `${base}/v1/rpc`,
  };
}

/** True when the page can never reach `baseUrl` because of mixed content. */
export function isMixedContentBlocked(baseUrl: string): boolean {
  if (typeof location === "undefined" || location.protocol !== "https:") {
    return false;
  }
  try {
    return new URL(baseUrl).protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * True when the page is public HTTPS and the target is a loopback / private
 * address. Chrome's Private Network Access rules block these requests from
 * public pages even when the server sends permissive CORS headers.
 */
export function isPrivateNetworkBlocked(baseUrl: string): boolean {
  if (typeof location === "undefined" || location.protocol !== "https:") {
    return false;
  }
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost"
    || host.endsWith(".localhost")
    || host === "127.0.0.1"
    || host === "::1"
    || host === "[::1]"
  ) {
    return true;
  }
  // RFC 1918 / link-local.
  if (/^10\./.test(host) || /^192\.168\./.test(host)) {
    return true;
  }
  const match = /^172\.(\d{1,3})\./.exec(host);
  if (match != null) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }
  // Treat the page's own origin as same-origin, not private.
  return location.hostname.toLowerCase() !== host && host.endsWith(".local");
}

interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {},
): Promise<{ status: number; body: T }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (signal?.aborted) {
      throw new RpcError("aborted", "Request cancelled", { cause: error });
    }
    if (controller.signal.reason instanceof Error) {
      throw new RpcError(
        "timeout",
        `No response from ${url} within ${Math.round(timeoutMs / 1000)}s`,
        { cause: error },
      );
    }
    // `fetch` reports CORS failures and DNS/connection failures identically.
    throw new RpcError(
      "network",
      `Could not reach ${url}. Is the server running? (CORS / mixed content may also block this request.)`,
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text !== "") {
    try {
      body = JSON.parse(text);
    } catch (error) {
      throw new RpcError(
        "bad-json",
        `${url} returned non-JSON (HTTP ${response.status})`,
        { status: response.status, detail: text.slice(0, 300), cause: error },
      );
    }
  }

  if (!response.ok) {
    const detail =
      body != null && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : text.slice(0, 300);
    throw new RpcError(
      "http-status",
      `${url} returned HTTP ${response.status}${
        detail ? `: ${detail}` : ""
      }`,
      { status: response.status, detail },
    );
  }

  return { status: response.status, body: body as T };
}

export class RpcClient {
  readonly endpoints: NormalizedEndpoints;
  readonly config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.endpoints = normalizeEndpoints(config.baseUrl);
    if (isMixedContentBlocked(this.endpoints.healthUrl)) {
      throw new RpcError(
        "mixed-content",
        "This page is served over HTTPS and cannot call a plain-HTTP server. " +
          "Open the app over http:// (e.g. local dev) or serve the server behind HTTPS.",
      );
    }
  }

  /** True when the page is public HTTPS and the target is loopback/LAN. */
  get privateNetworkSuspected(): boolean {
    return isPrivateNetworkBlocked(this.endpoints.healthUrl);
  }

  private authHeaders(): Record<string, string> {
    const token = this.config.token.trim();
    return token === "" ? {} : { Authorization: `Bearer ${token}` };
  }

  async health(options?: RequestOptions): Promise<HealthResponse> {
    const { body } = await fetchJson<HealthResponse>(
      this.endpoints.healthUrl,
      { method: "GET", headers: { Accept: "application/json" } },
      { timeoutMs: 8_000, ...options },
    );
    if (body == null || typeof body !== "object") {
      throw new RpcError("bad-json", "Health response was not an object");
    }
    return body;
  }

  async rpc(
    request: RpcRequest,
    options?: RequestOptions,
  ): Promise<RpcResponse> {
    const payload: RpcRequest = { ...request };
    const token = this.config.token.trim();
    // Prefer the header; sending it in the body too would duplicate the secret.
    if (token !== "") {
      payload.token = undefined;
    }

    const { body } = await fetchJson<RpcResponse>(
      this.endpoints.rpcUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.authHeaders(),
        },
        body: JSON.stringify(payload),
      },
      options,
    );

    if (body == null || typeof body !== "object" || !("ok" in body)) {
      throw new RpcError(
        "bad-json",
        "Server replied with an object that does not match the protocol (missing `ok`)",
        { detail: JSON.stringify(body).slice(0, 300) },
      );
    }
    return body;
  }

  /**
   * Fetch the registered pattern list.
   *
   * Accepts both documented placements: `data.patterns` and a top-level
   * `patterns` array (older/adapter servers). Returns the raw payload; call
   * `fromPatternsListReply` in `hexparse/registry.ts` to normalize it.
   */
  async patternsList(options?: RequestOptions): Promise<PatternListPayload> {
    const reply = await this.rpc({ cmd: "patterns.list" }, options);

    if (reply.ok === false) {
      throw new RpcError(
        "http-status",
        reply.data?.error != null
          ? String(reply.data.error)
          : "Server refused patterns.list",
        { detail: JSON.stringify(reply.data ?? {}).slice(0, 300) },
      );
    }

    const fromData = reply.data as PatternListPayload | undefined;
    const fromTop = (reply as unknown as PatternListPayload).patterns;
    const patterns = Array.isArray(fromData?.patterns)
      ? fromData.patterns
      : Array.isArray(fromTop)
        ? fromTop
        : null;

    if (patterns == null) {
      throw new RpcError(
        "bad-json",
        "patterns.list reply has no pattern array (expected data.patterns or patterns)",
        { detail: JSON.stringify(reply).slice(0, 300) },
      );
    }

    return {
      ...fromData,
      patterns,
      numbers: fromData?.numbers ?? undefined,
    };
  }
}
