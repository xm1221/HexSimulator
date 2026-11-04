/**
 * Wire types for the HexSimulator HTTP protocol (protocol version 1).
 *
 * Source of truth: `docs/PROTOCOL.md` / `docs/PROTOCOL.zh-CN.md`.
 * Keep these types in sync with the protocol document.
 */

export const PROTOCOL_VERSION = 1;

export interface HealthResponse {
  ok: boolean;
  protocol?: number;
  server?: string;
  version?: string;
}

export type RpcCommand =
  | "ping"
  | "run"
  | "reset"
  | "stack"
  | "step.begin"
  | "step.next"
  | "step.abort"
  | "complete"
  | "profile.list"
  | "profile.show"
  | "profile.use"
  | "env.list"
  | "env.use"
  | "patterns.list";

export interface RpcRequest {
  id?: number | string;
  cmd: RpcCommand | string;
  code?: string;
  label?: string;
  name?: string;
  token?: string;
}

/** Styled display segment (`rich`). */
export interface RichSegment {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  obfuscated?: boolean;
}

export interface IotaEntity {
  type?: string;
  name?: string;
  pos?: [number, number, number] | number[];
  uuid?: string;
}

export interface IotaPattern {
  /** Direction name, e.g. `NORTH_EAST`, or a numeric HexDir value. */
  startDir?: string | number;
  /** Angle letters, e.g. `waaw`. */
  angles?: string;
  /** Alternative spelling used by some servers. */
  signature?: string;
}

/** One iota on the stack. Unknown fields are preserved by the renderer. */
export interface Iota {
  type: string;
  text: string;
  color?: string;
  rich?: RichSegment[];
  /** Numbers / booleans / null / vector components when known. */
  value?: number | boolean | null | number[];
  /** Pattern iotas, for mini glyph rendering. */
  pattern?: IotaPattern;
  /** Entity iotas. */
  entity?: IotaEntity;
  /** List iotas (recursive). */
  children?: Iota[];
}

export interface CastResult {
  resolution?: string;
  steps?: number;
  ops?: number;
  /** Bottom -> top. */
  stack?: Iota[];
  ravenmind?: Iota | string | null;
  mishaps?: string[];
  mediaUsed?: number;
  mediaDust?: number;
  /** Some servers include the iotas that were pushed/popped. */
  [key: string]: unknown;
}

export interface StepInfo {
  total: number;
  index: number;
  done: boolean;
  executed?: number;
  preview?: Iota;
  stopped?: string;
}

export interface MediaInfo {
  mode?: string;
  text?: string;
}

export interface RpcData {
  cast?: CastResult | null;
  stack?: Iota[];
  ravenmind?: Iota | string | null;
  parens?: number;
  prints?: string[];
  messages?: string[];
  parserMessages?: string[];
  media?: MediaInfo;
  error?: string | null;
  step?: StepInfo | null;
  /** reset / step.abort / ping extras. */
  message?: string;
  profile?: string;
  stackSize?: number;
  [key: string]: unknown;
}

export interface RpcResponse {
  id?: number | string;
  ok: boolean;
  lines?: string[];
  data?: RpcData;
}

/**
 * Normalized view of one RPC reply, independent of whether the server put the
 * stack under `data.cast.stack` or `data.stack`.
 */
export interface CastSnapshot {
  /** Bottom -> top, or `null` when the server sent no stack at all. */
  stack: Iota[] | null;
  ravenmind: Iota | string | null;
  parens: number | null;
  resolution: string | null;
  steps: number | null;
  ops: number | null;
  mishaps: string[];
  mediaUsed: number | null;
  mediaDust: number | null;
  prints: string[];
  messages: string[];
  parserMessages: string[];
  media: MediaInfo | null;
  error: string | null;
  step: StepInfo | null;
  lines: string[];
  ok: boolean;
}

/** Flatten an RPC reply into the shape the UI renders. */
export function toSnapshot(response: RpcResponse): CastSnapshot {
  const data = response.data ?? {};
  const cast =
    data.cast != null && typeof data.cast === "object" ? data.cast : null;

  const stack = cast?.stack ?? data.stack ?? null;
  const ravenmind =
    cast?.ravenmind !== undefined ? cast.ravenmind : (data.ravenmind ?? null);

  return {
    stack: Array.isArray(stack) ? stack : null,
    ravenmind: ravenmind ?? null,
    parens: typeof data.parens === "number" ? data.parens : null,
    resolution: cast?.resolution ?? null,
    steps: typeof cast?.steps === "number" ? cast.steps : null,
    ops: typeof cast?.ops === "number" ? cast.ops : null,
    mishaps: Array.isArray(cast?.mishaps) ? cast.mishaps : [],
    mediaUsed: typeof cast?.mediaUsed === "number" ? cast.mediaUsed : null,
    mediaDust: typeof cast?.mediaDust === "number" ? cast.mediaDust : null,
    prints: Array.isArray(data.prints) ? data.prints : [],
    messages: Array.isArray(data.messages) ? data.messages : [],
    parserMessages: Array.isArray(data.parserMessages)
      ? data.parserMessages
      : [],
    media: data.media ?? null,
    error: typeof data.error === "string" ? data.error : null,
    step: data.step ?? null,
    lines: Array.isArray(response.lines) ? response.lines : [],
    ok: response.ok === true,
  };
}

/**
 * Carry the last known stack forward when a command did not report one.
 *
 * `reset`, `step.abort`, `ping`, `step.begin` and the like legitimately omit
 * the stack; keeping the previous value avoids blanking the panel. A command
 * that *does* report a stack always wins, including an empty one.
 */
export function mergeStack(previous: CastSnapshot | null, next: CastSnapshot): CastSnapshot {
  if (next.stack !== null || previous?.stack == null) {
    return next;
  }
  return { ...next, stack: previous.stack };
}

// ---- pattern registry (`patterns.list`) -----------------------------------

export type PatternDirection =
  | "NORTH_EAST"
  | "EAST"
  | "SOUTH_EAST"
  | "SOUTH_WEST"
  | "WEST"
  | "NORTH_WEST";

/** One registered pattern as sent by the server. */
export interface PatternListEntry {
  /** Fully qualified id, e.g. `hexcasting:add`. */
  id: string;
  /** Start direction name, e.g. `NORTH_EAST`. */
  startDir: PatternDirection | string;
  /** Angle letters (`wqeasd`), e.g. `waaw`. */
  angles: string;
  /** Optional extra lookup names (server-specific). */
  aliases?: string[];
  /** Optional owning addon / mod id (`hexcasting`, `miehex`, ...). */
  addon?: string;
}

/**
 * Payload of `patterns.list`, as accepted from either `data` or a top-level
 * `patterns` field for servers that reply in the shorthand shape.
 */
export interface PatternListPayload {
  patterns?: PatternListEntry[];
  /** Optional pre-generated number table (`"<n>" -> [startDir, angles]`). */
  numbers?: Record<string, [string, string]>;
  /** Optional server/adapter identification. */
  source?: string;
  version?: number;
}
