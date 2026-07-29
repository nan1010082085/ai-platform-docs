# AI 应用五项迭代 — 计划与进度

> 产品工作坊五项问题的一次性工程落地。  
> **最后更新：2026-07-07** · 状态：**全部 Phase 已完成**

**关联文档**：[插件中心（独立）](../plugin.md) · [未完成任务 backlog](./backlog.md) · [Workflow 术语表](./workflow-terminology.md)

---

## 背景问题

| # | 问题 | 目标 | 结果 |
|---|------|------|------|
| 1 | 触发节点 vs 调用通道概念混淆 | 术语 + 设计器说明 + 执行记录中文 | ✅ |
| 2 | Skill 未进生产配置 | `plugins/skills/` + expert 引用 | ✅ |
| 3 | Sidebar / Shell 导航碎片化 | AI 应用内导航（不改 Shell） | ✅ |
| 4 | Chat 里 Workflow 轮询非流式 | WebSocket `workflow:event` | ✅ |
| 5 | 文档与实现漂移 | 文档与代码对齐 | ✅ |

**附加完成**：Chat LangGraph **HTTP SSE 已移除**，仅保留 WebSocket `chat:send` / `chat:event`。

---

## Phase 1 — 概念与文案 ✅

| 任务 | 证据 |
|------|------|
| `workflowInvocation.ts` — trigger 中文、调用通道常量 | `ai/app/src/constants/workflowInvocation.ts` |
| 设计器「调用通道」只读区 | `InvocationMethodsPanel.vue` |
| 手动/Webhook 触发节点文案（入口 vs 通道） | `TriggerNodePanel` / `WebhookTriggerNodePanel` |
| 执行列表 / 详情 trigger 中文 | `AgentExecutionListView` / `AgentExecutionDetailView` |
| Chat 执行 `trigger: chat` | `agentWorkflowApi.executeWorkflow(..., { trigger: 'chat' })` |

术语文档：[workflow-terminology.md](./workflow-terminology.md)

---

## Phase 2 — Skills 生产配置 ✅

| 任务 | 证据 |
|------|------|
| `platform.reply-zh.json` | `server/config/plugins/skills/` |
| `platform.schema-quality.json` | 同上 |
| 挂到 `platform.general` / `platform.editor` | `plugins/experts/*.json` |
| PluginCenter 工具中文显示名 | `getToolDisplayLabel` |
| 专家工具列中文 tag | `PluginCenterView.vue` |

插件完整说明见 **[plugin.md](../plugin.md)**。

---

## Phase 3 — AI 内导航 ✅

| 任务 | 证据 |
|------|------|
| 侧栏：对话 / 编排 / RAG / 插件 / 监控 | `AiLayout.vue` |
| 设置抽屉 → Agent 编排、插件中心 | `AiChatSettings.vue` |
| 工作流选择器「打开 Agent 编排」 | `AiChatPanel.vue` |
| 未改 Shell 菜单 | 范围遵守 |

---

## Phase 4 — Chat × Workflow WebSocket ✅

| 任务 | 证据 |
|------|------|
| `workflow:subscribe` / `workflow:event` | `platform-shared/socket/index.ts` |
| 服务端推送 | `workflowStreamHandler.ts` + `workflowExecutionPush.ts` |
| Chat 对话进度 | `useWorkflowChatExecution` + `useWorkflowExecutionStream` |
| 执行详情 WS | `subscribeWorkflowExecution` |
| 执行列表 WS（原 2s 轮询） | `watchRunningWorkflowExecutions` |
| HITL resume 后重订阅 | `AgentExecutionDetailView.confirmHitl` |

```
POST /api/ai/workflows/:id/execute  { input, trigger: "chat" }
workflow:subscribe → workflow:event → workflow:unsubscribe
```

协议文档：[events.md](../events.md) §二 · [server/docs/api-reference.md](../../../server/docs/api-reference.md)

---

## Phase 5 — 文档同步 ✅

| 文档 | 内容 |
|------|------|
| [workflow-terminology.md](./workflow-terminology.md) | 入口节点 vs trigger |
| [plugin.md](../plugin.md) | **插件中心独立文档** |
| [backlog.md](./backlog.md) | 未完成项与实现思路 |
| [design/chat.md](../design/chat.md) | Workflow WS 交互流 |
| [design/runtime.md](../design/runtime.md) | 双引擎运行时 |
| [design/workflows.md](../design/workflows.md) | 执行监控 WS |
| [agent-workflow.md](../agent-workflow.md) | Chat 集成章节 |
| [plugin-registry.md](../plugin-registry.md) / [plugin-roadmap.md](../plugin-roadmap.md) | 迁移指针 → plugin.md |

---

## 测试验收（2026-07-07）

| 套件 | 结果 |
|------|------|
| `ai/app` vitest | **330/330** |
| `server/src/ai/__tests__` | **329/329** |
| `pnpm plugin:validate` | OK（4 experts · 2 skills · 25 tools · 5 MCP） |

---

## 明确不在范围

见 [backlog.md](./backlog.md)「明确不做」：Open API SSE、Shell 菜单、Chat v2 未实现图节点等。

---

## 变更记录

| 日期 | 内容 |
|------|------|
| 2026-07-07 上午 | 五项 Phase 1–5 落地；Chat SSE 移除 |
| 2026-07-07 中午 | 执行列表/详情 WS；HITL 重订阅；文档去轮询漂移 |
| 2026-07-07 下午 | 独立 [plugin.md](../plugin.md)；[backlog.md](./backlog.md) 待办与实现思路 |
