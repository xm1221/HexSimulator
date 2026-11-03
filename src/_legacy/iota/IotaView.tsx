/**
 * Render a single iota.
 *
 * Classification follows `docs/PROTOCOL.md`: numbers, vectors, booleans, null,
 * garbage, patterns (mini glyph), lists (collapsible), entities, and a generic
 * text + type badge fallback for everything else.
 */

import { useState } from "react";

import type { Iota, RichSegment } from "../server/types.ts";
import { useI18n } from "../i18n/I18nContext.ts";
import { PatternGlyph, patternFromIota } from "./PatternGlyph.tsx";

export function shortType(type: string): string {
  const colon = type.indexOf(":");
  return colon >= 0 ? type.slice(colon + 1) : type;
}

export type IotaKind =
  | "number"
  | "boolean"
  | "null"
  | "garbage"
  | "pattern"
  | "list"
  | "entity"
  | "vector"
  | "unknown";

export function classifyIota(iota: Iota): IotaKind {
  const type = (iota.type ?? "").toLowerCase();
  const short = shortType(type);

  if (short === "garbage" || short.endsWith("garbage")) return "garbage";
  if (short === "null" || short.endsWith("null")) {
    // `hexcasting:null` is the real null iota; `*_nullable` etc. is not.
    return "null";
  }
  if (short === "boolean" || short.endsWith("_boolean")) return "boolean";
  if (short === "double" || short === "number" || short.endsWith("_double")) {
    return "number";
  }
  if (short === "pattern" || short.endsWith("_pattern")) return "pattern";
  if (short === "list" || short.endsWith("_list")) return "list";
  if (short === "entity" || short.endsWith("_entity")) return "entity";
  if (short === "vec3" || short === "vector" || short.startsWith("vec")) {
    return "vector";
  }
  if (Array.isArray(iota.children)) return "list";
  if (iota.entity != null) return "entity";
  if (iota.pattern != null) return "pattern";
  if (typeof iota.value === "number") return "number";
  if (typeof iota.value === "boolean") return "boolean";
  if (short === "unknown") return "unknown";
  return "unknown";
}

export interface IotaViewProps {
  iota: Iota;
  /** Nesting depth, used for list indentation. */
  depth?: number;
  /** Top-level stack rows start expanded-and-compact; nested lists collapsed. */
  defaultOpen?: boolean;
}

export default function IotaView({ iota }: IotaViewProps) {
  const kind = classifyIota(iota);

  switch (kind) {
    case "number":
      return <NumberIota iota={iota} />;
    case "boolean":
      return <BooleanIota iota={iota} />;
    case "null":
      return <SimpleChip kind="null" text={iota.text || "null"} iota={iota} />;
    case "garbage":
      return <SimpleChip kind="garbage" text={iota.text || "<garbage>"} iota={iota} />;
    case "vector":
      return <VectorIota iota={iota} />;
    case "pattern":
      return <PatternIota iota={iota} />;
    case "entity":
      return <EntityIota iota={iota} />;
    case "list":
      return <ListIota iota={iota} />;
    default:
      return <GenericIota iota={iota} />;
  }
}

// ---- individual kinds -----------------------------------------------------

function NumberIota({ iota }: { iota: Iota }) {
  const value = typeof iota.value === "number" ? iota.value : Number(iota.text);
  const display = Number.isFinite(value)
    ? formatNumber(value)
    : iota.text;
  const isInteger = Number.isFinite(value) && Number.isInteger(value);
  return (
    <span className={`iota-chip iota-chip--number${isInteger ? "" : " iota-chip--decimal"}`}>
      <span className="iota-chip__sigil" aria-hidden="true">
        #
      </span>
      <span className="iota-chip__value">{display}</span>
    </span>
  );
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(6)));
}

function BooleanIota({ iota }: { iota: Iota }) {
  const value =
    typeof iota.value === "boolean"
      ? iota.value
      : iota.text.trim().toLowerCase() === "true";
  const { t } = useI18n();
  return (
    <span className={`iota-chip iota-chip--boolean ${value ? "is-true" : "is-false"}`}>
      <span className="iota-chip__sigil" aria-hidden="true">
        {value ? "✓" : "✕"}
      </span>
      <span className="iota-chip__value">
        {value ? "true" : "false"}
      </span>
      <span className="sr-only">{t("iota.boolean")}</span>
    </span>
  );
}

function SimpleChip({
  kind,
  text,
  iota,
}: {
  kind: "null" | "garbage";
  text: string;
  iota: Iota;
}) {
  return (
    <span className={`iota-chip iota-chip--${kind}`} title={iota.type}>
      <span className="iota-chip__value">{text}</span>
    </span>
  );
}

/**
 * Parse a vector from `text` such as `(1, 2, 3)` or `[1.0, 2.0, 3.0]`
 * (Hex Casting uses `(x, y, z)`).
 */
