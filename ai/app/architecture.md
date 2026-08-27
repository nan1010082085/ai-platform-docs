---
title: AI App 架构与分层
---

# AI App 架构与分层

> `ai/app/` 前端应用的实现级结构：目录规范、Store / Composable / API 清单、插件适配层与 Harness 客户端。

## 一、分层规范

AI App 前端遵循平台统一分层（与 editor / flow / ua 一致）：

| 层 | 位置 | 职责 | 约束 |
|------|------|------|------|
| 页面视图 | `views/` | 路由级页面组装 | 只做页面编排，不写复杂业务逻辑 |
| UI 组件 | `components/` | 可复用渲染组件 | 只做渲染；业务逻辑下沉 composables/stores |
| 全局状态 | `stores/` | Pinia Store | 全局状态唯一出口，禁止组件内裸状态跨页共享 |
| 公共逻辑 | `composables/` | `useXXX` 组合式函数 | 公共逻辑统一组合式 API，废弃零散 utils |
| API 聚合 | `api/` | 所有后端请求 | 组件/stores/composables 禁止直接 `fetch()` |
| 插件适配 | `plugins/` | DSH/Cordis 插件容器 | 业务代码只允许 `import ... from '@/plugins'` |
| 常量 | `constants/` | 静态枚举/元数据 | errorCodes、节点类型、模型 Provider 元数据 |
| 类型 | `types/` | 本地协议类型 | 跨项目共享类型放 `platform-shared/ai` |

## 二、API 聚合层（src/api/）

所有后端请求经 `src/api/` 聚合；`api/shared/request.ts` 提供统一请求封装（token 注入、租户头 `X-Tenant-Id`、错误处理），`api/shared/blobRequest.ts` 提供二进制流请求。

| 模块 | 文件 | 职责 |
|------|------|------|
| `aiApi/` | `base.ts` | AI API 基类与通用请求 |
| | `conversation.ts` | 对话 CRUD、消息、流式（WebSocket） |
| | `document.ts` | 文档上传/解析 |
| | `evaluation.ts` | 评测数据集与运行 |
| | `llm.ts` | LLM 调用与配置 |
| | `mcp.ts` | MCP Server 管理 |
| | `memory.ts` | 记忆管理 |
| | `monitor.ts` | Agent 监控统计 |
| | `rag.ts` | 知识库 / 检索 |
| | `workflowTemplate.ts` | 工作流模板 |
| `agentWorkflowApi.ts` | 工作流 CRUD、发布、执行、HITL 恢复、invoke |
| `workflowInvokeApi.ts` | 外部集成 invoke 调用 |
| `apiKeyApi.ts` / `tenantApi.ts` | API Key / 租户 |
| `modelApi.ts` / `modelConfigApi.ts` / `providerApi.ts` | 模型 / 模型配置 / Provider |
| `pluginApi.ts` / `tenantPluginApi.ts` | 插件中心 / 租户插件 |

> 接口对接遵循服务端既有规范（前端不修改 `server/`），新增端点时先在 `api/` 聚合。

## 三、Pinia Store（src/stores/）

| Store | 文件 | 职责 |
|------|------|------|
| `useAiStore` | `ai.ts` | 兼容层主 Store（`stores/ai/` 拆分前的入口） |
| | `ai/actions.ts` | AI 动作分发（生成/工具调用） |
| | `ai/events.ts` | 流式事件处理（v1/v2 事件 → 状态） |
| | `ai/requirement.ts` | 需求分析/确认状态 |
| | `ai/workflow.ts` | 工作流相关状态 |
| `useConversationStore` | `conversation.ts` | 对话列表/当前会话 |
| `useStreamStore` | `stream.ts` | WebSocket 流式缓冲与事件队列 |
| `useSchemaStore` | `schema.ts` | 当前 Schema 与版本对比 |
| `useRAGStore` | `rag.ts` | RAG 检索状态 |
| `useChatSettingsStore` | `chatSettings.ts` | 对话设置（模型/参数） |
| `useChatConfigStore` | `chatConfig.ts` | 对话配置 |
| `useHITLStore` | `hitl.ts` | HITL 中断/恢复状态 |
| `useAgentWorkflowDesignerStore` | `agentWorkflowDesigner.ts` | 设计器画布/节点/边状态 |
| `usePublishedAgentWorkflowsStore` | `publishedAgentWorkflows.ts` | 已发布工作流缓存 |

统一导出见 `stores/index.ts`（`useAiStore` 保持向后兼容）。

