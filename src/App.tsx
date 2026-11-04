import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  Stack,
  Text,
  useMatches,
} from "@mantine/core";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { IconBrandGithub } from "@tabler/icons-react";
import { Redirect, Route, Switch } from "wouter";

import { ColorSchemeButton } from "@hextools/react";

import HeaderNavLink from "./components/HeaderNavLink";
import StaffGridPage from "./components/staffGrid/StaffGridPage";
import SwindlerStacks from "./components/swindler/SwindlerStacks";
import { useI18n } from "./i18n/I18nContext";
import LanguageSwitcher from "./i18n/LanguageSwitcher";
import { ServerProvider } from "./simulator/ServerContext";
import { ServerSettingsButton } from "./simulator/ServerSettings";

export const GITHUB_URL = "https://github.com/xm1221/HexSimulator";

function Brand() {
  return (
    <Group gap={8} wrap="nowrap" mr="xs">
      <Text fw={700} fz="lg" lh={1} style={{ whiteSpace: "nowrap" }}>
        HexSimulator
      </Text>
    </Group>
  );
}

export default function App() {
  const mobileBreakpoint = "xs";
  const isMobile = useMatches({ base: true, [mobileBreakpoint]: false });
  const [sidebarOpen, { toggle: toggleSidebar, close: closeSidebar }] =
    useDisclosure();
  const { t } = useI18n();

  const routes = [
    {
      path: "/StaffGrid",
      label: t("nav.staffGrid"),
      component: StaffGridPage,
    },
    { path: "/Swindler", label: t("nav.swindler"), component: SwindlerStacks },
  ];

  const navButtons = routes.map(({ path, label }) => (
    <HeaderNavLink
      key={path}
      path={path}
      label={label}
      onClick={closeSidebar}
    />
  ));

  return (
    <ServerProvider>
      <AppShell
        h="100dvh"
        mode="static"
        padding="md"
        header={{ height: 56 }}
        navbar={{
          width: "100%",
          breakpoint: mobileBreakpoint,
          collapsed: { desktop: true, mobile: !sidebarOpen },
        }}
      >
        <AppShell.Header>
          <Group h="100%" mx="xs" gap="xs" align="center" wrap="nowrap">
            {isMobile ? (
              <Burger
                opened={sidebarOpen}
                onClick={toggleSidebar}
                aria-label={t("nav.toggleNavigation")}
              />
            ) : null}

            {isMobile ? <Brand /> : (
              <>
                <Brand />
                {navButtons}
              </>
            )}

            <Group gap="xs" ml="auto" wrap="nowrap">
              <ServerSettingsButton />

              <ActionIcon
                variant="default"
                size="lg"
                visibleFrom="xs"
                component="a"
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("header.github")}
                title={t("header.github")}
              >
                <IconBrandGithub />
              </ActionIcon>

              <LanguageSwitcher />

              <ColorSchemeButton
                variant="default"
                size="lg"
                aria-label={t("header.toggleColorScheme")}
              />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar>
          <Stack m="xs" gap="xs">
            {navButtons}
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main pos="relative">
          <Switch>
            {routes.map(({ path, component }) => (
              <Route key={path} path={path} component={component} />
            ))}

            <Route>
              <Redirect to={routes[0].path} />
            </Route>
          </Switch>
        </AppShell.Main>
      </AppShell>
    </ServerProvider>
  );
}
