/**
 * Interactive staff grid canvas.
 *
 * Interaction model adapted from HexTools
 * (`packages/@hextools/react/src/components/StaffGrid.tsx` and
 * `packages/@hextools/renderer/src/staffGrid/guiSpellcasting.ts`), MIT License,
 * Copyright (c) 2026 [object Object]. See THIRD_PARTY.md.
 *
 * HexTools renders with WebGL; this port keeps the same drawing rules but uses
 * a plain 2D canvas so the app stays dependency-free and works everywhere.
 */

import { useEffect, useImperativeHandle, useRef } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  Ref,
  WheelEvent as ReactWheelEvent,
} from "react";

import {
  clamp,
  coordToPx,
  HexAngle,
  HexCoord,
  HexDir,
  HexPattern,
  mod,
  pxToCoord,
} from "./hex.ts";
import type { Point } from "./hex.ts";
import type { LaidOutPattern } from "../hexparse/index.ts";

export interface StaffGridRef {
  resetView: () => void;
  /** Center and scale the view so every pattern is visible. */
  fitToPatterns: () => void;
  cancelPattern: () => void;
  panToPattern: (pattern: LaidOutPattern) => void;
}

export interface StaffGridProps {
  patterns: readonly LaidOutPattern[];
  onChange: (patterns: LaidOutPattern[]) => void;
  onPatternDrawn?: (pattern: LaidOutPattern) => void;
  ref?: Ref<StaffGridRef>;
}

const HEX_SIZE = 34;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const GRID_SNAP_THRESHOLD = 0.5;

/** Palette of one staff pattern (purple/blue, matching Hex Casting). */
const PATTERN_COLOR = { r: 0x8b, g: 0x7d, b: 0xff };
const PATTERN_FADE = { r: 0xf3, g: 0xcf, b: 0xff };
const ACCENT = { r: 0x59, g: 0xe6, b: 0xd6 };

type DrawState =
  | { type: "idle" }
  | { type: "justStarted"; origin: HexCoord; editedIndex: number | null }
  | {
      type: "drawing";
      origin: HexCoord;
      current: HexCoord;
      wip: HexPattern;
      editedIndex: number | null;
    };

const IDLE: DrawState = { type: "idle" };

interface View {
  /** Screen-space pan, in CSS pixels. */
  panX: number;
  panY: number;
  zoom: number;
}

