/**
 * Render a single iota.
 *
 * Classification follows `docs/PROTOCOL.md`: numbers, vectors, booleans, null,
 * garbage, patterns (mini glyph), lists (collapsible), entities, and a generic
 * text + type badge fallback for everything else.
 */

import { Badge, Box, Code, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";

import { useI18n } from "../../i18n/I18nContext.ts";
import type { Iota, RichSegment } from "../../server/types.ts";
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
  /** Nested lists start collapsed; top-level stack rows are compact. */
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
      return <SimpleChip tone="dim" text={iota.text || "null"} title={iota.type} />;
    case "garbage":
      return (
        <SimpleChip tone="red" text={iota.text || "<garbage>"} title={iota.type} />
      );
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

function MonoValue({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <Text
      component="span"
      ff="monospace"
      fz="sm"
      lh={1.3}
      title={title}
      style={{ overflowWrap: "anywhere" }}
    >
      {children}
    </Text>
  );
}

function NumberIota({ iota }: { iota: Iota }) {
  const value = typeof iota.value === "number" ? iota.value : Number(iota.text);
  const display = Number.isFinite(value) ? formatNumber(value) : iota.text;
  const isInteger = Number.isFinite(value) && Number.isInteger(value);
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text component="span" fz="xs" c="dimmed" ff="monospace" aria-hidden="true">
        #
      </Text>
      <MonoValue title={iota.text}>
        <span style={{ color: isInteger ? undefined : "var(--mantine-color-grape-4)" }}>
          {display}
        </span>
      </MonoValue>
    </Group>
  );
}

export function formatNumber(value: number): string {
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
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text
        component="span"
        fz="sm"
        ff="monospace"
        c={value ? "teal.4" : "red.4"}
        aria-label={t("iota.boolean")}
      >
        {value ? "✓" : "✕"}
      </Text>
      <MonoValue>{value ? "true" : "false"}</MonoValue>
    </Group>
  );
}

function SimpleChip({
  tone,
  text,
  title,
}: {
  tone: "dim" | "red";
  text: string;
  title?: string;
}) {
  return (
    <Code c={tone === "red" ? "red.4" : "dimmed"} title={title} style={{ wordBreak: "break-all" }}>
      {text}
    </Code>
  );
}

/**
 * Parse a vector from `text` such as `(1, 2, 3)` or `[1.0, 2.0, 3.0]`
 * (Hex Casting uses `(x, y, z)`).
 */
export function parseVectorText(text: string): [number, number, number] | null {
  const match =
    /^\s*[([{]\s*(-?[\d.eE+]+)\s*[,;]\s*(-?[\d.eE+]+)\s*[,;]\s*(-?[\d.eE+]+)\s*[)\]}]/.exec(
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
      ? (iota.value as unknown[]).slice(0, 3).map((component) => Number(component))
      : null);

  if (components == null || components.length < 3) {
    return <GenericIota iota={iota} />;
  }

  return (
    <Group gap={8} wrap="nowrap" align="baseline" title={iota.text}>
      <Text component="span" fz="xs" c="dimmed" aria-hidden="true">
        ➤
      </Text>
      {components.slice(0, 3).map((component, index) => (
        <Text key={index} component="span" ff="monospace" fz="sm">
          <Text component="span" fz="xs" c="dimmed">
            {["x", "y", "z"][index]}
          </Text>
          {formatNumber(component)}
        </Text>
      ))}
    </Group>
  );
}

function PatternIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const pattern = patternFromIota(iota.pattern, iota.text);
  const color = iota.color ?? "#b9a8ff";
  const label = iota.text?.trim() || pattern?.toString() || t("iota.pattern");

  return (
    <Group gap={8} wrap="nowrap" align="center" title={iota.text}>
      {pattern != null ? (
        <PatternGlyph pattern={pattern} size={30} color={color} title={label} />
      ) : (
        <Text component="span" fz="sm" c="dimmed" aria-hidden="true">
          ✦
        </Text>
      )}
      <Box style={{ minWidth: 0 }}>
        {pattern != null && label !== pattern.toString() ? (
          <Text fz="xs" truncate>
            {label}
          </Text>
        ) : null}
        <Code fz="xs" c="dimmed">
          {pattern != null && label !== pattern.toString()
            ? pattern.toString()
            : label}
        </Code>
      </Box>
    </Group>
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
    <Group gap={6} wrap="nowrap" align="center" title={iota.text}>
      <Text component="span" fz="xs" c="dimmed" aria-hidden="true">
        ☺
      </Text>
      <Box style={{ minWidth: 0 }}>
        <Text fz="sm" truncate>
          {entity.name ?? shortType(entity.type ?? "entity")}
        </Text>
        <Group gap={6}>
          <Code fz="xs" c="dimmed">
            {entity.type}
          </Code>
          {position != null && (
            <Text fz="xs" c="dimmed">
              {t("iota.position", {
                x: position[0],
                y: position[1],
                z: position[2],
              })}
            </Text>
          )}
          {entity.uuid != null && (
            <Text fz="xs" c="dimmed" ff="monospace" title={entity.uuid}>
              {entity.uuid.slice(0, 8)}
            </Text>
          )}
        </Group>
      </Box>
    </Group>
  );
}

function ListIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const children = Array.isArray(iota.children) ? iota.children : [];
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <UnstyledButton
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={children.length === 0}
        style={{ display: "block", width: "100%" }}
      >
        <Group gap={6} wrap="nowrap">
          <IconChevronRight
            size={14}
            style={{
              transform: open ? "rotate(90deg)" : undefined,
              transition: "transform 120ms ease",
              flex: "0 0 auto",
            }}
          />
          <Badge variant="light" color="grape" size="sm" radius="sm">
            [ ]
          </Badge>
          <Text fz="sm" c="dimmed">
            {t("iota.listCount", { n: children.length })}
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse expanded={open}>
        <Box pl={22} pt={6}>
          {children.map((child, index) => (
            <Group key={index} gap={6} wrap="nowrap" align="flex-start" mb={4}>
              <Text fz="xs" c="dimmed" ff="monospace" w={16} ta="right" pt={2}>
                {index + 1}
              </Text>
              <Box style={{ minWidth: 0 }}>
                <IotaView iota={child} depth={1} />
              </Box>
            </Group>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

function GenericIota({ iota }: { iota: Iota }) {
  const { t } = useI18n();
  const rich = iota.rich;
  return (
    <Group gap={8} wrap="nowrap" align="center" title={iota.type}>
      <Box style={{ minWidth: 0 }}>
        <Text fz="sm" style={{ overflowWrap: "anywhere" }}>
          {rich != null && rich.length > 0 ? (
            <RichText segments={rich} fallback={iota.text} />
          ) : (
            iota.text
          )}
        </Text>
      </Box>
      <Badge
        variant="default"
        size="xs"
        radius="sm"
        title={t("iota.typeBadge", { type: iota.type })}
      >
        {shortType(iota.type)}
      </Badge>
    </Group>
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
        >
          {segment.text}
        </span>
      ))}
    </>
  );
}
