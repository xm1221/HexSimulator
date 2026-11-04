import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { I18nContext, type I18nContextValue } from "./I18nContext";
import type { Language, MessageKey, MessageVars } from "./messages";
import { messages, translateParseMessage } from "./messages";

const STORAGE_KEY = "hexsimulator-lang";

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh";
}

function detectLanguage(): Language {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable (e.g. disabled cookies).
  }
  if (isLanguage(saved)) {
    return saved;
  }

  const preferred = navigator.languages?.[0] ?? navigator.language;
  return preferred?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function interpolate(template: string, vars?: MessageVars): string {
  if (vars == null) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = messages[lang]["app.title"];
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures; the choice just won't persist.
    }
  }, [lang]);

  const setLang = useCallback((value: Language) => {
    setLangState(value);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: MessageVars) =>
      interpolate(messages[lang][key] ?? messages.en[key] ?? key, vars),
    [lang],
  );

  const tParseMessage = useCallback(
    (message: string) => translateParseMessage(message, lang),
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t, tParseMessage }),
    [lang, setLang, t, tParseMessage],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}
