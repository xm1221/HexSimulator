import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { patternsToCode } from "../hexparse/index.ts";
import type { LaidOutPattern } from "../hexparse/index.ts";
import type { StaffGridRef } from "../canvas/StaffGrid.tsx";
import { StaffGrid } from "../canvas/StaffGrid.tsx";
import HexParsePanel from "../components/HexParsePanel.tsx";
import {
  IconCheck,
  IconFocus,
  IconGithub,
  IconPlay,
  IconRedo,
  IconRefresh,
  IconReset,
  IconSettings,
  IconTrash,
  IconUndo,
  IconWarn,
} from "../components/Icons.tsx";
import SettingsDrawer from "../components/SettingsDrawer.tsx";
import StepBar from "../components/StepBar.tsx";
import type { ConnectionState, StoredSettings } from "../components/settings.ts";
import {
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
} from "../components/settings.ts";
import { useI18n } from "../i18n/I18nContext.ts";
import type { Language } from "../i18n/messages.ts";
import ResultPanel from "../iota/ResultPanel.tsx";
import StackView from "../iota/StackView.tsx";
import {
  normalizeEndpoints,
  RpcClient,
  RpcError,
} from "../server/client.ts";
import type { RpcRequest, RpcResponse } from "../server/types.ts";
import { mergeStack, PROTOCOL_VERSION, toSnapshot } from "../server/types.ts";
import type { CastSnapshot } from "../server/types.ts";

type InputMode = "code" | "patterns";

const REPO_URL = "https://github.com/xm1221/HexSimulator";
const CODE_STORAGE_KEY = "hexsimulator-code";

