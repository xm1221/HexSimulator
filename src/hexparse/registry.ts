/**
 * Session-scoped pattern registry: fetch from the server, merge with the
 * built-in number table, cache per base URL.
 *
 * Registry patterns **must not be bundled**. `src/hexparse/data/numbers_2000.json`
 * only contains number literal encodings; every named pattern comes from
 * `patterns.list` once when the connection is established; keep the local copy for the whole session (manual resync only). 连上时同步一次，会话内用本地副本，不要实时拉取。
 */

import type { ResolvedPattern } from "@hextools/renderer/staffGrid";
import { PATTERN_TYPES } from "@hextools/renderer/staffGrid";

import type { PatternsData } from "./types.ts";
import { layoutPatterns } from "./layout.ts";
import { BUILTIN_NUMBERS } from "./numbersTable.ts";
import {
  hasPatterns,
  patternsDataFromServer,
  type RawPatternListResponse,
} from "./patterns.ts";
import { parseHex } from "./resolve.ts";

/** `hexsimulator:patterns:<normalized baseUrl>` */
export const CACHE_KEY_PREFIX = "hexsimulator:patterns:";

export interface PatternCacheEntry {
  /** Version of the cache envelope, for future migrations. */
  schema: 1;
  baseUrl: string;
  /** Unix milliseconds. */
  fetchedAt: number;
  /** Server identification from `patterns.list`, when present. */
  source?: string;
  data: PatternsData;
}

export function cacheKey(baseUrl: string): string {
  return `${CACHE_KEY_PREFIX}${baseUrl.replace(/\/+$/, "")}`;
}

export function readPatternCache(baseUrl: string): PatternCacheEntry | null {
  let text: string | null = null;
  try {
    text = localStorage.getItem(cacheKey(baseUrl));
  } catch {
    return null;
  }
  if (text == null) {
    return null;
  }
  try {
    const parsed = JSON.parse(text) as Partial<PatternCacheEntry>;
    if (parsed?.schema !== 1 || parsed.data == null) {
      return null;
    }
    if (!Array.isArray(parsed.data.patterns)) {
      return null;
    }
    return {
      schema: 1,
      baseUrl,
      fetchedAt: typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : 0,
      source: parsed.source,
      data: withBuiltinNumbers(parsed.data),
    };
  } catch {
    return null;
  }
}

export function writePatternCache(baseUrl: string, data: PatternsData): void {
  const entry: PatternCacheEntry = {
    schema: 1,
    baseUrl,
    fetchedAt: Date.now(),
    source: data.source,
    // The numbers table is bundled; don't spend localStorage space on it.
    data: { ...data, numbers: {} },
  };
  try {
    localStorage.setItem(cacheKey(baseUrl), JSON.stringify(entry));
  } catch {
    // Quota or disabled storage: caching is best-effort.
  }
}

export function clearPatternCache(baseUrl: string): void {
  try {
    localStorage.removeItem(cacheKey(baseUrl));
  } catch {
    // Ignore.
  }
}

/**
 * Merge the server's number table (if any) over the built-in one. The built-in
 * table wins for entries the server also ships, since it is versioned with the
 * app; server entries fill gaps (e.g. a server with a different range).
 */
export function withBuiltinNumbers(data: PatternsData): PatternsData {
  return {
    ...data,
    numbers: { ...(data.numbers ?? {}), ...BUILTIN_NUMBERS },
  };
}

/** Build `PatternsData` from a raw `patterns.list` reply. */
export function fromPatternsListReply(
  reply: RawPatternListResponse,
  source?: string,
): PatternsData {
  return withBuiltinNumbers(patternsDataFromServer(reply, { source }));
}

export { hasPatterns };

/**
 * Empty registry used before any server connection.
 *
 * Number literals, masks and raw angle signatures still parse from this; named
 * patterns (`add`, `hexcasting:add`) need a real registry from the server.
 */
export const OFFLINE_PATTERNS_DATA: PatternsData = {
  version: 0,
  generated_from: 0,
  source: "offline",
  patterns: [],
  numbers: BUILTIN_NUMBERS,
};

/** Parse `input` and lay the result out for the staff grid. */
export function parseToResolvedPatterns(
  input: string,
  data: PatternsData,
  options?: Parameters<typeof parseHex>[2],
): ResolvedPattern[] {
  const result = parseHex(input, data, options);
  return layoutPatterns(result.patterns).map((entry) => ({
    pattern: entry.pattern,
    origin: entry.origin,
    type: PATTERN_TYPES.Evaluated,
    name: entry.name,
  }));
}
