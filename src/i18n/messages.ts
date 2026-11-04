export type Language = "en" | "zh";

export type MessageVars = Record<string, string | number>;

/**
 * English is the source language. Every key used in the app must be added
 * here; `zh` is typed to require a translation for each one.
 */
const en = {
  "app.title": "HexSimulator",

  "language.label": "Language",

  "nav.staffGrid": "Staff Grid",
  "nav.swindler": "Swindler",
  "nav.toggleNavigation": "Toggle navigation",

  "header.github": "GitHub",
  "header.toggleColorScheme": "Toggle color scheme",

  "server.title": "HexCLI server",
  "server.open": "Server connection",
  "server.url": "Server URL",
  "server.urlDescription":
    "HexCLI-compatible HTTP endpoint (GET /v1/health, POST /v1/rpc).",
  "server.token": "Token (optional)",
  "server.tokenDescription":
    "Sent as Authorization: Bearer. Stored in this browser only.",
  "server.connect": "Connect",
  "server.disconnect": "Disconnect",
  "server.connecting": "Connecting…",
  "server.connected": "Connected",
  "server.disconnected": "Disconnected",
  "server.offline": "Unreachable",
  "server.health": "Health",
  "server.server": "Server",
  "server.version": "Version",
  "server.protocol": "Protocol",
  "server.patterns": "Patterns",
  "server.patternsReady": "{n} patterns · {source}",
  "server.patternsCached": "cached {when}",
  "server.patternsLoading": "Loading patterns…",
  "server.refreshPatterns": "Refresh patterns",
  "server.refreshPatternsHint":
    "Synced once when you connect (not live). Cached per URL for the session; use Refresh to resync. Never bundled.",
  "server.fetchedNow": "just now",
  "server.never": "never",
  "server.close": "Close",
  "server.notConnected": "Connect to a HexCLI server first.",
  "server.error.invalid-url": "That URL is not valid.",
  "server.error.mixed-content":
    "This HTTPS page cannot call a plain-HTTP server. Open the app over http://, put TLS in front of HexCLI, or use a reverse proxy.",
  "server.error.private-network":
    "The browser blocked a request from a public HTTPS page to a local/private address (Private Network Access). Open HexSimulator over http://localhost, or expose the server through HTTPS.",
  "server.error.network":
    "Could not reach the server. Is HexCLI running? Check the URL, the CORS allowlist, and mixed content.",
  "server.error.timeout": "The server did not answer in time.",
  "server.error.http-status": "The server rejected the request.",
  "server.error.bad-json":
    "The server replied with something that is not HexCLI JSON.",
  "server.error.aborted": "Request cancelled.",
  "server.error.unknown": "Unexpected error.",
  "server.privateNetworkHint":
    "Heads-up: this page is HTTPS and the server is a local address; Chrome may block it (Private Network Access).",
  "server.mixedContentHint":
    "This page is HTTPS; browsers block plain-HTTP servers from here.",

  "stack.title": "Stack",
  "stack.count": "{n} iotas",
  "stack.empty": "Stack is empty.",
  "stack.unknown": "No stack reported yet.",
  "stack.copy": "Copy stack",
  "stack.copied": "Copied",
  "stack.top": "top",
  "stack.index": "#{n}",
  "stack.run": "Run",
  "stack.running": "Running…",
  "stack.reset": "Reset",
  "stack.refresh": "Refresh stack",
  "stack.mishaps": "Mishaps",
  "stack.prints": "Prints",
  "stack.messages": "Messages",
  "stack.parserMessages": "Parser messages",
  "stack.error": "Error",
  "stack.source": "Source",
  "stack.sourceHint": "hexParse input, or the drawn staff",
  "stack.step": "Step",
  "stack.stepNext": "Next",
  "stack.stepAbort": "Abort",
  "stack.stepProgress": "Step {index}/{total}",
  "stack.collapse": "Collapse stack panel",
  "stack.expand": "Expand stack panel",
  "stack.ravenmind": "Ravenmind",

  "ravenmind.title": "Ravenmind",
  "ravenmind.none": "Not set",
  "ravenmind.parens": "{n} open parens",

  "iota.boolean": "Boolean value",
  "iota.pattern": "Pattern",
  "iota.position": "at {x}, {y}, {z}",
  "iota.listCount": "{n} items",
  "iota.typeBadge": "iota type: {type}",

  "hexParse.title": "Parse patterns",
  "hexParse.input": "Input",
  "hexParse.description": "Whitespace-separated tokens, e.g. num_1 num_2 add",
  "hexParse.loadError": "Couldn't load the pattern registry",
  "hexParse.serverRequired":
    "No registry from a server yet — connect to resolve named patterns. Numbers, masks and angle signatures still parse offline.",
  "hexParse.registry": "{n} server patterns available",
  "hexParse.offlineBadge": "Offline (numbers/masks only)",
  "hexParse.parseAndDraw": "Parse and draw",
  "hexParse.errorWarningCount": "{errors} error(s), {warnings} warning(s)",
  "hexParse.patternCount": "{n} patterns",
  "hexParse.errorCount": "{n} errors",
  "hexParse.warningCount": "{n} warnings",

  "settings.title": "Settings",
  "settings.guiScale": "GUI Scale: {n}",
  "settings.gridZoom": "Grid Zoom",
  "settings.enableWobblyPatterns": "Enable Wobbly Patterns",
  "settings.wobbleOnShake": "Patterns Wobble On Shake",
  "settings.ctrlTogglesOffStrokeOrder": "Ctrl Toggles Off Stroke Order",
  "settings.clickingTogglesDrawing": "Clicking Toggles Drawing",
  "settings.clickToEditPatterns": "Click To Edit Patterns",
  "settings.autoPatternColor": "Automatically Set Pattern Color",
  "settings.showDrawTime": "Show Draw Time",
  "settings.actionOnShake": "Action On Shake",
  "settings.none": "None",
  "settings.undo": "Undo",
  "settings.clearGrid": "Clear Grid",
  "settings.gridDotsMode": "Grid Dots Mode",
  "settings.aroundMouse": "Around Mouse",
  "settings.fullGrid": "Full Grid",
  "settings.advanced": "Advanced Settings",
  "settings.wobbliness": "Pattern Wobbliness",
  "settings.mouseDotsRadius": "Mouse Dots Radius",
  "settings.dynamicResolutionURL": "Dynamic Pattern Resolution URL",
  "settings.dynamicResolutionDescription":
    "When set, all drawn patterns are sent to the /resolve endpoint of this URL to determine the pattern's color.",
  "settings.resetAll": "Reset All Settings",
  "settings.motionPermissionDenied": "Device motion permission denied :(",

  "palette.title": "Pattern Color",

  "patternTypes.evaluated": "Evaluated",
  "patternTypes.escaped": "Escaped",
  "patternTypes.undone": "Undone",
  "patternTypes.errored": "Errored",
  "patternTypes.invalid": "Invalid",
  "patternTypes.unresolved": "Unresolved",
  "patternTypes.custom": "custom",

  "controls.patternList": "Pattern list",
  "controls.undo": "Undo",
  "controls.redo": "Redo",
  "controls.clearGrid": "Clear grid",
  "controls.resetView": "Reset view",

  "sidebar.patterns": "Patterns",
  "sidebar.copyAngleSignatures": "Copy angle signatures",
  "sidebar.copyHexBugCommand": "Copy HexBug command",
  "sidebar.share": "Share",

  "swindler.lehmerCode": "Lehmer Code",
  "swindler.addItem": "Add item",
} as const;

