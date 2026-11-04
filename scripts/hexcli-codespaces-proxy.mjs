#!/usr/bin/env node
/**
 * Tiny front proxy for running HexCLI as a browser-reachable backend
 * (e.g. a GitHub Codespace). 仓库内小反代，不改 MieLib。
 *
 * Why this exists, given that HexCLI's HTTP endpoint already sends CORS headers:
 *
 * 1. **Stable token.** MieLib generates a fresh random `hexcli/http.json` token on
 *    every server start, so a browser that saved the token would get HTTP 401 after
 *    every Codespace wake-up. This proxy keeps one stable token in a file outside the
 *    repository and swaps in the live upstream token for each request.
 * 2. **Tight CORS.** HexCLI is started with a permissive allowlist (it is bound to
 *    127.0.0.1 behind this proxy anyway); the proxy is what the browser talks to, so
 *    the allowlist enforced towards the browser lives here.
 * 3. **Stable port.** HexCLI picks an internal port; the forwarded public port stays
 *    8742 for the lifetime of the codespace.
 *
 * Upstream stays loopback-only, so the only thing exposed on the forwarded public
 * port is this proxy.
 *
 *   node scripts/hexcli-codespaces-proxy.mjs
 *
 * Environment (all optional):
 *   HEXCLI_PROXY_PORT         public/first port to listen on      (default 8742)
 *   HEXCLI_PROXY_BIND         bind address                        (default 0.0.0.0)
 *   HEXCLI_UPSTREAM_HOST      HexCLI HTTP host                    (default 127.0.0.1)
 *   HEXCLI_UPSTREAM_PORT      HexCLI HTTP port                    (default 8743)
 *   HEXCLI_SERVER_DIR         Minecraft server dir (hexcli/http.json lives here)
 *   HEXCLI_PROXY_TOKEN        token the browser must send; empty string = no auth
 *   HEXCLI_PROXY_TOKEN_FILE   where the stable token lives         (default ~/.cache/hexcli/proxy-token)
 *   HEXCLI_CORS_ORIGINS       comma-separated allowlist, or `*`   (default: HexSim sites + local dev)
 *
 * Routes: `GET /v1/health`, `POST /v1/rpc`, `POST /resolve` (all proxied),
 * plus `GET /__hexsim/status` (this proxy's own liveness, no token, no secrets).
 */
import { timingSafeEqual, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { homedir } from "node:os";
import path from "node:path";

const PROXY_PORT = Number(process.env.HEXCLI_PROXY_PORT || 8742);
const PROXY_BIND = process.env.HEXCLI_PROXY_BIND || "0.0.0.0";
const UPSTREAM_HOST = process.env.HEXCLI_UPSTREAM_HOST || "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.HEXCLI_UPSTREAM_PORT || 8743);

const CACHE_DIR =
  process.env.HEXCLI_CACHE_DIR || path.join(homedir(), ".cache", "hexcli");
const SERVER_DIR =
  process.env.HEXCLI_SERVER_DIR || path.join(CACHE_DIR, "server");
const TOKEN_FILE =
  process.env.HEXCLI_PROXY_TOKEN_FILE || path.join(CACHE_DIR, "proxy-token");

const DEFAULT_CORS = [
  "https://hexsim.xm1221.cn",
  "http://hexsim.xm1221.cn",
  "https://hextools.xm1221.cn",
  "http://hextools.xm1221.cn",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];
const RAW_CORS = (process.env.HEXCLI_CORS_ORIGINS ?? "").trim();
const CORS = (RAW_CORS === "" ? DEFAULT_CORS.join(",") : RAW_CORS)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s !== "");

const MAX_BODY = 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 130_000;

/**
 * The token the browser must present. `HEXCLI_PROXY_TOKEN` wins (and an explicit
 * empty value disables auth); otherwise a token is generated once and reused, so
 * the browser only has to be configured one time.
 */
