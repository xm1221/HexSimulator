import { HexDir, HexPattern } from "@hextools/renderer/staffGrid";

import { maskToPattern } from "./mask.ts";
import {
  directionFromName,
  lookupNumber,
  NUMBER_PREFIX,
  NEGATIVE_NUMBER_PREFIX,
} from "./numbers.ts";
import type {
  ParsedToken,
  ParseOptions,
  ParseResult,
  PatternsData,
} from "./types.ts";

const SPECIAL_ALIASES: Record<string, string> = {
  "{": "hexcasting:open_paren",
  "(": "hexcasting:open_paren",
  intro: "hexcasting:open_paren",
  "}": "hexcasting:close_paren",
  ")": "hexcasting:close_paren",
  retro: "hexcasting:close_paren",
  "\\": "hexcasting:escape",
  escape: "hexcasting:escape",
};

const DEFAULT_DIRECTION = HexDir.EAST;

export interface ResolvedAliases {
  /** alias -> record id */
  byAlias: Map<string, string>;
  /** record id -> record */
  byId: Map<string, PatternsData["patterns"][number]>;
}

export function buildAliasIndex(data: PatternsData): ResolvedAliases {
  const byAlias = new Map<string, string>();
  const byId = new Map<string, PatternsData["patterns"][number]>();
  for (const record of data.patterns) {
    byId.set(record.id, record);
    for (const alias of record.aliases) {
      if (!byAlias.has(alias)) {
        byAlias.set(alias, record.id);
      }
    }
    // Always allow the unqualified path, even if the generator omitted it.
    const path = record.id.split(":").slice(1).join(":");
    if (path && !byAlias.has(path)) {
      byAlias.set(path, record.id);
    }
  }
  return { byAlias, byId };
}

function recordToPattern(
  record: PatternsData["patterns"][number],
): HexPattern | null {
  const startDir = directionFromName(record.startdir);
  if (startDir == null) {
    return null;
  }
  if (!/^[wqeasd]*$/.test(record.signature)) {
    return null;
  }
  return HexPattern.fromSignature(startDir, record.signature);
}

/** Try `DIR_sig` (e.g. `NORTH_EAST_waaw`) and `_sig`. */
function parseSignatureToken(
  token: string,
): { pattern: HexPattern; direction: HexDir } | null {
  const candidates = token.split("_");
  if (candidates.length >= 2) {
    const direction = directionFromName(candidates.slice(0, -1).join("_"));
    const signature = candidates[candidates.length - 1];
    if (direction != null && /^[wqeasd]+$/.test(signature)) {
      return {
        pattern: HexPattern.fromSignature(direction, signature),
        direction,
      };
    }
  }
  const signature = token.startsWith("_") ? token.slice(1) : token;
  if (/^[wqeasd]+$/.test(signature)) {
    return {
      pattern: HexPattern.fromSignature(DEFAULT_DIRECTION, signature),
      direction: DEFAULT_DIRECTION,
    };
  }
  return null;
}

const SKIPPED_PREFIXES = ["vec_", "vec/", "\\[", "["];

