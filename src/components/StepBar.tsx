/**
 * Step debugger for servers that implement `step.begin` / `step.next` /
 * `step.abort` (protocol v1, optional).
 */

import { useI18n } from "../i18n/I18nContext.ts";
import type { StepInfo } from "../server/types.ts";
import IotaView from "../iota/IotaView.tsx";
import { IconPlay, IconStep, IconStop } from "./Icons.tsx";

export interface StepBarProps {
  step: StepInfo | null;
  active: boolean;
  busy: boolean;
  onBegin: () => void;
  onNext: () => void;
  onAbort: () => void;
}

export default function StepBar({
  step,
  active,
  busy,
  onBegin,
  onNext,
  onAbort,
}: StepBarProps) {
  const { t } = useI18n();

  return (
    <div className="step-bar">
      <div className="step-bar__actions">
        <button
          type="button"
          className="btn"
          onClick={onBegin}
          disabled={busy}
        >
          <IconStep size={14} />
          {t("cast.stepBegin")}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={onNext}
          disabled={busy || !active || step?.done === true}
        >
          <IconPlay size={14} />
          {t("cast.stepNext")}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={onAbort}
          disabled={busy || !active}
        >
          <IconStop size={14} />
          {t("cast.stepAbort")}
        </button>
      </div>

      {step != null && (
        <div className="step-bar__info">
          <span className="step-bar__progress">
            {t("cast.stepProgress", {
              index: Math.min(step.executed != null ? step.executed + 1 : step.index + 1, step.total),
              total: step.total,
            })}
          </span>
          <span className="step-bar__meter" aria-hidden="true">
            <span
              className="step-bar__meter-fill"
              style={{
                width: `${step.total === 0 ? 0 : Math.min(100, (step.index / step.total) * 100)}%`,
              }}
            />
          </span>
          {step.done && <span className="badge">{t("cast.stepDone")}</span>}
          {step.stopped != null && (
            <span className="badge badge--error">
              {t("cast.stepStopped", { reason: step.stopped })}
            </span>
          )}
        </div>
      )}

      {step?.preview != null && !step.done && (
        <div className="step-bar__preview">
          <span className="step-bar__preview-label">{t("cast.stepPreview")}</span>
          <IotaView iota={step.preview} />
        </div>
      )}
    </div>
  );
}