function resolveProxyToken() {
  if (process.env.HEXCLI_PROXY_TOKEN != null) {
    return {
      token: process.env.HEXCLI_PROXY_TOKEN.trim(),
      source: "HEXCLI_PROXY_TOKEN",
    };
  }
  try {
    const existing = readFileSync(TOKEN_FILE, "utf8").trim();
    if (existing !== "") {
      return { token: existing, source: TOKEN_FILE };
    }
  } catch {
    // missing: generate below
  }
  const generated = randomBytes(16).toString("hex");
  mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  writeFileSync(TOKEN_FILE, `${generated}\n`, { mode: 0o600 });
  return { token: generated, source: TOKEN_FILE };
}

const proxyToken = resolveProxyToken();
const authRequired = proxyToken.token !== "";

/** Cache for `hexcli/http.json`, re-read whenever the file changes. */
let upstreamCache = { mtimeMs: -1, token: null, port: UPSTREAM_PORT };

function readUpstream() {
  const file = path.join(SERVER_DIR, "hexcli", "http.json");
  try {
    const stat = statSync(file);
    if (stat.mtimeMs !== upstreamCache.mtimeMs) {
      const parsed = JSON.parse(readFileSync(file, "utf8"));
      upstreamCache = {
        mtimeMs: stat.mtimeMs,
        token: typeof parsed.token === "string" ? parsed.token : null,
        port: Number(parsed.port) || UPSTREAM_PORT,
      };
    }
  } catch {
    // Server stopped or starting: keep the last known values, requests will fail.
  }
  return upstreamCache;
}

