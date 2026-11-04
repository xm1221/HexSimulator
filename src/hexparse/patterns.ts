/**
 * Pattern registry normalization.
 *
 * Runtime pattern data is **not bundled**. On the first successful connection
 * the client asks the server for `patterns.list` (`POST /v1/rpc`) and converts
 * the reply into the `PatternsData` shape the parser already understands.
 *
 * `docs/PROTOCOL.md` describes the wire shape; this module is deliberately
 * forgiving about field spelling because early servers reply with either
 * `startDir`/`angles` or `startdir`/`signature`.
 */

import type { HexPattern } from "@hextools/renderer/staffGrid";

import type { PatternListEntry, PatternListPayload } from "../server/types.ts";
import type { PatternRecord, PatternsData } from "./types.ts";

export const PATTERNS_DATA_VERSION = 1;

const DIRECTIONS = new Set([
  "NORTH_EAST",
  "EAST",
  "SOUTH_EAST",
  "SOUTH_WEST",
  "WEST",
  "NORTH_WEST",
]);

/** Accepted reply shapes: `data.patterns`, a bare array, or `{patterns, …}`. */
export type RawPatternListResponse =
  | PatternListPayload
  | PatternListEntry[]
  | null
  | undefined;

function readEntry(raw: unknown): PatternRecord | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const entry = raw as Record<string, unknown>;
  const id = typeof entry.id === "string" ? entry.id.trim() : "";
  if (id === "") {
    return null;
  }
  const startDir =
    typeof entry.startDir === "string"
      ? entry.startDir
      : typeof entry.startdir === "string"
        ? entry.startdir
        : "";
  const signature =
    typeof entry.angles === "string"
      ? entry.angles
      : typeof entry.signature === "string"
        ? entry.signature
        : "";
  const direction = startDir.trim().toUpperCase().replaceAll("-", "_");
  if (!DIRECTIONS.has(direction) || !/^[wqeasd]*$/.test(signature)) {
    return null;
  }

  const aliases = new Set<string>([id]);
  const path = id.includes(":") ? id.split(":").slice(1).join(":") : id;
  if (path !== "") {
    aliases.add(path);
  }
  if (Array.isArray(entry.aliases)) {
    for (const alias of entry.aliases) {
      if (typeof alias === "string" && alias.trim() !== "") {
        aliases.add(alias.trim());
      }
    }
  }

  return {
    id,
    startdir: direction,
    signature,
    aliases: [...aliases],
  };
}

/**
 * Convert a server reply into `PatternsData`.
 *
 * Unknown fields are ignored. Entries without an id, a direction, or a valid
 * angle signature are dropped; the rest are deduplicated by id (last wins).
 */
export function patternsDataFromServer(
  raw: RawPatternListResponse,
  options: { source?: string } = {},
): PatternsData {
  const payload: PatternListPayload = Array.isArray(raw)
    ? { patterns: raw }
    : (raw ?? {});

  const entries = Array.isArray(payload.patterns) ? payload.patterns : [];
  const byId = new Map<string, PatternRecord>();
  const gaps: { id: string; reason: string }[] = [];

  for (const rawEntry of entries) {
    const record = readEntry(rawEntry);
    if (record == null) {
      const id =
        rawEntry != null && typeof rawEntry === "object"
          ? String((rawEntry as { id?: unknown }).id ?? "<no id>")
          : "<invalid>";
      gaps.push({ id, reason: "missing id, direction, or angle signature" });
      continue;
    }
    byId.set(record.id, record);
  }

  const numbers = payload.numbers ?? {};
  const patterns = [...byId.values()];

  return {
    version: typeof payload.version === "number" ? payload.version : PATTERNS_DATA_VERSION,
    generated_from: 0,
    ...(gaps.length > 0 ? { gaps } : {}),
    source: options.source ?? payload.source,
    patterns,
    numbers,
  };
}

/** `false` when the reply carries no usable patterns. */
export function hasPatterns(data: PatternsData | null | undefined): boolean {
  return data != null && Array.isArray(data.patterns) && data.patterns.length > 0;
}

/** Serialize a `DIR_signature` token for a resolved pattern. */
export function patternToCode(pattern: HexPattern): string {
  // The renderer's `toString()` already returns `NORTH_EAST waaw`; hexParse
  // tokens join direction and signature with an underscore.
  return pattern.toString().replace(" ", "_");
}

/** `patternsToCode` — turn the drawn staff into hexParse `DIR_signature` source. */
export function patternsToCode(
  patterns: readonly { pattern: HexPattern }[],
): string {
  return patterns.map((entry) => patternToCode(entry.pattern)).join(" ");
}
