import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import type { Preview } from "@storybook/react-vite";

import { I18nProvider } from "../src/i18n/I18nProvider";

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <MantineProvider forceColorScheme={context.globals.theme || "light"}>
        <I18nProvider>
          <Story />
        </I18nProvider>
      </MantineProvider>
    ),
  ],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Mantine color scheme",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
