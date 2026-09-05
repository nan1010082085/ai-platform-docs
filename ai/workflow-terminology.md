# 智能体工作流术语表

> 说明「画布入口节点」与「执行触发方式」的区别，便于正确配置与集成。

## 两层概念

| 层 | 含义 | 体现在 |
|---|---|---|
| **画布入口节点** | DAG 从哪个节点开始跑 | `manual-trigger`、`webhook-trigger` 节点；`entryNodeId` |
| **执行触发方式 (trigger)** | 谁发起了这次运行 | 执行记录字段 `execution.trigger` |

二者独立：例如对话中绑定工作流后发送消息，画布入口仍可以是「手动触发」节点，但 `trigger` 记为 `chat`。

## 入口节点

| 节点类型 | 中文 | 说明 |
|---|---|---|
| `manual-trigger` | 手动触发 | 默认入口；设计器测试、对话、开放 API 均可从此进入 |
| `webhook-trigger` | Webhook 触发 | 外部 HTTP 调用专用入口；body/query 映射为 `$input` |

## 执行 trigger 枚举

| 值 | 中文 | 典型场景 |
|---|---|---|
| `manual` | 手动执行 | 设计器「测试执行」、内部执行未指定 trigger |
| `chat` | AI 对话 | 对话设置绑定工作流后发送消息 |
| `webhook` | Webhook | `POST /api/ai/webhooks/...` |
| `api` | 开放集成 | `POST /api/ai/workflows/invoke/...` + 用户平台 Key 或工作流 Key |

## 调用通道（工作流级）

工作流可被调用的方式（设计器「工作流设置 → 调用通道」）：

1. **设计器测试** — trigger: `manual`
2. **AI 对话** — trigger: `chat`（WebSocket 推送 `workflow:event`）
3. **Webhook** — trigger: `webhook`
4. **统一 invoke** — trigger: `api`（`X-API-Key` 或 `X-Workflow-Key`）

## 对话 × 工作流传输

- 启动：REST `POST /api/ai/workflows/:id/execute`（`trigger: chat`）
- 进度：**WebSocket** `workflow:subscribe` → `workflow:event`
- HITL：`POST .../resume` 后继续 `workflow:subscribe`

详见 [对话设计](./design/chat.md)、[运行时设计](./design/runtime.md)、[插件中心](./plugin.md)。
