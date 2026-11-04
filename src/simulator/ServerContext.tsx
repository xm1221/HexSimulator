/**
 * Server connection + session state.
 *
 * - Persists the base URL and token in `localStorage`.
 * - Pattern registry: sync **once** when the connection is established
 *   (`patterns.list`), then keep that local copy for the whole session.
 *   Do NOT re-fetch per pattern or live-query while drawing. Manual resync
 *   via `refreshPatterns`. Cache key: `hexsimulator:patterns:<baseUrl>`.
 * - Exposes the RPC commands the Staff Grid page needs.
 *
 * 图案数据：启动/连上时同步一次，会话内用本地副本；不要实时按图案拉取。可手动再同步。
 */

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { PatternsData } from "../hexparse/types.ts";
import {
  fromPatternsListReply,
  hasPatterns,
  readPatternCache,
  writePatternCache,
} from "../hexparse/registry.ts";
import { RpcClient, RpcError, normalizeEndpoints } from "../server/client.ts";
import type { HealthResponse, Iota, StepInfo } from "../server/types.ts";
import { mergeStack, toSnapshot, type CastSnapshot } from "../server/types.ts";

export const DEFAULT_BASE_URL = "http://127.0.0.1:8742";
export const URL_STORAGE_KEY = "hexsimulator:server-url";
export const TOKEN_STORAGE_KEY = "hexsimulator:server-token";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ServerError {
  kind: string;
  /** English technical message, shown in a details tooltip. */
  message: string;
}

export interface PatternsState {
  data: PatternsData | null;
  /** True when `data` came from localStorage rather than the server. */
  fromCache: boolean;
  /** Unix ms of the last successful fetch or cache write. */
  fetchedAt: number | null;
  loading: boolean;
  error: ServerError | null;
}

export interface ServerContextValue {
  baseUrl: string;
  token: string;
  status: ConnectionStatus;
  health: HealthResponse | null;
  error: ServerError | null;
  privateNetworkSuspected: boolean;

  patterns: PatternsState;
  /** True when the parser has named patterns available (server or cache). */
  hasRegistry: boolean;

  /** Last normalized cast/stack state. */
  snapshot: CastSnapshot | null;
  busy: boolean;
  /** `busy` with the action name, for per-button spinners. */
  pendingAction: string | null;
  step: StepInfo | null;
  lastRunCode: string | null;

  connect: (config: { baseUrl: string; token: string }) => Promise<boolean>;
  disconnect: () => void;
  refreshPatterns: () => Promise<void>;
  run: (code: string) => Promise<void>;
  reset: () => Promise<void>;
  refreshStack: () => Promise<void>;
  stepBegin: (code: string) => Promise<void>;
  stepNext: () => Promise<void>;
  stepAbort: () => Promise<void>;
}

export const ServerContext = createContext<ServerContextValue | null>(null);

export function useServer(): ServerContextValue {
  const value = use(ServerContext);
  if (value == null) {
    throw new Error("useServer must be used within a ServerProvider");
  }
  return value;
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value === "") {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage may be unavailable; the session still works.
  }
}

export function toServerError(error: unknown): ServerError {
  if (error instanceof RpcError) {
    return { kind: error.kind, message: error.message };
  }
  if (error instanceof Error) {
    return { kind: "unknown", message: error.message };
  }
  return { kind: "unknown", message: String(error) };
}

function normalizeBaseUrl(raw: string): string {
  try {
    return normalizeEndpoints(raw).base;
  } catch {
    return raw.trim();
  }
}

export interface ServerProviderProps {
  children: ReactNode;
  /** Skip the automatic connection attempt on mount (stories/tests). */
  autoConnect?: boolean;
}

