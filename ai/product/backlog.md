# AI 平台 — 任务进度与开放缺口

> 最后更新：**2026-08-05**  
> 历史 Phase 明细与迭代日志见归档：[archive/phases-completed-through-z.md](./archive/phases-completed-through-z.md)  
> 五项工程落地总览：[archive/ai-five-phase-iteration.md](./archive/ai-five-phase-iteration.md) · [plugin.md](../plugin.md) · [platform.md](../platform.md)

---

## 进度总览

| 域 | 进度 |
|----|------|
| Phase A～Z（含五项迭代、P2、体验打磨） | **已关闭** → [归档快照](./archive/phases-completed-through-z.md) |
| Phase T — 复杂文件组件化 | **100%**（T-1～T-6 已落地，2026-08-05 校准关闭） |
| Phase U — 智能体深化 | **已关闭**（U-1～U-3 ✅；U-4 断点单步明确不做，见下） |
| Phase V — 智能体自动路由 | **已关闭**（V-1/V-2 ✅；V-3/V-4 与 handoff 并入多 Agent 记忆计划） |

---

## 开放缺口

当前无活跃 Phase 编号任务。后续能力跟进：

| 主题 | 说明 | 文档 |
|------|------|------|
| 多 Agent / handoff / 长程记忆 | chat 控制权转移、记忆分层；承接原 V-3/V-4 与 U 之后进阶 | [evolution-plan-2026-07-27-multi-agent-memory.md](./evolution-plan-2026-07-27-multi-agent-memory.md) |
| 高级能力路线 | PPT / 垂直场景等按需排期 | [advanced-features-roadmap.md](./advanced-features-roadmap.md) |
| 开放平台路线 | 开源/集成扩展索引 | [open-platform-roadmap.md](./open-platform-roadmap.md) |

### 2026-08-05 校准说明（T / U / V）

对照 `ai/app` 代码：

| 项 | 结论 |
|----|------|
| T-1 NodeTraceList / ExecutionHITLDialog | ✅ |
| T-2 `aiApi.ts` barrel + `aiApi/*` 域拆分 | ✅ |
| T-5 WorkflowTemplateCard + list 拆分 | ✅ |
| T-6 useModelCenter | ✅ |
| U-1 子 workflow 调用 / U-2 成本可见 / U-3 配额 | ✅（见归档 Phase U 计划） |
| **U-4** WorkflowDebugView 断点单步 | **明确不做**（原计划标注可选；无 `breakAtNodeId` / 单步 UI） |
| V-1 / V-2 routingKeywords + 建议/自动切换 | ✅ |
| V-3 graph `workflow-exec` / V-4 更深 handoff | **延后** → [multi-agent-memory 计划](./evolution-plan-2026-07-27-multi-agent-memory.md) |

---

## 明确不做

| 项 | 原因 |
|----|------|
| Chat HTTP SSE | 已删除，仅 WebSocket |
| Shell 改菜单 | 范围外 |
| 恢复 `/api/ai/open/*` | 基线 1.0 已删除，统一 invoke |
| 单独一级「模板预览」侧栏 | 与模板 Tab 重复 |
| `@ai-sdk` / `@schema-platform/workflow-client` | 无消费者，已删除 |
| **U-4 断点单步调试** | 可选需求，本期不做 |

---

## 产品定位（鉴权）

- **主路径**：全部业务 API **JWT**（`authMiddleware`）
- **集成**：`POST /api/ai/workflows/invoke/{slug}` + **`X-Workflow-Key`**（`wf-...`）或 **`X-API-Key`**（`sk-...`）二选一
- 外部系统直接调用 REST API，无需额外 SDK

---

## 归档索引

| 文档 | 说明 |
|------|------|
| [archive/](./archive/) | 归档目录总览 |
| [archive/phases-completed-through-z.md](./archive/phases-completed-through-z.md) | 原 backlog 全文（A～Z 明细 + 迭代日志） |
| [archive/ai-five-phase-iteration.md](./archive/ai-five-phase-iteration.md) | 五项迭代完成记录 |
| [archive/evolution-plan-2026-07-20.md](./archive/evolution-plan-2026-07-20.md) | 早期演进计划 |
| [archive/evolution-plan-2026-07-22-workflow-as-agent.md](./archive/evolution-plan-2026-07-22-workflow-as-agent.md) | Workflow-as-Agent（Q/R/S/T） |
| [archive/evolution-plan-2026-07-22-phase-u.md](./archive/evolution-plan-2026-07-22-phase-u.md) | Phase U 计划（已关闭） |
| [archive/evolution-plan-2026-07-24-product-polish.md](./archive/evolution-plan-2026-07-24-product-polish.md) | 产品打磨 X/Y/Z |
| [archive/langgraph-workflow-nodes-roadmap.md](./archive/langgraph-workflow-nodes-roadmap.md) | Phase J 白盒路线 |
| [archive/f-p-prompt-architecture.md](./archive/f-p-prompt-architecture.md) | Phase F Prompt 专项 |
| [archive/f2-survey-remaining.md](./archive/f2-survey-remaining.md) | F.2 调研剩余项 |
| [archive/iteration-evolution.md](./archive/iteration-evolution.md) | A1–A3 产品演进 |
| [archive/iteration-plan-2026-07-23.md](./archive/iteration-plan-2026-07-23.md) | 2026-07-23 迭代计划 |
| [archive/dev-execution-plan.md](./archive/dev-execution-plan.md) | A1–A3 开发执行计划 |
| [archive/reserved-events-decision.md](./archive/reserved-events-decision.md) | A2 预留事件决策 |
| [archive/plugin-market-security.md](./archive/plugin-market-security.md) | A3.3 插件市场安全 |
