/**
 * Dynamic Pattern Resolution URL defaults.
 *
 * HexTools' staff grid posts each drawn pattern to `{base}/resolve`. When the
 * user connects HexSimulator to a HexCLI server, that server can answer the
 * same endpoint, so we auto-fill the setting with the server **origin**
 * (scheme + host + port, no `/v1` path) unless the user typed their own URL.
 *
 * The last auto-filled origin is stored separately (`RESOLVE_AUTO_ORIGIN_KEY`)
 * so a later connection may replace it, while a hand-typed URL is left alone.
 */
import { normalizeEndpoints } from "../server/client.ts";

/** Parallel to `staff-grid-settings-hexsim`; holds the last auto origin. */
export const RESOLVE_AUTO_ORIGIN_STORAGE_KEY = "hexsimulator:resolve-url-auto";

/** Origin (`scheme://host:port`) of a HexCLI base URL, or null if invalid. */
export function serverOriginOf(baseUrl: string): string | null {
  try {
    return new URL(normalizeEndpoints(baseUrl).base).origin;
  } catch {
    return null;
  }
}

/** Trim and drop trailing slashes, for comparing stored URLs. */
export function normalizeResolveUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function readAutoResolveOrigin(): string | null {
  try {
    const value = localStorage.getItem(RESOLVE_AUTO_ORIGIN_STORAGE_KEY) ?? "";
    return value.trim() === "" ? null : value.trim();
  } catch {
    return null;
  }
}

export function writeAutoResolveOrigin(origin: string | null): void {
  try {
    if (origin == null || origin.trim() === "") {
      localStorage.removeItem(RESOLVE_AUTO_ORIGIN_STORAGE_KEY);
    } else {
      localStorage.setItem(RESOLVE_AUTO_ORIGIN_STORAGE_KEY, origin.trim());
    }
  } catch {
    // Storage may be unavailable; the session still works.
  }
}

/**
 * True when the current setting may be replaced by the connected server:
 * it is empty, or still exactly what we auto-filled last time.
 */
export function isAutoFilledResolveUrl(
  current: string | null,
  lastAutoOrigin: string | null,
): boolean {
  const value = normalizeResolveUrl(current ?? "");
  if (value === "") {
    return true;
  }
  return (
    lastAutoOrigin != null && value === normalizeResolveUrl(lastAutoOrigin)
  );
}