export function StaffGrid({
  patterns,
  onChange,
  onPatternDrawn,
  ref,
}: StaffGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable render state kept in refs so the animation loop never restarts.
  const patternsRef = useRef(patterns);
  const onChangeRef = useRef(onChange);
  const onDrawnRef = useRef(onPatternDrawn);
  const viewRef = useRef<View>({ panX: 0, panY: 0, zoom: 1 });
  const drawRef = useRef<DrawState>(IDLE);
  const pointerRef = useRef<{ x: number; y: number; inside: boolean }>({
    x: 0,
    y: 0,
    inside: false,
  });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const lastPinchRef = useRef<{ distance: number; cx: number; cy: number } | null>(
    null,
  );
  const draggingRef = useRef(false);
  const panningRef = useRef(false);

  patternsRef.current = patterns;
  onChangeRef.current = onChange;
  onDrawnRef.current = onPatternDrawn;

  // ---- coordinate helpers (screen <-> hex) --------------------------------

  const hexSize = () => HEX_SIZE * viewRef.current.zoom;

  const center = (): Point => {
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth ?? 0;
    const height = canvas?.clientHeight ?? 0;
    return {
      x: width / 2 + viewRef.current.panX,
      y: height / 2 + viewRef.current.panY,
    };
  };

  const hexToScreen = (coord: HexCoord): Point => {
    const { x, y } = coordToPx(coord, hexSize());
    const c = center();
    return { x: c.x + x, y: c.y + y };
  };

  const screenToHex = (point: Point): HexCoord => {
    const c = center();
    return pxToCoord(
      { x: point.x - c.x, y: point.y - c.y },
      hexSize(),
    );
  };

  const localPoint = (event: ReactPointerEvent): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const usedSpots = (): Map<string, number> => {
    const map = new Map<string, number>();
    for (const [index, entry] of patternsRef.current.entries()) {
      for (const coord of entry.pattern.positions(entry.origin)) {
        map.set(HexCoord.toString(coord), index);
      }
    }
    return map;
  };

  // ---- drawing ------------------------------------------------------------

  const beginStroke = (point: Point) => {
    // Panning state is handled by the caller.
    const coord = screenToHex(point);
    const spots = usedSpots();
    const usedIndex = spots.get(HexCoord.toString(coord));

    if (usedIndex === undefined) {
      drawRef.current = { type: "justStarted", origin: coord, editedIndex: null };
      return;
    }

    // Click on an existing pattern: trim it back to the clicked vertex so the
    // user can redraw the tail, like HexTools does.
    const entry = patternsRef.current[usedIndex];
    if (entry == null) {
      return;
    }
    let lastIndex: number | null = null;
    let compass = entry.pattern.startDir;
    let cursor = HexCoord.shiftedBy(entry.origin, compass);
    for (const [index, angle] of entry.pattern.angles.entries()) {
      compass = HexDir.rotatedBy(compass, angle);
      cursor = HexCoord.shiftedBy(cursor, compass);
      if (HexCoord.equals(cursor, coord)) {
        lastIndex = index;
      }
    }

    if (lastIndex != null) {
      drawRef.current = {
        type: "drawing",
        origin: entry.origin,
        current: coord,
        wip: entry.pattern.withAngles(entry.pattern.angles.slice(0, lastIndex + 1)),
        editedIndex: usedIndex,
      };
    } else {
      drawRef.current = { type: "justStarted", origin: coord, editedIndex: usedIndex };
    }
  };

  const extendStroke = (point: Point) => {
    const state = drawRef.current;
    if (state.type === "idle") {
      return;
    }
    const anchorCoord =
      state.type === "justStarted" ? state.origin : state.current;
    const anchor = hexToScreen(anchorCoord);
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    const snapDistance = hexSize() * hexSize() * GRID_SNAP_THRESHOLD;
    if (dx * dx + dy * dy < snapDistance) {
      return;
    }

    const angle = Math.atan2(dy, dx);
    const snapped = mod(angle / (Math.PI * 2), 6);
    const newDir = mod(Math.round(snapped * 6) + 1, 6) as HexDir;
    const nextCoord = HexCoord.shiftedBy(anchorCoord, newDir);

    const spots = usedSpots();
    const occupied = spots.get(HexCoord.toString(nextCoord));
    const isEditingSpot =
      state.type === "drawing"
      && state.editedIndex != null
      && occupied === state.editedIndex;
    if (occupied !== undefined && !isEditingSpot) {
      return;
    }

    if (state.type === "justStarted") {
      drawRef.current = {
        type: "drawing",
        origin: anchorCoord,
        current: nextCoord,
        wip: new HexPattern(newDir),
        editedIndex: state.editedIndex,
      };
      return;
    }

    const lastDir = state.wip.finalDir();
    if (newDir === HexDir.rotatedBy(lastDir, HexAngle.BACK)) {
      if (state.wip.angles.length === 0) {
        drawRef.current = {
          type: "justStarted",
          origin: nextCoord,
          editedIndex: state.editedIndex,
        };
      } else {
        drawRef.current = {
          ...state,
          current: nextCoord,
          wip: state.wip.withAngles(state.wip.angles.slice(0, -1)),
        };
      }
      return;
    }

    const appended = state.wip.tryAppendDir(newDir);
    if (appended != null) {
      drawRef.current = { ...state, wip: appended, current: nextCoord };
    }
  };

  const finishStroke = () => {
    const state = drawRef.current;
    drawRef.current = IDLE;
    if (state.type !== "drawing") {
      return;
    }
    if (state.wip.angles.length === 0) {
      return;
    }

    const entry: LaidOutPattern = {
      pattern: state.wip,
      origin: state.origin,
    };

    if (state.editedIndex != null) {
      const next = [...patternsRef.current];
      const existing = next[state.editedIndex];
      next[state.editedIndex] = { ...entry, name: existing?.name };
      onChangeRef.current(next);
    } else {
      onChangeRef.current([...patternsRef.current, entry]);
      onDrawnRef.current?.(entry);
    }
  };

  // ---- lifecycle: canvas sizing + animation ------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas == null || container == null) {
      return;
    }
    const context = canvas.getContext("2d");
    if (context == null) {
      return;
    }

    let frame = 0;
    let disposed = false;
    let lastTime = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      if (
        canvas.width !== Math.round(width * dpr)
        || canvas.height !== Math.round(height * dpr)
      ) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = (time: number) => {
      if (disposed) {
        return;
      }
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      resize();
      drawScene(context, time / 1000 + dt * 0);
      frame = requestAnimationFrame(render);
    };

    const drawScene = (ctx: CanvasRenderingContext2D, time: number) => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      ctx.clearRect(0, 0, width, height);

      drawBackdrop(ctx, width, height);
      drawGridDots(ctx, time, hexToScreen, screenToHex, width, height);

      const editingIndex =
        drawRef.current.type === "drawing"
          ? drawRef.current.editedIndex
          : drawRef.current.type === "justStarted"
            ? drawRef.current.editedIndex
            : null;

      for (const [index, entry] of patternsRef.current.entries()) {
        if (index === editingIndex) {
          continue;
        }
        const points = [...entry.pattern.positions(entry.origin)].map(hexToScreen);
        drawStroke(ctx, points, time + index * 0.7, 1);
      }

      if (drawRef.current.type === "drawing") {
        const { wip, origin } = drawRef.current;
        const points = [...wip.positions(origin)].map(hexToScreen);
        drawStroke(ctx, points, time, 0.8);
      } else if (drawRef.current.type === "justStarted") {
        drawHead(ctx, hexToScreen(drawRef.current.origin), time, 1);
      }

      const pointer = pointerRef.current;
      if (pointer.inside && drawRef.current.type === "idle" && !panningRef.current) {
        const hover = screenToHex(pointer);
        const spots = usedSpots();
        for (const coord of HexCoord.rangeAround(hover, 2)) {
          if (spots.has(HexCoord.toString(coord))) {
            continue;
          }
          const p = hexToScreen(coord);
          const distance = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          const alpha = clamp(1 - distance / (hexSize() * 2.6), 0, 1) * 0.5;
          if (alpha <= 0.01) {
            continue;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${PATTERN_FADE.r}, ${PATTERN_FADE.g}, ${PATTERN_FADE.b}, ${alpha})`;
          ctx.fill();
        }
      }
    };

    frame = requestAnimationFrame(render);
    const observer = new ResizeObserver(() => resize());
    observer.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // `patterns` is read from a ref; only mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- imperative API -----------------------------------------------------

  useImperativeHandle(
    ref,
    () => ({
      resetView: () => {
        viewRef.current = { panX: 0, panY: 0, zoom: 1 };
      },
      fitToPatterns: () => {
        const entries = patternsRef.current;
        if (entries.length === 0) {
          viewRef.current = { panX: 0, panY: 0, zoom: 1 };
          return;
        }
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const entry of entries) {
          for (const coord of entry.pattern.positions(entry.origin)) {
            const point = coordToPx(coord, HEX_SIZE);
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          }
        }
        const canvas = canvasRef.current;
        const width = canvas?.clientWidth ?? 0;
        const height = canvas?.clientHeight ?? 0;
        const padding = HEX_SIZE * 2.2;
        const spanX = Math.max(maxX - minX + padding * 2, 1);
        const spanY = Math.max(maxY - minY + padding * 2, 1);
        const zoom = clamp(
          Math.min(width / spanX, height / spanY),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        viewRef.current = { panX: -midX * zoom, panY: -midY * zoom, zoom };
      },
      cancelPattern: () => {
        drawRef.current = IDLE;
      },
      panToPattern: (target: LaidOutPattern) => {
        const mid = target.pattern.midpoint(target.origin);
        const size = hexSize();
        const offset = coordToPx(mid, size);
        viewRef.current = {
          ...viewRef.current,
          panX: -offset.x,
          panY: -offset.y,
        };
      },
    }),
    [],
  );

  // ---- pointer handlers ---------------------------------------------------

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    pointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointersRef.current.size === 2) {
      // Two fingers: pan + pinch, cancel any in-progress stroke.
      drawRef.current = IDLE;
      const [a, b] = [...pointersRef.current.values()];
      lastPinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      draggingRef.current = false;
      panningRef.current = true;
      return;
    }

    if (event.button === 1 || (event.buttons & 4) !== 0 || event.shiftKey) {
      panningRef.current = true;
      draggingRef.current = false;
      drawRef.current = IDLE;
      return;
    }

    if (event.button !== 0) {
      return;
    }

    draggingRef.current = true;
    panningRef.current = false;
    beginStroke(point);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = localPoint(event);
    pointerRef.current = { ...point, inside: true };
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, point);
    }

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const previous = lastPinchRef.current;
      if (previous != null && previous.distance > 0 && distance > 0) {
        viewRef.current.panX += cx - previous.cx;
        viewRef.current.panY += cy - previous.cy;
        viewRef.current.zoom = clamp(
          viewRef.current.zoom * (distance / previous.distance),
          MIN_ZOOM,
          MAX_ZOOM,
        );
      }
      lastPinchRef.current = { distance, cx, cy };
      return;
    }

    if (panningRef.current && draggingRef.current === false && event.buttons !== 0) {
      const movement = pointerRef.current;
      // Use movementX/Y when available; fall back to the stored pinch anchor.
      viewRef.current.panX += event.movementX || 0;
      viewRef.current.panY += event.movementY || 0;
      void movement;
      return;
    }

    if (event.buttons !== 0 && drawRef.current.type !== "idle") {
      extendStroke(point);
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      lastPinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      panningRef.current = false;
    }
    if (draggingRef.current) {
      draggingRef.current = false;
      finishStroke();
    }
  };

  const localWheelPoint = (event: ReactWheelEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handleWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (event.deltaY === 0) {
      return;
    }
    const point = localWheelPoint(event);
    const before = screenToHex(point);
    viewRef.current.zoom = clamp(
      viewRef.current.zoom * (1 - event.deltaY * 0.0015),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    // Keep the hex under the cursor fixed.
    const after = hexToScreen(before);
    viewRef.current.panX += point.x - after.x;
    viewRef.current.panY += point.y - after.y;
  };

  return (
    <div ref={containerRef} className="staff-grid">
      <canvas
        ref={canvasRef}
        className="staff-grid__canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          pointerRef.current.inside = false;
        }}
        onWheel={handleWheel}
      />
    </div>
  );
}

// ---- rendering primitives -------------------------------------------------

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    0,
    width * 0.5,
    height * 0.42,
    Math.max(width, height) * 0.75,
  );
  gradient.addColorStop(0, "rgba(38, 32, 66, 0.55)");
  gradient.addColorStop(0.55, "rgba(17, 15, 31, 0.65)");
  gradient.addColorStop(1, "rgba(9, 8, 16, 0.9)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawGridDots(
  ctx: CanvasRenderingContext2D,
  time: number,
  hexToScreen: (coord: HexCoord) => Point,
  screenToHex: (point: Point) => HexCoord,
  width: number,
  height: number,
) {
  // Draw the hex lattice itself, so the dots pan and zoom with the staff.
  const corners = [
    screenToHex({ x: 0, y: 0 }),
    screenToHex({ x: width, y: 0 }),
    screenToHex({ x: 0, y: height }),
    screenToHex({ x: width, y: height }),
  ];
  const minQ = Math.min(...corners.map((corner) => corner.q)) - 1;
  const maxQ = Math.max(...corners.map((corner) => corner.q)) + 1;
  const minR = Math.min(...corners.map((corner) => corner.r)) - 1;
  const maxR = Math.max(...corners.map((corner) => corner.r)) + 1;
  if ((maxQ - minQ) * (maxR - minR) > 6000) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.16 + 0.03 * Math.sin(time * 0.7);
  ctx.fillStyle = "rgba(200, 190, 255, 1)";
  for (let r = minR; r <= maxR; r++) {
    for (let q = minQ; q <= maxQ; q++) {
      const point = hexToScreen({ q, r });
      if (
        point.x < -8
        || point.x > width + 8
        || point.y < -8
        || point.y > height + 8
      ) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  time: number,
  alpha: number,
) {
  if (points.length < 2) {
    return;
  }

  const gradient = ctx.createLinearGradient(
    points[0].x,
    points[0].y,
    points[points.length - 1].x,
    points[points.length - 1].y,
  );
  const pulse = 0.75 + 0.25 * Math.sin(time * 1.6);
  gradient.addColorStop(
    0,
    `rgba(${PATTERN_COLOR.r}, ${PATTERN_COLOR.g}, ${PATTERN_COLOR.b}, ${0.55 * alpha})`,
  );
  gradient.addColorStop(
    1,
    `rgba(${PATTERN_FADE.r}, ${PATTERN_FADE.g}, ${PATTERN_FADE.b}, ${pulse * alpha})`,
  );

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Soft outer glow.
  ctx.strokeStyle = `rgba(${PATTERN_COLOR.r}, ${PATTERN_COLOR.g}, ${PATTERN_COLOR.b}, ${0.18 * alpha})`;
  ctx.lineWidth = 13;
  tracePath(ctx, points);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${PATTERN_COLOR.r}, ${PATTERN_COLOR.g}, ${PATTERN_COLOR.b}, ${0.32 * alpha})`;
  ctx.lineWidth = 8;
  ctx.stroke();

  // Bright core.
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.shadowColor = `rgba(${PATTERN_FADE.r}, ${PATTERN_FADE.g}, ${PATTERN_FADE.b}, 0.8)`;
  ctx.shadowBlur = 12;
  tracePath(ctx, points);
  ctx.stroke();
  ctx.restore();

  // Vertices.
  for (const [index, point] of points.entries()) {
    const isHead = index === points.length - 1;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isHead ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${PATTERN_FADE.r}, ${PATTERN_FADE.g}, ${PATTERN_FADE.b}, ${
      (isHead ? 0.95 : 0.45) * alpha
    })`;
    ctx.fill();
  }

  drawHead(ctx, points[points.length - 1], time, alpha);
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  point: Point,
  time: number,
  alpha: number,
) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 2.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 9 + pulse * 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${0.1 * alpha})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${0.85 * alpha})`;
  ctx.fill();
  ctx.restore();
}

function tracePath(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}
