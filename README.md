# minichat

> 一个**纯前端、零后端**的角色扮演聊天工具，原本对接 [MiniMax M2-her](https://platform.minimaxi.com/docs/guides/text-chat) 跑对话。  
> **项目本身也是对 M2-her 的一次实地测试**——结论写在下方。

[![GitHub](https://img.shields.io/badge/GitHub-klarkxy%2Fminichat-black?logo=github)](https://github.com/klarkxy/minichat)
[![License: SATA 2.0](https://img.shields.io/badge/License-SATA%202.0-blue.svg)](./LICENSE)

---

## ⚠️ 当前状态（重要）

**实测结论：M2-her 服务端在 2026-05 时点对高级角色存在 100% 触发 500 错误的 bug。**

具体表现：任何包含以下高级角色的请求都会**稳定**触发
```json
{"type":"error","error":{"type":"server_error","message":"unknown error, 999 (1000)","http_code":"500"}}
```
- `role: "user_system"` → 100% 500
- `role: "group"` → 100% 500
- `role: "sample_message_user"` / `"sample_message_ai"` → 100% 500

**但官方文档明确写了 M2-her 支持这些角色**：
[platform.minimaxi.com/docs/guides/text-chat](https://platform.minimaxi.com/docs/guides/text-chat)（"高级角色"小节）

**只 `system` / `user` / `assistant` 三个基础角色能正常返回 200。**

### 这意味着什么

`minichat` 按官方文档正确实现了：
- 选 AI 角色 → 注入 `system` + 3 对 `sample_message_*`
- 选「我的人设」→ 注入 `user_system`
- 写场景 → 注入 `group`

这些用法**符合文档**，但**实际服务端 100% 报错**，导致无法跑通。

**本项目保留原状（按文档用法实现），等 MiniMax 修复服务端后再可用。**

### 现在能跑通的路径

如果你的 MiniMax 账户有余额，可以这样临时用：

1. **国际端（minimax.io）+ MiniMax-M3**（M3 是 OpenAI 兼容格式的**通用**模型，不是对话专用）
   - 设置里切到「国际 (minimax.io)」
   - 模型名填 `MiniMax-M3`
   - **这路径 minichat 会在 api 层自动降级**：把所有高级角色（user_system / group / samples）拼到 `system` prompt 文本里
   - M3 role-play 能力**不如 M2-her**（实测 M2-her 切中文后角色扮演更沉浸），但能用

2. **等 MiniMax 修服务端 bug**（推荐关注 [M2-her 文档](https://platform.minimaxi.com/docs/guides/text-chat) 的更新）

3. **自己改代码**（如果你想）：把 `src/api/minimax.ts` 里 `buildRequestBody` 的 cn 分支删掉，全走 global 分支的降级逻辑。M2-her 服务端即使收到 OpenAI 兼容格式也能返回 200（基础角色），只是失去高级角色能力。

---

## ✨ 功能（如果服务端修好就能用）

- 🧙 **人物管理**：手动创建或用 AI 一键生成角色 system prompt + 3 条 few-shot 样本
- 💬 **角色对话**：基于 MiniMax 的多轮对话，**流式打字效果**，可随时停止
- 🎬 **场景设定**：每个对话可以单独设置场景，注入到 `group` 消息
- 👤 **user_system**：人物列表里"我的人设"类型，对话时作为 `user_system` 注入
- ⚙️ **运行时可调**：右上角齿轮随时切换 endpoint、修改 API Key、调整 temperature
- 💾 **本地优先**：所有数据存 `localStorage`，无需后端、无需登录
- 🔍 **可审计**：所有代码开源，欢迎页自带"如何审计"指南
- 📱 **响应式**：桌面端微信式左右分栏，移动端单栏切换

## 🚀 快速开始

### 在线使用（**注意上面"当前状态"**）

直接打开 **<https://klarkxy.github.io/minichat/>**。

第一次访问会被引导完成 3 步配置：
1. 选择 endpoint
2. 填入 API Key
3. 点击「发送一次测试请求」—— 看到 ✅ 后即可进入

### 本地开发

```bash
git clone https://github.com/klarkxy/minichat
cd minichat
npm install
npm run dev      # http://localhost:5173
```

### 构建

```bash
npm run build    # 产物在 dist/ 目录
```

`vite.config.ts` 里 `base: './'` 让 build 产物可部署到任意子路径。

### 部署到 GitHub Pages

本仓库自带 `.github/workflows/deploy.yml` —— push 到 `main` 分支后 GitHub Actions 自动 build + 部署。

## 🤖 模型

| 用途 | 模型 | 端点 | 状态 |
|---|---|---|---|
| **跑对话**（默认） | `M2-her` | 国内 minimaxi.com | ⚠️ 服务端 bug，等官方修 |
| **跑对话**（临时方案） | `MiniMax-M3` | 国际 minimax.io | ✅ 可用（role-play 效果弱） |
| **AI 写人设** | 用户可改 | 任意 | 取决于你 |

设置里可以手动改"对话模型"和"生成模型"。

## 🔍 隐私与安全

- **API Key**：只存你浏览器的 `localStorage`，本站没有任何后端
- **没有后端**：纯静态页面，托管在 GitHub Pages
- **数据随时清空**：右上角齿轮 → 「清空所有数据」

## 🧰 技术栈

| 维度 | 选型 |
|---|---|
| 构建 | Vite 5 |
| 框架 | React 18 + TypeScript |
| 路由 | react-router-dom v6（HashRouter，GitHub Pages 友好） |
| 状态 | React Context + useReducer + `localStorage` 持久化 |
| 样式 | CSS Modules + CSS Variables（设计 token 体系，**不引入任何 UI 框架**） |
| 图标 | lucide-react |
| 流式协议 | SSE（`text/event-stream`） |

## ❓ 常见问题

**Q：API Key 安全吗？**
A：只存在你浏览器的 `localStorage`，本站没有任何后端。你可以打开 DevTools 验证。

**Q：为什么 M2-her 一直报 999？**
A：MiniMax 服务端 bug，详见上方"⚠️ 当前状态"。

**Q：我能修复吗？**
A：本地项目里把 `src/api/minimax.ts` 的 `buildRequestBody` 函数 cn 分支删掉就行。但会失去高级角色能力。也可以等官方修。

**Q：想贡献代码？**
A：欢迎 fork / PR。如果 MiniMax 修好服务端，本项目即可直接跑通。

## 📜 License

本项目采用 [SATA 2.0（Star And Thank Author License v2.0）](./LICENSE)。

简单说：
- ✅ 自由使用、修改、分发、商用
- ⭐ **使用前请先给 [项目仓库](https://github.com/klarkxy/minichat) 加 Star**
- 💌 欢迎以各种方式感谢作者
- 📝 保留 copyright 和 project url 声明
- ❌ 协议不提供任何担保

## 🙏 致谢

- 感谢 [MiniMax](https://platform.minimaxi.com) 提供的 API
- M2-her 服务端 bug 报告：[MiniMax 平台反馈](https://platform.minimaxi.com)
- 感谢所有为本项目加 Star 和反馈的伙伴
