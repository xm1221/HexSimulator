/**
 * Stack card, pinned top-left over the staff grid.
 *
 * The protocol sends stacks bottom -> top. The card renders the top of stack
 * first (labelled) because that is what the next operation consumes; the rest
 * follow downwards. Mishaps / prints from the last cast appear under the list.
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Collapse,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack as MStack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBarToDown,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconPlayerStop,
  IconRefresh,
  IconRotate,
} from "@tabler/icons-react";
import { useState } from "react";

import IotaView, { shortType } from "../iota/IotaView";
import { useI18n } from "../../i18n/I18nContext";
import { useServer } from "../../simulator/ServerContext";

export interface StackPanelProps {
  /** hexParse source to run, or the code produced from the drawn staff. */
  code: string;
  sourceIsDrawn: boolean;
  onToggleSource: () => void;
  onRun: () => void;
  notify: (message: string, kind?: "ok" | "error") => void;
  /** Narrow screens: shrink to leave the top-right ravenmind card visible. */
  compact?: boolean;
}

export default function StackPanel({
  code,
  sourceIsDrawn,
  onToggleSource,
  onRun,
  notify,
  compact = false,
}: StackPanelProps) {
  const { t } = useI18n();
  const {
    snapshot,
    status,
    busy,
    pendingAction,
    step,
    reset,
    refreshStack,
    stepBegin,
    stepNext,
    stepAbort,
  } = useServer();

  const [collapsed, setCollapsed] = useState(false);
  const stack = snapshot?.stack ?? null;
  const connected = status === "connected";

  const copyStack = async () => {
    if (stack == null) {
      return;
    }
    const text = stack.map((iota) => iota.text).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      notify(t("stack.copied"));
    } catch {
      notify(t("stack.copied"), "error");
    }
  };

  return (
    <Paper
      withBorder
      shadow="md"
      radius="md"
      style={{
        backgroundColor: "var(--mantine-color-body)",
        opacity: 0.96,
        // Leave room for the top-right ravenmind card on narrow screens.
        width: compact
          ? "min(240px, calc(100vw - 164px))"
          : "min(340px, calc(100vw - 32px))",
      }}
    >
      <Group gap={6} px="sm" py={8} wrap="nowrap">
        <IconArrowBarToDown size={16} color="var(--mantine-color-grape-4)" />
        <Text fz="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: 0.4 }}>
          {t("stack.title")}
        </Text>
        {stack != null && (
          <Badge size="xs" variant="light" color="gray">
            {t("stack.count", { n: stack.length })}
          </Badge>
        )}
        <Group gap={2} ml="auto" wrap="nowrap">
          {stack != null && stack.length > 0 && (
            <Tooltip label={t("stack.copy")} withArrow>
              <ActionIcon size="sm" variant="subtle" onClick={() => void copyStack()}>
                <IconArrowBarToDown size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label={t("stack.refresh")} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              disabled={!connected || busy}
              onClick={() => void refreshStack()}
              loading={pendingAction === "stack"}
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip
            label={collapsed ? t("stack.expand") : t("stack.collapse")}
            withArrow
          >
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? t("stack.expand") : t("stack.collapse")}
            >
              {collapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Collapse expanded={!collapsed}>
        <Box px="sm" pb="sm">
          {stack == null ? (
            <Text fz="xs" c="dimmed" fs="italic" py={4}>
              {t("stack.unknown")}
            </Text>
          ) : stack.length === 0 ? (
            <Text fz="xs" c="dimmed" fs="italic" py={4}>
              {t("stack.empty")}
            </Text>
          ) : (
            <ScrollArea.Autosize mah={220} type="hover" offsetScrollbars>
              <MStack gap={2} pr={6}>
                {[...stack].reverse().map((iota, reverseIndex) => {
                  const index = stack.length - 1 - reverseIndex;
                  const isTop = index === stack.length - 1;
                  return (
                    <Group
                      key={index}
                      gap={8}
                      wrap="nowrap"
                      align="center"
                      py={4}
                      px={6}
                      style={{
                        borderRadius: "var(--mantine-radius-sm)",
                        backgroundColor: isTop
                          ? "var(--mantine-color-grape-light)"
                          : undefined,
                      }}
                    >
                      <Text
                        fz={10}
                        c={isTop ? "grape.4" : "dimmed"}
                        fw={isTop ? 700 : 400}
                        w={34}
                        style={{ flex: "0 0 auto", textTransform: "uppercase" }}
                      >
                        {isTop ? t("stack.top") : t("stack.index", { n: index })}
                      </Text>
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <IotaView iota={iota} />
                      </Box>
                      <Text
                        fz={9}
                        c="dimmed"
                        ff="monospace"
                        style={{ flex: "0 0 auto" }}
                      >
                        {shortType(iota.type)}
                      </Text>
                    </Group>
                  );
                })}
              </MStack>
            </ScrollArea.Autosize>
          )}

          {(snapshot?.error != null
            || (snapshot?.mishaps.length ?? 0) > 0
            || (snapshot?.prints.length ?? 0) > 0
            || (snapshot?.messages.length ?? 0) > 0
            || (snapshot?.parserMessages.length ?? 0) > 0) && (
            <>
              <Divider my={8} />
              <MStack gap={4}>
                {snapshot?.error != null && (
                  <Group gap={6} wrap="nowrap" align="flex-start">
                    <IconAlertTriangle
                      size={14}
                      color="var(--mantine-color-red-4)"
                      style={{ flex: "0 0 auto", marginTop: 2 }}
                    />
                    <Text fz="xs" c="red.4">
                      {snapshot.error}
                    </Text>
                  </Group>
                )}
                {(snapshot?.mishaps ?? []).map((mishap, index) => (
                  <Group key={`m${index}`} gap={6} wrap="nowrap" align="flex-start">
                    <IconAlertTriangle
                      size={14}
                      color="var(--mantine-color-orange-4)"
                      style={{ flex: "0 0 auto", marginTop: 2 }}
                    />
                    <Text fz="xs" c="orange.4">
                      {mishap}
                    </Text>
                  </Group>
                ))}
                {(snapshot?.prints ?? []).map((line, index) => (
                  <Group key={`p${index}`} gap={6} wrap="nowrap" align="flex-start">
                    <IconInfoCircle
                      size={14}
                      color="var(--mantine-color-teal-4)"
                      style={{ flex: "0 0 auto", marginTop: 2 }}
                    />
                    <Text fz="xs">{line}</Text>
                  </Group>
                ))}
                {(snapshot?.messages ?? []).map((line, index) => (
                  <Text key={`msg${index}`} fz="xs" c="dimmed">
                    {line}
                  </Text>
                ))}
                {(snapshot?.parserMessages ?? []).map((line, index) => (
                  <Text key={`parse${index}`} fz="xs" c="yellow.5">
                    {line}
                  </Text>
                ))}
              </MStack>
            </>
          )}

          <Divider my={8} />

          {step != null ? (
            <Group gap={6} wrap="nowrap">
              <Text fz="xs" c="dimmed" ff="monospace">
                {t("stack.stepProgress", {
                  index: Math.min(step.executed ?? step.index, step.total),
                  total: step.total,
                })}
              </Text>
              {step.stopped != null && (
                <Badge size="xs" variant="light" color="red">
                  {step.stopped}
                </Badge>
              )}
              <Group gap={4} ml="auto">
                <Button
                  size="compact-xs"
                  variant="light"
                  leftSection={<IconPlayerSkipForward size={14} />}
                  disabled={!connected || step.done || busy}
                  onClick={() => void stepNext()}
                >
                  {t("stack.stepNext")}
                </Button>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => void stepAbort()}
                  aria-label={t("stack.stepAbort")}
                >
                  <IconPlayerStop size={14} />
                </ActionIcon>
              </Group>
            </Group>
          ) : (
            <Group gap={6} wrap="nowrap">
              <Button
                size="compact-sm"
                leftSection={<IconPlayerPlay size={15} />}
                onClick={onRun}
                loading={pendingAction === "run"}
                disabled={!connected || busy || code.trim() === ""}
                style={{ flex: 1 }}
              >
                {t("stack.run")}
              </Button>
              <Tooltip label={t("stack.step")} withArrow>
                <ActionIcon
                  size="lg"
                  variant="light"
                  disabled={!connected || busy || code.trim() === ""}
                  onClick={() => void stepBegin(code)}
                  loading={pendingAction === "step.begin"}
                  aria-label={t("stack.step")}
                >
                  <IconPlayerSkipForward size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t("stack.reset")} withArrow>
                <ActionIcon
                  size="lg"
                  variant="default"
                  disabled={!connected || busy}
                  onClick={() => void reset()}
                  loading={pendingAction === "reset"}
                  aria-label={t("stack.reset")}
                >
                  <IconRotate size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}

          <Group gap={6} mt={6} wrap="nowrap">
            <Tooltip label={t("stack.sourceHint")} withArrow>
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                onClick={onToggleSource}
                style={{ flex: "0 0 auto" }}
              >
                {t("stack.source")}: {sourceIsDrawn ? "staff" : "hexParse"}
              </Button>
            </Tooltip>
            <Code
              fz={10}
              c="dimmed"
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={code}
            >
              {code.trim() === "" ? "—" : code}
            </Code>
          </Group>
        </Box>
      </Collapse>
    </Paper>
  );
}
