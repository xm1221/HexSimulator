export type Language = "en" | "zh";

export type MessageVars = Record<string, string | number>;

/**
 * English is the source language. Every key used in the app must be added
 * here; `zh` is typed to require a translation for each one.
 */
const en = {
  "app.title": "HexSimulator",
  "app.subtitle": "A drawing frontend for HexCLI-compatible servers",
  "app.loading": "Loading…",

  "language.label": "Language",

  "conn.title": "Server",
  "conn.status": "Connection",
  "conn.connected": "Connected",
  "conn.checking": "Checking…",
  "conn.offline": "Offline",
  "conn.notConfigured": "No server configured",
  "conn.unknown": "Unknown",
  "conn.server": "Server: {name}",
  "conn.version": "Version: {version}",
  "conn.protocol": "Protocol: {version}",
  "conn.protocolMismatch":
    "Server speaks protocol {theirs}; this UI implements {ours}. Some fields may be missing.",
  "conn.check": "Check connection",
  "conn.openSettings": "Server settings",

  "settings.title": "Server settings",
  "settings.baseUrl": "Base URL",
  "settings.baseUrlDescription":
    "For example http://127.0.0.1:8742. The server must implement the HexSimulator HTTP protocol.",
  "settings.token": "Token (optional)",
  "settings.tokenDescription":
    "Sent as `Authorization: Bearer <token>`. Stored in this browser's localStorage.",
  "settings.tokenShow": "Show token",
  "settings.tokenHide": "Hide token",
  "settings.remember": "Settings are saved to localStorage automatically.",
  "settings.save": "Save",
  "settings.close": "Close",
  "settings.reset": "Reset",
  "settings.mixedContentWarning":
    "This page is HTTPS, so browsers will block plain-HTTP servers. Use http://localhost for both, enable TLS on the server, or use a same-origin reverse proxy.",
  "settings.stepSupport":
    "If the server supports `step.*` commands, a step debugger appears next to Run.",

  "input.title": "Staff",
  "input.code": "hexParse source",
  "input.codePlaceholder": "num_1 num_2 add",
  "input.codeDescription":
    "Tokens: num_<n>, mask_<mask>, <DIR>_<angles>, _<angles>, pattern names such as `add`, plus `{ } ( ) \\\\`.",
  "input.sendCode": "Send this code as-is",
  "input.sendPatterns": "Send drawn patterns",
  "input.modeLabel": "What Run sends",
  "input.modeCode": "hexParse source",
  "input.modePatterns": "Drawn patterns",
  "input.parse": "Parse",
  "input.parseAndLoad": "Parse into staff",
  "input.loadingPatterns": "Loading pattern data…",
  "input.patternsLoaded": "{n} patterns available",
  "input.parseErrors": "{errors} error(s), {warnings} warning(s)",
  "input.patternCount": "{n} patterns",
  "input.greedyWarning": "Greedy number encoding (not the shortest pattern)",
  "input.clear": "Clear staff",
  "input.undo": "Undo",
  "input.redo": "Redo",
  "input.help": "Syntax help",
  "input.helpTitle": "hexParse syntax",
  "input.helpBody":
    "Separate tokens with spaces. `num_3` draws the literal 3, `mask_-v--` draws a HexBug mask, `NORTH_EAST_waaw` uses an explicit direction, `_waaw` defaults to EAST, and named patterns like `add` or `hexcasting:add` come from patterns.json.",
  "input.drawHint": "Drag on the canvas to draw. Click a stroke to edit it.",
  "input.staffEmpty": "Draw a pattern, or parse hexParse source.",

  "cast.run": "Run",
  "cast.running": "Running…",
  "cast.stack": "Refresh",
  "cast.reset": "Reset",
  "cast.continue": "Continue",
  "cast.stepBegin": "Step",
  "cast.stepNext": "Next",
  "cast.stepAbort": "Abort",
  "cast.stepProgress": "Step {index} / {total}",
  "cast.stepDone": "Step session finished",
  "cast.stepPreview": "Next iota",
  "cast.stepStopped": "Stopped: {reason}",
  "cast.abort": "Stop",
  "cast.codeRequired": "Enter hexParse source, or draw something on the staff.",

  "stack.title": "Stack",
  "stack.empty": "The stack is empty.",
  "stack.unknown": "Stack not loaded yet. Press Refresh.",
  "stack.top": "top",
  "stack.index": "#{n}",
  "stack.count": "{n} iota(s)",
  "stack.copy": "Copy stack as text",
  "stack.copied": "Copied",
  "stack.expandAll": "Expand lists",
  "stack.collapseAll": "Collapse lists",

  "ravenmind.title": "Ravenmind",
  "ravenmind.none": "(not set)",
  "ravenmind.parens": "Introspection depth: {n}",

  "result.title": "Result",
  "result.resolution": "Resolution",
  "result.steps": "Steps",
  "result.ops": "Ops",
  "result.mediaUsed": "Media used",
  "result.mediaDust": "Media dust",
  "result.mishaps": "Mishaps",
  "result.noMishaps": "No mishaps.",
  "result.prints": "Prints",
  "result.messages": "Messages",
  "result.parserMessages": "Parser messages",
  "result.media": "Media",
  "result.error": "Error",
  "result.lines": "Server log",
  "result.idle": "Run some code to see the result.",
  "result.ok": "OK",
  "result.failed": "Failed",
  "result.preview": "Preview",
  "result.stopped": "Stopped",

  "iota.list": "list",
  "iota.listCount": "{n} item(s)",
  "iota.entity": "entity",
  "iota.pattern": "pattern",
  "iota.null": "null",
  "iota.boolean": "boolean",
  "iota.number": "number",
  "iota.vector": "vector",
  "iota.garbage": "garbage",
  "iota.empty": "(empty)",
  "iota.position": "at {x}, {y}, {z}",
  "iota.uuid": "UUID {uuid}",
  "iota.typeBadge": "type: {type}",

  "errors.title": "Something went wrong",
  "errors.network":
    "The browser could not reach the server. Check the URL, that the server is running, and that CORS allows this page's origin.",
  "errors.mixedContent":
    "Mixed content: an HTTPS page cannot call an HTTP server. Serve the app over http:// on localhost, or enable TLS on the server.",
  "errors.invalidUrl": "That base URL does not look right.",
  "errors.timeout": "The server did not answer in time.",
  "errors.httpStatus": "The server returned an error status.",
  "errors.badJson": "The server replied with something that is not valid protocol JSON.",
  "errors.aborted": "Request cancelled.",
  "errors.protocolMismatch": "The server did not answer like a HexSimulator server.",
  "errors.dismiss": "Dismiss",

  "footer.credit": "Pattern data from hexdoc. Drawing code adapted from HexTools (MIT).",
  "footer.protocol": "Protocol",
  "footer.source": "Source",
};

