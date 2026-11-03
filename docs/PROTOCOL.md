# HexSimulator ↔ HexCLI HTTP Protocol / 协议

English first, then 中文. Keep both sections in sync when editing.

Also see: [PROTOCOL.zh-CN.md](./PROTOCOL.zh-CN.md) (Chinese-first mirror).

---

## English

### Goals

- Frontend and backend exchange **commands and execution results only** (JSON over HTTP).
- Any server that speaks this protocol can drive HexSimulator (not only MieLib HexCLI).
- Browsers cannot use the existing HexCLI TCP remote; this HTTP surface is the browser-facing adapter.

### Transport

- Base URL chosen by the user (stored in `localStorage`), e.g. `http://127.0.0.1:8742`.
- `POST /v1/rpc` with `Content-Type: application/json`.
- Optional auth: header `Authorization: Bearer <token>` or JSON field `"token"`.
- CORS: server must allow the page origin (configurable allowlist; `*` only for local debug).
- `GET /v1/health` → `{ "ok": true, "protocol": 1, "server": "mielib-hexcli", "version": "..." }` (no auth required).
- Mixed content: an `https://` HexSimulator page cannot call `http://` servers in most browsers. Use local `http` for both, or put TLS on the HexCLI side / use a same-origin reverse proxy.

### Request

```json
{
  "id": 1,
  "cmd": "run",
  "code": "num_1 num_2 add",
  "token": "optional-if-header-absent"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | number/string | no | Echoed in the response for correlation |
| `cmd` | string | yes | See commands below |
| `code` | string | for `run`, `step.begin` | hexParse source |
| `label` | string | no | Label for step sessions |
| `token` | string | if server requires | Alternative to `Authorization` header |

### `code` syntax (hexParse)

`code` is whitespace-separated hexParse source. Servers are expected to accept at least the token
forms HexSimulator emits and lets users type:

| Form | Example | Meaning |
|------|---------|---------|
| `num_<n>` | `num_3`, `num_-12.5` | Number literal |
| Pattern name | `add`, `hexcasting:add` | Registered pattern by alias / id |
| `DIR_signature` | `NORTH_EAST_waaw` | Explicit start direction + angle letters |
| `_signature` | `_waaw` | Angle letters, default direction (EAST) |
| Signature only | `waaw` | Same as `_waaw` |
| `mask_<mask>` | `mask_-v--` | HexBug mask |
| Specials | `{` `}` `(` `)` `\` `intro` `retro` `escape` | Parens / escape |

HexSimulator's "Drawn patterns" mode always emits `DIR_signature` tokens, so a server only needs
that form plus `num_<n>` and names to be fully usable from the canvas.

### Commands

| `cmd` | Body fields | Meaning |
|-------|-------------|---------|
| `ping` | — | Liveness |
| `run` | `code` | Parse + execute all iotas (session stack persists) |
| `reset` | — | Reset session image to profile defaults; abort step |
| `stack` | — | Current stack + ravenmind without casting |
| `step.begin` | `code`, optional `label` | Start a step session |
| `step.next` | — | Execute one top-level iota |
| `step.abort` | — | Abort step session (stack kept) |
| `complete` | — | Pattern id completion list (optional for UIs) |
| `profile.list` / `profile.show` / `profile.use` | `name` for use | Optional |
| `env.list` / `env.use` | `id` for use (`"auto"` ok) | Optional |

Unknown `cmd` → `ok: false` with `data.error`.

### Response

```json
{
  "id": 1,
  "ok": true,
  "lines": ["human-readable log lines…"],
  "data": {
    "cast": {
      "resolution": "EVALUATED",
      "steps": 3,
      "ops": 3,
      "stack": [ /* iota objects, bottom → top */ ],
      "ravenmind": null,
      "mishaps": [],
      "mediaUsed": 0,
      "mediaDust": 0.0
    },
    "prints": [],
    "messages": [],
    "parserMessages": [],
    "media": { "mode": "infinite", "text": "infinite" },
    "error": null,
    "step": null
  }
}
```

After `stack` / when no cast occurred, `data.stack` and `data.ravenmind` may sit at the top level of `data` (same iota schema). Clients should prefer `data.cast.stack` when `data.cast` is an object, else `data.stack`.

`ok` is `false` on mishap, parse failure, or server error. Always inspect `data`.

### Iota JSON schema

Every iota is an object:

```json
{
  "type": "hexcasting:double",
  "text": "3.00",
  "color": "#ff55ff",
  "rich": [{ "text": "3.00", "color": "#ff55ff" }],
  "value": 3.0,
  "pattern": { "startDir": "NORTH_EAST", "angles": "qaq" },
  "entity": { "type": "minecraft:player", "name": "HexCLI", "pos": [0, 64, 0], "uuid": "…" },
  "children": [ /* nested iotas for lists */ ]
}
```

| Field | When present |
|-------|----------------|
| `type` | Always — registry id of the iota type |
| `text` | Always — plain display string |
| `color` | Always — `#rrggbb` |
| `rich` | Always — styled segments |
| `value` | Numbers / booleans / null when known |
| `pattern` | Pattern iotas — for mini glyph rendering |
| `entity` | Entity iotas |
| `children` | List iotas (recursive) |

