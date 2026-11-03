/**
 * hexParse source editor: type, parse, and either load onto the staff or send
 * the source to the server verbatim.
 */

import { useEffect, useState } from "react";

import {
  loadPatternsData,
  parseHex,
  parseToResolvedPatterns,
} from "../hexparse/index.ts";
import type { LaidOutPattern, PatternsData, ParseResult } from "../hexparse/index.ts";
import { useI18n } from "../i18n/I18nContext.ts";

export interface HexParsePanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  /** Replace the staff with the parsed patterns. */
  onApplyPatterns: (patterns: LaidOutPattern[]) => void;
  disabled?: boolean;
}

const PLACEHOLDER = "num_1 num_2 add";

export default function HexParsePanel({
  code,
  onCodeChange,
  onApplyPatterns,
  disabled,
}: HexParsePanelProps) {
  const { t, tParseMessage } = useI18n();
  const [data, setData] = useState<PatternsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPatternsData()
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parse = () => {
    if (data == null) {
      return;
    }
    const parsed = parseHex(code, data);
    setResult(parsed);
    if (parsed.patterns.length > 0) {
      onApplyPatterns(parseToResolvedPatterns(code, data));
    }
  };

  const errorCount = result == null ? 0 : Object.keys(result.errors).length;
  const warningCount = result == null ? 0 : Object.keys(result.warnings).length;

  return (
    <section className="panel hexparse-panel" aria-labelledby="hexparse-heading">
      <header className="panel__header">
        <h2 id="hexparse-heading" className="panel__title">
          {t("input.code")}
        </h2>
        <div className="panel__actions">
          {data != null && (
            <span className="panel__hint">
              {t("input.patternsLoaded", { n: data.patterns.length })}
            </span>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setHelpOpen((value) => !value)}
            aria-expanded={helpOpen}
          >
            {t("input.help")}
          </button>
        </div>
      </header>

      {helpOpen && (
        <div className="callout callout--info">
          <strong>{t("input.helpTitle")}</strong>
          <span>{t("input.helpBody")}</span>
        </div>
      )}

      <textarea
        className="code-input"
        value={code}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        rows={3}
        disabled={disabled}
        onChange={(event) => onCodeChange(event.target.value)}
        aria-label={t("input.code")}
      />
      <p className="field__help">{t("input.codeDescription")}</p>

      {loadError != null && (
        <div className="callout callout--error" role="alert">
          {tParseMessage(loadError)}
        </div>
      )}

      <div className="hexparse-panel__footer">
        <button
          type="button"
          className="btn"
          onClick={parse}
          disabled={disabled || data == null}
          title={t("input.parseAndLoad")}
        >
          {data == null ? t("input.loadingPatterns") : t("input.parseAndLoad")}
        </button>

        {(result != null || errorCount + warningCount > 0) && (
          <span
            className={`parse-summary${
              errorCount > 0 ? " is-error" : warningCount > 0 ? " is-warn" : ""
            }`}
          >
            {result != null && (
              <>
                <span>{t("input.patternCount", { n: result.patterns.length })}</span>
                {(errorCount > 0 || warningCount > 0) && (
                  <span>
                    {t("input.parseErrors", {
                      errors: errorCount,
                      warnings: warningCount,
                    })}
                  </span>
                )}
              </>
            )}
          </span>
        )}
      </div>

      {result != null && (errorCount > 0 || warningCount > 0) && (
        <ul className="parse-messages">
          {Object.entries(result.errors).map(([index, message]) => (
            <li key={`e${index}`} className="parse-messages__error">
              #{Number(index) + 1}: {tParseMessage(message)}
            </li>
          ))}
          {Object.entries(result.warnings).map(([index, message]) => (
            <li key={`w${index}`} className="parse-messages__warn">
              #{Number(index) + 1}: {tParseMessage(message)}
            </li>
          ))}
        </ul>
      )}

      {result != null && result.tokens.some((token) => token.approximate) && (
        <p className="panel__hint">{t("input.greedyWarning")}</p>
      )}
    </section>
  );
}
