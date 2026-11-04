# HexSimulator

**基于 HexTools 的图形化前端，可接入任意兼容 HexCLI 协议的施法服务端。**

[English](./README.md) · [协议](./docs/PROTOCOL.zh-CN.md) · [架构](./docs/ARCHITECTURE.zh-CN.md) · [第三方](./THIRD_PARTY.md)

本仓库**只含前端**（Vite/React 静态页）。界面与画布沿用 HexTools（含中英切换与移动端行为），右上角显示**栈**，左上角显示**渡鸦之思**，通过 [`docs/PROTOCOL.md`](./docs/PROTOCOL.md) 里的小型 HTTP JSON 协议与服务端互传指令和结果。

**不会**改动 HexTools 仓库，也不会动 https://hextools.xm1221.cn。

## 图案数据（重要）

注册表图案**不会打包进前端**。在**启动/连上服务端时同步一次**（`patterns.list`），写入内存与 `localStorage`（按服务端 URL 区分），**整段会话都用这份本地副本**。画图、解析时不会实时向服务端按图案拉取。需要更新时点 **刷新图案**。

`num_<n>` 数字字面量仍用客户端编码表，那不属于动作注册表。

## 快速开始

```bash
yarn install
yarn dev
yarn build
yarn smoke
```

打开 ⚙，填写 Base URL（默认 `http://127.0.0.1:8742`），连接后执行 `num_1 num_2 add`。

混合内容（https 页访问本机 http）说明见英文 README。

## 许可

MIT。基于 [HexTools](https://github.com/object-Object/HexTools)（见 `LICENSE` / `THIRD_PARTY.md`）。
