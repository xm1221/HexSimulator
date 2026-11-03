import { createContext, use } from "react";

import type { Language, MessageKey, MessageVars } from "./messages";

export interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => unknown;
  /** Translate a UI string, interpolating `{name}` variables. */
  t: (key: MessageKey, vars?: MessageVars) => string;
  /** Translate a user-facing message produced by `src/hexparse`. */
  tParseMessage: (message: string) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = use(I18nContext);
  if (value == null) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return value;
}
