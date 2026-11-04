import { Alert, Stack } from "@mantine/core";
import { useHotkeys, useStateHistory } from "@mantine/hooks";
import _ from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

import { StaffGrid, type StaffGridRef, useDeviceMotion } from "@hextools/react";
import { useIsTouchscreen } from "@hextools/react";
import { useLocalStorageObject } from "@hextools/react";
import {
  DEFAULT_PATTERN_TYPE,
  GuiSpellcasting,
  HexCoord,
  PATTERN_TYPES,
  type ResolvedPattern,
} from "@hextools/renderer/staffGrid";

import { patternsToCode } from "../../hexparse";
import { useI18n } from "../../i18n/I18nContext";
import { useServer } from "../../simulator/ServerContext";
import HexParseInput from "./HexParseInput";
import RavenmindPanel from "./RavenmindPanel";
import StackPanel from "./StackPanel";
import type { HexToolsGridSettings } from "./StaffGrid.lib";
import StaffGridControls from "./StaffGridControls";
import StaffGridTimer from "./StaffGridTimer";

type SourceMode = "code" | "drawn";

export default function StaffGridPage() {
  const isTouchscreen = useIsTouchscreen();
  const { t } = useI18n();
  const { status, run, error } = useServer();

  const [patterns, patternsHandlers, patternsHistory] = useStateHistory<
    readonly ResolvedPattern[]
  >([]);

  // HACK
  const latestPatternsRef = useRef(patterns);
  // eslint-disable-next-line react-hooks/refs
  latestPatternsRef.current = patterns;

  const [patternType, setPatternType] = useState(DEFAULT_PATTERN_TYPE);

  const [drawTimeMs, setDrawTimeMs] = useState<number | null>(null);
  const [prevDrawTimeMs, setPrevDrawTimeMs] = useState<number | null>(null);

  const staffGridRef = useRef<StaffGridRef>(null);

  const [hexCode, setHexCode] = useState("num_1 num_2 add");
  const [sourceMode, setSourceMode] = useState<SourceMode>("code");
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(
    null,
  );

  const notify = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setToast({ text, kind });
  }, []);

  useEffect(() => {
    if (toast == null) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const defaultSettings: HexToolsGridSettings = {
    ...GuiSpellcasting.getDefaultSettings({
      isTouchscreen,
    }),
    dynamicResolutionURL: null,
  };

  const [settings, setSettings] = useLocalStorageObject<HexToolsGridSettings>({
    key: "staff-grid-settings",
    defaultValue: defaultSettings,
  });

  const hasDynamicResolutionURL = settings.dynamicResolutionURL != null;
  const [prevHasDynamicResolutionURL, setPrevHasDynamicResolutionURL] =
    useState(hasDynamicResolutionURL);
  if (hasDynamicResolutionURL !== prevHasDynamicResolutionURL) {
    setPrevHasDynamicResolutionURL(hasDynamicResolutionURL);
    setPatternType(
      hasDynamicResolutionURL ? PATTERN_TYPES.Unresolved : DEFAULT_PATTERN_TYPE,
    );
  }

  useHotkeys([
    ["Escape", () => staffGridRef.current?.cancelPattern()],
    ["mod+Z", () => patternsHandlers.back()],
    ["mod+Y", () => patternsHandlers.forward()],
    ["mod+shift+Z", () => patternsHandlers.forward()],
  ]);

  useDeviceMotion({
    shakeDuration: 1500,
    shakeThreshold: 15,
    onMeanAcceleration: (meanAcceleration) => {
      staffGridRef.current?.setZappyMultiplier(
        settings.zappyOnShake ? _.clamp(meanAcceleration / 5, 1, 3) : 1,
      );
    },
    onShake: () => {
      switch (settings.shakeAction) {
        case "none":
          break;
        case "undo":
          patternsHandlers.back();
          break;
        case "clear":
          patternsHandlers.set([]);
          break;
      }
    },
  });

  const onPanToPattern = (pattern: ResolvedPattern) => {
    staffGridRef.current?.panToPattern(pattern);
  };

  const onResetPanAndZoom = () => {
    staffGridRef.current?.resetPanAndZoom();
  };

  const onPatternDrawn = async (
    pattern: ResolvedPattern,
    newDrawTimeMs: number,
  ) => {
    setDrawTimeMs(newDrawTimeMs);
    setPrevDrawTimeMs(drawTimeMs);
    if (settings.dynamicResolutionURL != null) {
      const url = new URL("/resolve", settings.dynamicResolutionURL);
      url.searchParams.append("signature", pattern.pattern.signature);
      const response = await fetch(url, {
        method: "POST",
      });

      const rawType = (await response.json()) as string;
      const type =
        rawType in resolveResponseToType
          ? resolveResponseToType[rawType as keyof typeof resolveResponseToType]
          : PATTERN_TYPES.Unresolved;

      patternsHandlers.set(
        latestPatternsRef.current.map((other) =>
          HexCoord.equals(pattern.origin, other.origin)
          && pattern.pattern.signature === other.pattern.signature
            ? { ...other, type }
            : other,
        ),
      );
      return;
    }
    // A hand-drawn staff is what the user means to cast.
    setSourceMode("drawn");
  };

  const staffCode = patternsToCode(patterns);
  const effectiveCode =
    sourceMode === "drawn"
      ? staffCode
      : hexCode.trim() !== ""
        ? hexCode
        : staffCode;

  const onRun = () => {
    const code = effectiveCode.trim();
    if (code === "") {
      notify(t("stack.unknown"), "error");
      return;
    }
    void run(code);
  };

  const connected = status === "connected";

  return (
    <>
      <StaffGrid
        patterns={patterns}
        onPatternsChange={patternsHandlers.set}
        patternType={patternType}
        onPatternTypeChange={setPatternType}
        onPatternDrawn={onPatternDrawn}
        settings={settings}
        ref={staffGridRef}
      />

      {settings.showDrawTime && (
        <StaffGridTimer
          drawTimeMs={drawTimeMs}
          prevDrawTimeMs={prevDrawTimeMs}
        />
      )}

      {/* Top-left: ravenmind + hexParse entry. */}
      <Stack
        gap="xs"
        pos="absolute"
        top={16}
        left={16}
        style={{ pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <RavenmindPanel />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <HexParseInput
            onPatterns={patternsHandlers.set}
            onCode={(code) => {
              setHexCode(code);
              setSourceMode("code");
            }}
            onResetPanAndZoom={onResetPanAndZoom}
          />
        </div>
      </Stack>

      {/* Top-right: live stack / run controls. */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          pointerEvents: "auto",
        }}
      >
        <StackPanel
          code={effectiveCode}
          sourceIsDrawn={sourceMode === "drawn"}
          onToggleSource={() =>
            setSourceMode((mode) => (mode === "drawn" ? "code" : "drawn"))
          }
          onRun={onRun}
          notify={notify}
        />
      </div>

      {!connected && error != null && (
        <Alert
          color="red"
          pos="absolute"
          bottom={16}
          left="50%"
          style={{ transform: "translateX(-50%)", maxWidth: 520, zIndex: 5 }}
        >
          {t("server.notConnected")}
        </Alert>
      )}

      {toast != null && (
        <Alert
          color={toast.kind === "ok" ? "teal" : "red"}
          pos="absolute"
          bottom={16}
          left="50%"
          style={{
            transform: "translateX(-50%)",
            maxWidth: 420,
            zIndex: 10,
          }}
          py={6}
          px="md"
        >
          {toast.text}
        </Alert>
      )}

      <StaffGridControls
        patterns={patterns}
        patternsHandlers={patternsHandlers}
        patternsHistory={patternsHistory}
        patternType={patternType}
        onPatternTypeChange={setPatternType}
        settings={settings}
        onSettingsChange={setSettings}
        onResetSettings={() => setSettings(defaultSettings)}
        onPanToPattern={onPanToPattern}
        onResetPanAndZoom={onResetPanAndZoom}
      />
    </>
  );
}

const resolveResponseToType = {
  unresolved: PATTERN_TYPES.Unresolved,
  evaluated: PATTERN_TYPES.Evaluated,
  escaped: PATTERN_TYPES.Escaped,
  undone: PATTERN_TYPES.Undone,
  errored: PATTERN_TYPES.Errored,
  invalid: PATTERN_TYPES.Invalid,
};
