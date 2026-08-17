---
title: AI App 路由与页面
---

# AI App 路由与页面

> `ai/app/src/router.ts` 完整路由表与守卫逻辑（`createAiRouter`）。

## 一、路由总览

| 路径 | 名称 | 视图 | 说明 |
|------|------|------|------|
| `/login` | `login` | platform-shared `LoginView` | 登录页（`meta.public`），独立模式自动跳转已登录用户 |
| `/auth/callback` | `auth-callback` | `AuthCallbackView` | SSO/OAuth 回调（`meta.public`） |
| `/shared/:shareId` | `shared-conversation` | `SharedConversationView` | 分享对话只读查看（`meta.public`） |

以下均为 `AiLayout`（侧栏 + 主内容）子路由：

| 路径 | 名称 | 视图 |
|------|------|------|
| `/` | `chat` | `AiChatView` |
| `/rag` | `rag` | `RagKnowledgeBase` |
| `/memory` | `memory` | `MemoryManagementView` |
| `/integration` | `integration` | `WorkflowIntegrationView` |
| `/monitor` | `monitor` | `AiMonitorView` |
| `/plugins` | `plugin-center` | `PluginCenterView` |
| `/mcp` | `mcp-manager` | `McpManagerView` |
| `/workflows` | `agent-workflows` | `AgentWorkflowListView` |
| `/executions` | `agent-executions` | `AgentExecutionListView` |
| `/workflows/:id/executions` | `agent-workflow-executions` | `AgentExecutionListView` |
| `/settings/keys` | `api-keys` | `ApiKeyManagerView` |
| `/settings/models` | `model-settings` | `ModelSettingsView` |
| `/settings/embedding` | `embedding-settings` | `EmbeddingSettingsView` |
| `/settings/templates` | `workflow-templates` | `WorkflowTemplateManagerView` |
| `/debug/routing` | `routing-debug` | `RoutingDebugView` |
| `/debug/workflow/:id` | `workflow-debug` | `WorkflowDebugView` |
| `/debug/harness` | `harness-debug` | `HarnessTraceView` |
| `/debug/rag` | `rag-debug` | `RagDebugView` |
| `/evaluation` | `evaluation` | `EvaluationView` |
| `/schedules` | `schedules` | `ScheduleView` |

全屏页面（脱离 AiLayout 侧栏，自带顶栏工具条）：

| 路径 | 名称 | 视图 |
|------|------|------|
| `/workflows/:id` | `agent-workflow-designer` | `AgentWorkflowDesignerView` |
| `/executions/:id` | `agent-execution-detail` | `AgentExecutionDetailView` |
| `/sidebar` | `sidebar` | `AiSidebarView` | 400px 精简 Chat（嵌入模式） |

## 二、守卫与公开路由

`router.beforeEach`：

- `meta.public` 路由（`login` / `auth-callback` / `shared/:shareId`）跳过鉴权；`login` 在独立模式（非 qiankun）下若已登录，经 `resolvePostLoginNavigation` 跳转到 `redirect` 目标
- 其余路由经 `guardAuthenticatedRoute`（platform-shared `authSession`）校验 token，未登录跳转登录页

## 三、Route Base 推断（`resolveRouteBase`）

优先级从高到低：

1. 外部传入的 `routeBase`（qiankun mount 时 `props.getRouteBase()`；`mode === 'sidebar'` 时为 `/sidebar`）
2. 从 `window.location.pathname` 推断 qiankun 容器前缀（匹配 `/schema-platform/app/ai/...` 或 `/schema-platform/standalone/ai/...`）
3. `VITE_ROUTE_BASE`（独立部署时与 nginx 路径一致，避免与 BASE_URL 重复拼接）
4. `import.meta.env.BASE_URL`
5. 默认 `/`

## 四、导航高亮规则

`/workflows*` 与 `/executions*` 均激活侧栏「Agent 编排」项（见 [设计概览](../design/overview) 的 `activeNav` 规则）。

## 五、相关文档

- [App 概览](./index) — 功能与嵌入模式
- [架构与分层](./architecture) — 目录结构与各层清单
- [设计概览](../design/overview) — 信息架构与导航线框
