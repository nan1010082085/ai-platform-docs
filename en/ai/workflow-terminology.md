# Agent Workflow Terminology

> Distinguishes **canvas entry nodes** from **execution triggers** when configuring and integrating workflows.

## Two layers

| Layer | Meaning | Appears as |
|---|---|---|
| **Canvas entry node** | Where the DAG starts | `manual-trigger`, `webhook-trigger`; `entryNodeId` |
| **Execution trigger** | Who started this run | `execution.trigger` |

They are independent: Chat can bind a workflow and send a message while the canvas entry remains a manual-trigger node, but `trigger` is recorded as `chat`.

## Entry nodes

| Type | Label | Description |
|---|---|---|
| `manual-trigger` | Manual | Default entry; designer test, chat, and Open API can all start here |
| `webhook-trigger` | Webhook | HTTP entry; body/query map to `$input` |

## Trigger values

| Value | Typical use |
|---|---|
| `manual` | Designer “Test run” |
| `chat` | Chat bound to a published workflow |
| `webhook` | `POST /api/ai/webhooks/...` |
| `api` | `POST /api/ai/workflows/invoke/...` with platform or workflow Key |

## Call channels

1. Designer test — `manual`
2. AI chat — `chat` (WebSocket `workflow:event`)
3. Webhook — `webhook`
4. Unified invoke — `api` (`X-API-Key` or `X-Workflow-Key`)

See [Chat design](./design/chat.md), [Runtime](./design/runtime.md), and [Plugin center](./plugin.md).
