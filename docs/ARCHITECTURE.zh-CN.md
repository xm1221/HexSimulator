# HexSimulator 架构

英文版：[ARCHITECTURE.md](./ARCHITECTURE.md)。

## 概览

前端是基于 HexTools 的静态页；服务端是任意实现 PROTOCOL 的 HexCLI。连接成功时调用一次 `patterns.list`，结果缓存在本地供整段会话使用（可手动刷新），画图时不实时拉图案。

左上角栈（下方是 hexParse 入口）、右上角渡鸦之思；画布与中英/移动端行为沿用 HexTools。窄屏（`max-width: 30em`）下两张卡片会缩小，但仍保持栈在左、渡鸦之思在右。法杖画布铺满 AppShell 主区域，默认 `dotsMode: "all"`（设置键 `staff-grid-settings-hexsim`）。本仓库不修改 HexTools 本体。

## 关键路径

| 路径 | 作用 |
|------|------|
| `src/simulator/ServerContext.tsx` | 连接、图案一次同步、run/stack/step |
| `src/hexparse/*` | hexParse 与注册表缓存 |
| `packages/@hextools/*` | 法杖画布渲染 |
| `docs/PROTOCOL.md` | 协议 |
