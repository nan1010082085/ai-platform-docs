# AI 平台演进计划：Workflow-as-Agent 与交互架构优化

> 日期：2026-07-22
> 依据：代码核实（agentWorkflowExecutor / agentWorkflowRoutes / workflow.ts / debugRoutes）+ 竞品架构（Dify / Coze / n8n / LangGraph）公开资料
> 上游：[evolution-plan-2026-07-20.md](./evolution-plan-2026-07-20.md)、[backlog.md](./backlog.md)、[langgraph-workflow-nodes-roadmap.md](./langgraph-workflow-nodes-roadmap.md)
> 本文档解决三件事：① 每个工作流成为智能体的架构路径 ② workflow 直接测试界面（不只是 chat）③ 复杂界面/文件组件化重构

---

## 一、现状核实（规划前提）

### 1.1 workflow 执行能力（已具备）

| 能力 | 位置 | 状态 |
|---|---|---|
| DAG 执行器 | `agentWorkflowExecutor.ts` | ✅ 20+ 节点类型（llm/if/hitl/intent-router/summarizer/task-planner/collaboration-router/image-generate...） |
| 平台内执行（JWT 草稿测试） | `agentWorkflowRoutes.ts:180` `POST /workflows/:id/execute` | ✅ trigger 支持 manual/webhook/chat/api |
| Open API 执行（invoke key） | `agentWorkflowInvoke.ts` | ✅ slug + wf_ key |
| Chat 里跑 workflow | `stores/ai/workflow.ts` `sendWorkflowMessage` -> `runWorkflowChatTurn` -> `executeWorkflow(trigger:'chat')` | ✅ 轮询执行进度 + 流式文本 |
| HITL 人工审批 | `agentWorkflowExecutor.ts:1290` + 前端 `AgentExecutionDetailView` | ✅ |
| 路由调试界面 | `RoutingDebugView` -> `/api/ai/debug/route` | ✅ 测试意图路由，不是 workflow |

### 1.2 关键缺口（本计划要补的）

1. **没有 workflow 直接测试界面**。现状只有两条路测 workflow：
   - designer 的"手动测试执行"：发固定 `message: '手动测试执行'`（`AgentWorkflowDesignerView.vue:136`），不支持自定义输入、不显示中间节点、直接跳执行详情页。
   - "chat-test"：跳到 chat 界面带 `workflowId`，用对话测。但 chat 是"消息→轮询执行"模式，看不到 DAG 节点级流转。
   - **缺**：一个像路由调试那样的、独立于 chat 的 workflow 调用测试界面，能自定义 input、看节点执行轨迹、复跑。
2. **workflow 不是 agent**。当前 workflow 是确定性 DAG（intent-router/collaboration-router 是图内分支，不是 LLM 自主循环）。没有"让 workflow 像 agent 一样自主决定下一步"的模式。
3. **复杂文件未拆**。`ModelSettingsView`(593行/17个handler)、`AgentExecutionDetailView`(529行/HITL+图谱+日志+节点详情全堆一起)、`AgentWorkflowListView`(572行)、`aiApi.ts`(681行) 超限，违反"UI 组件只做渲染"规则。

---

## 二、产品判断：Workflow-as-Agent

### 2.1 竞品模式（公开架构，非本次联网核实）

| 平台 | Workflow | Agent | 关系 |
|---|---|---|---|
| **Dify** | 确定性 DAG 编排 | LLM 自主 ReAct 循环（Reasoning→Action→Observation） | Workflow 里放 **Agent 节点**，让 DAG 的某一段变成自主循环；Agent 应用也可调 Workflow |
| **Coze** | Bot 的"技能"/插件 | Bot = 人设+插件+触发器 | Workflow 作为 Bot 可调用的技能；Bot 自主决定何时调哪个 workflow |
| **n8n** | 确定性触发器链 | AI Agent 节点（接 LLM+工具） | Agent 节点在 workflow 内自主循环调工具 |
| **LangGraph** | StateGraph | agent loop（conditional edges） | 本质统一：graph + conditional edge = agent loop |

**核心共识**：workflow 和 agent 不是对立的，而是 **"agent 是 workflow 的一种节点/模式"**。让 workflow 成为智能体 = 在 workflow 内引入"自主循环节点"。

### 2.2 你们的定位优势

你们已经具备：
- 完整 DAG 执行器（20+ 节点）
- `intent-router` / `collaboration-router` / `task-planner` / `task-chain` —— 这套节点**已经是 agent loop 的雏形**（task-planner 拆解 → task-chain 顺序执行 → collaboration-router 决定 continue/nextStep/summarize）
- HITL 节点（人在环里）
- Chat 里跑 workflow 的链路

**所以"每个 workflow 都有成为智能体的潜质"这个判断成立**，且实现路径短：不是新建一套 agent 系统，而是给 workflow 加一个 **"agent-loop 节点"**（或强化现有 task-chain 为可循环），让任意 workflow 的某段变成自主循环。

### 2.3 三档能力定位（建议）

