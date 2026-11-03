/**
 * Miniature staff glyph for a pattern iota.
 *
 * Uses the same hex geometry as the drawing canvas, rendered as inline SVG so
 * it can appear anywhere in the stack / step preview without a canvas.
 */

import { coordToPx, HexDir, HexPattern } from "../canvas/hex.ts";
import type { IotaPattern } from "../server/types.ts";

const SIZE = 7;

export interface PatternGlyphProps {
  pattern: HexPattern;
  /** Width/height in CSS pixels. */
  size?: number;
  color?: string;
  /** Show a soft glow behind the stroke. */
  glow?: boolean;
  title?: string;
}

export function PatternGlyph({
  pattern,
  size = 34,
  color = "#b9a8ff",
  glow = true,
  title,
}: PatternGlyphProps) {
  const coords = [...pattern.positions()];
  const points = coords.map((coord) => coordToPx(coord, SIZE));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const padding = SIZE * 1.4;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const scale = Math.min(size / width, size / height);

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${(point.x - minX + padding).toFixed(2)},${(
          point.y - minY + padding
        ).toFixed(2)}`,
    )
    .join(" ");

  const head = points[points.length - 1];

  return (
    <svg
      className="pattern-glyph"
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title ?? pattern.toString()}
    >
      <title>{title ?? pattern.toString()}</title>
      <g transform={`scale(${scale})`}>
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={SIZE * 0.34}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={glow ? 0.35 : 0.7}
          filter={glow ? "url(#hexglyph-glow)" : undefined}
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={SIZE * 0.16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={SIZE * 0.08}
            fill={color}
            opacity={index === points.length - 1 ? 1 : 0.55}
          />
        ))}
        <circle
          cx={head.x}
          cy={head.y}
          r={SIZE * 0.16}
          fill="#6ff0e0"
          opacity={0.9}
        />
      </g>
      {glow && (
        <defs>
          <filter id="hexglyph-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={SIZE * 0.18} />
          </filter>
        </defs>
      )}
    </svg>
  );
}

/**
 * Recover a drawable pattern from an iota.
 *
 * Prefers the structured `pattern` field. Servers that omit it usually put
 * something like `NORTH_EAST waaw` in `text`; that form is accepted too.
 */
export function patternFromIota(
  pattern: IotaPattern | undefined,
  text: string,
): HexPattern | null {
  if (pattern != null) {
    const startDir =
      typeof pattern.startDir === "number"
        ? (pattern.startDir as HexDir)
        : pattern.startDir != null
          ? HexDir.fromName(String(pattern.startDir))
          : null;
    if (startDir != null) {
      const angles = pattern.angles ?? pattern.signature ?? "";
      if (/^[wqeasd]*$/.test(angles)) {
        return HexPattern.fromSignature(startDir, angles);
      }
    }
  }

  // Fall back to the text form produced by HexCLI / HexPattern.toString():
  // `NORTH_EAST waaw`, `north_east waaw`, `ne waaw`, or just `waaw`.
  const match = /^\s*([A-Za-z_]+)?\s+([wqeasd]+)\s*$/.exec(text);
  if (match != null) {
    const dir = match[1] != null ? HexDir.fromName(match[1]) : HexDir.EAST;
    if (dir != null) {
      return HexPattern.fromSignature(dir, match[2]);
    }
  }
  const bare = /^\s*([wqeasd]+)\s*$/.exec(text);
  if (bare != null) {
    return HexPattern.fromSignature(HexDir.EAST, bare[1]);
  }
  return null;
}
