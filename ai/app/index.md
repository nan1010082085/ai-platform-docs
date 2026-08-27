---
title: AI App 前端应用
---

# AI App 前端应用（@ai-app）

> `ai/app/` — AI 智能助手前端，对话式 Schema 生成、流程编排、版本管理。
> 实现级文档（目录结构、Store/Composable/API 清单）见 [架构与分层](./architecture)，
> 路由与页面见 [路由与页面](./routing)。

## 一、定位

Schema Form Platform 的 AI 交互层：通过自然语言对话驱动表单 Schema 与 BPMN 流程图的生成。支持多 Agent 协作、RAG 知识库检索、WebSocket 流式响应，可**独立使用**，也可作为微前端嵌入 Editor / Flow（qiankun 容器或 iframe 侧边栏）。

依赖方向：`app → @schema-platform/platform-shared`（含 `platform-shared/ai` 类型/事件/Prompt）。

## 二、功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| AI 对话 | `/` | 多 Agent 对话（Auto/Editor/Flow）、WebSocket 流式、Markdown 渲染、多模态输入、RAG 引用、任务链、Schema/Flow 预览卡片 |
| RAG 知识库 | `/rag` | 知识库列表、文档上传/向量化、检索测试 |
| 记忆管理 | `/memory` | 对话记忆 / 长程记忆查看与清理 |
| 外部集成 | `/integration` | Workflow 开放 API 的 Key 管理与调用方式 |
| 性能监控 | `/monitor` | Agent 执行统计、告警、概览 |
| 插件中心 | `/plugins` | Expert / Skill / Tool / MCP 配置与管理 |
| MCP 管理 | `/mcp` | MCP Server 配置与健康检查 |
| Agent 工作流 | `/workflows` 等 | 工作流列表、设计器、执行历史、执行详情 |
| 设置 | `/settings/*` | API Key、模型设置、Embedding 设置、工作流模板 |
| 评测 | `/evaluation` | 离线评测 workflow 质量（数据集 + 运行 + 对比） |
| 定时任务 | `/schedules` | 定时触发工作流管理 |
| 调试 | `/debug/*` | 路由调试、工作流调试、Harness 轨迹、RAG 调试 |
| 侧边栏模式 | `/sidebar` | 400px 精简 Chat，嵌入 editor/flow 右侧面板 |

完整路由表见 [路由与页面](./routing)。

## 三、技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3.5 + TypeScript 5.7 + `<script setup>` |
| UI | Element Plus 2.9（`setupElementPlus` 统一安装） |
| 状态 | Pinia（全局状态统一 Store，见 [架构与分层](./architecture#stores)） |
| 路由 | Vue Router 4（`createAiRouter`，支持 qiankun route base 推断） |
| 通信 | REST API（`src/api/` 聚合）+ WebSocket / Socket.IO 流式 |
| 流式渲染 | marked + DOMPurify（Markdown + 代码高亮） |
| 微前端 | qiankun（`vite-plugin-qiankun`，`renderWithQiankun`） |
| 多语言 | vue-i18n（`zh-CN` / `en-US`，`locales/`） |
| 工作流画布 | @vue-flow/core（`agent-workflow/` 组件） |
| 文档解析 | pdfjs-dist、xlsx、pptxgenjs、`@google/model-viewer`（3D 预览） |
| 构建 | Vite 6 + CSS Modules |
| 测试 | Vitest（单元）+ Playwright（E2E） |

## 四、运行与嵌入模式

### 4.1 独立模式

```bash
cd ai/app
pnpm dev        # http://localhost:5300
pnpm build      # vite build
pnpm preview    # 预览产物
```

开发代理：`VITE_DEV_PROXY_TARGET`（默认线上 `https://pyflow.icu`，联调本机 server 改为 `http://localhost:3001`）。

### 4.2 qiankun 微前端模式

由 Shell（ua）通过 qiankun 加载。`main.ts` 使用 `renderWithQiankun` 注册 `bootstrap/mount/unmount/update` 生命周期：

- **token 注入**：`props.getToken()` 或 `props.token` 写入 `sfp_access_token`
- **route base**：`props.getRouteBase()` 提供子应用路由前缀（如 `/schema-platform/standalone/ai`）
- **路由同步**：`installSubAppRouteSync` 保持 qiankun 与 vue-router 一致
- **standalone 兜底**：qiankun 未在 500ms 内调用 `mount()` 时直接渲染（适配 dev 模式 `__POWERED_BY_QIANKUN__` 误置）

### 4.3 侧边栏模式（iframe / qiankun）

`props.mode === 'sidebar'` 时 route base 固定为 `/sidebar`，渲染 400px 精简 Chat（`AiSidebarView`），嵌入 editor/flow 右侧面板。嵌入检测与上下文交互见 `useShellEmbed`（postMessage 桥接）。

## 五、目录速览

```
ai/app/src/
├── api/          # API 聚合层（唯一 fetch/axios 出口）
├── components/   # UI 组件（chat/ message/ preview/ agent-workflow/ workflow/ rag/ ...）
├── composables/  # 公共逻辑（useXXX）
├── stores/       # Pinia Store（全局状态唯一出口）
├── views/        # 页面级视图（与路由一一对应）
├── plugins/      # DSH/Cordis 插件适配层（唯一出口 @/plugins）
├── types/        # 本地类型
├── constants/    # 静态常量（errorCodes、节点类型、模型 Provider 元数据）
├── locales/      # i18n 文案
├── utils/        # 工具（telemetry 等）
├── router.ts     # 路由表 + 守卫
├── main.ts       # 应用引导（qiankun 生命周期）
└── main-sidebar.ts
```

分层规范与各层清单见 [架构与分层](./architecture)。

## 六、常用命令

```bash
pnpm dev              # 开发服务器（5300）
pnpm build            # vite build
pnpm typecheck        # vue-tsc --noEmit
pnpm test             # vitest run（单元）
pnpm test:coverage    # 覆盖率
pnpm test:e2e         # playwright test（e2e/auth.spec.ts）
```

## 七、相关文档

- [架构与分层](./architecture) — 目录结构、Store/Composable/API 清单、插件适配层
- [路由与页面](./routing) — 完整路由表、守卫逻辑
- [架构设计](../architecture) — AI 平台双引擎整体架构
- [设计概览](../design/overview) — 信息架构与布局线框
