import { RestrictToElement } from "@dnd-kit/dom/modifiers";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Popover,
  Stack,
  Text,
  type DrawerProps,
} from "@mantine/core";
import { IconShare2 } from "@tabler/icons-react";
import { useState } from "react";

import { HexCoord, type ResolvedPattern } from "@hextools/renderer/staffGrid";

import { StaffGridSidebarPattern } from "./StaffGridSidebarPattern";

export interface StaffGridSidebarLabels {
  patterns: string;
  copyAngleSignatures: string;
  copyHexBugCommand: string;
  share: string;
}

const DEFAULT_STAFF_GRID_SIDEBAR_LABELS: StaffGridSidebarLabels = {
  patterns: "Patterns",
  copyAngleSignatures: "Copy angle signatures",
  copyHexBugCommand: "Copy HexBug command",
  share: "Share",
};

export interface StaffGridSidebarProps extends Pick<
  DrawerProps,
  "opened" | "onClose"
> {
  patterns: readonly ResolvedPattern[];
  onPatternsChange: (patterns: readonly ResolvedPattern[]) => unknown;
  onPanToPattern: (pattern: ResolvedPattern) => unknown;
  /** Optional UI strings; defaults to English. */
  labels?: Partial<StaffGridSidebarLabels>;
}

export function StaffGridSidebar({
  patterns,
  onPatternsChange,
  onPanToPattern,
  opened,
  onClose,
  labels: labelOverrides,
}: StaffGridSidebarProps) {
  const labels = { ...DEFAULT_STAFF_GRID_SIDEBAR_LABELS, ...labelOverrides };
  const [popoverOpen, setPopoverOpen] = useState(false);

  const copyAndClosePopover = (text: string) => {
    void navigator.clipboard.writeText(text);
    setPopoverOpen(false);
  };

  const popover = (
    <Popover opened={popoverOpen} onChange={setPopoverOpen}>
      <Popover.Target>
        <ActionIcon
          variant="transparent"
          size="sm"
          onClick={() => setPopoverOpen((open) => !open)}
          aria-label={labels.share}
          title={labels.share}
        >
          <IconShare2 />
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Button
            variant="default"
            onClick={() =>
              copyAndClosePopover(
                patterns.map(({ pattern }) => pattern.toString()).join("\n"),
              )
            }
          >
            {labels.copyAngleSignatures}
          </Button>

          <Button
            variant="default"
            onClick={() =>
              copyAndClosePopover(
                `/patterns hex hex:${patterns.map(({ pattern }) => pattern.toShorthand()).join(",")}`,
              )
            }
          >
            {labels.copyHexBugCommand}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );

  return (
    <Drawer
      title={
        <Group gap="md">
          <Text fw="bold">{labels.patterns}</Text>
          {patterns.length > 0 && popover}
        </Group>
      }
      position="right"
      opened={opened}
      onClose={onClose}
    >
      <DragDropProvider
        onDragEnd={(event) => {
          onPatternsChange(
            // hacky hacky hack
            move(
              patterns.map((pattern) => ({
                ...pattern,
                id: HexCoord.toString(pattern.origin),
              })),
              event,
            ).map(({ id: _, ...pattern }) => pattern),
          );
        }}
        modifiers={[
          RestrictToElement.configure({
            element(operation) {
              return operation.source?.element?.parentElement ?? null;
            },
          }),
        ]}
      >
        <Stack gap="xs">
          {patterns.map((pattern, index) => (
            <StaffGridSidebarPattern
              key={HexCoord.toString(pattern.origin)}
              id={HexCoord.toString(pattern.origin)}
              index={index}
              pattern={pattern.pattern}
              name={pattern.name ?? null}
              onPan={() => {
                onPanToPattern(pattern);
                onClose();
              }}
              onDelete={() => {
                onPatternsChange(
                  patterns.filter((_resolved, i) => i !== index),
                );
              }}
            />
          ))}
        </Stack>
      </DragDropProvider>
    </Drawer>
  );
}
