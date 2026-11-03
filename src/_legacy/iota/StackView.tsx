/**
 * Stack + ravenmind view.
 *
 * The protocol sends stacks bottom -> top; the UI shows the top of stack first
 * (the value the next operation will consume) with the rest below it.
 */

import { useState } from "react";

import { useI18n } from "../i18n/I18nContext.ts";
import type { Iota } from "../server/types.ts";
import IotaView, { shortType } from "./IotaView.tsx";

export interface StackViewProps {
  stack: Iota[] | null;
  ravenmind: Iota | string | null;
  parens: number | null;
}

export default function StackView({ stack, ravenmind, parens }: StackViewProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copyStack = async () => {
    if (stack == null) {
      return;
    }
    const text = stack.map((iota) => iota.text).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; ignore.
    }
  };

  const hasRavenmind =
    ravenmind != null && !(typeof ravenmind === "string" && ravenmind === "");

  return (
    <section className="panel stack-panel" aria-labelledby="stack-heading">
      <header className="panel__header">
        <h2 id="stack-heading" className="panel__title">
          {t("stack.title")}
          {stack != null && (
            <span className="panel__count">
              {t("stack.count", { n: stack.length })}
            </span>
          )}
        </h2>
        {stack != null && stack.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={copyStack}>
            {copied ? t("stack.copied") : t("stack.copy")}
          </button>
        )}
      </header>

      {stack == null ? (
        <p className="panel__hint">{t("stack.unknown")}</p>
      ) : stack.length === 0 ? (
        <p className="panel__hint">{t("stack.empty")}</p>
      ) : (
        <ol className="stack-list">
          {[...stack].reverse().map((iota, reverseIndex) => {
            const index = stack.length - 1 - reverseIndex;
            const isTop = index === stack.length - 1;
            return (
              <li
                key={index}
                className={`stack-row${isTop ? " stack-row--top" : ""}`}
              >
                <span className="stack-row__index">
                  {isTop ? t("stack.top") : t("stack.index", { n: index })}
                </span>
                <span className="stack-row__type">{shortType(iota.type)}</span>
                <span className="stack-row__value">
                  <IotaView iota={iota} />
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="ravenmind">
        <h3 className="ravenmind__title">{t("ravenmind.title")}</h3>
        {hasRavenmind ? (
          <div className="ravenmind__value">
            {typeof ravenmind === "string" ? (
              <code>{ravenmind}</code>
            ) : (
              <IotaView iota={ravenmind} />
            )}
          </div>
        ) : (
          <span className="panel__hint">{t("ravenmind.none")}</span>
        )}
        {parens != null && parens > 0 && (
          <span className="ravenmind__parens">
            {t("ravenmind.parens", { n: parens })}
          </span>
        )}
      </div>
    </section>
  );
}
