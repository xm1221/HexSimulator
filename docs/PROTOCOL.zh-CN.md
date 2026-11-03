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

鉴权：`Authorization: Bearer <token>` 或 JSON `token`。CORS 白名单可配。

## 请求示例

```json
{ "id": 1, "cmd": "run", "code": "num_1 num_2 add" }
```

常用 `cmd`：`ping`、`run`、`reset`、`stack`、`step.begin`、`step.next`、`step.abort`、`complete`。

## 响应要点

- `ok`：无 mishap / 无致命错误时为 `true`。
- `data.cast.stack`：iota 数组，**底 → 顶**；无 cast 时看 `data.stack`。
- iota：`type`/`text`/`color`/`rich`；图案带 `pattern.startDir`+`angles`；列表带 `children`。

## 本地启用（MieLib）

```
-Dmielib.hexcli=true -Dmielib.hexcli.http=true -Dmielib.hexcli.http.port=8742
```

混合内容注意：`https` 页面不能直接打 `http://127.0.0.1`。
