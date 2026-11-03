export type Language = "en" | "zh";

export type MessageVars = Record<string, string | number>;

/**
 * English is the source language. Every key used in the app must be added
 * here; `zh` is typed to require a translation for each one.
 */
const en = {
  "app.title": "Hex Tools",

  "language.label": "Language",

  "nav.staffGrid": "Staff Grid",
  "nav.swindler": "Swindler",
  "nav.toggleNavigation": "Toggle navigation",

  "header.github": "GitHub",
  "header.toggleColorScheme": "Toggle color scheme",

  "hexParse.title": "Parse patterns",
  "hexParse.input": "Input",
  "hexParse.description": "Whitespace-separated tokens, e.g. num_1 num_2 add",
  "hexParse.loadError": "Couldn't load patterns.json",
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
  "app.title": "Hex 工具",

  "language.label": "语言",

  "nav.staffGrid": "法杖网格",
  "nav.swindler": "堆栈重排",
  "nav.toggleNavigation": "切换导航",

  "header.github": "GitHub",
  "header.toggleColorScheme": "切换配色方案",

  "hexParse.title": "解析图案",
  "hexParse.input": "输入",
  "hexParse.description": "以空白分隔的 token，例如 num_1 num_2 add",
  "hexParse.loadError": "无法加载 patterns.json",
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
