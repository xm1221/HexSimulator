/**
 * hexParse public entry point.
 *
 * Ported from HexTools (`src/hexparse/index.ts`, `layout.ts`), MIT License,
 * Copyright (c) 2026 [object Object]. See THIRD_PARTY.md.
 */

import { HexPattern, layoutPatterns } from "../canvas/hex.ts";
import type { HexCoord } from "../canvas/hex.ts";
import { parseHex } from "./resolve.ts";
import type { ParseOptions, PatternsData } from "./types.ts";

export * from "./mask.ts";
export * from "./numbers.ts";
export { buildAliasIndex, parseHex } from "./resolve.ts";
export * from "./types.ts";

/**
 * Resolve the URL of `patterns.json` relative to the current page.
 *
 * The app is built with `base: "./"`, so a root-absolute `/data/...` URL would
 * break on sub-path deployments (GitHub Pages project sites, previews).
 * `import.meta.env.BASE_URL` already carries the Vite base.
 */
export const PATTERNS_URL = `${import.meta.env.BASE_URL}data/patterns.json`;

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

/** A pattern plus where to draw it on the staff. */
export interface LaidOutPattern {
  pattern: HexPattern;
  origin: HexCoord;
  name?: string;
}

export { layoutPatterns };

/** Parse `input` and lay the result out for the staff grid. */
export function parseToResolvedPatterns(
  input: string,
  data: PatternsData,
  options?: ParseOptions,
): LaidOutPattern[] {
  const result = parseHex(input, data, options);
  return layoutPatterns(result.patterns);
}

/**
 * Turn drawn staff patterns back into hexParse source.
 *
 * Each pattern becomes one `DIR_signature` token, e.g. `NORTH_EAST_waaw`.
 * That is the same syntax HexTools' hexParse accepts, and it keeps names out
 * of the wire format so the server's registry decides what each pattern does.
 */
export function patternsToCode(
  patterns: readonly { pattern: HexPattern }[],
): string {
  return patterns
    .map(({ pattern }) => `${pattern.toString().replace(" ", "_")}`)
    .join(" ");
}
