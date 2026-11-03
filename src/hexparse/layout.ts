import type { HexCoord, HexPattern } from "@hextools/renderer/staffGrid";

import type { ParseResult } from "./types.ts";

export interface LayoutOptions {
  /** Horizontal gap between pattern bounding boxes, in hex units. */
  gap?: number;
}

export interface LaidOutPattern {
  pattern: HexPattern;
  origin: HexCoord;
  name?: string;
}

/**
 * Lay patterns out left-to-right, one row, in staff order.
 *
 * Each pattern's bounding box is computed from its drawn segments, then the
 * next pattern starts just past the previous box's maximum q.
 */
export function layoutPatterns(
  patterns: readonly ParseResult["patterns"][number][],
  { gap = 1 }: LayoutOptions = {},
): LaidOutPattern[] {
  const out: LaidOutPattern[] = [];
  let cursorQ = 0;

  for (const entry of patterns) {
    let minQ = Infinity;
    let maxQ = -Infinity;
    for (const { q } of entry.pattern.positions()) {
      minQ = Math.min(minQ, q);
      maxQ = Math.max(maxQ, q);
    }
    if (!Number.isFinite(minQ) || !Number.isFinite(maxQ)) {
      minQ = 0;
      maxQ = 0;
    }

    const origin = { q: cursorQ - minQ, r: 0 };
    out.push({ pattern: entry.pattern, origin, name: entry.name });
    cursorQ += maxQ - minQ + gap;
  }

  return out;
}
