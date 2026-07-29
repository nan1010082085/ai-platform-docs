# Agent Workflow 术语表

> 产品与研发对齐用。避免把「画布入口节点」与「执行触发通道」混为一谈。

## 两层概念

| 层 | 含义 | 体现在 |
|---|---|---|
| **画布入口节点** | DAG 从哪个节点开始跑 | `manual-trigger`、`webhook-trigger` 节点；`entryNodeId` |
| **执行触发方式 (trigger)** | 谁发起了这次运行 | 执行记录字段 `execution.trigger` |

二者独立：例如 Chat 选择工作流后发送消息，画布入口仍可以是「手动触发」节点，但 `trigger` 记为 `chat`。

## 入口节点（Palette）

| 节点类型 | 中文 | 说明 |
|---|---|---|
| `manual-trigger` | 手动触发 | 默认入口；设计器测试、Chat、开放 API 均可从此进入 |
| `webhook-trigger` | Webhook 触发 | 外部 HTTP 调用专用入口；body/query 映射为 `$input` |

## 执行 trigger 枚举

| 值 | 中文 | 典型场景 |
|---|---|---|
| `manual` | 手动执行 | 设计器「测试执行」、内部 `POST .../execute` 未指定 trigger |
| `chat` | AI 对话 | Chat 设置绑定工作流后发送消息 |
| `webhook` | Webhook | `POST /api/ai/webhooks/...` |
| `api` | 开放集成 | `POST /api/ai/workflows/invoke/...` + 用户平台 Key 或工作流 Key |

前端常量：`ai/app/src/constants/workflowInvocation.ts`。

## 调用通道（工作流级）

工作流可被调用的方式（只读说明，见设计器「工作流设置 → 调用通道」）：

1. **设计器测试** — trigger: `manual`
2. **AI 对话** — trigger: `chat`（WebSocket 推送 `workflow:event`）
3. **Webhook** — trigger: `webhook`
4. **统一 invoke** — trigger: `api`（`X-API-Key` 或 `X-Workflow-Key`）

## Chat × Workflow 传输

- 启动：REST `POST /api/ai/workflows/:id/execute`（`trigger: chat`）
- 进度：**WebSocket** `workflow:subscribe` → `workflow:event`（非轮询）
- HITL：`POST .../resume` 后继续 `workflow:subscribe`

详见 [design/chat.md](../design/chat.md)、[design/runtime.md](../design/runtime.md)。

**相关**：[五项迭代记录](./ai-five-phase-iteration.md) · [插件中心](../plugin.md) · [待办 backlog](./backlog.md)
