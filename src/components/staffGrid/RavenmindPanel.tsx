/**
 * Ravenmind card (渡鸦之思), pinned top-right over the staff grid.
 *
 * Shows the iota currently held in the ravenmind. Empty means the server has
 * not set one, or none has been written yet.
 */

import { Badge, Box, Group, Paper, Text, Tooltip } from "@mantine/core";
import { IconFeather } from "@tabler/icons-react";

import IotaView from "../iota/IotaView";
import { useI18n } from "../../i18n/I18nContext";
import { ravenmindOf, useServer } from "../../simulator/ServerContext";

export interface RavenmindPanelProps {
  /** Narrow screens: keep the card small so it never covers the stack. */
  compact?: boolean;
}

export default function RavenmindPanel({
  compact = false,
}: RavenmindPanelProps) {
  const { snapshot } = useServer();
  const { t } = useI18n();

  const ravenmind = ravenmindOf(snapshot);
  const parens = snapshot?.parens ?? null;
  const hasValue = ravenmind != null;

  return (
    <Paper
      withBorder
      shadow="md"
      radius="md"
      p={compact ? "xs" : "sm"}
      w={compact ? 132 : { base: 190, sm: 230 }}
      style={{ backgroundColor: "var(--mantine-color-body)", opacity: 0.96 }}
    >
      <Group gap={6} mb={6} wrap="nowrap">
        <IconFeather size={16} color="var(--mantine-color-grape-4)" />
        <Text
          fz="xs"
          fw={600}
          tt="uppercase"
          c="dimmed"
          truncate
          style={{ letterSpacing: 0.4, minWidth: 0 }}
        >
          {t("ravenmind.title")}
        </Text>
        {parens != null && parens > 0 && (
          <Tooltip label={t("ravenmind.parens", { n: parens })} withArrow>
            <Badge size="xs" variant="light" color="grape" ml="auto">
              {"{".repeat(Math.min(parens, 4))}
            </Badge>
          </Tooltip>
        )}
      </Group>

      <Box mih={32} style={{ display: "flex", alignItems: "center" }}>
        {hasValue ? (
          <Box style={{ minWidth: 0, maxWidth: "100%" }}>
            {typeof ravenmind === "string" ? (
              <Text fz="sm" ff="monospace" style={{ overflowWrap: "anywhere" }}>
                {ravenmind}
              </Text>
            ) : (
              <IotaView iota={ravenmind} />
            )}
          </Box>
        ) : (
          <Text fz="sm" c="dimmed" fs="italic">
            {t("ravenmind.none")}
          </Text>
        )}
      </Box>
    </Paper>
  );
}
