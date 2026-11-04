/**
 * Header connection control + settings modal.
 *
 * The pill in the header always shows the connection state; the modal owns
 * the editable URL/token, the health details, and the pattern-registry
 * refresh button.
 */

import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCloudDownload,
  IconInfoCircle,
  IconPlugConnected,
  IconPlugOff,
  IconRefresh,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { normalizeEndpoints } from "../server/client.ts";
import { useI18n } from "../i18n/I18nContext";
import type { MessageKey } from "../i18n/messages";
import {
  DEFAULT_BASE_URL,
  useServer,
  type ConnectionStatus,
} from "./ServerContext";

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  connected: "teal",
  connecting: "yellow",
  disconnected: "gray",
  error: "red",
};

function statusKey(status: ConnectionStatus): MessageKey {
  switch (status) {
    case "connected":
      return "server.connected";
    case "connecting":
      return "server.connecting";
    case "error":
      return "server.offline";
    default:
      return "server.disconnected";
  }
}

const ERROR_KEYS: Record<string, MessageKey> = {
  "invalid-url": "server.error.invalid-url",
  "mixed-content": "server.error.mixed-content",
  "private-network": "server.error.private-network",
  network: "server.error.network",
  cors: "server.error.network",
  timeout: "server.error.timeout",
  "http-status": "server.error.http-status",
  "bad-json": "server.error.bad-json",
  aborted: "server.error.aborted",
};

export function serverErrorMessage(
  error: { kind: string; message: string } | null,
  t: (key: MessageKey) => string,
): string | null {
  if (error == null) {
    return null;
  }
  const key = ERROR_KEYS[error.kind];
  return key == null ? t("server.error.unknown") : t(key);
}

export function ConnectionPill() {
  const { status } = useServer();
  const { t } = useI18n();
  return (
    <Badge
      color={STATUS_COLOR[status]}
      variant="light"
      size="sm"
      radius="sm"
      visibleFrom="xs"
    >
      {t(statusKey(status))}
    </Badge>
  );
}

export function ServerSettingsButton() {
  const [opened, { open, close }] = useDisclosure(false);
  const { status } = useServer();
  const { t } = useI18n();
  const Icon = status === "connected" ? IconPlugConnected : IconPlugOff;

  return (
    <>
      <Tooltip label={t("server.open")} withArrow>
        <ActionIcon
          variant="default"
          size="lg"
          onClick={open}
          aria-label={t("server.open")}
          color={status === "error" ? "red" : undefined}
        >
          <Icon />
        </ActionIcon>
      </Tooltip>
      <ServerSettingsModal opened={opened} onClose={close} />
    </>
  );
}

export function ServerSettingsModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isMobile = useMediaQuery("(max-width: 30em)");
  const {
    baseUrl,
    token,
    status,
    health,
    error,
    patterns,
    privateNetworkSuspected,
    connect,
    disconnect,
    refreshPatterns,
  } = useServer();

  const [urlDraft, setUrlDraft] = useState(baseUrl || DEFAULT_BASE_URL);
  const [tokenDraft, setTokenDraft] = useState(token);

  // Re-sync drafts when the modal opens with a changed stored config.
  useEffect(() => {
    if (opened) {
      setUrlDraft(baseUrl || DEFAULT_BASE_URL);
      setTokenDraft(token);
    }
  }, [opened, baseUrl, token]);

  const connecting = status === "connecting";
  const connected = status === "connected";
  const errorText = serverErrorMessage(error, t);

  const endpointPreview = (() => {
    try {
      return normalizeEndpoints(urlDraft);
    } catch {
      return null;
    }
  })();

  const patternSummary = (() => {
    if (patterns.loading) {
      return t("server.patternsLoading");
    }
    if (patterns.data != null && patterns.data.patterns.length > 0) {
      const when =
        patterns.fetchedAt == null
          ? t("server.never")
          : new Date(patterns.fetchedAt).toLocaleString();
      return `${t("server.patternsReady", {
        n: patterns.data.patterns.length,
        source: patterns.data.source ?? "server",
      })} · ${t("server.patternsCached", { when })}`;
    }
    return t("server.never");
  })();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("server.title")}
      fullScreen={isMobile}
      size="lg"
    >
      <Stack gap="md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void connect({ baseUrl: urlDraft, token: tokenDraft });
          }}
        >
          <Stack gap="sm">
            <TextInput
              label={t("server.url")}
              description={t("server.urlDescription")}
              placeholder={DEFAULT_BASE_URL}
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.currentTarget.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              ff="monospace"
            />

            <PasswordInput
              label={t("server.token")}
              description={t("server.tokenDescription")}
              value={tokenDraft}
              onChange={(event) => setTokenDraft(event.currentTarget.value)}
              autoComplete="off"
              ff="monospace"
            />

            {endpointPreview != null && (
              <Text size="xs" c="dimmed">
                <Code>{endpointPreview.healthUrl}</Code>
                {" · "}
                <Code>{endpointPreview.rpcUrl}</Code>
              </Text>
            )}

            <Group gap="xs">
              {connected ? (
                <Button
                  variant="default"
                  leftSection={<IconPlugOff size={16} />}
                  onClick={() => disconnect()}
                >
                  {t("server.disconnect")}
                </Button>
              ) : (
                <Button
                  type="submit"
                  leftSection={<IconPlugConnected size={16} />}
                  loading={connecting}
                >
                  {t("server.connect")}
                </Button>
              )}
              <Badge color={STATUS_COLOR[status]} variant="light">
                {t(statusKey(status))}
              </Badge>
            </Group>
          </Stack>
        </form>

        {errorText != null && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title={t("server.offline")}
          >
            <Stack gap={4}>
              <Text size="sm">{errorText}</Text>
              <Text size="xs" c="dimmed" style={{ wordBreak: "break-word" }}>
                {error?.message}
              </Text>
            </Stack>
          </Alert>
        )}

        {privateNetworkSuspected && (
          <Alert color="yellow" icon={<IconInfoCircle size={18} />}>
            <Text size="sm">{t("server.privateNetworkHint")}</Text>
          </Alert>
        )}

        <Divider label={t("server.health")} labelPosition="left" />

        <Stack gap={6}>
          <Group gap="xs" wrap="wrap">
            <Badge variant="default" size="sm">
              {t("server.server")}: {health?.server ?? "—"}
            </Badge>
            <Badge variant="default" size="sm">
              {t("server.version")}: {health?.version ?? "—"}
            </Badge>
            <Badge variant="default" size="sm">
              {t("server.protocol")}: {health?.protocol ?? "—"}
            </Badge>
          </Group>
          <Group gap="xs">
            <IconCloudDownload size={16} />
            <Text size="sm">{patternSummary}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {t("server.refreshPatternsHint")}
          </Text>
          <Group gap="xs">
            <Button
              variant="light"
              size="xs"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void refreshPatterns()}
              disabled={!connected}
              loading={patterns.loading}
            >
              {t("server.refreshPatterns")}
            </Button>
            {patterns.error != null && (
              <Text size="xs" c="red">
                {serverErrorMessage(patterns.error, t)}
              </Text>
            )}
          </Group>
        </Stack>

        <Text size="xs" c="dimmed">
          <Anchor
            href="https://github.com/xm1221/HexSimulator/blob/main/docs/PROTOCOL.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs/PROTOCOL.md
          </Anchor>
        </Text>
      </Stack>
    </Modal>
  );
}
