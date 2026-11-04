# HexSimulator ↔ HexCLI HTTP 协议

中文在前。完整对照与英文权威字段表见 [PROTOCOL.md](./PROTOCOL.md)。

修改协议时请同时更新本文件与 `PROTOCOL.md`。

## 目标

- 前端与后端只互传 **指令与执行结果**（HTTP JSON）。
- 任意兼容服务端都可接入，不绑定 MieLib HexCLI。
- 浏览器不能走原有 TCP 远程接口，故需 HTTP 适配层。

## 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/v1/health` | `{ok, protocol:1, server, version}`，可不鉴权 |
| `POST` | `/v1/rpc` | 执行命令，见下 |
| `POST` | `/resolve?signature=<角度>` | HexTools 动态图案解析；返回 JSON 字符串，免鉴权（主机根下，不在 `/v1`） |

鉴权：`Authorization: Bearer <token>` 或 JSON `token`。CORS 白名单可配。

## 请求示例

```json
{ "id": 1, "cmd": "run", "code": "num_1 num_2 add" }
```

常用 `cmd`：`ping`、`run`、`reset`、`stack`、`step.begin`、`step.next`、`step.abort`、`complete`（可选 `profile.*`、`env.*`）。

### `code`（hexParse）语法

`code` 是空格分隔的 hexParse 源码。服务端至少应接受 HexSimulator 会发送、用户会输入的这些形式：

| 形式 | 示例 | 含义 |
|------|------|------|
| `num_<n>` | `num_3`、`num_-12.5` | 数字字面量 |
| 图案名 | `add`、`hexcasting:add` | 按别名 / id 查找已注册图案 |
| `方向_签名` | `NORTH_EAST_waaw` | 显式起点方向 + 角度字母 |
| `_签名` | `_waaw` | 角度字母，默认方向（EAST） |
| 仅签名 | `waaw` | 等同 `_waaw` |
| `mask_<遮罩>` | `mask_-v--` | HexBug 遮罩 |
| 特殊记号 | `{` `}` `(` `)` `\` `intro` `retro` `escape` | 括号 / 转义 |

HexSimulator 的「画出的图案」模式始终发送 `方向_签名` token，因此服务端只要支持该形式加上 `num_<n>` 和图案名，画布就能完整使用。

## 响应要点

- `ok`：无 mishap / 无致命错误时为 `true`。
- `data.cast.stack`：iota 数组，**底 → 顶**；无 cast 时看 `data.stack`。
- iota：`type`/`text`/`color`/`rich`；数字/布尔带 `value`，图案带 `pattern.startDir`+`angles`，实体带 `entity`，列表带递归 `children`。
- `data.step`（`step.begin` / `step.next`）：`total`、`index`（**下一个**待执行 iota 的下标，0 起，完成时等于 `total`）、`done`，可选 `executed`（最近一次 `step.next` 执行的下标）、`preview`（未完成时的下一个 iota，可省略 `rich`/`children`）、`stopped`（如 `"mishap"`）。

## 本地启用（MieLib）

```
-Dmielib.hexcli=true -Dmielib.hexcli.http=true -Dmielib.hexcli.http.port=8742
```

混合内容注意：`https` 页面不能直接打 `http://127.0.0.1`。

## `patterns.list`

客户端在**建立连接时调用一次**（仅在手动「刷新图案」时再调）。`data` 形状与英文 PROTOCOL 相同：`patterns[]` 含 `id` / `startdir` / `signature` / `aliases` / `perWorld` / `nameKey` / `names`。

图案在会话内使用本地缓存，**不要**画图时实时向服务端按图案查询。

`stack` / `cast` 的 `ravenmind` 为 iota JSON 对象（或 `null`）。

预检若带 `Access-Control-Request-Private-Network: true`，服务端应回 `Access-Control-Allow-Private-Network: true`。https 页访问本机 http 仍可能被混合内容拦截，此时请用本地 `yarn dev` 或给 HexCLI 加 TLS/反代。

## `POST /resolve`（HexTools 动态图案解析）

HexTools 画板把每个画出的图案 POST 到 `{base}/resolve?signature=<角度签名>`（如 `?signature=waaw`）来决定颜色。
这是独立的**免鉴权**端点，位于**主机根**（不在 `/v1` 之下），body 不用。

响应体是 **JSON 字符串**，如 `"evaluated"`：

| 结果 | 含义 |
|------|------|
| `"invalid"` | `signature` 缺失或为空 |
| `"evaluated"` | 命中当前动作注册表（per-world 大法术用当前世界的 canonical 笔画） |
| `"unresolved"` | 没有命中 |
| `"escaped"` / `"undone"` / `"errored"` | 施法期状态，静态查表不会产生（内部失败可回 `"errored"`） |

与 `/v1/*` 使用相同的 CORS / PNA 规则。该端点供 HexTools 使用；HexSimulator 仍按 `patterns.list` 缓存图案。

HexSimulator 连上 HexCLI 后，若「动态图案解析 URL」为空（或仍是上次连接自动填入的 origin），
会用该服务器的 **origin**（如 `http://127.0.0.1:8742`）自动填入，使 `new URL("/resolve", url)` 命中
`{origin}/resolve`。用户手动输入的 URL 不会被覆盖。
