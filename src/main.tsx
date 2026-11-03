import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import App from "./App.tsx";
import { I18nProvider } from "./i18n/I18nProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="dark">
      <I18nProvider>
        <Router hook={useHashLocation}>
          <App />
        </Router>
      </I18nProvider>
    </MantineProvider>
  </StrictMode>,
);
