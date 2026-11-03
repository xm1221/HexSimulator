import { HexDir, HexPattern } from "@hextools/renderer/staffGrid";

import type { PatternsData } from "./types.ts";

export const NUMBER_PREFIX = "aqaa";
export const NEGATIVE_NUMBER_PREFIX = "dedd";

export interface NumberLookup {
  pattern: HexPattern;
  /** True when the literal was encoded by the greedy fallback. */
  approximate: boolean;
}

/**
 * Decode a number literal body (the part after `aqaa` / `dedd`).
 *
 * Hexcasting number literals are encoded by the "math pattern" scheme:
 * `w` +1, `q` +5, `e` +10, `a` ×2, `d` ÷2 (the latter two only apply to
 * non-zero values; they are the doubled/negated forms used while searching).
 */
export function decodeNumberSignature(signature: string): number | null {
  let value = 0;
  for (const char of signature) {
    switch (char) {
      case "w":
        value += 1;
        break;
      case "q":
        value += 5;
        break;
      case "e":
        value += 10;
        break;
      case "a":
        if (value === 0) {
          return null;
        }
        value *= 2;
        break;
      case "d":
        if (value % 2 !== 0) {
          return null;
        }
        value /= 2;
        break;
      default:
        return null;
    }
  }
  return value;
}

/**
 * Greedy fallback encoder used when a number is not in the pregenerated table.
 *
 * Builds the magnitude with a binary doubling chain: start at 1, then for each
 * remaining bit `a` doubles and `w` adds one. Every symbol is one of the
 * arithmetic operators the interpreter understands, so the pattern evaluates
 * to the right value even though it is not the shortest possible pattern.
 */
export function encodeNumberGreedy(n: number): HexPattern | null {
  if (!Number.isInteger(n)) {
    return null;
  }
  const magnitude = Math.abs(n);
  if (magnitude > 1e15) {
    return null;
  }

  const bits = magnitude.toString(2);
  let signature = "w";
  for (const bit of bits.slice(1)) {
    signature += "a" + (bit === "1" ? "w" : "");
  }

  const startDir = n < 0 ? HexDir.NORTH_EAST : HexDir.SOUTH_EAST;
  const prefix = n < 0 ? NEGATIVE_NUMBER_PREFIX : NUMBER_PREFIX;
  return HexPattern.fromSignature(startDir, prefix + signature);
}

/** Number value of a literal signature (with the `aqaa`/`dedd` prefix). */
export function decodeNumberPattern(signature: string): number | null {
  if (signature.startsWith(NEGATIVE_NUMBER_PREFIX)) {
    const magnitude = decodeNumberSignature(
      signature.slice(NEGATIVE_NUMBER_PREFIX.length),
    );
    return magnitude == null ? null : -magnitude;
  }
  if (signature.startsWith(NUMBER_PREFIX)) {
    return decodeNumberSignature(signature.slice(NUMBER_PREFIX.length));
  }
  return null;
}

export function lookupNumber(
  n: number,
  numbers: PatternsData["numbers"],
): NumberLookup | null {
  if (!Number.isInteger(n)) {
    return null;
  }

  const entry = numbers[String(n)];
  if (entry != null) {
    const [startdir, signature] = entry;
    const startDir = directionFromName(startdir);
    if (startDir != null) {
      return {
        pattern: HexPattern.fromSignature(startDir, signature),
        approximate: false,
      };
    }
  }

  const fallback = encodeNumberGreedy(n);
  return fallback == null ? null : { pattern: fallback, approximate: true };
}

const DIRECTION_NAMES: Record<string, HexDir> = {
  NORTH_EAST: HexDir.NORTH_EAST,
  EAST: HexDir.EAST,
  SOUTH_EAST: HexDir.SOUTH_EAST,
  SOUTH_WEST: HexDir.SOUTH_WEST,
  WEST: HexDir.WEST,
  NORTH_WEST: HexDir.NORTH_WEST,
};

export function directionFromName(name: string): HexDir | null {
  const key = name.trim().toUpperCase().replaceAll("-", "_");
  return DIRECTION_NAMES[key] ?? null;
}
