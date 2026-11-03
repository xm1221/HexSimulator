/**
 * Cast metadata: resolution, ops/steps, mishaps, prints, messages, raw lines.
 */

import { useState } from "react";

import { useI18n } from "../i18n/I18nContext.ts";
import type { CastSnapshot } from "../server/types.ts";

export interface ResultPanelProps {
  snapshot: CastSnapshot | null;
  loading: boolean;
}

export default function ResultPanel({ snapshot, loading }: ResultPanelProps) {
  const { t } = useI18n();
  const [showLines, setShowLines] = useState(false);

  if (snapshot == null) {
    return (
      <section className="panel result-panel" aria-labelledby="result-heading">
        <header className="panel__header">
          <h2 id="result-heading" className="panel__title">
            {t("result.title")}
          </h2>
        </header>
        <p className="panel__hint">{t("result.idle")}</p>
      </section>
    );
  }

  const failed = !snapshot.ok;
  const hasMeta =
    snapshot.resolution != null
    || snapshot.steps != null
    || snapshot.ops != null
    || snapshot.mediaUsed != null
    || snapshot.mediaDust != null;

  return (
    <section className="panel result-panel" aria-labelledby="result-heading">
      <header className="panel__header">
        <h2 id="result-heading" className="panel__title">
          {t("result.title")}
        </h2>
        <span
          className={`status-pill ${failed ? "status-pill--error" : "status-pill--ok"}`}
        >
          {failed ? t("result.failed") : t("result.ok")}
        </span>
        {loading && <span className="spinner" aria-hidden="true" />}
      </header>

      {hasMeta && (
        <dl className="meta-grid">
          {snapshot.resolution != null && (
            <div className="meta-grid__item">
              <dt>{t("result.resolution")}</dt>
              <dd>
                <code>{snapshot.resolution}</code>
              </dd>
            </div>
          )}
          {snapshot.steps != null && (
            <div className="meta-grid__item">
              <dt>{t("result.steps")}</dt>
              <dd>{snapshot.steps}</dd>
            </div>
          )}
          {snapshot.ops != null && (
            <div className="meta-grid__item">
              <dt>{t("result.ops")}</dt>
              <dd>{snapshot.ops}</dd>
            </div>
          )}
          {snapshot.mediaUsed != null && (
            <div className="meta-grid__item">
              <dt>{t("result.mediaUsed")}</dt>
              <dd>{snapshot.mediaUsed}</dd>
            </div>
          )}
          {snapshot.mediaDust != null && (
            <div className="meta-grid__item">
              <dt>{t("result.mediaDust")}</dt>
              <dd>{snapshot.mediaDust}</dd>
            </div>
          )}
        </dl>
      )}

      {snapshot.error != null && (
        <div className="callout callout--error" role="alert">
          <strong>{t("result.error")}</strong>
          <span>{snapshot.error}</span>
        </div>
      )}

      <div className="result-block">
        <h3 className="result-block__title">
          {t("result.mishaps")}
          {snapshot.mishaps.length > 0 && (
            <span className="badge badge--error">{snapshot.mishaps.length}</span>
          )}
        </h3>
        {snapshot.mishaps.length === 0 ? (
          <p className="panel__hint">{t("result.noMishaps")}</p>
        ) : (
          <ul className="mishap-list">
            {snapshot.mishaps.map((mishap, index) => (
              <li key={index} className="mishap">
                <span className="mishap__icon" aria-hidden="true">
                  ⚠
                </span>
                <span>{mishap}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(snapshot.prints.length > 0 || snapshot.messages.length > 0) && (
        <div className="result-columns">
          {snapshot.prints.length > 0 && (
            <div className="result-block">
              <h3 className="result-block__title">{t("result.prints")}</h3>
              <ul className="message-list message-list--print">
                {snapshot.prints.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {snapshot.messages.length > 0 && (
            <div className="result-block">
              <h3 className="result-block__title">{t("result.messages")}</h3>
              <ul className="message-list">
                {snapshot.messages.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {snapshot.parserMessages.length > 0 && (
        <div className="result-block">
          <h3 className="result-block__title">{t("result.parserMessages")}</h3>
          <ul className="message-list message-list--warn">
            {snapshot.parserMessages.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.media?.text != null && (
        <div className="result-block">
          <h3 className="result-block__title">{t("result.media")}</h3>
          <p>
            <code>{snapshot.media.text}</code>
            {snapshot.media.mode != null && (
              <span className="panel__hint"> ({snapshot.media.mode})</span>
            )}
          </p>
        </div>
      )}

      {snapshot.lines.length > 0 && (
        <div className="result-block">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setShowLines((value) => !value)}
            aria-expanded={showLines}
          >
            <span aria-hidden="true">{showLines ? "▾" : "▸"}</span>{" "}
            {t("result.lines")}
          </button>
          {showLines && (
            <pre className="log-lines">{snapshot.lines.join("\n")}</pre>
          )}
        </div>
      )}
    </section>
  );
}
