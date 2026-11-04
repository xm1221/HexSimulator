import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCloudOff,
  IconKeyboard,
  IconWand,
} from "@tabler/icons-react";
import { useState } from "react";

import { type ResolvedPattern } from "@hextools/renderer/staffGrid";

import {
  OFFLINE_PATTERNS_DATA,
  parseHex,
  parseToResolvedPatterns,
  type ParseResult,
} from "../../hexparse";
import { useI18n } from "../../i18n/I18nContext";
import { useServer } from "../../simulator/ServerContext";
import { staffGridButtonProps } from "./StaffGrid.lib";

export interface HexParseInputProps {
  onPatterns: (patterns: readonly ResolvedPattern[]) => unknown;
  /** Called with the source last used, so the stack panel can run it. */
  onCode?: (code: string) => unknown;
  /** Clear pan/zoom after replacing the staff. */
  onResetPanAndZoom?: () => unknown;
  disabled?: boolean;
}

const PLACEHOLDER = "num_1 num_2 add";

/**
 * Text-to-pattern input, modelled on HexBug / hexparse.
 *
 * Named patterns resolve against the registry fetched from the connected
 * server (`patterns.list`). Without a connection, numbers, masks and raw
 * angle signatures still work — the modal says so.
 */
export default function HexParseInput({
  onPatterns,
  onCode,
  onResetPanAndZoom,
  disabled,
}: HexParseInputProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 30em)");
  const { t, tParseMessage } = useI18n();
  const { patterns } = useServer();

  const [input, setInput] = useState(PLACEHOLDER);
  const [result, setResult] = useState<ParseResult | null>(null);

  const data = patterns.data ?? OFFLINE_PATTERNS_DATA;
  const hasRegistry = (patterns.data?.patterns.length ?? 0) > 0;

  const onParse = () => {
    const parsed = parseHex(input, data);
    setResult(parsed);
    onPatterns(parseToResolvedPatterns(input, data));
    onCode?.(input);
    onResetPanAndZoom?.();
    close();
  };

  const errorCount = result == null ? 0 : Object.keys(result.errors).length;
  const warningCount = result == null ? 0 : Object.keys(result.warnings).length;

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        fullScreen={isMobile}
        title={t("hexParse.title")}
        removeScrollProps={{
          allowPinchZoom: true,
        }}
      >
        <Stack>
          <Textarea
            label={t("hexParse.input")}
            description={t("hexParse.description")}
            placeholder={PLACEHOLDER}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            autosize
            minRows={4}
            maxRows={10}
            data-autofocus
            ff="monospace"
          />

          {!hasRegistry && (
            <Alert color="yellow" icon={<IconCloudOff />} title={t("hexParse.offlineBadge")}>
              <Text size="sm">{t("hexParse.serverRequired")}</Text>
            </Alert>
          )}

          {patterns.error != null && (
            <Alert
              color="red"
              icon={<IconAlertTriangle />}
              title={t("hexParse.loadError")}
            >
              <Text size="sm">{patterns.error.message}</Text>
            </Alert>
          )}

          {result != null && (errorCount > 0 || warningCount > 0) && (
            <Alert
              color={errorCount > 0 ? "red" : "yellow"}
              icon={<IconAlertTriangle />}
              title={t("hexParse.errorWarningCount", {
                errors: errorCount,
                warnings: warningCount,
              })}
            >
              <Stack gap={4}>
                {Object.entries(result.errors).map(([index, message]) => (
                  <Text key={index} size="sm">
                    #{Number(index) + 1}: {tParseMessage(message)}
                  </Text>
                ))}
                {Object.entries(result.warnings).map(([index, message]) => (
                  <Text key={index} size="sm" c="dimmed">
                    #{Number(index) + 1}: {tParseMessage(message)}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          {result != null && (
            <Group gap="xs">
              <Badge variant="light">
                {t("hexParse.patternCount", { n: result.patterns.length })}
              </Badge>
              {errorCount > 0 && (
                <Badge color="red">
                  {t("hexParse.errorCount", { n: errorCount })}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge color="yellow">
                  {t("hexParse.warningCount", { n: warningCount })}
                </Badge>
              )}
            </Group>
          )}

          <Group gap="xs">
            <Button
              leftSection={<IconWand />}
              onClick={onParse}
              disabled={Boolean(disabled)}
            >
              {t("hexParse.parseAndDraw")}
            </Button>
            <Badge variant="default" color={hasRegistry ? "teal" : "gray"}>
              {hasRegistry
                ? t("hexParse.registry", {
                    n: patterns.data?.patterns.length ?? 0,
                  })
                : t("hexParse.offlineBadge")}
            </Badge>
          </Group>
        </Stack>
      </Modal>

      <ActionIcon
        {...staffGridButtonProps}
        onClick={open}
        disabled={disabled}
        aria-label={t("hexParse.title")}
        title={t("hexParse.title")}
      >
        <IconKeyboard />
      </ActionIcon>
    </>
  );
}