| 档位 | 形态 | 触发 | 自主性 |
|---|---|---|---|
| **L1 工作流** | 确定性 DAG | 手动/webhook/api/chat | 无（路由节点是预定义分支） |
| **L2 半自主** | DAG + task-planner/task-chain | 同上 | 受控循环（planner 拆解→执行→router 判定是否继续） |
| **L3 智能体** | DAG + agent-loop 节点 | 同上 + 可作为 Bot 被意图路由调用 | LLM 自主决定下一步工具/子流程 |

L1/L2 你们已具备。L3 是本计划的核心增量。

---

## 三、迭代计划

### Phase Q：Workflow 调用测试界面（优先，2-3d）

**目标**：给 workflow 一个独立于 chat 的调用测试界面，像路由调试那样直接、可复跑。

**为什么不是仅用 chat**：
- chat 是"对话轮询"模式，看不到 DAG 节点级实时流转，调试时不知道卡在哪个节点。
- chat 要求先发布（`onChatTest` 里 `if (!publishedVersion) warning`），草稿没法快速试。
- 调试 workflow 时需要：自定义 input schema 输入、单步看每个节点的输入输出、失败节点直接定位、改了图重跑。这些 chat 给不了。

**实现**：

| 子任务 | 说明 |
|---|---|
| Q-1 新建 `WorkflowDebugView.vue` | 复用 `PageHeader`。左：输入区（根据 workflow input schema 动态生成表单）；右：执行轨迹（节点列表 + 状态 + 耗时 + 展开看 input/output） |
| Q-2 复用现有 API | `POST /workflows/:id/execute`（trigger='manual'，已支持草稿）+ 轮询 `GET /workflow-executions/:id` |
| Q-3 节点轨迹渲染 | 抽 `NodeTraceList` 组件（从 `AgentExecutionDetailView` 现有节点记录逻辑提取，两边复用） |
| Q-4 入口 | designer 工具栏"测试"按钮改为：发布过→chat-test；未发布/草稿→WorkflowDebugView。或并存两个按钮 |
| Q-5 路由 | `/debug/workflow/:id`，挂到 AiLayout 设置区下拉（与"路由调试"并列） |

**验收**：草稿 workflow 不发布即可在 WorkflowDebugView 自定义输入执行，看到每个节点 input/output/耗时，失败节点标红。

### Phase R：Agent-Loop 节点（核心，3-5d）

**目标**：让任意 workflow 内可嵌入 LLM 自主循环段，workflow 即智能体。

**实现**：

| 子任务 | 说明 |
|---|---|
| R-1 server 新增 `agent-loop` 节点类型 | `agentWorkflowExecutor.ts` 加 case。节点配置：绑定的 LLM 模型、可用工具/子 workflow 列表、最大迭代数、停止条件 |
| R-2 执行器实现自主循环 | 循环：LLM 推理 → 选工具/子workflow → 执行 → 观察结果 → 回 LLM，直到 LLM 给出 finish 或达迭代上限。复用现有 tool 执行能力 + `startAgentWorkflowExecution` 递归调子 workflow |
| R-3 前端节点面板 | `AgentLoopNodePanel.vue`（模型选择用 `ModelOptionSelect`、工具多选、迭代数滑块） |
| R-4 节点 palette 注册 | `constants/agentNodes.ts` 加 agent-loop 节点定义 |
| R-5 流式 | agent-loop 内 LLM 输出走现有 stream 事件（thinker/quality_check 已有） |
| R-6 安全 | 每次工具调用记 metric（复用现有 node metric）；迭代上限硬限制；HITL 可作为循环内的"审批门" |

**验收**：一个 workflow 里放 agent-loop 节点，LLM 能自主调用同图内的 tool 节点/子 workflow，循环到完成。

### Phase S：Workflow 作为 Bot 技能被路由调用（2d）

**目标**：已发布的 workflow 可被 Chat 的意图路由识别并调用，workflow 即"专家技能"。

| 子任务 | 说明 |
|---|---|
| S-1 workflow 发布时注册到 plugin registry | 作为一种 expert/技能，带 routing keywords（workflow 元数据加 `routing` 字段） |
| S-2 intent-router 匹配 workflow | `resolveIntent` 匹配到 workflow 时，chat 链路走 `sendWorkflowMessage`（已存在） |
| S-3 workflow 元数据 UI | designer 加 routing keywords 配置（与 expert 的 routing 配置一致） |

**验收**：发布带 routing keywords 的 workflow，在 chat 里说相关话术，自动路由到该 workflow 执行。

### Phase T：复杂界面组件化重构（穿插进行，见第四节）

---

## 四、架构重构：复杂文件组件化 / 函数化

### 4.1 超标文件清单