type MessageKey = keyof typeof en;

const zh: Record<MessageKey, string> = {
  "app.title": "HexSimulator",
  "app.subtitle": "面向 HexCLI 兼容服务端的图形化施法前端",
  "app.loading": "加载中…",

  "language.label": "语言",

  "conn.title": "服务端",
  "conn.status": "连接",
  "conn.connected": "已连接",
  "conn.checking": "检测中…",
  "conn.offline": "离线",
  "conn.notConfigured": "尚未配置服务端",
  "conn.unknown": "未知",
  "conn.server": "服务端：{name}",
  "conn.version": "版本：{version}",
  "conn.protocol": "协议：{version}",
  "conn.protocolMismatch":
    "服务端协议版本为 {theirs}，本界面实现 {ours}；部分字段可能缺失。",
  "conn.check": "检测连接",
  "conn.openSettings": "服务端设置",

  "settings.title": "服务端设置",
  "settings.baseUrl": "Base URL",
  "settings.baseUrlDescription":
    "例如 http://127.0.0.1:8742。服务端需实现 HexSimulator HTTP 协议。",
  "settings.token": "Token（可选）",
  "settings.tokenDescription":
    "通过 `Authorization: Bearer <token>` 发送，保存在本浏览器 localStorage。",
  "settings.tokenShow": "显示 token",
  "settings.tokenHide": "隐藏 token",
  "settings.remember": "设置会自动保存到 localStorage。",
  "settings.save": "保存",
  "settings.close": "关闭",
  "settings.reset": "重置",
  "settings.mixedContentWarning":
    "当前页面是 HTTPS，浏览器会拦截明文 HTTP 服务端。请让页面与服务端都用 http://localhost，或给服务端配 TLS / 同源反向代理。",
  "settings.stepSupport":
    "若服务端支持 `step.*` 指令，Run 旁边会出现单步调试器。",

  "input.title": "法杖",
  "input.code": "hexParse 源码",
  "input.codePlaceholder": "num_1 num_2 add",
  "input.codeDescription":
    "可用：num_<n>、mask_<遮罩>、<方向>_<角度>、_<角度>、图案名（如 `add`），以及 `{ } ( ) \\\\`。",
  "input.sendCode": "原样发送代码",
  "input.sendPatterns": "发送画出的图案",
  "input.modeLabel": "Run 发送内容",
  "input.modeCode": "hexParse 源码",
  "input.modePatterns": "画出的图案",
  "input.parse": "解析",
  "input.parseAndLoad": "解析到法杖",
  "input.loadingPatterns": "正在加载图案数据…",
  "input.patternsLoaded": "共 {n} 个图案",
  "input.parseErrors": "{errors} 个错误，{warnings} 个警告",
  "input.patternCount": "{n} 个图案",
  "input.greedyWarning": "贪心数字编码（并非最短图案）",
  "input.clear": "清空法杖",
  "input.undo": "撤销",
  "input.redo": "重做",
  "input.help": "语法帮助",
  "input.helpTitle": "hexParse 语法",
  "input.helpBody":
    "用空格分隔 token。`num_3` 画出数字 3，`mask_-v--` 画 HexBug 遮罩，`NORTH_EAST_waaw` 指定起点方向，`_waaw` 默认朝东，`add` / `hexcasting:add` 等名称来自 patterns.json。",
  "input.drawHint": "在画布上拖动即可绘制；点击已有笔画可编辑。",
  "input.staffEmpty": "画一个图案，或解析 hexParse 源码。",

  "cast.run": "运行",
  "cast.running": "运行中…",
  "cast.stack": "刷新",
  "cast.reset": "重置",
  "cast.continue": "继续",
  "cast.stepBegin": "单步",
  "cast.stepNext": "下一步",
  "cast.stepAbort": "中止",
  "cast.stepProgress": "第 {index} / {total} 步",
  "cast.stepDone": "单步会话已结束",
  "cast.stepPreview": "下一个 iota",
  "cast.stepStopped": "已停止：{reason}",
  "cast.abort": "停止",
  "cast.codeRequired": "请输入 hexParse 源码，或在法杖上画点东西。",

  "stack.title": "栈",
  "stack.empty": "栈为空。",
  "stack.unknown": "尚未获取栈。点击「刷新」。",
  "stack.top": "栈顶",
  "stack.index": "#{n}",
  "stack.count": "{n} 个 iota",
  "stack.copy": "复制为文本",
  "stack.copied": "已复制",
  "stack.expandAll": "展开列表",
  "stack.collapseAll": "折叠列表",

  "ravenmind.title": "Ravenmind",
  "ravenmind.none": "（未设置）",
  "ravenmind.parens": "内省深度：{n}",

  "result.title": "结果",
  "result.resolution": "求值结果",
  "result.steps": "步数",
  "result.ops": "操作数",
  "result.mediaUsed": "消耗媒质",
  "result.mediaDust": "媒质粉尘",
  "result.mishaps": "事故",
  "result.noMishaps": "没有事故。",
  "result.prints": "输出",
  "result.messages": "消息",
  "result.parserMessages": "解析器消息",
  "result.media": "媒质",
  "result.error": "错误",
  "result.lines": "服务端日志",
  "result.idle": "运行代码后在这里查看结果。",
  "result.ok": "成功",
  "result.failed": "失败",
  "result.preview": "预览",
  "result.stopped": "已停止",

  "iota.list": "列表",
  "iota.listCount": "{n} 项",
  "iota.entity": "实体",
  "iota.pattern": "图案",
  "iota.null": "null",
  "iota.boolean": "布尔",
  "iota.number": "数字",
  "iota.vector": "向量",
  "iota.garbage": "垃圾",
  "iota.empty": "（空）",
  "iota.position": "坐标 {x}, {y}, {z}",
  "iota.uuid": "UUID {uuid}",
  "iota.typeBadge": "类型：{type}",

  "errors.title": "出错了",
  "errors.network":
    "浏览器无法连接服务端。请检查地址、服务端是否在运行，以及 CORS 是否放行本页来源。",
  "errors.mixedContent":
    "混合内容：HTTPS 页面无法请求 HTTP 服务端。请在 localhost 上用 http:// 打开本页，或给服务端启用 TLS。",
  "errors.invalidUrl": "Base URL 格式不正确。",
  "errors.timeout": "服务端未在超时时间内响应。",
  "errors.httpStatus": "服务端返回了错误状态码。",
  "errors.badJson": "服务端返回的内容不是合法的协议 JSON。",
  "errors.aborted": "请求已取消。",
  "errors.protocolMismatch": "服务端的响应不像 HexSimulator 服务端。",
  "errors.dismiss": "关闭",

  "footer.credit": "图案数据来自 hexdoc；绘制代码改编自 HexTools（MIT）。",
  "footer.protocol": "协议",
  "footer.source": "源码",
};

