import { Menu, UnstyledButton } from "@mantine/core";
import { IconCheck, IconLanguage } from "@tabler/icons-react";

import { useI18n } from "./I18nContext";
import type { Language } from "./messages";

const LANGUAGE_LABELS: Record<Language, string> = {
  zh: "中文",
  en: "English",
};

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <Menu position="bottom-end" width="max-content">
      <Menu.Target>
        <UnstyledButton
          aria-label={t("language.label")}
          title={t("language.label")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            height: 36,
            paddingInline: 10,
            borderRadius: "var(--mantine-radius-default)",
            border: "1px solid var(--mantine-color-default-border)",
            fontSize: "var(--mantine-font-size-sm)",
            lineHeight: 1,
          }}
        >
          <IconLanguage size={18} />
          {LANGUAGE_LABELS[lang]}
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {(Object.keys(LANGUAGE_LABELS) as Language[]).map((value) => (
          <Menu.Item
            key={value}
            onClick={() => setLang(value)}
            leftSection={
              // Keep the icon slot aligned for both items.
              value === lang ? <IconCheck size={16} /> : <span />
            }
          >
            {LANGUAGE_LABELS[value]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
