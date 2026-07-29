# 预留事件类型决策（A2.3 / A2.4）

> 日期：2026-07-20 · 对应 [dev-execution-plan.md](./dev-execution-plan.md) Epic A2.3

## 结论

**保留** `thinker_*` / `quality_check_*` 事件协议，不移除。

## 依据

| 层 | 现状 |
|----|------|
| 协议定义 | `shared/platform-shared/ai/events.ts` 已定义类型与 payload |
| 服务端 | `server/src/ai/chatStreamRunner.ts` **已发送** `thinker_start/complete`、`quality_check_start/complete` |
| 前端 | `ai/app/src/stores/ai/events.ts` **已处理** 上述事件并写入 thinking 展示 |

原先「图节点未实现」的表述针对的是 **工作流 DAG 节点**（LangGraph 可视化节点），而非对话流事件。对话侧事件链路已闭环。

## 后续（非本决策阻塞）

- 若产品需要「思考 / 质检」成为可编排的工作流节点，另开 LangGraph 节点路线图（见 `langgraph-workflow-nodes-roadmap.md`），与协议事件并存。
- 文档：在 `docs/events.md` 标明这两类为 **已实现的对话流事件**，避免再被当作「预留空洞」。

## 不做

- 不从协议删除
- 不在本迭代实现独立工作流图节点（无明确 1 版本内产品场景）