| 文件 | 行数 | 问题 | 拆分方向 |
|---|---|---|---|
| `ModelSettingsView.vue` | 593 | 17 个 handler 全在视图里，Provider/Model 两套 CRUD 混在一起 | 抽 `useProviderCrud` + `useModelCrud` composable；视图只留编排 |
| `AgentExecutionDetailView.vue` | 529 | HITL 弹窗 + 图谱画布 + 底部 tab 面板 + 节点详情 全在一个文件 | 抽 `ExecutionHITLDialog` / `NodeTraceList` / `ExecutionLogs` / `NodeDetailPanel` |
| `AgentWorkflowListView.vue` | 572 | 模板网格 + 空状态 + 搜索 + 卡片操作 混在一起 | 抽 `WorkflowTemplateGrid` / `WorkflowCard` |
| `AiPreviewCompare.vue` | 572 | 预览对比逻辑重 | 抽 `usePreviewCompare` composable |
| `RequirementConfirmCard.vue` | 558 | 表单+校验+多题型 | 抽题型子组件 |
| `RagKnowledgeBase.vue` | 545 | 状态卡片 + schema 表 + 上传弹窗 | 抽 `RagStatusCards` / `RagSchemaTable` / `RagUploadDialog` |
| `aiApi.ts` | 681 | 全部 AI API 堆一个文件 | 按域拆 `aiApi/chat.ts` `aiApi/conversation.ts` `aiApi/rag.ts` `aiApi/sync.ts` |
| `types/index.ts` | 692 | 全局类型桶 | 按域拆 `types/chat.ts` `types/workflow.ts` `types/rag.ts` |
| `AiSidebarView.vue` | 489 | 侧栏多职责 | 抽 `SidebarNav` / `SidebarWorkflowList` |

### 4.2 重构原则（对齐 CLAUDE.md）

1. **UI 组件只做渲染**：业务逻辑进 composable（`useXXX`）或 store
2. **API 聚合 `src/api/`**：禁止组件直接 fetch（`aiApi.ts` 拆分时保持这层）
3. **一个文件一个职责**：视图文件 > 300 行考虑拆；composable > 200 行考虑拆
4. **渐进式**：每拆一个文件跑一次 680 测试，不批量改

### 4.3 执行顺序（穿插在 Phase Q/R/S 之间）

1. **T-1** `AgentExecutionDetailView` 拆 `NodeTraceList`（Phase Q-3 复用，先做）
2. **T-2** `aiApi.ts` 按域拆（低风险，受益广）
3. **T-3** `ModelSettingsView` 抽两个 composable
4. **T-4** `RagKnowledgeBase` 拆子组件
5. **T-5** `AgentWorkflowListView` 拆模板/卡片
6. **T-6** 其余按需

---

## 五、用户交互逻辑

### 5.1 测试 workflow 的三条路径（统一心智）

| 路径 | 入口 | 场景 | 状态 |
|---|---|---|---|
| **WorkflowDebugView**（新） | designer 工具栏"调试" / `/debug/workflow/:id` | 调试图结构、看节点流转、草稿可测 | Phase Q |
| **Chat 测试** | designer 工具栏"对话测试" | 体验端到端对话效果（需发布） | ✅ 已有 |
| **Open API** | WorkflowInvokeInfo 的 invoke URL + key | 外部系统集成、自动化 | ✅ 已有 |

交互决策：designer 工具栏放两个按钮"调试"（→WorkflowDebugView，草稿可测）和"对话测试"（→chat，需发布）。不再用"手动测试执行"发固定消息那个旧入口。

### 5.2 Workflow-as-Agent 的用户配置交互

- workflow 元数据加"智能体模式"开关：L1（纯 DAG）/ L2（含 task-planner）/ L3（含 agent-loop 节点）
- L3 时 designer 节点 palette 显现 `agent-loop` 节点
- 发布为"可路由技能"时（Phase S），填 routing keywords，chat 里可被自动唤起

### 5.3 与路由调试界面的关系

- `/debug/route`：测"消息→专家"的路由匹配（已有）
- `/debug/workflow/:id`：测"input→workflow 执行"的节点流转（Phase Q 新增）
- 两者并列在设置区下拉，不合并（职责不同）

---

## 六、批次执行计划

| 批次 | 内容 | 工期 | 依赖 |
|---|---|---|---|
| 批次 1 | T-1 拆 `NodeTraceList` + Phase Q（WorkflowDebugView） | 3d | 无 |
| 批次 2 | Phase R（agent-loop 节点） | 4d | 批次 1 |
| 批次 3 | Phase S（workflow 作为路由技能） | 2d | 批次 2 |
| 批次 4 | T-2/T-3/T-4 组件化重构 | 穿插 | 低耦合 |

---

## 七、成功度量

- WorkflowDebugView 上线后，designer 里"手动测试执行"（固定 message）入口下线
- agent-loop 节点能跑通一个 demo：LLM 自主调 2+ 工具完成多步任务
- 至少 3 个超标文件（>500行）拆到 <350 行
- 680 现有测试不退化，新增 workflow-debug / agent-loop 测试

---

## 八、待确认决策

1. **agent-loop 节点的工具范围**：只能调同图内的 tool 节点，还是也能调已发布的其它 workflow？（建议：先同图 tool，Phase S 后扩子 workflow）
2. **WorkflowDebugView 是否支持断点单步**：首版只做"执行+看轨迹"，单步调试放后续？
3. **L3 智能体的计费/配额**：agent-loop 迭代可能放大 token 消耗，是否复用 Phase D-3 的配额限流？