export type MessageKey = keyof typeof en;

const zh: Record<MessageKey, string> = {
  "app.title": "HexSimulator",

  "language.label": "语言",

  "nav.staffGrid": "法杖网格",
  "nav.swindler": "堆栈重排",
  "nav.toggleNavigation": "切换导航",

  "header.github": "GitHub",
  "header.toggleColorScheme": "切换配色方案",

  "server.title": "HexCLI 服务端",
  "server.open": "服务端连接",
  "server.url": "服务端 URL",
  "server.urlDescription":
    "兼容 HexCLI 的 HTTP 端点（GET /v1/health，POST /v1/rpc）。",
  "server.token": "令牌（可选）",
  "server.tokenDescription":
    "以 Authorization: Bearer 发送，只保存在当前浏览器。",
  "server.connect": "连接",
  "server.disconnect": "断开",
  "server.connecting": "连接中…",
  "server.connected": "已连接",
  "server.disconnected": "未连接",
  "server.offline": "无法连接",
  "server.health": "健康状态",
  "server.server": "服务端",
  "server.version": "版本",
  "server.protocol": "协议",
  "server.patterns": "图案",
  "server.patternsReady": "{n} 个图案 · {source}",
  "server.patternsCached": "缓存于 {when}",
  "server.patternsLoading": "正在加载图案…",
  "server.refreshPatterns": "刷新图案",
  "server.refreshPatternsHint":
    "连上时同步一次（非实时）。按 URL 缓存在本地供本会话使用；点刷新可再同步。不会打包进前端。",
  "server.fetchedNow": "刚刚",
  "server.never": "从未",
  "server.close": "关闭",
  "server.notConnected": "请先连接 HexCLI 服务端。",
  "server.error.invalid-url": "URL 无效。",
  "server.error.mixed-content":
    "HTTPS 页面无法请求明文 HTTP 服务端。请用 http:// 打开页面、给 HexCLI 配置 TLS，或使用反向代理。",
  "server.error.private-network":
    "浏览器阻止了公网 HTTPS 页面向本地/私有地址发起的请求（Private Network Access）。请通过 http://localhost 打开 HexSimulator，或让服务端走 HTTPS。",
  "server.error.network":
    "无法连接服务端。HexCLI 启动了吗？请检查 URL、CORS 白名单和混合内容限制。",
  "server.error.timeout": "服务端没有及时响应。",
  "server.error.http-status": "服务端拒绝了请求。",
  "server.error.bad-json": "服务端返回的不是 HexCLI JSON。",
  "server.error.aborted": "请求已取消。",
  "server.error.unknown": "未知错误。",
  "server.privateNetworkHint":
    "注意：当前页面是 HTTPS，而服务端是本地地址，Chrome 可能以 Private Network Access 规则拦截。",
  "server.mixedContentHint": "当前页面是 HTTPS，浏览器会拦截明文 HTTP 服务端。",

  "stack.title": "堆栈",
  "stack.count": "{n} 个 iota",
  "stack.empty": "堆栈为空。",
  "stack.unknown": "尚未获取堆栈。",
  "stack.copy": "复制堆栈",
  "stack.copied": "已复制",
  "stack.top": "栈顶",
  "stack.index": "#{n}",
  "stack.run": "运行",
  "stack.running": "运行中…",
  "stack.reset": "重置",
  "stack.refresh": "刷新堆栈",
  "stack.mishaps": "事故",
  "stack.prints": "输出",
  "stack.messages": "消息",
  "stack.parserMessages": "解析消息",
  "stack.error": "错误",
  "stack.source": "来源",
  "stack.sourceHint": "hexParse 输入，或画布上的图案",
  "stack.step": "单步",
  "stack.stepNext": "下一步",
  "stack.stepAbort": "中止",
  "stack.stepProgress": "第 {index}/{total} 步",
  "stack.collapse": "收起堆栈面板",
  "stack.expand": "展开堆栈面板",
  "stack.ravenmind": "渡鸦之思",

  "ravenmind.title": "渡鸦之思",
  "ravenmind.none": "未设置",
  "ravenmind.parens": "{n} 个未闭合括号",

  "iota.boolean": "布尔值",
  "iota.pattern": "图案",
  "iota.position": "位于 {x}, {y}, {z}",
  "iota.listCount": "{n} 项",
  "iota.typeBadge": "iota 类型：{type}",

  "hexParse.title": "解析图案",
  "hexParse.input": "输入",
  "hexParse.description": "以空白分隔的 token，例如 num_1 num_2 add",
  "hexParse.loadError": "无法加载图案注册表",
  "hexParse.serverRequired":
    "尚未从服务端获取图案注册表——连接后才能解析命名图案。数字、遮罩和角度签名仍可离线解析。",
  "hexParse.registry": "服务端提供 {n} 个图案",
  "hexParse.offlineBadge": "离线（仅数字/遮罩）",
  "hexParse.parseAndDraw": "解析并绘制",
  "hexParse.errorWarningCount": "{errors} 个错误，{warnings} 个警告",
  "hexParse.patternCount": "{n} 个图案",
  "hexParse.errorCount": "{n} 个错误",
  "hexParse.warningCount": "{n} 个警告",

  "settings.title": "设置",
  "settings.guiScale": "GUI 缩放：{n}",
  "settings.gridZoom": "网格缩放",
  "settings.enableWobblyPatterns": "启用图案抖动",
  "settings.wobbleOnShake": "摇动设备时图案抖动",
  "settings.ctrlTogglesOffStrokeOrder": "Ctrl 键切换关闭笔画顺序",
  "settings.clickingTogglesDrawing": "点击切换绘制",
  "settings.clickToEditPatterns": "点击编辑图案",
  "settings.autoPatternColor": "自动设置图案颜色",
  "settings.showDrawTime": "显示绘制用时",
  "settings.actionOnShake": "摇动时的操作",
  "settings.none": "无",
  "settings.undo": "撤销",
  "settings.clearGrid": "清空网格",
  "settings.gridDotsMode": "网格点模式",
  "settings.aroundMouse": "鼠标周围",
  "settings.fullGrid": "整个网格",
  "settings.advanced": "高级设置",
  "settings.wobbliness": "图案抖动幅度",
  "settings.mouseDotsRadius": "鼠标点半径",
  "settings.dynamicResolutionURL": "动态图案解析 URL",
  "settings.dynamicResolutionDescription":
    "设置后，所有绘制的图案都会发送到此 URL 的 /resolve 端点，以确定图案的颜色。",
  "settings.resetAll": "重置所有设置",
  "settings.motionPermissionDenied": "设备运动权限被拒绝 :(",

  "palette.title": "图案颜色",

  "patternTypes.evaluated": "已求值",
  "patternTypes.escaped": "已逃逸",
  "patternTypes.undone": "已撤销",
  "patternTypes.errored": "已出错",
  "patternTypes.invalid": "无效",
  "patternTypes.unresolved": "未解析",
  "patternTypes.custom": "自定义",

  "controls.patternList": "图案列表",
  "controls.undo": "撤销",
  "controls.redo": "重做",
  "controls.clearGrid": "清空网格",
  "controls.resetView": "重置视图",

  "sidebar.patterns": "图案",
  "sidebar.copyAngleSignatures": "复制角度签名",
  "sidebar.copyHexBugCommand": "复制 HexBug 指令",
  "sidebar.share": "分享",

  "swindler.lehmerCode": "Lehmer 码",
  "swindler.addItem": "添加一项",
};

export const messages: {
  en: Record<MessageKey, string>;
  zh: Record<MessageKey, string>;
} = { en, zh };

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
