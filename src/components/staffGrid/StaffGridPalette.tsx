import {
  ActionIcon,
  Combobox,
  Group,
  useCombobox,
  useMantineTheme,
} from "@mantine/core";
import { IconPalette } from "@tabler/icons-react";
import { useState } from "react";

import {
  PATTERN_TYPES,
  PATTERN_TYPES_VALUES,
  type NamedResolvedPatternType,
  type ResolvedPatternType,
} from "@hextools/renderer/staffGrid";

import { RGBColor } from "../../../packages/@hextools/renderer/src/colors";
import { useI18n } from "../../i18n/I18nContext";
import type { MessageKey } from "../../i18n/messages";
import DoubleColorSwatch from "../DoubleColorSwatch";
import { staffGridButtonProps } from "./StaffGrid.lib";

export interface StaffGridPaletteProps {
  patternType: NamedResolvedPatternType;
  onPatternTypeChange: (patternType: NamedResolvedPatternType) => unknown;
  disabled?: boolean;
}

export default function StaffGridPalette({
  patternType,
  onPatternTypeChange,
  disabled,
}: StaffGridPaletteProps) {
  const combobox = useCombobox();
  const { t } = useI18n();

  const theme = useMantineTheme();
  const activeColors = theme.variantColorResolver({
    theme,
    color: theme.primaryColor,
    variant: "filled",
  });

  const [customType, setCustomType] = useState<
    ResolvedPatternType & { name: typeof CUSTOM_NAME }
  >({
    ...PATTERN_TYPES.Evaluated,
    name: CUSTOM_NAME,
  });

  // TODO: implement
  const _updateCustomType = (overrides: Partial<ResolvedPatternType>) => {
    const newCustomType = { ...customType, ...overrides };
    setCustomType(newCustomType);
    if (patternType.name === CUSTOM_NAME) {
      onPatternTypeChange(customType);
    }
  };

  return (
    <Combobox
      store={combobox}
      position="left"
      width="max-content"
      onOptionSubmit={(value) => {
        onPatternTypeChange(
          value === CUSTOM_NAME
            ? customType
            : PATTERN_TYPES[value as keyof typeof PATTERN_TYPES],
        );
      }}
    >
      <Combobox.Target>
        <ActionIcon
          {...staffGridButtonProps}
          onClick={() => combobox.toggleDropdown()}
          disabled={disabled}
          aria-label={t("palette.title")}
          title={t("palette.title")}
        >
          <IconPalette color={RGBColor.toCSS(patternType.color)} />
        </ActionIcon>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {PATTERN_TYPES_VALUES.map(({ name, color, fadeColor }) => (
            <Combobox.Option
              key={name}
              value={name}
              active={patternType.name === name}
              c={patternType.name === name ? activeColors.color : undefined}
              bg={
                patternType.name === name ? activeColors.background : undefined
              }
              onClick={() => combobox.closeDropdown()}
            >
              <Group align="center">
                <DoubleColorSwatch
                  leftColor={RGBColor.toCSS(color)}
                  rightColor={RGBColor.toCSS(fadeColor)}
                  size={20}
                />
                {t(PATTERN_TYPE_KEYS[name])}
              </Group>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

const CUSTOM_NAME = "custom";

/** Display name of each built-in pattern type, keyed by `PATTERN_TYPES` name. */
const PATTERN_TYPE_KEYS: Record<string, MessageKey> = {
  Evaluated: "patternTypes.evaluated",
  Escaped: "patternTypes.escaped",
  Undone: "patternTypes.undone",
  Errored: "patternTypes.errored",
  Invalid: "patternTypes.invalid",
  Unresolved: "patternTypes.unresolved",
  [CUSTOM_NAME]: "patternTypes.custom",
};