function constantTimeEquals(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function originAllowed(origin) {
  if (origin == null) return false;
  const lower = origin.toLowerCase();
  if (CORS.includes("*")) return true;
  return CORS.some((entry) => {
    if (entry === lower) return true;
    // `http://localhost:*` style: wildcard the port only.
    if (entry.endsWith(":*")) {
      const prefix = entry.slice(0, -1);
      if (!lower.startsWith(prefix)) return false;
      const port = lower.slice(prefix.length);
      return port !== "" && /^\d+$/.test(port);
    }
    return false;
  });
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (originAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Access-Control-Request-Private-Network",
  );
  res.setHeader("Access-Control-Max-Age", "600");
  // Chrome Private Network Access preflight (harmless for public hosts).
  if (
    String(
      req.headers["access-control-request-private-network"] || "",
    ).toLowerCase() === "true"
  ) {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
}

function sendJson(req, res, status, body) {
  setCorsHeaders(req, res);
  const payload = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": payload.length,
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

/** Mirror HexCLI's error envelope so the frontend classifies it the same way. */
function sendRpcError(req, res, status, message) {
  sendJson(req, res, status, {
    ok: false,
    lines: [],
    data: { error: message },
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function forward({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const upstream = readUpstream();
    const outgoing = httpRequest(
      {
        host: UPSTREAM_HOST,
        port: upstream.port,
        method,
        path: url,
        headers,
        timeout: UPSTREAM_TIMEOUT_MS,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 502,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    outgoing.on("timeout", () =>
      outgoing.destroy(new Error("upstream timeout")),
    );
    outgoing.on("error", reject);
    if (body != null && body.length > 0) outgoing.write(body);
    outgoing.end();
  });
}

/** Send a proxied reply, dropping upstream CORS headers (this proxy owns them). */
function relay(req, res, result) {
  setCorsHeaders(req, res);
  const contentType =
    result.headers["content-type"] ?? "application/json; charset=utf-8";
  res.writeHead(result.status, {
    "Content-Type": contentType,
    "Content-Length": result.body.length,
    "Cache-Control": "no-store",
  });
  res.end(result.body);
}

/**
 * Authorise an `/v1/rpc` call against the stable proxy token.
 *
 * @returns {{ok: boolean}} `ok: false` means the caller must answer HTTP 401.
 */
function checkProxyAuth(req, rawBody) {
  if (!authRequired) return { ok: true };
  let presented = "";
  const header = req.headers.authorization;
  if (typeof header === "string" && /^bearer /i.test(header.trim())) {
    presented = header.trim().slice(7).trim();
  }
  if (presented === "" && rawBody.length > 0) {
    try {
      const parsed = JSON.parse(rawBody.toString("utf8"));
      if (parsed != null && typeof parsed.token === "string")
        presented = parsed.token.trim();
    } catch {
      // Malformed JSON is reported by the upstream.
    }
  }
  return { ok: constantTimeEquals(presented, proxyToken.token) };
}

async function handle(req, res) {
  const url = req.url ?? "/";
  const pathname = url.split("?")[0];
  const method = (req.method ?? "GET").toUpperCase();

  if (method === "OPTIONS") {
    setCorsHeaders(req, res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Disallowed origins are rejected outright, matching HexCLI's own behaviour.
  if (req.headers.origin != null && !originAllowed(req.headers.origin)) {
    if (
      pathname === "/v1/health"
      || pathname === "/v1/rpc"
      || pathname === "/resolve"
    ) {
      sendRpcError(req, res, 403, "origin not allowed");
      return;
    }
  }

  if (pathname === "/__hexsim/status") {
    sendJson(req, res, 200, {
      ok: true,
      proxy: "hexsim-hexcli-proxy",
      upstream: { host: UPSTREAM_HOST, port: readUpstream().port },
      authRequired,
      cors: CORS,
    });
    return;
  }

  if (
    pathname !== "/v1/health"
    && pathname !== "/v1/rpc"
    && pathname !== "/resolve"
  ) {
    sendRpcError(
      req,
      res,
      404,
      "not found (use /v1/health, /v1/rpc or /resolve)",
    );
    return;
  }

  const rawBody = method === "POST" ? await readBody(req) : Buffer.alloc(0);
  const headers = { Accept: "application/json" };

  if (pathname === "/v1/rpc") {
    const auth = checkProxyAuth(req, rawBody);
    if (!auth.ok) {
      sendRpcError(
        req,
        res,
        401,
        authRequired
          ? "bad proxy token (see .devcontainer/hexcli-info.sh)"
          : "bad token",
      );
      return;
    }
    const upstream = readUpstream();
    if (upstream.token != null)
      headers.Authorization = `Bearer ${upstream.token}`;
    let body = rawBody;
    if (rawBody.length > 0) {
      // Never forward the browser's proxy token upstream.
      try {
        const parsed = JSON.parse(rawBody.toString("utf8"));
        if (parsed != null && typeof parsed === "object" && "token" in parsed) {
          delete parsed.token;
          body = Buffer.from(JSON.stringify(parsed), "utf8");
        }
      } catch {
        // Leave the body untouched; the upstream reports the parse error.
      }
    }
    if (body.length > 0) {
      headers["Content-Type"] =
        req.headers["content-type"] || "application/json";
      headers["Content-Length"] = body.length;
    }
    try {
      relay(req, res, await forward({ method, url, headers, body }));
    } catch (error) {
      sendRpcError(
        req,
        res,
        503,
        `HexCLI upstream is not ready yet (${error.message}); see ~/.cache/hexcli/logs/`,
      );
    }
    return;
  }

  // `/v1/health` and `/resolve` are unauthenticated upstream too.
  try {
    relay(req, res, await forward({ method, url, headers, body: null }));
  } catch (error) {
    if (pathname === "/resolve") {
      // HexCLI answers this route with a bare JSON string.
      setCorsHeaders(req, res);
      const payload = Buffer.from(JSON.stringify("errored"), "utf8");
      res.writeHead(503, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": payload.length,
      });
      res.end(payload);
      return;
    }
    sendRpcError(
      req,
      res,
      503,
      `HexCLI upstream is not ready yet (${error.message})`,
    );
  }
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error(`[proxy] request failed: ${error?.stack ?? error}`);
    if (!res.headersSent) sendRpcError(req, res, 500, "proxy error");
    else res.end();
  });
});

server.listen(PROXY_PORT, PROXY_BIND, () => {
  console.log(
    `[proxy] http://${PROXY_BIND}:${PROXY_PORT} -> http://${UPSTREAM_HOST}:${
      readUpstream().port
    }`,
  );
  console.log(`[proxy] CORS allowlist: ${CORS.join(", ") || "(none)"}`);
  // Never log the token itself; say where it is.
  console.log(
    authRequired
      ? `[proxy] a token is required; it lives in ${proxyToken.source}`
      : "[proxy] token auth disabled (HEXCLI_PROXY_TOKEN is empty)",
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[proxy] ${signal}, shutting down`);
    server.close(() => process.exit(0));
  });
}
