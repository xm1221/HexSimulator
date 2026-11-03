/**
 * Hex grid geometry for Hex Casting patterns.
 *
 * Adapted from HexTools (`packages/@hextools/renderer/src/staffGrid/hexMath.ts`
 * and `hexUtils.ts`), MIT License, Copyright (c) 2026 [object Object].
 * See THIRD_PARTY.md. Only the parts HexSimulator needs were kept, and the
 * gl-matrix dependency was replaced with plain `{x, y}` math.
 *
 * Coordinate model follows HexMod: axial `{q, r}`, pointy-top hexes.
 */

export interface HexCoord {
  q: number;
  r: number;
}

/** Pixel-space (world) point. */
export interface Point {
  x: number;
  y: number;
}

export const SQRT_3 = Math.sqrt(3);

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(t: number, a: number, b: number): number {
  return a + (b - a) * t;
}

export const HexCoord = {
  shiftedBy(coord: HexCoord, other: HexCoord | HexDir): HexCoord {
    const delta = typeof other === "number" ? HexDir.asDelta(other) : other;
    return { q: coord.q + delta.q, r: coord.r + delta.r };
  },

  toString(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
  },

  equals(a: HexCoord, b: HexCoord): boolean {
    return a.q === b.q && a.r === b.r;
  },

  /** Hexes within `radius` of `center`, used for the hover-dot field. */
  *rangeAround(center: HexCoord, radius: number): Generator<HexCoord> {
    let q = -radius;
    let r = Math.max(-radius, 0);

    while (r <= radius + Math.min(0, -q) || q < radius) {
      if (r > radius + Math.min(0, -q)) {
        q++;
        r = -radius + Math.max(0, -q);
      }
      const out = { q: center.q + q, r: center.r + r };
      r++;
      yield out;
    }
  },

  /**
   * Hexes intersecting a pixel-space rectangle (as `q`/`r` bounds), used to
   * pitch a static dot grid behind the patterns.
   */
  boundsForRect(
    topLeft: HexCoord,
    topRight: HexCoord,
    bottomLeft: HexCoord,
  ): { minQ: number; maxQ: number; minR: number; maxR: number } {
    return {
      minQ: Math.min(topLeft.q, bottomLeft.q),
      maxQ: Math.max(topLeft.q, topRight.q),
      minR: Math.min(topLeft.r, topRight.r),
      maxR: Math.max(bottomLeft.r, bottomLeft.r),
    };
  },
};

export enum HexDir {
  NORTH_EAST,
  EAST,
  SOUTH_EAST,
  SOUTH_WEST,
  WEST,
  NORTH_WEST,
}

const DIR_TO_DELTA: Record<HexDir, HexCoord> = {
  [HexDir.NORTH_EAST]: { q: 1, r: -1 },
  [HexDir.EAST]: { q: 1, r: 0 },
  [HexDir.SOUTH_EAST]: { q: 0, r: 1 },
  [HexDir.SOUTH_WEST]: { q: -1, r: 1 },
  [HexDir.WEST]: { q: -1, r: 0 },
  [HexDir.NORTH_WEST]: { q: 0, r: -1 },
};

const DIR_TO_SHORTHAND: Record<HexDir, string> = {
  [HexDir.NORTH_EAST]: "ne",
  [HexDir.EAST]: "e",
  [HexDir.SOUTH_EAST]: "se",
  [HexDir.SOUTH_WEST]: "sw",
  [HexDir.WEST]: "w",
  [HexDir.NORTH_WEST]: "nw",
};

const DIR_NAMES: readonly string[] = [
  "NORTH_EAST",
  "EAST",
  "SOUTH_EAST",
  "SOUTH_WEST",
  "WEST",
  "NORTH_WEST",
];

export namespace HexDir {
  export function asDelta(dir: HexDir): HexCoord {
    return DIR_TO_DELTA[dir];
  }

  export function rotatedBy(dir: HexDir, angle: HexAngle): HexDir {
    return mod(dir + angle, 6) as HexDir;
  }

  export function angleFrom(dir: HexDir, other: HexDir): HexAngle {
    return mod(dir - other, 6) as HexAngle;
  }

  export function toShorthand(dir: HexDir): string {
    return DIR_TO_SHORTHAND[dir];
  }

  export function name(dir: HexDir): string {
    return DIR_NAMES[dir];
  }

  /** Parse `NORTH_EAST`, `north-east`, `ne`, ... into a `HexDir`. */
  export function fromName(value: string): HexDir | null {
    const key = value.trim().toUpperCase().replaceAll("-", "_");
    const index = DIR_NAMES.indexOf(key);
    if (index >= 0) {
      return index as HexDir;
    }
    const shorthand = key.toLowerCase();
    const shorthandIndex = Object.values(DIR_TO_SHORTHAND).indexOf(shorthand);
    return shorthandIndex >= 0 ? (shorthandIndex as HexDir) : null;
  }
}

export enum HexAngle {
  FORWARD,
  RIGHT,
  RIGHT_BACK,
  BACK,
  LEFT_BACK,
  LEFT,
}

const LETTER_TO_ANGLE: Record<string, HexAngle> = {
  w: HexAngle.FORWARD,
  e: HexAngle.RIGHT,
  d: HexAngle.RIGHT_BACK,
  s: HexAngle.BACK,
  a: HexAngle.LEFT_BACK,
  q: HexAngle.LEFT,
};