export function ServerProvider({
  children,
  autoConnect = true,
}: ServerProviderProps) {
  const [baseUrl, setBaseUrl] = useState(() => readStorage(URL_STORAGE_KEY));
  const [token, setToken] = useState(() => readStorage(TOKEN_STORAGE_KEY));
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<ServerError | null>(null);
  const [privateNetworkSuspected, setPrivateNetworkSuspected] = useState(false);

  const [patterns, setPatterns] = useState<PatternsState>(() => ({
    data: null,
    fromCache: false,
    fetchedAt: null,
    loading: false,
    error: null,
  }));

  const [snapshot, setSnapshot] = useState<CastSnapshot | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [step, setStep] = useState<StepInfo | null>(null);
  const [lastRunCode, setLastRunCode] = useState<string | null>(null);

  const clientRef = useRef<RpcClient | null>(null);
  const didAutoConnect = useRef(false);

  /** Load a cached registry immediately (before/without a connection). */
  const loadCacheFor = useCallback((url: string) => {
    const normalized = normalizeBaseUrl(url);
    const cache = normalized === "" ? null : readPatternCache(normalized);
    if (cache != null) {
      setPatterns((previous) => ({
        data: cache.data,
        fromCache: true,
        fetchedAt: cache.fetchedAt,
        loading: previous.loading,
        error: null,
      }));
    }
    return cache;
  }, []);

  // Seed from cache as soon as a saved URL exists.
  useEffect(() => {
    if (baseUrl.trim() !== "") {
      loadCacheFor(baseUrl);
    }
  }, [baseUrl, loadCacheFor]);

  const applySnapshot = useCallback((reply: Parameters<typeof toSnapshot>[0]) => {
    setSnapshot((previous) => mergeStack(previous, toSnapshot(reply)));
    const nextStep = toSnapshot(reply).step;
    setStep(nextStep);
  }, []);

  const fetchPatterns = useCallback(async (client: RpcClient): Promise<boolean> => {
    setPatterns((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const reply = await client.patternsList();
      const data = fromPatternsListReply(reply, client.endpoints.base);
      if (!hasPatterns(data)) {
        throw new RpcError(
          "bad-json",
          "patterns.list returned an empty registry",
        );
      }
      writePatternCache(client.endpoints.base, data);
      setPatterns({
        data,
        fromCache: false,
        fetchedAt: Date.now(),
        loading: false,
        error: null,
      });
      return true;
    } catch (cause) {
      const serverError = toServerError(cause);
      setPatterns((previous) => ({
        ...previous,
        loading: false,
        error: serverError,
      }));
      return false;
    }
  }, []);

  const connect = useCallback(
    async (config: { baseUrl: string; token: string }) => {
      const rawUrl = config.baseUrl.trim() === "" ? DEFAULT_BASE_URL : config.baseUrl;
      setStatus("connecting");
      setError(null);
      setHealth(null);
      setBaseUrl(rawUrl);
      setToken(config.token);

      let client: RpcClient;
      try {
        client = new RpcClient({ baseUrl: rawUrl, token: config.token });
      } catch (cause) {
        setStatus("error");
        setError(toServerError(cause));
        clientRef.current = null;
        return false;
      }

      clientRef.current = client;
      setPrivateNetworkSuspected(client.privateNetworkSuspected);

      try {
        const healthReply = await client.health();
        if (healthReply.ok !== true) {
          throw new RpcError("http-status", "Health reported ok:false");
        }
        setHealth(healthReply);
        setStatus("connected");
        // Only persist a URL that actually worked.
        writeStorage(URL_STORAGE_KEY, rawUrl);
        writeStorage(TOKEN_STORAGE_KEY, config.token);

        // Registry: use cache instantly if we have it, then refresh anyway
        // (the user explicitly connected, so a fetch is expected).
        const normalized = client.endpoints.base;
        const cache = readPatternCache(normalized);
        if (cache != null) {
          setPatterns({
            data: cache.data,
            fromCache: true,
            fetchedAt: cache.fetchedAt,
            loading: false,
            error: null,
          });
        }
        await fetchPatterns(client);

        // Pick up the current session state if the server has one.
        try {
          const stackReply = await client.rpc({ cmd: "stack" });
          applySnapshot(stackReply);
        } catch {
          // Optional: some servers may not support `stack` before a cast.
        }
        return true;
      } catch (cause) {
        setStatus("error");
        setError(toServerError(cause));
        clientRef.current = null;
        return false;
      }
    },
    [applySnapshot, fetchPatterns],
  );

  const disconnect = useCallback(() => {
    clientRef.current = null;
    setStatus("disconnected");
    setHealth(null);
    setError(null);
    setStep(null);
    setSnapshot(null);
    setPrivateNetworkSuspected(false);
  }, []);

  // Auto-connect to the saved URL once on mount.
  useEffect(() => {
    if (!autoConnect || didAutoConnect.current) {
      return;
    }
    didAutoConnect.current = true;
    const savedUrl = readStorage(URL_STORAGE_KEY);
    if (savedUrl.trim() === "") {
      return;
    }
    void connect({ baseUrl: savedUrl, token: readStorage(TOKEN_STORAGE_KEY) });
  }, [autoConnect, connect]);

  const refreshPatterns = useCallback(async () => {
    const client = clientRef.current;
    if (client == null) {
      setPatterns((previous) => ({
        ...previous,
        error: { kind: "network", message: "Not connected" },
      }));
      return;
    }
    await fetchPatterns(client);
  }, [fetchPatterns]);

  const withAction = useCallback(
    async (action: string, task: (client: RpcClient) => Promise<void>) => {
      const client = clientRef.current;
      if (client == null) {
        setError({ kind: "network", message: "Not connected" });
        return;
      }
      setPendingAction(action);
      setError(null);
      try {
        await task(client);
      } catch (cause) {
        setError(toServerError(cause));
      } finally {
        setPendingAction(null);
      }
    },
    [],
  );

  const run = useCallback(
    async (code: string) => {
      await withAction("run", async (client) => {
        setLastRunCode(code);
        const reply = await client.rpc({ cmd: "run", code });
        applySnapshot(reply);
      });
    },
    [applySnapshot, withAction],
  );

  const reset = useCallback(async () => {
    await withAction("reset", async (client) => {
      await client.rpc({ cmd: "reset" });
      setStep(null);
      const reply = await client.rpc({ cmd: "stack" });
      applySnapshot(reply);
    });
  }, [applySnapshot, withAction]);

  const refreshStack = useCallback(async () => {
    await withAction("stack", async (client) => {
      const reply = await client.rpc({ cmd: "stack" });
      applySnapshot(reply);
    });
  }, [applySnapshot, withAction]);

  const stepBegin = useCallback(
    async (code: string) => {
      await withAction("step.begin", async (client) => {
        setLastRunCode(code);
        const reply = await client.rpc({ cmd: "step.begin", code });
        applySnapshot(reply);
        setStep(reply.data?.step ?? null);
      });
    },
    [applySnapshot, withAction],
  );

  const stepNext = useCallback(async () => {
    await withAction("step.next", async (client) => {
      const reply = await client.rpc({ cmd: "step.next" });
      applySnapshot(reply);
      setStep(reply.data?.step ?? null);
    });
  }, [applySnapshot, withAction]);

  const stepAbort = useCallback(async () => {
    await withAction("step.abort", async (client) => {
      const reply = await client.rpc({ cmd: "step.abort" });
      setStep(null);
      applySnapshot(reply);
    });
  }, [applySnapshot, withAction]);

  const hasRegistry = hasPatterns(patterns.data);

  const value = useMemo<ServerContextValue>(
    () => ({
      baseUrl,
      token,
      status,
      health,
      error,
      privateNetworkSuspected,
      patterns,
      hasRegistry,
      snapshot,
      busy: pendingAction != null,
      pendingAction,
      step,
      lastRunCode,
      connect,
      disconnect,
      refreshPatterns,
      run,
      reset,
      refreshStack,
      stepBegin,
      stepNext,
      stepAbort,
    }),
    [
      baseUrl,
      token,
      status,
      health,
      error,
      privateNetworkSuspected,
      patterns,
      hasRegistry,
      snapshot,
      pendingAction,
      step,
      lastRunCode,
      connect,
      disconnect,
      refreshPatterns,
      run,
      reset,
      refreshStack,
      stepBegin,
      stepNext,
      stepAbort,
    ],
  );

  return <ServerContext value={value}>{children}</ServerContext>;
}

/** Convenience: current ravenmind iota, if any. */
export function ravenmindOf(snapshot: CastSnapshot | null): Iota | string | null {
  const value = snapshot?.ravenmind ?? null;
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}
