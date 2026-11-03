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
import { IconAlertTriangle, IconKeyboard, IconWand } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { type ResolvedPattern } from "@hextools/renderer/staffGrid";

import {
  loadPatternsData,
  parseHex,
  parseToResolvedPatterns,
  type PatternsData,
  type ParseResult,
} from "../../hexparse";
import { useI18n } from "../../i18n/I18nContext";
import { staffGridButtonProps } from "./StaffGrid.lib";

export interface HexParseInputProps {
  onPatterns: (patterns: readonly ResolvedPattern[]) => unknown;
  /** Clear pan/zoom after replacing the staff. */
  onResetPanAndZoom?: () => unknown;
  disabled?: boolean;
}

const PLACEHOLDER = "num_1 num_2 add";

/**
 * Text-to-pattern input, modelled on HexBug / hexparse.
 *
 * Accepts `num_<n>`, `mask_<mask>`, `<dir>_<sig>`, `_<sig>`, special tokens
 * (`{` `}` `(` `)` `\\` `escape` `intro` `retro`), and named patterns such as
 * `add` or `hexcasting:add`.
 */
export default function HexParseInput({
  onPatterns,
  onResetPanAndZoom,
  disabled,
}: HexParseInputProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 30em)");
  const { t, tParseMessage } = useI18n();

  const [input, setInput] = useState(PLACEHOLDER);
  const [data, setData] = useState<PatternsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    if (!opened || data != null) {
      return;
    }
    let cancelled = false;
    loadPatternsData()
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [opened, data]);

  const onParse = () => {
    if (data == null) {
      return;
    }
    const parsed = parseHex(input, data);
    setResult(parsed);
    onPatterns(parseToResolvedPatterns(input, data));
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
          />

          {loadError != null && (
            <Alert
              color="red"
              icon={<IconAlertTriangle />}
              title={t("hexParse.loadError")}
            >
              {tParseMessage(loadError)}
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

          <Button
            leftSection={<IconWand />}
            onClick={onParse}
            loading={data == null && loadError == null}
            disabled={Boolean(disabled) || data == null}
          >
            {t("hexParse.parseAndDraw")}
          </Button>
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
