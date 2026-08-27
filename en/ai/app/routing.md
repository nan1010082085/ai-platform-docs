---
title: AI App Routing & Pages
---

# AI App Routing & Pages

> Full route table and guard logic of `ai/app/src/router.ts` (`createAiRouter`).

## 1. Route Overview

| Path | Name | View | Description |
|------|------|------|------|
| `/login` | `login` | platform-shared `LoginView` | Login page (`meta.public`); standalone mode auto-redirects logged-in users |
| `/auth/callback` | `auth-callback` | `AuthCallbackView` | SSO/OAuth callback (`meta.public`) |
| `/shared/:shareId` | `shared-conversation` | `SharedConversationView` | Read-only shared conversation (`meta.public`) |

Children of `AiLayout` (sidebar + main content):

| Path | Name | View |
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
| `/debug/rag` | `rag-debug` | `RagDebugView` |
| `/evaluation` | `evaluation` | `EvaluationView` |
| `/schedules` | `schedules` | `ScheduleView` |

Fullscreen pages (outside `AiLayout`, with their own top toolbar):

| Path | Name | View |
|------|------|------|
| `/workflows/:id` | `agent-workflow-designer` | `AgentWorkflowDesignerView` |
| `/executions/:id` | `agent-execution-detail` | `AgentExecutionDetailView` |
| `/sidebar` | `sidebar` | `AiSidebarView` | 400px compact chat (embed mode) |

## 2. Guards & Public Routes

`router.beforeEach`:

- `meta.public` routes (`login` / `auth-callback` / `shared/:shareId`) skip auth; in standalone (non-qiankun) mode a logged-in user on `login` is redirected via `resolvePostLoginNavigation` to the `redirect` target
- All other routes go through `guardAuthenticatedRoute` (platform-shared `authSession`); unauthenticated users are sent to the login page

## 3. Route Base Inference (`resolveRouteBase`)

Priority (high to low):

1. Externally passed `routeBase` (`props.getRouteBase()` on qiankun mount; `/sidebar` when `mode === 'sidebar'`)
2. Inferred from `window.location.pathname` for qiankun container prefixes (matching `/schema-platform/app/ai/...` or `/schema-platform/standalone/ai/...`)
3. `VITE_ROUTE_BASE` (matches the nginx path in standalone deploys, avoiding double base with BASE_URL)
4. `import.meta.env.BASE_URL`
5. Default `/`

## 4. Nav Highlight Rules

`/workflows*` and `/executions*` both activate the "Agent Workflows" sidebar item (see the `activeNav` rule in [Design Overview](../design/overview)).

## 5. Related Docs

- [App Overview](./index) — features and embed modes
- [Architecture & Layers](./architecture) — directory structure and layer inventory
- [Design Overview](../design/overview) — information architecture and nav wireframes
