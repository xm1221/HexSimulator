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

## Use a GitHub Codespace as the backend / 用 Codespaces 当后端

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/xm1221/HexSimulator)

**No server of your own?** This repo ships a dev container that installs and runs a HexCLI backend
on demand, so https://hexsim.xm1221.cn can cast against a real Minecraft 1.20.1 server that only
exists while you are working. Nothing third-party is committed: the container runs the
[MieLib HexCLI one-click installer](https://github.com/xm1221/MieLib/releases/tag/hexcli-v1.0.0)
and downloads/builds everything under `~/.cache/hexcli`.

**Start it**

1. Click the badge above (or _Code → Codespaces → Create codespace_) and pick a **4-core / 8 GB**
   machine type; the container requires it.
2. Wait for the first boot. `postStartCommand` runs `.devcontainer/start-hexcli.sh`, which installs
   HexCLI, builds MieLib from source (the released installer jar predates the HTTP endpoint),
   starts the server in the background and then the front proxy. First run takes several minutes;
   later wake-ups are much faster because the cache is kept.
3. Get your address and token:

   ```bash
   bash .devcontainer/hexcli-info.sh
   ```

   It prints the base URL (`https://<codespace>-8742.app.github.dev`) and the token. The server log
   is `~/.cache/hexcli/logs/hexcli-server.log`, the proxy log is `~/.cache/hexcli/logs/hexcli-proxy.log`.

**Make the port public** — the browser page is on a different origin, so the forwarded port must not
require a Codespaces session cookie:

```bash
gh codespace ports visibility 8742:public -c <codespace-name>
```

`devcontainer.json` can only forward the port, not choose its visibility: the Dev Container spec has
no `visibility` port attribute, and Codespaces always adds a new port as **private**. So run the
command above once per codespace (or right-click the port in the **Ports** panel → _Port Visibility_ →
_Public_); `postStartCommand` also prints it on every start. Organization policy can forbid public
ports entirely, in which case use _org_ visibility and open the HexSim page from an authenticated
session.

**Point HexSim at it** — open https://hexsim.xm1221.cn, click ⚙, set **Server URL** to the printed
`https://<codespace>-8742.app.github.dev` and paste the token. Both are saved in that browser's
`localStorage`, so this is a one-time step per codespace name. The custom-URL field already accepts
any `https://…` host, so nothing else is needed.

**How it fits together** — `8742` is a small `node` front proxy in this repo
(`scripts/hexcli-codespaces-proxy.mjs`) and `8743` is HexCLI itself, bound to `127.0.0.1`:

- it enforces the CORS allowlist towards the browser (`hexsim.xm1221.cn`, `hextools.xm1221.cn`,
  local dev; override with `HEXCLI_CORS_ORIGINS`), so `POST /v1/rpc` and `POST /resolve` work
  cross-origin from the live site;
- it keeps **one stable token** across restarts — HexCLI generates a new random token on every
  start, which would otherwise force you to re-enter it after each wake-up;
- it keeps the public port stable even though HexCLI's own port is internal.

Casting still happens on the Minecraft server, exactly as locally.

**Idle sleep and quota / 闲置休眠与额度**

- A codespace stops automatically after **~30 minutes of inactivity** (configurable up to 4 hours;
  orgs can cap it). The default idle timeout is set at
  <https://github.com/settings/codespaces>. When it stops, the page cannot reach the backend until
  you reopen the codespace — and the start command brings HexCLI back up automatically.
- The free allowance for personal accounts is **120 core-hours per month** plus **15 GB-month** of
  storage, i.e. ~60 hours on a 2-core machine or ~30 hours on the 4-core machine this container
  needs. Check <https://github.com/settings/billing> for current usage; verify the numbers on
  GitHub's docs, since GitHub has revised them before.
- Stopping a codespace ends compute billing but keeps storage billing, so delete codespaces you no
  longer need.

<details>
<summary>中文：用 GitHub Codespaces 当后端</summary>

**没有自己的服务器？** 本仓库带一个 dev container，按需在 GitHub Codespaces 上装好并运行 HexCLI
后端，让 https://hexsim.xm1221.cn 直接对着一个真实的 Minecraft 1.20.1 服务端施法，而这个服务端只在
你工作时存在。仓库里**不提交任何第三方 jar**：容器运行
[MieLib 的 HexCLI 一键安装器](https://github.com/xm1221/MieLib/releases/tag/hexcli-v1.0.0)，
下载/构建出来的东西都放在 `~/.cache/hexcli`。

**怎么开**

1. 点上面的徽章（或 _Code → Codespaces → Create codespace_），机器类型选 **4 核 / 8 GB**
   （devcontainer 有硬性要求）。
2. 等首次启动完成。`postStartCommand` 会执行 `.devcontainer/start-hexcli.sh`：装 HexCLI、从源码
   构建 MieLib（安装器里那个 jar 早于 HTTP 端点）、后台起服务端、再起反代。首次要几分钟，之后
   因为缓存还在会快很多。
3. 拿地址和令牌：

   ```bash
   bash .devcontainer/hexcli-info.sh
   ```

   会打印 Base URL（`https://<codespace>-8742.app.github.dev`）和令牌。服务端日志在
   `~/.cache/hexcli/logs/hexcli-server.log`，反代日志在 `~/.cache/hexcli/logs/hexcli-proxy.log`。

**把端口设为 public** —— 浏览器里的页面是另一个源，转发端口不能要求 Codespaces 会话 cookie：

```bash
gh codespace ports visibility 8742:public -c <codespace-name>
```

`devcontainer.json` 只能负责转发端口，没法指定可见性：Dev Container 规范没有 `visibility` 这个
端口属性，而 Codespaces 新建端口一律是 **private**。所以每个 codespace 跑一次上面那条命令
（或在 **Ports** 面板右键端口 → _Port Visibility_ → _Public_）；`postStartCommand` 每次启动也会
把它打印出来。组织策略可能完全禁止 public 端口，那种情况用 _org_ 可见性并在已登录的会话里打开
HexSim 页面。

**填进 hexsim.xm1221.cn** —— 打开 https://hexsim.xm1221.cn，点 ⚙，**Server URL** 填打印出来的
`https://<codespace>-8742.app.github.dev`，粘上令牌。两者都存在该浏览器的 `localStorage` 里，
所以每个 codespace 名只需填一次。自定义地址输入框本来就接受任意 `https://…` 主机，不需要改前端。

**结构** —— `8742` 是本仓库的小反代（`scripts/hexcli-codespaces-proxy.mjs`），`8743` 是 HexCLI
本身，只绑 `127.0.0.1`：

- 由反代对浏览器执行 CORS 白名单（`hexsim.xm1221.cn`、`hextools.xm1221.cn`、本地开发；可用
  `HEXCLI_CORS_ORIGINS` 覆盖），所以线上站点能跨域调用 `POST /v1/rpc` 和 `POST /resolve`；
- 反代维护**一个固定令牌**：HexCLI 每次启动都会重新随机生成 token，不这么做每次休眠唤醒后都得
  重填；
- 对外端口固定，而 HexCLI 真实端口是内部的。

施法仍然发生在 Minecraft 服务端上，和本地用完全一样。

**闲置休眠与免费额度**

- Codespace 闲置约 **30 分钟**自动停止（可调到最多 4 小时，组织可设上限），默认值在
  <https://github.com/settings/codespaces>。停止后页面连不上后端，重新打开 codespace 时启动脚本
  会自动把 HexCLI 拉起来。
- 个人账号免费额度是**每月 120 core-hours** + **15 GB-月**存储，也就是 2 核约 60 小时、
  4 核（本容器需要）约 30 小时。用量看 <https://github.com/settings/billing>；具体数字请以 GitHub
  文档为准，GitHub 曾调整过。
- 停止 codespace 只停算力计费，存储仍然计费，不需要的及时删除。

</details>

## License

MIT. Based on [HexTools](https://github.com/object-Object/HexTools) (see `LICENSE` / `THIRD_PARTY.md`).
