import { useEffect, useState } from "react";

import { useI18n } from "../i18n/I18nContext.ts";
import type { Language } from "../i18n/messages.ts";
import { IconClose, IconSettings } from "./Icons.tsx";
import type { StoredSettings } from "./settings.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import { isMixedContentBlocked } from "../server/client.ts";

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  zh: "中文",
};

export interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: StoredSettings;
  onSave: (settings: StoredSettings) => void;
  onCheck: () => void;
  checking: boolean;
}

export default function SettingsDrawer({
  open,
  onClose,
  settings,
  onSave,
  onCheck,
  checking,
}: SettingsDrawerProps) {
  const { t, lang, setLang } = useI18n();
  const [draft, setDraft] = useState(settings);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setShowToken(false);
    }
  }, [open, settings]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const mixedContent =
    draft.baseUrl.trim() !== "" && isMixedContentBlocked(draft.baseUrl);

  const save = () => {
    onSave({
      baseUrl: draft.baseUrl.trim(),
      token: draft.token,
    });
  };

  return (
    <div className="drawer-layer">
      <button
        type="button"
        className="drawer-backdrop"
        aria-label={t("settings.close")}
        onClick={onClose}
      />
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header className="drawer__header">
          <h2 id="settings-title" className="drawer__title">
            <IconSettings size={18} />
            {t("settings.title")}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t("settings.close")}
            title={t("settings.close")}
          >
            <IconClose />
          </button>
        </header>

        <div className="drawer__body">
          <label className="field">
            <span className="field__label">{t("settings.baseUrl")}</span>
            <input
              className="field__input"
              type="url"
              inputMode="url"
              spellCheck={false}
              autoComplete="off"
              placeholder="http://127.0.0.1:8742"
              value={draft.baseUrl}
              onChange={(event) =>
                setDraft({ ...draft, baseUrl: event.target.value })
              }
            />
            <span className="field__help">{t("settings.baseUrlDescription")}</span>
          </label>

          <label className="field">
            <span className="field__label">{t("settings.token")}</span>
            <span className="field__row">
              <input
                className="field__input"
                type={showToken ? "text" : "password"}
                spellCheck={false}
                autoComplete="off"
                value={draft.token}
                onChange={(event) =>
                  setDraft({ ...draft, token: event.target.value })
                }
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowToken((value) => !value)}
              >
                {showToken ? t("settings.tokenHide") : t("settings.tokenShow")}
              </button>
            </span>
            <span className="field__help">{t("settings.tokenDescription")}</span>
          </label>

          <div className="field">
            <span className="field__label">{t("language.label")}</span>
            <div className="segmented" role="group" aria-label={t("language.label")}>
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`segmented__option${lang === value ? " is-active" : ""}`}
                  onClick={() => setLang(value)}
                  aria-pressed={lang === value}
                >
                  {LANGUAGE_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          {mixedContent && (
            <div className="callout callout--warn" role="alert">
              {t("settings.mixedContentWarning")}
            </div>
          )}

          <p className="panel__hint">{t("settings.remember")}</p>
          <p className="panel__hint">{t("settings.stepSupport")}</p>
        </div>

        <footer className="drawer__footer">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setDraft({ ...DEFAULT_SETTINGS })}
          >
            {t("settings.reset")}
          </button>
          <span className="drawer__spacer" />
          <button
            type="button"
            className="btn"
            onClick={() => {
              save();
              onCheck();
            }}
            disabled={checking || draft.baseUrl.trim() === ""}
          >
            {t("conn.check")}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              save();
              onClose();
            }}
          >
            {t("settings.save")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
