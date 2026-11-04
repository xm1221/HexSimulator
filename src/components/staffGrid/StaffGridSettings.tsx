import {
  Accordion,
  ActionIcon,
  Button,
  InputWrapper,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconChevronRight, IconSettings } from "@tabler/icons-react";

import { ControlledNumberInput } from "@hextools/react";
import { useRequestDeviceMotionPermission } from "@hextools/react";
import { mod } from "@hextools/renderer";
import { MAX_GRID_ZOOM, MIN_GRID_ZOOM } from "@hextools/renderer/staffGrid";

import { useI18n } from "../../i18n/I18nContext";
import { useServer } from "../../simulator/ServerContext";
import type { KeysOfValue } from "../../utils/types";
import {
  staffGridButtonProps,
  type HexToolsGridSettings,
} from "./StaffGrid.lib";
import styles from "./StaffGridSettings.module.css";

export interface StaffGridSettingsProps {
  settings: HexToolsGridSettings;
  onSettingsChange: (value: HexToolsGridSettings) => unknown;
  onResetSettings: () => unknown;
}

export default function StaffGridSettings({
  settings,
  onSettingsChange,
  onResetSettings,
}: StaffGridSettingsProps) {
  const {
    guiScale,
    gridZoom,
    enableZappyPoints,
    zappyVariance,
    ctrlTogglesOffStrokeOrder,
    dotsMode,
    mouseDotsRadius,
    clickingTogglesDrawing,
    zappyOnShake,
    shakeAction,
    enableEditingPatterns,
    autoPatternType,
    showDrawTime,
    dynamicResolutionURL,
  } = settings;

  const [opened, { open, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 30em)");
  const { t } = useI18n();
  const { status, origin } = useServer();

  const {
    canRequestPermission: canRequestMotionPermission,
    requestPermission: requestMotionPermission,
  } = useRequestDeviceMotionPermission();

  const requestMotionPermissionError = !canRequestMotionPermission
    ? t("settings.motionPermissionDenied")
    : null;

  function getSetter<T extends keyof HexToolsGridSettings>(
    key: T,
  ): (value: HexToolsGridSettings[T]) => unknown {
    return (value) => {
      onSettingsChange({ ...settings, [key]: value });
    };
  }

  function getSwitchSetter<
    T extends KeysOfValue<HexToolsGridSettings, boolean>,
  >(key: T): (event: React.ChangeEvent<HTMLInputElement>) => unknown {
    const setter = getSetter(key);
    return (event) => {
      setter(event.currentTarget.checked);
    };
  }

  const setGuiScale = getSetter("guiScale");
  const setZappyOnShake = getSetter("zappyOnShake");
  const setShakeAction = getSetter("shakeAction");

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        fullScreen={isMobile}
        title={t("settings.title")}
        removeScrollProps={{
          allowPinchZoom: true, // Allow pinch to zoom on mobile devices
        }}
      >
        <Stack>
          <Button
            variant="default"
            onClick={(event) =>
              setGuiScale(mod(guiScale - 1 + (event.shiftKey ? -1 : 1), 5) + 1)
            }
          >
            {t("settings.guiScale", { n: guiScale })}
          </Button>

          <ControlledNumberInput
            label={t("settings.gridZoom")}
            value={gridZoom}
            onChange={getSetter("gridZoom")}
            allowNegative={false}
            min={MIN_GRID_ZOOM}
            max={MAX_GRID_ZOOM}
            step={0.25}
          />

          <Switch
            label={t("settings.enableWobblyPatterns")}
            checked={enableZappyPoints}
            onChange={getSwitchSetter("enableZappyPoints")}
          />

          {enableZappyPoints && (
            <Switch
              label={t("settings.wobbleOnShake")}
              checked={zappyOnShake}
              disabled={!canRequestMotionPermission}
              error={requestMotionPermissionError}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onChange={async (value) => {
                setZappyOnShake(
                  value.currentTarget.checked
                    && (await requestMotionPermission()),
                );
              }}
            />
          )}

          <Switch
            label={t("settings.ctrlTogglesOffStrokeOrder")}
            checked={ctrlTogglesOffStrokeOrder}
            onChange={getSwitchSetter("ctrlTogglesOffStrokeOrder")}
          />

          <Switch
            label={t("settings.clickingTogglesDrawing")}
            checked={clickingTogglesDrawing}
            onChange={getSwitchSetter("clickingTogglesDrawing")}
          />

          <Switch
            label={t("settings.clickToEditPatterns")}
            checked={enableEditingPatterns}
            onChange={getSwitchSetter("enableEditingPatterns")}
            disabled={dynamicResolutionURL != null}
          />

          <Switch
            label={t("settings.autoPatternColor")}
            checked={autoPatternType}
            onChange={getSwitchSetter("autoPatternType")}
            disabled={dynamicResolutionURL != null}
          />

          <Switch
            label={t("settings.showDrawTime")}
            checked={showDrawTime}
            onChange={getSwitchSetter("showDrawTime")}
          />

          <InputWrapper
            label={t("settings.actionOnShake")}
            error={requestMotionPermissionError}
            labelElement="div"
          >
            <SegmentedControl
              value={shakeAction}
              disabled={!canRequestMotionPermission}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onChange={async (value) => {
                setShakeAction(
                  value !== "none" && (await requestMotionPermission())
                    ? value
                    : "none",
                );
              }}
              data={[
                { label: t("settings.none"), value: "none" },
                { label: t("settings.undo"), value: "undo" },
                { label: t("settings.clearGrid"), value: "clear" },
              ]}
              fullWidth
            />
          </InputWrapper>

          <InputWrapper label={t("settings.gridDotsMode")} labelElement="div">
            <SegmentedControl
              value={dotsMode}
              onChange={getSetter("dotsMode")}
              data={[
                { label: "None", value: "none" },
                { label: t("settings.aroundMouse"), value: "mouse" },
                { label: t("settings.fullGrid"), value: "all" },
              ]}
              fullWidth
            />
          </InputWrapper>

          <Accordion
            variant="unstyled"
            classNames={{ chevron: styles.chevron }}
            chevron={<IconChevronRight />}
            chevronPosition="left"
          >
            <Accordion.Item value="value">
              <Accordion.Control>{t("settings.advanced")}</Accordion.Control>
              <Accordion.Panel>
                {enableZappyPoints && (
                  <ControlledNumberInput
                    label={t("settings.wobbliness")}
                    value={zappyVariance}
                    onChange={getSetter("zappyVariance")}
                    allowNegative={false}
                    step={0.1}
                  />
                )}

                {dotsMode === "mouse" && (
                  <ControlledNumberInput
                    label={t("settings.mouseDotsRadius")}
                    value={mouseDotsRadius}
                    onChange={getSetter("mouseDotsRadius")}
                    allowNegative={false}
                    allowDecimal={false}
                    min={1}
                  />
                )}

                <TextInput
                  label={t("settings.dynamicResolutionURL")}
                  description={t("settings.dynamicResolutionDescription")}
                  placeholder="http://127.0.0.1:8000"
                  value={dynamicResolutionURL ?? ""}
                  onChange={(event) =>
                    onSettingsChange({
                      ...settings,
                      dynamicResolutionURL: event.currentTarget.value || null,
                      autoPatternType: false,
                      enableEditingPatterns: false,
                    })
                  }
                />

                {status === "connected" && origin != null && (
                  <Text size="xs" c="dimmed" mt={4}>
                    {t("settings.dynamicResolutionHexCliHint", { origin })}
                  </Text>
                )}

                <Button
                  mt="md"
                  variant="light"
                  color="red"
                  onClick={onResetSettings}
                >
                  {t("settings.resetAll")}
                </Button>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Modal>

      <ActionIcon
        {...staffGridButtonProps}
        onClick={open}
        aria-label={t("settings.title")}
        title={t("settings.title")}
      >
        <IconSettings />
      </ActionIcon>
    </>
  );
}
