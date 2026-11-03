# HexSimulator

**A graphical, vendor-neutral web frontend for HexCLI-compatible Hex Casting servers.**

[中文说明](./README.zh-CN.md) · [Protocol](./docs/PROTOCOL.md) · [Architecture](./docs/ARCHITECTURE.md) · [Third-party notices](./THIRD_PARTY.md)

HexSimulator is a static single-page app. You draw patterns on a staff grid or type
[hexParse](https://github.com/FallingColors/HexBug) source, point the app at any server that
implements the small HTTP JSON protocol in [`docs/PROTOCOL.md`](./docs/PROTOCOL.md), and it casts
the code and renders the resulting stack, ravenmind, mishaps, prints and step state.

It contains **no Minecraft code and no server**: it is only a client. The protocol is deliberately
small, so MieLib's HexCLI is one implementation, not a requirement.

## Features

- **Staff grid canvas** — draw patterns with mouse or touch (undo/redo, click a stroke to edit it,
  pinch-zoom, pan, fit-to-view). Adapted from HexTools' Staff Grid.
- **hexParse input** — `num_1 num_2 add`, `mask_-v--`, `NORTH_EAST_waaw`, `_waaw`, named patterns
  (`add`, `hexcasting:add`) and the `{ } ( ) \` specials, backed by a bundled
  `patterns.json` (1384 patterns, 4001 number literals).
- **Rich stack rendering** — numbers, vectors, booleans, null, garbage, entities, collapsible lists,
  and **mini glyphs** for pattern iotas (falls back to parsing the iota text when a server omits
  `pattern`).
- **Run / Refresh / Reset** — plus a **step debugger** (Begin / Next / Abort with preview and
  progress) when the server supports `step.*`.
- **Result panel** — resolution, ops/steps, media used/dust, mishap list, prints, messages, parser
  messages and the raw server log.
- **Bilingual UI** — English and 中文, following the browser language by default; the choice is
  remembered. Docs are bilingual too.
- **Friendly connection handling** — `GET /v1/health` status pill, precise errors for CORS,
  mixed content, timeouts, bad JSON and HTTP status, token stored in `localStorage`.

## Quick start

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # static output in dist/
yarn preview    # serve dist/
```

Open the app, click the ⚙ settings button, and enter your server's **Base URL** (for example
`http://127.0.0.1:8742`). Optionally add a token; it is sent as `Authorization: Bearer <token>`.
Both values are stored in this browser's `localStorage`.

Then either:

1. leave the default `num_1 num_2 add` in the hexParse box and press **Run** (sends it as `code`), or
2. press **Parse into staff** to draw it, edit it on the canvas, switch the toggle to
   **Drawn patterns**, and press **Run**.

### No server handy?

A mock server is included:

```bash
node scripts/mock-server.mjs --port 8742
# or, with auth:
node scripts/mock-server.mjs --port 8742 --token s3cret
```

It understands `num_<n>`, `add`, `subtract`, `multiply`, `true`/`false` and echoes other tokens as
pattern iotas, and implements `ping`, `run`, `stack`, `reset`, `step.begin`, `step.next`,
`step.abort`. Point the app at `http://127.0.0.1:8742`.

### Tests

```bash
yarn smoke
```

`scripts/smoke-rpc.mjs` bundles the real client, types and hexParse modules with esbuild, starts the
mock server on an ephemeral port, and checks URL normalization, auth, health, `num_1 num_2 add` → top
of stack 3, mishaps, `stack`/`reset`, the whole step sequence, unknown commands, snapshot
fallbacks, hexParse parsing/layout/round-tripping and network-error classification (51 checks).

## Connecting a server

The client only uses two endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/health` | Liveness + protocol version, no auth required |
| `POST` | `/v1/rpc` | Commands: `ping`, `run`, `stack`, `reset`, `step.begin`, `step.next`, `step.abort`, … |

The Base URL may be a bare origin (`http://127.0.0.1:8742`), include a path prefix
(`https://example.com/hex`) or already end in `/v1`; all three normalize to the same endpoints.

### Mixed content (important)

Browsers block `http://` requests made from an `https://` page. So:

- the deployed HTTPS app **cannot** talk to `http://localhost:8742`;
- run the app over plain HTTP for local development (`yarn dev` serves `http://localhost:5173`), or
- put TLS in front of the server, or reverse-proxy the API on the same origin as the app.

The settings drawer warns you when the combination cannot work.

For the server side, the protocol document covers token auth, CORS allow-listing and the MieLib
HexCLI system properties (`-Dmielib.hexcli=true -Dmielib.hexcli.http=true
-Dmielib.hexcli.http.port=8742`).

## Deploying

`yarn build` emits a fully static `dist/` with relative asset paths (`base: "./"`), so it can be
served from any static host or sub-path. The app is also deployed to Cloudflare Pages:
**https://hexsimulator.pages.dev** (see `.github/workflows/deploy-pages.yml`).

## Project layout

```
src/
  canvas/       staff grid canvas + hex geometry (port of HexTools' staff grid)
  hexparse/     hexParse tokenizer, masks, number literals (port of HexTools' hexparse)
  iota/         IotaView, StackView, ResultPanel, PatternGlyph
  server/       protocol types + fetch client
  components/   settings drawer, hexParse editor, step bar, icons
  i18n/         English/Chinese messages
  pages/        SimulatorPage
public/data/patterns.json
docs/           protocol + architecture (bilingual)
scripts/        mock server + protocol smoke test
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the component diagram, data flow, and how
to plug in a *different* server implementation.

## Credits

HexSimulator would not exist without these MIT-licensed projects:

- **[HexTools](https://github.com/xm1221/HexTools)** — Copyright (c) 2026 [object Object]. The staff
  grid interaction model, hex geometry, hexParse tokenizer, number/mask parsing and
  `public/data/patterns.json` are ported/adapted. The license notice is reproduced in
  [`THIRD_PARTY.md`](./THIRD_PARTY.md).
- **[hexdoc](https://github.com/object-Object/hexdoc)** — the pattern registry data in
  `patterns.json` was generated from hexdoc's Hex Casting exports (MIT).
- **[HexBug](https://github.com/FallingColors/HexBug)** — the hexParse input syntax this project
  accepts.
- **[Hex Casting](https://github.com/FallingColors/HexMod)** by petrak — the game mod whose pattern
  shapes and rendering behaviour everything here imitates.
- **MieLib HexCLI** — the reference server implementation of the HTTP protocol, and the source of
  the iota JSON shape used by `docs/PROTOCOL.md`.

This project itself is [MIT licensed](./LICENSE).
