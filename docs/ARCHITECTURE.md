# HexSimulator architecture

English first. Chinese: [ARCHITECTURE.zh-CN.md](./ARCHITECTURE.zh-CN.md).

## Overview

```
Browser (HexSimulator)                    HexCLI-compatible server
┌─────────────────────────────┐           ┌──────────────────────┐
│ HexTools shell (Mantine)    │  health   │ GET /v1/health       │
│  StaffGrid + hexParse       │◄─────────►│ POST /v1/rpc         │
│  Stack (top-left)           │  run/stack│  patterns.list once  │
│  Ravenmind (top-right)      │  step.*   │  run / stack / reset │
│  ServerProvider + cache     │           │  (live MC registry)  │
└─────────────────────────────┘           └──────────────────────┘
```

- **UI base:** vendored from [HexTools](https://github.com/object-Object/HexTools) / xm1221 fork (staff grid, renderer packages, i18n). This repo does not patch HexTools upstream.
- **RPC:** `src/server/*` — commands and results only.
- **Patterns:** `patterns.list` on connect → `src/hexparse/registry.ts` localStorage cache → in-memory `PatternsData` for hexParse. Sync once per connection; manual resync only.
- **Overlays:** `StackPanel` (top-left, with the hexParse entry beneath it) / `RavenmindPanel` (top-right) on `StaffGridPage`. On narrow screens (`max-width: 30em`) both cards shrink but keep their corners: stack on the left, ravenmind on the right.
- **Canvas:** the staff grid fills the AppShell main area and defaults to `dotsMode: "all"` (settings key `staff-grid-settings-hexsim`).

## Key paths

| Path | Role |
|------|------|
| `src/simulator/ServerContext.tsx` | Connection, one-shot registry sync, run/stack/step |
| `src/hexparse/*` | hexParse + registry cache (no bundled action list) |
| `packages/@hextools/*` | Staff grid renderer (from HexTools) |
| `scripts/mock-server.mjs` | Local protocol stand-in |
| `docs/PROTOCOL.md` | Wire format |

## Non-goals

- No Minecraft code in this repo.
- No per-stroke / per-pattern registry RPCs.
- No custom domain required for CF Pages (`*.pages.dev` is enough).