const ANGLE_TO_LETTER: Record<HexAngle, string> = {
  [HexAngle.FORWARD]: "w",
  [HexAngle.RIGHT]: "e",
  [HexAngle.RIGHT_BACK]: "d",
  [HexAngle.BACK]: "s",
  [HexAngle.LEFT_BACK]: "a",
  [HexAngle.LEFT]: "q",
};

const ANGLE_LETTERS = /^[wqeasd]*$/;

export function isAngleSignature(value: string): boolean {
  return ANGLE_LETTERS.test(value);
}

/**
 * A drawn pattern: a starting compass direction plus a sequence of turns.
 * `signature` is the human/machine-readable angle string (`waaw`, `qaq`, ...).
 */
export class HexPattern {
  public readonly signature: string;

  constructor(
    public readonly startDir: HexDir,
    public readonly angles: readonly HexAngle[] = [],
  ) {
    this.signature = angles.map((angle) => ANGLE_TO_LETTER[angle]).join("");
  }

  static fromSignature(startDir: HexDir, signature: string): HexPattern {
    return new HexPattern(
      startDir,
      Array.from(signature).map((letter) => LETTER_TO_ANGLE[letter]),
    );
  }

  /** All hexes the stroke passes through, starting at `origin`. */
  *positions(origin: HexCoord = { q: 0, r: 0 }): Generator<HexCoord> {
    let cursor = origin;
    let compass = this.startDir;
    yield cursor;
    for (const angle of this.angles) {
      cursor = HexCoord.shiftedBy(cursor, compass);
      yield cursor;
      compass = HexDir.rotatedBy(compass, angle);
    }
    yield HexCoord.shiftedBy(cursor, compass);
  }

  finalDir(): HexDir {
    return this.angles.reduce(HexDir.rotatedBy, this.startDir);
  }

  midpoint(origin: HexCoord = { q: 0, r: 0 }): HexCoord {
    let minQ = origin.q;
    let maxQ = origin.q;
    let minR = origin.r;
    let maxR = origin.r;
    for (const { q, r } of this.positions(origin)) {
      minQ = Math.min(minQ, q);
      maxQ = Math.max(maxQ, q);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
    }
    return { q: (minQ + maxQ) / 2, r: (minR + maxR) / 2 };
  }

  /**
   * Append a move in `newDir`, rejecting illegal strokes (backtracking,
   * revisiting an occupied line, ...). Returns `null` when invalid.
   */
  tryAppendDir(newDir: HexDir): HexPattern | null {
    const linesSeen = new Set<string>();

    let cursor = { q: 0, r: 0 };
    let compass = this.startDir;
    for (const angle of this.angles) {
      linesSeen.add(`${HexCoord.toString(cursor)},${compass}`);
      cursor = HexCoord.shiftedBy(cursor, compass);
      const back = HexDir.rotatedBy(compass, HexAngle.BACK);
      linesSeen.add(`${HexCoord.toString(cursor)},${back}`);
      compass = HexDir.rotatedBy(compass, angle);
    }
    cursor = HexCoord.shiftedBy(cursor, compass);

    if (linesSeen.has(`${HexCoord.toString(cursor)},${newDir}`)) {
      return null;
    }
    const nextAngle = HexDir.angleFrom(newDir, compass);
    if (nextAngle === HexAngle.BACK) {
      return null;
    }

    return this.withAngles([...this.angles, nextAngle]);
  }

  withAngles(newAngles: readonly HexAngle[]): HexPattern {
    return new HexPattern(this.startDir, newAngles);
  }

  toString(): string {
    return `${HexDir.name(this.startDir)} ${this.signature}`;
  }

  toShorthand(): string {
    return `${HexDir.toShorthand(this.startDir)} ${this.signature}`;
  }
}

/** Axial -> pixel for a pointy-top hex grid of the given `size`. */
export function coordToPx(coord: HexCoord, size: number): Point {
  return {
    x: (SQRT_3 * coord.q + (SQRT_3 / 2) * coord.r) * size,
    y: 1.5 * coord.r * size,
  };
}

/** Pixel -> nearest axial hex. */
export function pxToCoord(point: Point, size: number): HexCoord {
  const x = point.x / size;
  const y = point.y / size;
  let qf = (SQRT_3 / 3) * x - (1 / 3) * y;
  let rf = (2 / 3) * y;

  const q = Math.round(qf);
  const r = Math.round(rf);
  qf -= q;
  rf -= r;
  return Math.abs(q) >= Math.abs(r)
    ? { q: q + Math.round(qf + 0.5 * rf), r }
    : { q, r: r + Math.round(rf + 0.5 * qf) };
}

/**
 * Lay patterns out left-to-right on one staff row.
 *
 * Each pattern's bounding box is computed from its drawn segments, then the
 * next pattern starts just past the previous box's maximum `q`.
 */
export function layoutPatterns(
  patterns: readonly { pattern: HexPattern; name?: string }[],
  { gap = 1 }: { gap?: number } = {},
): { pattern: HexPattern; origin: HexCoord; name?: string }[] {
  const out: { pattern: HexPattern; origin: HexCoord; name?: string }[] = [];
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
