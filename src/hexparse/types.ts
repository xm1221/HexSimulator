import type { HexDir, HexPattern } from "@hextools/renderer/staffGrid";

/** One entry of `public/data/patterns.json`. */
export interface PatternRecord {
  /** Fully qualified id, e.g. `hexcasting:add`. */
  id: string;
  /** Direction name, e.g. `EAST` (matches `HexDir`). */
  startdir: string;
  /** Angle letters, e.g. `waaw`. */
  signature: string;
  /** Shorthand names this pattern can be looked up by (`add`, `hexcasting:add`, ...). */
  aliases: string[];
}

export interface PatternsData {
  version: number;
  generated_from: number;
  /** Where the registry came from (`mock-hexcli`, `mielib-hexcli`, …). */
  source?: string;
  /** Failed package installs, if any. Shape may be string or {package, reason}. */
  gaps?: unknown[];
  packages?: string[];
  empty_packages?: string[];
  per_addon?: Record<string, number>;
  ambiguous?: { alias: string; kept: string; skipped: string }[];
  patterns: PatternRecord[];
  /** `"<integer>" -> [startdir, signature]` */
  numbers: Record<string, [string, string]>;
}

export type TokenKind =
  | "number"
  | "mask"
  | "special"
  | "named"
  | "escape"
  | "paren"
  | "unknown";

export interface ParsedToken {
  /** Index into the whitespace-separated token list. */
  index: number;
  raw: string;
  kind: TokenKind;
  /** Null when the token could not be resolved. */
  pattern: HexPattern | null;
  /** Resolved direction, when known. */
  startDir?: HexDir;
  /** Human-readable name for the sidebar, when known. */
  name?: string;
  /** Set when the literal was produced by the greedy fallback encoder. */
  approximate?: boolean;
  warning?: string;
  error?: string;
}

export interface ParseOptions {
  /** Skip `{`/`}`/`(`/`)` special tokens instead of emitting them. */
  skipParens?: boolean;
  /** Treat bare integers as `num_<n>`. */
  bareNumbers?: boolean;
}

export interface ParseResult {
  tokens: ParsedToken[];
  /** Patterns ready to hand to the staff grid, laid out horizontally. */
  patterns: {
    pattern: HexPattern;
    origin: { q: number; r: number };
    name?: string;
  }[];
  /** Token index -> message, for highlighting. */
  errors: Record<number, string>;
  warnings: Record<number, string>;
}