function resolveToken(
  raw: string,
  index: number,
  data: PatternsData,
  aliasIndex: ResolvedAliases,
): ParsedToken {
  const base: ParsedToken = { index, raw, kind: "unknown", pattern: null };

  // Special aliases first: `{`, `}`, `\`, `intro`, `retro`, ...
  const special = SPECIAL_ALIASES[raw];
  if (special != null) {
    const record = aliasIndex.byId.get(special);
    const pattern = record == null ? null : recordToPattern(record);
    return {
      ...base,
      kind: "paren",
      pattern,
      name: raw,
      startDir: pattern?.startDir,
      error:
        pattern == null ? "missing pattern data for special token" : undefined,
    };
  }

  if (raw.startsWith("num_") || raw.startsWith("number_")) {
    const literal = raw.slice(raw.indexOf("_") + 1);
    const n = Number(literal);
    if (!Number.isFinite(n)) {
      return {
        ...base,
        kind: "number",
        error: `invalid number literal: ${literal}`,
      };
    }
    const lookup = lookupNumber(n, data.numbers);
    if (lookup == null) {
      return {
        ...base,
        kind: "number",
        error: `could not resolve number ${literal}`,
      };
    }
    return {
      ...base,
      kind: "number",
      pattern: lookup.pattern,
      startDir: lookup.pattern.startDir,
      name: literal,
      approximate: lookup.approximate,
      warning: lookup.approximate
        ? "not in pregenerated table; using greedy encoding"
        : undefined,
    };
  }

  if (raw.startsWith("mask_")) {
    const mask = raw.slice("mask_".length);
    const pattern = maskToPattern(mask);
    if (pattern == null) {
      const reason = /[^-v]/.test(mask)
        ? "invalid mask (expected only - and v)"
        : "empty mask";
      return { ...base, kind: "mask", error: reason };
    }
    return {
      ...base,
      kind: "mask",
      pattern,
      startDir: pattern.startDir,
      name: mask,
    };
  }

  // Number literal passed as a bare signature (`aqaa...` / `dedd...`).
  if (raw.startsWith(NUMBER_PREFIX) || raw.startsWith(NEGATIVE_NUMBER_PREFIX)) {
    const startDir = raw.startsWith(NEGATIVE_NUMBER_PREFIX)
      ? HexDir.NORTH_EAST
      : HexDir.SOUTH_EAST;
    return {
      ...base,
      kind: "number",
      pattern: HexPattern.fromSignature(startDir, raw),
      startDir,
      name: raw,
    };
  }

  // Signature with an explicit direction, e.g. `NORTH_EAST_waaw`.
  const signature = parseSignatureToken(raw);
  if (signature != null && (raw.startsWith("_") || raw.includes("_"))) {
    return {
      ...base,
      kind: "special",
      pattern: signature.pattern,
      startDir: signature.direction,
      name: raw,
    };
  }

  // Named pattern, qualified (`hexcasting:add`) or bare (`add`).
  const lowered = raw.toLowerCase();
  const recordId =
    aliasIndex.byAlias.get(lowered) ?? aliasIndex.byAlias.get(raw);
  if (recordId != null) {
    const record = aliasIndex.byId.get(recordId)!;
    const pattern = recordToPattern(record);
    return {
      ...base,
      kind: "named",
      pattern,
      startDir: pattern?.startDir,
      name: recordId,
      error: pattern == null ? `invalid signature for ${recordId}` : undefined,
    };
  }

  // Raw signature without a direction marker (`waaw`).
  if (/^[wqeasd]+$/.test(raw)) {
    const pattern = HexPattern.fromSignature(DEFAULT_DIRECTION, raw);
    return {
      ...base,
      kind: "special",
      pattern,
      startDir: DEFAULT_DIRECTION,
      name: raw,
    };
  }

  if (SKIPPED_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return { ...base, warning: `unsupported token, skipped: ${raw}` };
  }

  return { ...base, error: `unknown pattern: ${raw}` };
}

export function parseHex(
  input: string,
  data: PatternsData,
  options: ParseOptions = {},
): ParseResult {
  const aliasIndex = buildAliasIndex(data);
  const raws = input.split(/\s+/).filter((token) => token.length > 0);

  const tokens = raws.map((raw, index) =>
    resolveToken(raw, index, data, aliasIndex),
  );

  const errors: Record<number, string> = {};
  const warnings: Record<number, string> = {};
  for (const token of tokens) {
    if (token.error != null) {
      errors[token.index] = token.error;
    }
    if (token.warning != null) {
      warnings[token.index] = token.warning;
    }
  }

  const patterns: ParseResult["patterns"] = [];
  for (const token of tokens) {
    if (token.pattern == null) {
      continue;
    }
    if (options.skipParens && token.kind === "paren") {
      continue;
    }
    patterns.push({
      pattern: token.pattern,
      origin: { q: 0, r: 0 },
      name: token.name,
    });
  }

  return { tokens, patterns, errors, warnings };
}