## 四、组合式 API（src/composables/）

| 领域 | Composables |
|------|-------------|
| Chat | `useChatAttachments`（多模态附件）、`useChatScroll`、`useSmartSuggestions`、`useActionProposals` |
| 工作流执行 | `useWorkflowChatExecution`、`useWorkflowExecutionStream`、`useWorkflowInvoke`、`useWorkflowInvokeInfo`、`useWorkflowSelfTest`、`useWorkflowSuggestion`、`useWorkflowTemplates`、`usePublishedAgentWorkflows` |
| 设计器 | `useAgentNodePropertyPanel`（节点属性面板注册）、`useEdgePath`、`useFlowPreview`、`useWorkflowActions` |
| 模型 | `useModelCenter`、`useModelOptions`、`useModelPresets` |
| 插件 | `usePluginRegistry`（Registry 快照）、`usePluginRuntime`、`useMcpHealth` |
| 预览 | `usePreviewCompare`、`usePreviewInteraction` |
| Shell 嵌入 | `useShellEmbed`（qiankun/iframe 嵌入检测与上下文桥接） |
| 监控 / 多语言 | `useAiMonitor`、`useAiLocale` |

## 五、DSH/Cordis 插件适配层（src/plugins/）

M0 落地的插件体系融合（设计依据：`ai/docs/design/dsh-cordis-integration.md`）。**业务代码只允许 `import ... from '@/plugins'`**，禁止直接引用 `@deepseek-ai/cordis` / `@deepseek-ai/dsh-*`，Cordis API 变更只影响适配层内部。

| 文件 | 职责 |
|------|------|
| `index.ts` | 唯一出口（host 生命周期、serviceState、builtin tools、layers、adapter 转换、palette 项） |
| `host.ts` | 插件宿主生命周期：`startPluginHost` / `ensurePluginHost` / `stopPluginHost` |
| `bridge.ts` | 桥接服务状态（`serviceState`） |
| `config/builtin.ts` | 内置工具定义与分类（`BUILT_IN_TOOLS`） |
| `config/layers.ts` | 配置分层：`builtin < registry overlay < local patch`（`mergeLayers`） |
| `config/nodeTypes.ts` | Agent 画布 Palette 项与节点配色（`AGENT_PALETTE_ITEMS`） |
| `config/renderers.ts` | 消息渲染器注册 |
| `registry-adapter.ts` | 服务端 Registry 工具 → 适配层工具定义（`registryToolToDef`） |
| `skill-adapter.ts` | 平台 Skill → 适配层技能定义（`platformSkillToDef`） |
| `plugins/chat-tools` | 工具定义类型与分类（`ToolDef` / `ToolCategory`） |
| `plugins/node-types` / `plugins/renderers` | 节点类型 / 渲染器插件 |

**铁律**（见 `ai/CLAUDE.md`）：

- 插件（代码）静态装载；工具 / workflow / skill 是数据，由插件运行时动态注册（`chatTools.setOverlay` / `ctx.tools.register`）
- workflow 永远是数据不是插件；浏览器端禁止 loader 运行时动态 import
- 版本锁定：`@deepseek-ai/cordis@4.0.1`、`@deepseek-ai/dsh@0.1.0-rc.6` 精确版本，升级需逐包评审

## 六、多语言与遥测

- **i18n**：`locales/zh-CN.ts` / `locales/en-US.ts`，`useAiLocale` 读写本地语言偏好
- **遥测**：`utils/telemetry.ts`（`initAiTelemetry` / `disposeAiTelemetry`），上报 AI 交互埋点
- **主题**：`styles/ai-theme-bridge.scss`、`graphEdgeStates.scss` 桥接 platform-shared 主题变量与画布边状态

## 八、测试

| 类型 | 位置 | 说明 |
|------|------|------|
| 单元（Vitest） | `src/__tests__/`、`stores/__tests__/`、`stores/ai/__tests__/`、`api/*.spec.ts`、`plugins/__tests__/` | Store 行为、API 封装、适配层转换、消息组件 |
| E2E（Playwright） | `e2e/auth.spec.ts` | 认证链路（`pnpm test:e2e`） |
| 类型检查 | — | `pnpm typecheck`（vue-tsc --noEmit） |

## 九、相关文档

- [App 概览](./index) — 定位、功能、运行与嵌入模式
- [路由与页面](./routing) — 完整路由表与守卫
- [ai-shared API](../ai-shared) — 共享类型/事件/Prompt
- [设计概览](../design/overview) — 信息架构线框