export function parseVectorText(text: string): [number, number, number] | null {
  const match = /^\s*[([{]\s*(-?[\d.eE+]+)\s*[,;]\s*(-?[\d.eE+]+)\s*[,;]\s*(-?[\d.eE+]+)\s*[)\]}]/.exec(
    text,
  );
  if (match == null) {
    return null;
  }
  const values = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  return values.every(Number.isFinite) ? [...values] : null;
}

function VectorIota({ iota }: { iota: Iota }) {
  const parsed = parseVectorText(iota.text);
  const components =
    parsed ??
    (Array.isArray(iota.value)
      ? (iota.value as unknown[])
          .slice(0, 3)
          .map((component) => Number(component))
      : null);

  if (components == null || components.length < 3) {
    return <GenericIota iota={iota} />;
  }

  return (
    <span className="iota-chip iota-chip--vector" title={iota.text}>
      <span className="iota-chip__sigil" aria-hidden="true">
        ➤
      </span>
      <span className="iota-vector">
        {components.slice(0, 3).map((component, index) => (
          <span key={index} className="iota-vector__component">
            <span className="iota-vector__axis">{["x", "y", "z"][index]}</span>
            {formatNumber(component)}
          </span>
        ))}
      </span>
    </span>
  );
}

function PatternIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const pattern = patternFromIota(iota.pattern, iota.text);
  const color = iota.color ?? "#b9a8ff";
  const label = iota.text?.trim() || pattern?.toString() || t("iota.pattern");

  return (
    <span className="iota-chip iota-chip--pattern" title={iota.text}>
      {pattern != null ? (
        <PatternGlyph
          pattern={pattern}
          size={30}
          color={color}
          title={label}
        />
      ) : (
        <span className="iota-chip__sigil" aria-hidden="true">
          ✦
        </span>
      )}
      <span className="iota-pattern-text">
        {pattern != null && label !== pattern.toString() ? (
          <>
            <span className="iota-pattern-text__name">{label}</span>
            <code className="iota-pattern-text__sig">{pattern.toString()}</code>
          </>
        ) : (
          <code className="iota-pattern-text__sig">{label}</code>
        )}
      </span>
    </span>
  );
}

function EntityIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const entity = iota.entity;
  if (entity == null) {
    return <GenericIota iota={iota} />;
  }
  const position =
    Array.isArray(entity.pos) && entity.pos.length >= 3
      ? entity.pos.slice(0, 3).map((n) => formatNumber(Number(n)))
      : null;

  return (
    <span className="iota-chip iota-chip--entity" title={iota.text}>
      <span className="iota-chip__sigil" aria-hidden="true">
        ☺
      </span>
      <span className="iota-entity">
        <span className="iota-entity__name">
          {entity.name ?? shortType(entity.type ?? "entity")}
        </span>
        <code className="iota-entity__type">{entity.type}</code>
        {position != null && (
          <span className="iota-entity__pos">
            {t("iota.position", {
              x: position[0],
              y: position[1],
              z: position[2],
            })}
          </span>
        )}
        {entity.uuid != null && (
          <span className="iota-entity__uuid" title={entity.uuid}>
            {entity.uuid.slice(0, 8)}
          </span>
        )}
      </span>
    </span>
  );
}

function ListIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const children = Array.isArray(iota.children) ? iota.children : [];
  const [open, setOpen] = useState(false);

  return (
    <span className={`iota-list${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="iota-list__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={children.length === 0}
      >
        <span className="iota-list__caret" aria-hidden="true">
          {children.length === 0 ? "·" : open ? "▾" : "▸"}
        </span>
        <span className="iota-chip iota-chip--list">
          <span className="iota-chip__sigil" aria-hidden="true">
            [ ]
          </span>
          <span className="iota-chip__value">
            {t("iota.listCount", { n: children.length })}
          </span>
        </span>
      </button>
      {children.length > 0 && (
        <span className="iota-list__body" hidden={!open}>
          {children.map((child, index) => (
            <span key={index} className="iota-list__item">
              <span className="iota-list__bullet" aria-hidden="true">
                {index + 1}
              </span>
              <IotaView iota={child} depth={1} />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function GenericIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const rich = iota.rich;
  return (
    <span className="iota-chip iota-chip--generic" title={iota.type}>
      <span className="iota-chip__value">
        {rich != null && rich.length > 0 ? (
          <RichText segments={rich} fallback={iota.text} />
        ) : (
          iota.text
        )}
      </span>
      <span className="iota-badge" title={t("iota.typeBadge", { type: iota.type })}>
        {shortType(iota.type)}
      </span>
    </span>
  );
}

export function RichText({
  segments,
  fallback,
}: {
  segments: RichSegment[];
  fallback: string;
}) {
  if (segments.length === 0) {
    return <>{fallback}</>;
  }
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={index}
          style={{
            color: segment.color,
            fontWeight: segment.bold ? 700 : undefined,
            fontStyle: segment.italic ? "italic" : undefined,
            textDecoration: segment.underlined ? "underline" : undefined,
          }}
          className={segment.obfuscated ? "is-obfuscated" : undefined}
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
