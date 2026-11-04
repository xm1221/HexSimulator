# HexSimulator

**A HexTools-based graphical frontend for any HexCLI-compatible Hex Casting server.**

[中文说明](./README.zh-CN.md) · [Protocol](./docs/PROTOCOL.md) · [Architecture](./docs/ARCHITECTURE.md) · [Third-party](./THIRD_PARTY.md)

HexSimulator is a **static** Vite/React app. It reuses the HexTools staff-grid look and UX (including zh/en i18n and mobile behaviour), adds a **stack** panel (top-left) and a **ravenmind / 渡鸦之思** panel (top-right), and talks to any server that speaks the small HTTP JSON protocol in [`docs/PROTOCOL.md`](./docs/PROTOCOL.md).

The staff grid always shows the **full dot grid** (`dotsMode: "all"`) on desktop and touch, so the canvas is never empty while idle.

This repository is **frontend only**. Casting happens on the server (e.g. MieLib HexCLI). The HexTools repo and https://hextools.xm1221.cn are **not** modified by this project.

## Pattern data (important)

Registry patterns are **not bundled**. On connect / startup the client calls `patterns.list` **once**, stores the result in memory and `localStorage` (keyed by server URL), and uses that local copy for the **whole session**. Drawing and hexParse never live-query the server for patterns. Use **Refresh patterns** to resync manually.

Number-literal encodings (`num_<n>`) still use a client-side table; that is not the action registry.

## Quick start

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # dist/
yarn smoke      # mock-server RPC + parser checks
```

Open ⚙, set Base URL (default `http://127.0.0.1:8742`), Connect, then run `num_1 num_2 add`.

### Mock server

```bash
node scripts/mock-server.mjs --port 8742
```

### Real HexCLI (MieLib)

```bash
cd /path/to/MieLib   # branch with HTTP + patterns.list
JAVA_HOME=/path/to/jdk17 ./gradlew :fabric:runHexcliServer
# -Dmielib.hexcli=true -Dmielib.hexcli.http=true (defaults forwarded in the Fabric run)
```

## Mixed content / Private Network Access

An **https** deployment (e.g. https://hexsimulator.pages.dev) often cannot call `http://127.0.0.1`. MieLib answers `Access-Control-Allow-Private-Network` on preflight when asked; if the browser still blocks mixed content, run `yarn dev` locally (http) or put TLS / a reverse proxy in front of HexCLI.

## License

MIT. Based on [HexTools](https://github.com/object-Object/HexTools) (see `LICENSE` / `THIRD_PARTY.md`).
