import { ActionIcon, Stack } from "@mantine/core";
import {
  useDisclosure,
  type UseStateHistoryHandlers,
  type UseStateHistoryValue,
} from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconFocusCentered,
  IconMenu2,
  IconTrash,
} from "@tabler/icons-react";

import { StaffGridSidebar, type StaffGridSidebarProps } from "@hextools/react";
import { type ResolvedPattern } from "@hextools/renderer/staffGrid";

import { useI18n } from "../../i18n/I18nContext";
import { staffGridButtonProps } from "./StaffGrid.lib";
import type { StaffGridPaletteProps } from "./StaffGridPalette";
import StaffGridPalette from "./StaffGridPalette";
import StaffGridSettings, {
  type StaffGridSettingsProps,
} from "./StaffGridSettings";

export interface StaffGridControlsProps
  extends
    StaffGridPaletteProps,
    StaffGridSettingsProps,
    Pick<StaffGridSidebarProps, "onPanToPattern"> {
  patterns: readonly ResolvedPattern[];
  patternsHandlers: UseStateHistoryHandlers<readonly ResolvedPattern[]>;
  patternsHistory: UseStateHistoryValue<readonly ResolvedPattern[]>;
  onResetPanAndZoom: () => unknown;
}

export default function StaffGridControls({
  patterns,
  patternsHandlers,
  patternsHistory,
  patternType,
  onPatternTypeChange,
  settings,
  onSettingsChange,
  onResetSettings,
  onPanToPattern,
  onResetPanAndZoom,
}: StaffGridControlsProps) {
  const [sidebarOpen, { toggle: toggleSidebar, close: closeSidebar }] =
    useDisclosure(false);
  const { t } = useI18n();

  const hasDynamicResolutionURL = settings.dynamicResolutionURL != null;

  return (
    <>
      {/* Bottom-right: canvas tools. The top-right corner belongs to the
          stack panel, so this column is anchored to the bottom. */}
      <Stack gap="xs" pos="absolute" bottom={16} right={16}>
        <StaffGridSettings
          settings={settings}
          onSettingsChange={onSettingsChange}
          onResetSettings={onResetSettings}
        />

        <ActionIcon
          {...staffGridButtonProps}
          onClick={toggleSidebar}
          aria-label={t("controls.patternList")}
          title={t("controls.patternList")}
        >
          <IconMenu2 />
        </ActionIcon>

        <StaffGridPalette
          patternType={patternType}
          onPatternTypeChange={onPatternTypeChange}
          disabled={hasDynamicResolutionURL}
        />

        <ActionIcon
          {...staffGridButtonProps}
          onClick={() => patternsHandlers.back()}
          disabled={patternsHistory.current === 0 || hasDynamicResolutionURL}
          aria-label={t("controls.undo")}
          title={t("controls.undo")}
        >
          <IconArrowBackUp />
        </ActionIcon>

        <ActionIcon
          {...staffGridButtonProps}
          onClick={() => patternsHandlers.forward()}
          disabled={
            patternsHistory.current === patternsHistory.history.length - 1
            || hasDynamicResolutionURL
          }
          aria-label={t("controls.redo")}
          title={t("controls.redo")}
        >
          <IconArrowForwardUp />
        </ActionIcon>

        <ActionIcon
          {...staffGridButtonProps}
          onClick={() => patternsHandlers.set([])}
          disabled={patterns.length === 0}
          aria-label={t("controls.clearGrid")}
          title={t("controls.clearGrid")}
        >
          <IconTrash />
        </ActionIcon>

        <ActionIcon
          {...staffGridButtonProps}
          onClick={onResetPanAndZoom}
          aria-label={t("controls.resetView")}
          title={t("controls.resetView")}
        >
          <IconFocusCentered />
        </ActionIcon>
      </Stack>

      <StaffGridSidebar
        patterns={patterns}
        onPatternsChange={patternsHandlers.set}
        onPanToPattern={onPanToPattern}
        opened={sidebarOpen}
        onClose={closeSidebar}
        labels={{
          patterns: t("sidebar.patterns"),
          copyAngleSignatures: t("sidebar.copyAngleSignatures"),
          copyHexBugCommand: t("sidebar.copyHexBugCommand"),
          share: t("sidebar.share"),
        }}
      />
    </>
  );
}