export default function SimulatorPage() {
  const { t, lang, setLang } = useI18n();

  const [settings, setSettings] = useState<StoredSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>(() =>
    loadSettings().baseUrl.trim() === ""
      ? { state: "unconfigured" }
      : { state: "checking" },
  );

  const [code, setCode] = useState(() => {
    try {
      return localStorage.getItem(CODE_STORAGE_KEY) ?? "num_1 num_2 add";
    } catch {
      return "num_1 num_2 add";
    }
  });
  const [inputMode, setInputMode] = useState<InputMode>("code");

  const [patterns, setPatterns] = useState<LaidOutPattern[]>([]);
  const [history, setHistory] = useState<{ past: LaidOutPattern[][]; future: LaidOutPattern[][] }>(
    { past: [], future: [] },
  );
  const latestPatterns = useRef(patterns);
  latestPatterns.current = patterns;
  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    if (patterns.length > 0 && inputMode === "code" && code.trim() === "") {
      setCode(patternsToCode(patterns));
    }
  }, [patterns, inputMode, code]);

  const [snapshot, setSnapshot] = useState<CastSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [stepActive, setStepActive] = useState(false);
  const [banner, setBanner] = useState<{ kind: "error" | "info"; message: string } | null>(
    null,
  );

  const staffRef = useRef<StaffGridRef>(null);

  // Persist server settings whenever they change.
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(CODE_STORAGE_KEY, code);
    } catch {
      // ignore
    }
  }, [code]);

  // ---- client + health ----------------------------------------------------

  const client = useMemo(() => {
    if (settings.baseUrl.trim() === "") {
      return null;
    }
    try {
      return new RpcClient(settings);
    } catch {
      return null;
    }
  }, [settings]);

  const checkConnection = useCallback(async () => {
    if (settings.baseUrl.trim() === "") {
      setConnection({ state: "unconfigured" });
      return;
    }
    let activeClient: RpcClient;
    try {
      activeClient = new RpcClient(settings);
    } catch (error) {
      const rpcError = error instanceof RpcError ? error : null;
      setConnection({
        state: "error",
        kind: rpcError?.kind ?? "invalid-url",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    setConnection({ state: "checking" });
    try {
      const health = await activeClient.health();
      setConnection({
        state: "connected",
        server: health.server ?? null,
        version: health.version ?? null,
        protocol: typeof health.protocol === "number" ? health.protocol : null,
      });
    } catch (error) {
      const rpcError = error instanceof RpcError ? error : null;
      setConnection({
        state: "error",
        kind: rpcError?.kind ?? "network",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [settings]);

  useEffect(() => {
    void checkConnection();
    // Re-check when the base URL or token changes.
  }, [checkConnection]);

  // ---- staff editing ------------------------------------------------------

  const commitPatterns = useCallback((next: LaidOutPattern[]) => {
    const previous = latestPatterns.current;
    setHistory((current) => ({
      past: [...current.past.slice(-49), previous],
      future: [],
    }));
    setPatterns(next);
  }, []);

  const undo = useCallback(() => {
    const current = historyRef.current;
    if (current.past.length === 0) {
      return;
    }
    const previous = current.past[current.past.length - 1];
    const now = latestPatterns.current;
    setHistory({
      past: current.past.slice(0, -1),
      future: [now, ...current.future],
    });
    setPatterns(previous);
  }, []);

  const redo = useCallback(() => {
    const current = historyRef.current;
    if (current.future.length === 0) {
      return;
    }
    const next = current.future[0];
    const now = latestPatterns.current;
    setHistory({
      past: [...current.past, now],
      future: current.future.slice(1),
    });
    setPatterns(next);
  }, []);

  const applyParsedPatterns = useCallback(
    (parsed: LaidOutPattern[]) => {
      commitPatterns(parsed);
      // Let the canvas lay out before fitting the new staff.
      requestAnimationFrame(() => staffRef.current?.fitToPatterns());
      setBanner(null);
    },
    [commitPatterns],
  );

  // ---- RPC helpers --------------------------------------------------------

  const runRpc = useCallback(
    async (request: RpcRequest): Promise<RpcResponse | null> => {
      if (client == null) {
        setBanner({ kind: "error", message: t("conn.notConfigured") });
        setSettingsOpen(true);
        return null;
      }
      setBusy(true);
      setBanner(null);
      try {
        const response = await client.rpc({ ...request, id: Date.now() });
        setSnapshot((previous) => mergeStack(previous, toSnapshot(response)));
        return response;
      } catch (error) {
        const message =
          error instanceof RpcError
            ? describeRpcError(error, t)
            : error instanceof Error
              ? error.message
              : String(error);
        setBanner({ kind: "error", message });
        setConnection({
          state: "error",
          kind: error instanceof RpcError ? error.kind : "network",
          message,
        });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [client, t],
  );

  const currentCode = useCallback((): string | null => {
    if (inputMode === "code") {
      const trimmed = code.trim();
      if (trimmed !== "") {
        return trimmed;
      }
      return patterns.length > 0 ? patternsToCode(patterns) : null;
    }
    return patterns.length > 0 ? patternsToCode(patterns) : null;
  }, [code, inputMode, patterns]);

  const run = useCallback(async () => {
    const source = currentCode();
    if (source == null) {
      setBanner({ kind: "error", message: t("cast.codeRequired") });
      return;
    }
    if (inputMode === "patterns") {
      setCode(source);
    }
    await runRpc({ cmd: "run", code: source });
  }, [currentCode, inputMode, runRpc, t]);

  const refreshStack = useCallback(async () => {
    await runRpc({ cmd: "stack" });
  }, [runRpc]);

  const resetSession = useCallback(async () => {
    await runRpc({ cmd: "reset" });
    setStepActive(false);
  }, [runRpc]);

  const stepBegin = useCallback(async () => {
    const source = currentCode();
    if (source == null) {
      setBanner({ kind: "error", message: t("cast.codeRequired") });
      return;
    }
    const response = await runRpc({ cmd: "step.begin", code: source });
    setStepActive(response?.ok === true && response.data?.step?.done !== true);
  }, [currentCode, runRpc, t]);

  const stepNext = useCallback(async () => {
    const response = await runRpc({ cmd: "step.next" });
    if (response != null) {
      setStepActive(response.data?.step != null && response.data.step.done !== true);
    }
  }, [runRpc]);

  const stepAbort = useCallback(async () => {
    await runRpc({ cmd: "step.abort" });
    setStepActive(false);
  }, [runRpc]);

  // Keyboard shortcuts: Ctrl/Cmd+Enter runs, Ctrl/Cmd+Z undoes.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "Enter") {
        event.preventDefault();
        void run();
      } else if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (event.key === "Escape") {
        staffRef.current?.cancelPattern();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [redo, run, undo]);

  // ---- render -------------------------------------------------------------

  const stack = snapshot?.stack ?? null;
  const ravenmind = snapshot?.ravenmind ?? null;
  const parens = snapshot?.parens ?? null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26">
              <path
                d="M16 3l11 6.5v13L16 29 5 22.5v-13z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                opacity="0.7"
              />
              <path
                d="M11 20l5-9 5 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1 className="brand-title">{t("app.title")}</h1>
            <p className="brand-subtitle">{t("app.subtitle")}</p>
          </div>
        </div>

        <div className="topbar__actions">
          <ConnectionBadge connection={connection} onCheck={checkConnection} />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            title={t("language.label")}
            aria-label={t("language.label")}
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
          <a
            className="icon-btn"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            title={t("footer.source")}
            aria-label={t("footer.source")}
          >
            <IconGithub />
          </a>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            title={t("settings.title")}
            aria-label={t("settings.title")}
          >
            <IconSettings />
          </button>
        </div>
      </header>

      {banner != null && (
        <div
          className={`banner banner--${banner.kind}`}
          role={banner.kind === "error" ? "alert" : "status"}
        >
          <IconWarn size={16} />
          <span>{banner.message}</span>
          <button
            type="button"
            className="btn btn--ghost banner__close"
            onClick={() => setBanner(null)}
          >
            {t("errors.dismiss")}
          </button>
        </div>
      )}

      <main className="layout">
        <div className="layout__left">
          <section className="panel staff-panel" aria-labelledby="staff-heading">
            <header className="panel__header">
              <h2 id="staff-heading" className="panel__title">
                {t("input.title")}
                <span className="panel__count">
                  {t("input.patternCount", { n: patterns.length })}
                </span>
              </h2>
              <div className="panel__actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={undo}
                  disabled={history.past.length === 0}
                  title={t("input.undo")}
                  aria-label={t("input.undo")}
                >
                  <IconUndo />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={redo}
                  disabled={history.future.length === 0}
                  title={t("input.redo")}
                  aria-label={t("input.redo")}
                >
                  <IconRedo />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => staffRef.current?.fitToPatterns()}
                  title={t("input.fitView")}
                  aria-label={t("input.fitView")}
                >
                  <IconFocus />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => commitPatterns([])}
                  disabled={patterns.length === 0}
                  title={t("input.clear")}
                  aria-label={t("input.clear")}
                >
                  <IconTrash />
                </button>
              </div>
            </header>

            <div className="staff-wrap">
              <StaffGrid
                patterns={patterns}
                onChange={commitPatterns}
                ref={staffRef}
              />
              {patterns.length === 0 && (
                <p className="staff-empty">{t("input.staffEmpty")}</p>
              )}
            </div>
            <p className="field__help">{t("input.drawHint")}</p>
          </section>

          <div className="run-bar">
            <div className="segmented" role="group" aria-label={t("input.modeLabel")}>
              <button
                type="button"
                className={`segmented__option${inputMode === "code" ? " is-active" : ""}`}
                onClick={() => setInputMode("code")}
                aria-pressed={inputMode === "code"}
              >
                {t("input.modeCode")}
              </button>
              <button
                type="button"
                className={`segmented__option${inputMode === "patterns" ? " is-active" : ""}`}
                onClick={() => setInputMode("patterns")}
                aria-pressed={inputMode === "patterns"}
              >
                {t("input.modePatterns")}
              </button>
            </div>

            <div className="run-bar__buttons">
              <button
                type="button"
                className="btn btn--primary btn--lg"
                onClick={() => void run()}
                disabled={busy}
              >
                <IconPlay size={15} />
                {busy ? t("cast.running") : t("cast.run")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void refreshStack()}
                disabled={busy}
              >
                <IconRefresh size={14} />
                {t("cast.stack")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void resetSession()}
                disabled={busy}
              >
                <IconReset size={14} />
                {t("cast.reset")}
              </button>
            </div>
          </div>

          <StepBar
            step={snapshot?.step ?? null}
            active={stepActive}
            busy={busy}
            onBegin={() => void stepBegin()}
            onNext={() => void stepNext()}
            onAbort={() => void stepAbort()}
          />

          <HexParsePanel
            code={code}
            onCodeChange={setCode}
            onApplyPatterns={applyParsedPatterns}
            disabled={busy}
          />
        </div>

        <div className="layout__right">
          <StackView stack={stack} ravenmind={ravenmind} parens={parens} />
          <ResultPanel snapshot={snapshot} loading={busy} />
        </div>
      </main>

      <footer className="footer">
        <span>{t("footer.credit")}</span>
        <a
          href={`${REPO_URL}/blob/main/docs/PROTOCOL.md`}
          target="_blank"
          rel="noreferrer"
        >
          {t("footer.protocol")}
        </a>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          {t("footer.source")}
        </a>
      </footer>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={(next) => {
          setSettings(next);
        }}
        onCheck={() => void checkConnection()}
        checking={connection.state === "checking"}
      />
    </div>
  );
}

// ---- header status --------------------------------------------------------

function ConnectionBadge({
  connection,
  onCheck,
}: {
  connection: ConnectionState;
  onCheck: () => void;
}) {
  const { t } = useI18n();

  let tone: "ok" | "warn" | "error" | "idle" = "idle";
  let label = t("conn.unknown");
  let detail: string | null = null;

  switch (connection.state) {
    case "unconfigured":
      tone = "idle";
      label = t("conn.notConfigured");
      break;
    case "checking":
      tone = "warn";
      label = t("conn.checking");
      break;
    case "connected":
      tone = "ok";
      label = t("conn.connected");
      detail =
        connection.server != null
          ? t("conn.server", { name: connection.server })
          : null;
      if (
        connection.protocol != null
        && connection.protocol !== PROTOCOL_VERSION
      ) {
        detail = t("conn.protocolMismatch", {
          theirs: connection.protocol,
          ours: PROTOCOL_VERSION,
        });
      }
      break;
    case "error":
      tone = "error";
      label = t("conn.offline");
      detail = connection.message;
      break;
  }

  return (
    <button
      type="button"
      className={`conn-badge conn-badge--${tone}`}
      onClick={onCheck}
      title={detail ?? label}
    >
      <span className="conn-badge__dot" aria-hidden="true" />
      <span className="conn-badge__label">{label}</span>
      {connection.state === "connected" && (
        <IconCheck size={13} />
      )}
    </button>
  );
}

function describeRpcError(
  error: RpcError,
  t: (
    key:
      | "errors.network"
      | "errors.mixedContent"
      | "errors.invalidUrl"
      | "errors.timeout"
      | "errors.httpStatus"
      | "errors.badJson"
      | "errors.aborted"
      | "errors.protocolMismatch",
  ) => string,
): string {
  switch (error.kind) {
    case "network":
      return `${t("errors.network")} ${error.message}`;
    case "mixed-content":
      return t("errors.mixedContent");
    case "invalid-url":
      return `${t("errors.invalidUrl")} ${error.message}`;
    case "timeout":
      return `${t("errors.timeout")} ${error.message}`;
    case "http-status":
      return `${t("errors.httpStatus")} ${error.message}`;
    case "bad-json":
      return `${t("errors.badJson")} ${error.message}`;
    case "aborted":
      return t("errors.aborted");
    default:
      return error.message;
  }
}

export { SETTINGS_KEY, normalizeEndpoints };
export type { Language };
