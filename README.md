# Hex Tools

Web tools for Hex Casting.

This is a fork of [object-Object/HexTools](https://github.com/object-Object/HexTools),
maintained at [xm1221/HexTools](https://github.com/xm1221/HexTools). It adds a
text-to-pattern input ("HexParse") to the staff grid page.

## HexParse

Open the Staff Grid page and press the keyboard button in the top-left corner.
Type whitespace-separated tokens and hit **Parse and draw**.

Try:

```
num_1 num_2 add
```

Supported token syntax:

| Token                                        | Meaning                                                  | Example              |
| -------------------------------------------- | -------------------------------------------------------- | -------------------- |
| `num_<n>`                                    | number literal, looked up in `public/data/patterns.json` | `num_123`, `num_-42` |
| `mask_<mask>`                                | HexBug mask made of `-` and `v`                          | `mask_---v-v`        |
| `<sig>` / `_<sig>`                           | angle letters, starting EAST by default                  | `waaw`, `_qqq`       |
| `<DIR>_<sig>`                                | angle letters with an explicit direction                 | `NORTH_EAST_waaw`    |
| `add`, `hexcasting:add`                      | any alias from the generated pattern list                | `break_block`        |
| `{` `}` `(` `)` `\` `escape` `intro` `retro` | Hex Casting special patterns                             | `{ num_1 }`          |

Tokens that cannot be resolved are reported as errors and skipped; the rest of
the input is still drawn. Numbers outside the pregenerated ±2000 table fall
back to a greedy encoding and are shown with a warning.

The parser lives in [`src/hexparse/`](src/hexparse) and has a smoke test:

```sh
yarn verify-hexparse
```

## Refreshing the pattern data

`public/data/patterns.json` is generated from
[hexdoc](https://github.com/object-Object/hexdoc) pattern files published by each
Hex Casting mod, plus a pregenerated table of number literals.

```sh
# optional: put hexdoc + the mods into a throwaway directory
uv pip install --target .vendor-hexdoc -r scripts/requirements.txt

yarn generate-patterns   # python3 scripts/generate_patterns.py
```

The script scans `**/*.patterns.hexdoc.json` under `.vendor-hexdoc` (override
with `HEXDOC_VENDOR_DIR`), merges them, and combines the result with
`scripts/data/numbers_2000.json`. Mods that fail to install are recorded under
`gaps` in the output instead of aborting. `SKIP_INSTALL=1` reuses an existing
`.vendor-hexdoc` directory.

The generated JSON is committed, so CI and ordinary builds never need Python.

## Build and deploy

```sh
corepack yarn install
corepack yarn build
```

Deployment target is Cloudflare Pages (project `hextools`, custom domain
`hextools.xm1221.cn`). Manual deploy:

```sh
npx wrangler@4 pages deploy dist --project-name=hextools --branch=main
```

`.github/workflows/deploy-pages-cf.yml` does this automatically on pushes to
`main` when a `CLOUDFLARE_API_TOKEN` repository secret exists; without the
secret the job still succeeds and only builds. The upstream GitHub Pages
workflow is kept for the original repository.

## Credits

- [object-Object/HexTools](https://github.com/object-Object/HexTools) — upstream project
- [hexdoc](https://github.com/object-Object/hexdoc) — pattern metadata and the `.patterns.hexdoc.json` format
- [HexBug](https://github.com/object-Object/HexBug) — mask syntax, number literal encoding, special pattern semantics
- [hexparse](https://github.com/object-Object/hexparse) — the text-to-pattern idea

Licensed under the MIT license, see [LICENSE](LICENSE).

---

# Hex Tools（中文）

本项目是 [object-Object/HexTools](https://github.com/object-Object/HexTools) 的 fork，
仓库位于 [xm1221/HexTools](https://github.com/xm1221/HexTools)，
在线地址 <https://hextools.xm1221.cn>。
在原版 Staff Grid 页面上新增了「文本转图案」输入框（左上角键盘按钮）。

## 用法

在 Staff Grid 页面点击左上角的键盘图标，输入以空格分隔的图案标记，然后点
**Parse and draw**（解析并绘制）。例如：

```
num_1 num_2 add
```

支持的写法：

- `num_<整数>`：数字字面量，例如 `num_123`、`num_-42`
- `mask_<掩码>`：HexBug 的掩码语法，只能包含 `-` 和 `v`，例如 `mask_---v-v`
- `waaw`、`_qqq`：角度字母，默认从 EAST 开始
- `NORTH_EAST_waaw`：显式指定起始方向
- `add`、`hexcasting:add`：任何已收录的图案别名
- `{` `}` `(` `)` `\` `escape` `intro` `retro`：Hex Casting 的特殊图案

无法识别的标记会以错误提示列出并被跳过，其余标记照常绘制。超出预生成
±2000 范围的数字会退化为贪心编码，并给出警告。

## 刷新图案数据

`public/data/patterns.json` 由各 Hex Casting 模组发布的
[hexdoc](https://github.com/object-Object/hexdoc) 图案文件，加上预生成的数字表合并而成：

```sh
uv pip install --target .vendor-hexdoc -r scripts/requirements.txt
yarn generate-patterns
```

脚本会扫描 `.vendor-hexdoc` 下的 `**/*.patterns.hexdoc.json`（可用
`HEXDOC_VENDOR_DIR` 覆盖目录），与 `scripts/data/numbers_2000.json` 合并后写出
`public/data/patterns.json`。安装失败的模组会记录在输出的 `gaps` 字段中，
不会中断流程；已有 `.vendor-hexdoc` 时可设置 `SKIP_INSTALL=1` 跳过安装。

生成的 JSON 已提交到仓库，因此普通构建和 CI 都不需要 Python。

自检脚本：

```sh
yarn verify-hexparse
```

## 构建与部署

```sh
corepack yarn install
corepack yarn build
```

部署到 Cloudflare Pages（项目名 `hextools`，自定义域名 `hextools.xm1221.cn`）。
手动部署：

```sh
npx wrangler@4 pages deploy dist --project-name=hextools --branch=main
```

`.github/workflows/deploy-pages-cf.yml` 会在 push 到 `main` 时自动构建并部署；
如果仓库没有配置 `CLOUDFLARE_API_TOKEN` secret，则只构建、不部署，任务不会失败。
上游原有的 GitHub Pages workflow 保留不动。

## 致谢与许可

感谢上游 HexTools，以及 hexdoc、HexBug、hexparse 提供的图案数据与语法参考。
本项目沿用 MIT 许可证，见 [LICENSE](LICENSE)。