Frontend rendering rules of thumb:

- `hexcasting:double` / number → number chip  
- vector → `(x, y, z)`  
- boolean / null / garbage → distinct chips  
- pattern → mini hex glyph from `pattern.startDir` + `pattern.angles`  
- list → nested expandable list  
- entity → type + name + position  
- anything else → `text` fallback with `type` badge  

### Step object

```json
{
  "total": 3,
  "index": 1,
  "done": false,
  "executed": 0,
  "preview": { /* iota JSON of next iota */ },
  "stopped": "mishap"
}
```

- `index` is the zero-based index of the **next** iota to execute (equals `total` when done).
- `executed` (informational) is the zero-based index of the iota the last `step.next` executed.
- `preview` is present while not done; it may omit `rich`/`children`.
- `stopped` appears when the session ended early (e.g. `"mishap"`).

### MieLib HexCLI enablement

Off by default. Enable with e.g.:

```
-Dmielib.hexcli=true -Dmielib.hexcli.http=true -Dmielib.hexcli.http.port=8742
```

See MieLib `HEXCLI.md` / `docs/hexcli-http.md` for bind address, CORS, and token file (`hexcli/http.json`).

### Protocol version

`protocol: 1` in `/v1/health`. Breaking changes bump the number.

---

## 中文

### 目标

- 前端与后端只互传 **指令与执行结果**（HTTP JSON）。
- 任何实现本协议的服务端都能驱动 HexSimulator，不绑定 MieLib。
- 浏览器无法使用 HexCLI 原有的 TCP 远程接口，因此需要这层 HTTP 适配。

### 传输

- 用户自行填写服务端 Base URL（存 `localStorage`），例如 `http://127.0.0.1:8742`。
- `POST /v1/rpc`，`Content-Type: application/json`。
- 鉴权：请求头 `Authorization: Bearer <token>`，或 JSON 字段 `"token"`。
- CORS：服务端按可配置白名单放行页面来源（本地调试才可用 `*`）。
- `GET /v1/health` → `{ "ok": true, "protocol": 1, "server": "mielib-hexcli", "version": "..." }`（可不鉴权）。
- 混合内容：`https://` 页面通常无法请求 `http://` 服务端。本地请前后端都用 `http`，或给 HexCLI 配 TLS / 同源反代。

### 请求 / 命令 / 响应 / Iota

字段与英文节表格相同。`cmd` 取值：`ping`、`run`、`reset`、`stack`、`step.begin`、`step.next`、`step.abort`、`complete`，以及可选的 `profile.*` / `env.*`。

`code`（hexParse）支持：`num_<n>`（数字）、图案名（如 `add`、`hexcasting:add`）、`方向_签名`（如 `NORTH_EAST_waaw`）、`_签名` 或仅签名（默认 EAST）、`mask_<遮罩>`，以及 `{ } ( ) \ intro retro escape` 等特殊记号。完整表格见 [`PROTOCOL.zh-CN.md`](./PROTOCOL.zh-CN.md#codehexparse语法) 或上方英文表。

Iota 对象必有 `type` / `text` / `color` / `rich`；数字可有 `value`，图案有 `pattern:{startDir,angles}`，实体有 `entity`，列表有 `children`。

栈顺序：**底 → 顶**。有 `data.cast` 时优先读 `data.cast.stack`，否则读 `data.stack`。

`data.step`：`total`、`index`（**下一个**待执行 iota 的下标，完成后等于 `total`）、`done`，可选 `executed`（最近一次 `step.next` 执行的下标）、`preview`（未完成的下一 iota）、`stopped`（提前结束的原因，如 `"mishap"`）。

### MieLib 启用

默认关闭。示例：

```
-Dmielib.hexcli=true -Dmielib.hexcli.http=true -Dmielib.hexcli.http.port=8742
```

细节见 MieLib 的 `HEXCLI.md` / `docs/hexcli-http.md`（绑定地址、CORS、`hexcli/http.json`）。

### 版本

`/v1/health` 里 `protocol: 1`；破坏性变更时加一。