export const messages: {
  en: Record<MessageKey, string>;
  zh: Record<MessageKey, string>;
} = { en, zh };

export type { MessageKey };

/**
 * `src/hexparse` stores plain English messages so it stays testable and
 * language-agnostic. Translate the known ones at display time; anything
 * unrecognised falls through unchanged.
 */
const zhParseMessagePatterns: [RegExp, string][] = [
  [/^invalid number literal: (.+)$/, "无效的数字字面量：$1"],
  [/^could not resolve number (.+)$/, "无法解析数字 $1"],
  [
    /^not in pregenerated table; using greedy encoding$/,
    "不在预生成表中，将使用贪心编码",
  ],
  [/^invalid mask \(expected only - and v\)$/, "无效的遮罩（只允许 - 和 v）"],
  [/^empty mask$/, "空遮罩"],
  [/^invalid signature for (.+)$/, "$1 的签名无效"],
  [/^missing pattern data for special token$/, "特殊 token 缺少图案数据"],
  [/^unsupported token, skipped: (.+)$/, "不支持的 token，已跳过：$1"],
  [/^unknown pattern: (.+)$/, "未知图案：$1"],
  [/^failed to load (.+): (\d+)$/, "无法加载 $1：$2"],
];

export function translateParseMessage(message: string, lang: Language): string {
  if (lang !== "zh") {
    return message;
  }
  for (const [pattern, replacement] of zhParseMessagePatterns) {
    if (pattern.test(message)) {
      return message.replace(pattern, replacement);
    }
  }
  return message;
}
