# HexSimulator

**面向 HexCLI 兼容 Hex Casting 服务端的图形化、无厂商锁定的 Web 前端。**

[English](./README.md) · [协议](./docs/PROTOCOL.zh-CN.md) · [架构](./docs/ARCHITECTURE.zh-CN.md) · [第三方声明](./THIRD_PARTY.md)

HexSimulator 是一个纯静态单页应用：在法杖网格上画图案，或输入 [hexParse](https://github.com/FallingColors/HexBug)
源码，把应用指向任意实现了 [`docs/PROTOCOL.zh-CN.md`](./docs/PROTOCOL.zh-CN.md) 里那套小型 HTTP JSON 协议的服务端，
即可施法，并渲染返回的栈、ravenmind、事故、输出与单步状态。

它**不包含 Minecraft 代码，也不含服务端**，只是一个客户端。协议刻意做得很小，所以 MieLib 的 HexCLI 只是其中一种实现，并非必需。

## 功能

- **法杖画布** —— 鼠标 / 触摸绘制图案（撤销重做、点击笔画可编辑、双指缩放、平移、缩放至全部图案）。移植自 HexTools 的 Staff Grid。
- **hexParse 输入** —— 支持 `num_1 num_2 add`、`mask_-v--`、`NORTH_EAST_waaw`、`_waaw`、图案名（`add`、`hexcasting:add`）以及 `{ } ( ) \` 特殊记号；内置 `patterns.json`（1384 个图案、4001 个数字字面量）。
- **丰富的栈渲染** —— 数字、向量、布尔、null、garbage、实体、可折叠列表，以及图案 iota 的**迷你 glyph**（服务端没给 `pattern` 字段时会尝试解析 iota 文本）。
- **Run / 刷新 / 重置** —— 服务端支持 `step.*` 时还会出现**单步调试器**（Begin / Next / Abort，带预览与进度）。
- **结果面板** —— resolution、ops/steps、媒质消耗/粉尘、事故列表、prints、messages、解析器消息和服务端原始日志。
- **中英双语界面** —— 默认跟随浏览器语言，可切换并记住；文档同样双语。
- **友好的连接处理** —— `GET /v1/health` 状态指示；对 CORS、混合内容、超时、非法 JSON、HTTP 状态码分别给出明确错误；token 存在 `localStorage`。

## 快速开始

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # 静态产物在 dist/
yarn preview    # 预览 dist/
```

打开页面，点右上角 ⚙ 设置，填入服务端 **Base URL**（例如 `http://127.0.0.1:8742`），可选填 token
（以 `Authorization: Bearer <token>` 发送）。两项都会保存在本浏览器的 `localStorage`。

然后二选一：

1. 保留 hexParse 输入框里默认的 `num_1 num_2 add`，直接点 **运行**（作为 `code` 发送）；或
2. 点 **解析到法杖** 把它画出来，在画布上编辑，把开关切到 **画出的图案**，再点 **运行**。

### 手边没有服务端？

仓库自带一个 mock 服务端：

```bash
node scripts/mock-server.mjs --port 8742
# 需要鉴权时：
node scripts/mock-server.mjs --port 8742 --token s3cret
```

它支持 `num_<n>`、`add`、`subtract`、`multiply`、`true`/`false`，其余 token 会回显为图案 iota，并实现了
`ping`、`run`、`stack`、`reset`、`step.begin`、`step.next`、`step.abort`。把应用指向 `http://127.0.0.1:8742` 即可。

### 测试

```bash
yarn smoke
```

`scripts/smoke-rpc.mjs` 用 esbuild 打包真实的 client / types / hexParse 模块，在随机端口起 mock 服务端，检查：
URL 归一化、鉴权、health、`num_1 num_2 add` → 栈顶 3、事故、`stack`/`reset`、完整单步序列、未知命令、
快照回退规则、hexParse 解析/排版/往返、网络错误分类（共 51 项）。

## 连接服务端

客户端只使用两个端点：

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/v1/health` | 存活检查 + 协议版本，无需鉴权 |
| `POST` | `/v1/rpc` | 命令：`ping`、`run`、`stack`、`reset`、`step.begin`、`step.next`、`step.abort` 等 |

Base URL 可以是纯源（`http://127.0.0.1:8742`）、带路径前缀（`https://example.com/hex`），或已经以 `/v1` 结尾；
三种写法都会归一化成同一组端点。

### 混合内容（重要）

浏览器会拦截从 `https://` 页面发出的 `http://` 请求。因此：

- 部署在 HTTPS 上的应用**无法**访问 `http://localhost:8742`；
- 本地开发请用纯 HTTP 打开应用（`yarn dev` 就是 `http://localhost:5173`）；或
- 给服务端启用 TLS，或把 API 反向代理到与应用同源。

设置抽屉会在这种组合无法工作时给出警告。

服务端侧：token 鉴权、CORS 白名单以及 MieLib HexCLI 的启动参数
（`-Dmielib.hexcli=true -Dmielib.hexcli.http=true -Dmielib.hexcli.http.port=8742`）见协议文档。

## 部署

`yarn build` 产出的 `dist/` 是纯静态文件，资源路径是相对的（`base: "./"`），可放在任意静态托管的任意子路径下。
本项目也部署在 Cloudflare Pages：**https://hexsimulator.pages.dev**（见 `.github/workflows/deploy-pages.yml`）。

## 目录结构

```
src/
  canvas/       法杖画布 + 六边形几何（移植自 HexTools staff grid）
  hexparse/     hexParse 解析器、mask、数字字面量（移植自 HexTools hexparse）
  iota/         IotaView、StackView、ResultPanel、PatternGlyph
  server/       协议类型 + fetch 客户端
  components/   设置抽屉、hexParse 编辑器、单步条、图标
  i18n/         中英文案
  pages/        SimulatorPage
public/data/patterns.json
docs/           协议与架构文档（双语）
scripts/        mock 服务端 + 协议冒烟测试
```

组件图、数据流以及如何接入**另一个**服务端实现，见 [`docs/ARCHITECTURE.zh-CN.md`](./docs/ARCHITECTURE.zh-CN.md)。

## 致谢

没有这些 MIT 项目就没有 HexSimulator：

- **[HexTools](https://github.com/xm1221/HexTools)** —— Copyright (c) 2026 [object Object]。法杖网格交互模型、六边形几何、
  hexParse 解析器、数字/遮罩解析以及 `public/data/patterns.json` 均移植/改编自该项目。许可证原文见
  [`THIRD_PARTY.md`](./THIRD_PARTY.md)。
- **[hexdoc](https://github.com/object-Object/hexdoc)** —— `patterns.json` 中的图案注册表数据由 hexdoc 的 Hex Casting
  导出生成（MIT）。
- **[HexBug](https://github.com/FallingColors/HexBug)** —— 本项目接受的 hexParse 输入语法。
- **[Hex Casting](https://github.com/FallingColors/HexMod)**（petrak）—— 本项目模仿的图案形状与渲染行为均来自这个模组。
- **MieLib HexCLI** —— HTTP 协议的参考服务端实现，也是 `docs/PROTOCOL.zh-CN.md` 中 iota JSON 形状的来源。

本项目自身使用 [MIT 许可证](./LICENSE)。
