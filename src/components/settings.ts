/**
 * localStorage-backed settings for the server connection.
 */

import type { ServerConfig } from "../server/client.ts";

export const SETTINGS_KEY = "hexsimulator-server";

export interface StoredSettings extends ServerConfig {}

export const DEFAULT_SETTINGS: StoredSettings = {
  baseUrl: "http://127.0.0.1:8742",
  token: "",
};

export function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw == null) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      baseUrl:
        typeof parsed.baseUrl === "string"
          ? parsed.baseUrl
          : DEFAULT_SETTINGS.baseUrl,
      token: typeof parsed.token === "string" ? parsed.token : "",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/** Connect status shown in the header. */
export type ConnectionState =
  | { state: "unconfigured" }
  | { state: "checking" }
  | {
      state: "connected";
      server: string | null;
      version: string | null;
      protocol: number | null;
    }
  | { state: "error"; message: string; kind: string };
