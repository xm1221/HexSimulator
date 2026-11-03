import type { ResolvedPattern } from "@hextools/renderer/staffGrid";
import { PATTERN_TYPES } from "@hextools/renderer/staffGrid";

import { layoutPatterns } from "./layout.ts";
import { parseHex } from "./resolve.ts";
import type { ParseOptions, PatternsData } from "./types.ts";

export * from "./layout.ts";
export * from "./mask.ts";
export * from "./numbers.ts";
export { buildAliasIndex, parseHex } from "./resolve.ts";
export * from "./types.ts";

export const PATTERNS_URL = "/data/patterns.json";

let cached: Promise<PatternsData> | null = null;

/** Load `public/data/patterns.json` once per page load. */
export function loadPatternsData(): Promise<PatternsData> {
  cached ??= fetch(PATTERNS_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`failed to load ${PATTERNS_URL}: ${response.status}`);
      }
      return response.json() as Promise<PatternsData>;
    })
    .catch((error: unknown) => {
      cached = null;
      throw error;
    });
  return cached;
}

/** Parse `input` and lay the result out for the staff grid. */
export function parseToResolvedPatterns(
  input: string,
  data: PatternsData,
  options?: ParseOptions,
): ResolvedPattern[] {
  const result = parseHex(input, data, options);
  return layoutPatterns(result.patterns).map((entry) => ({
    pattern: entry.pattern,
    origin: entry.origin,
    type: PATTERN_TYPES.Evaluated,
    name: entry.name,
  }));
}
