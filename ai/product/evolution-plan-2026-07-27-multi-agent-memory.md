# AI 平台演进计划：多智能体深化 + RAG 进化为长程记忆

> 日期：2026-07-27
> 依据：代码核实（`agentWorkflowExecutor.ts` / `agentNodes.ts` / `platform-shared/ai/agentWorkflow/types.ts` / `SchemaEmbedding.ts` / `ragService.ts`）+ 业界多智能体与长程记忆实践（LangGraph / Anthropic 多智能体研究系统 / Mem0 / Letta / Zep 公开资料）
> 上游：[evolution-plan-2026-07-22-workflow-as-agent.md](./evolution-plan-2026-07-22-workflow-as-agent.md)、[evolution-plan-2026-07-22-phase-u.md](./evolution-plan-2026-07-22-phase-u.md)
> 本文档解决两件事：① RAG 进化为长程记忆（跨会话、可提取/整合/遗忘）② 多智能体协作深化（并行/精炼/handoff），并将两者嵌入 workflow 与 chat

---

## 一、当前状态核实（规划前提）

### 1.1 已具备（比预期超前）

| 能力 | 位置 | 状态 |
|---|---|---|
| DAG 执行器（30+ 节点） | `server/src/ai/services/agentWorkflowExecutor.ts`（1450 行，`runNode` switch-case） | ✅ |
| **agent-team 多智能体** | `executeAgentTeamNode`；面板 `AgentTeamNodePanel.vue`；sequential/discussion 模式，成员有 persona/model/tools，supervisor 调度 + 最大轮次 + 工具上限 | ✅ |
| **agent-loop 自主循环** | `runAgentLoop`；含子 workflow 调用（`workflow:` 前缀）、配额（`agentLoopMaxToolInvocations`）、中断恢复（`request_user_input`） | ✅ Phase R + U-1 已落地 |
| 短期会话记忆 | `conversation-memory` 节点（read/append/reset，`maxHistoryTurns`） | ✅ |
| RAG 知识检索 | `ragService.ts` + `embeddingService.ts` + `vectorStore.ts` + `rerankService.ts`；BGE-M3 embedding；`SchemaEmbedding` model；`rag__search` 工具；chat 内联 `ragContext` | ✅ |
| 节点类型集中定义 | `shared/platform-shared/ai/agentWorkflow/types.ts`（`AgentNodeType` 联合 + `AgentWorkflowNodeData`） | ✅ |
| 前端 palette | `ai/app/src/constants/agentNodes.ts`（`AGENT_PALETTE_ITEMS` + `AGENT_NODE_COLORS`） | ✅ |

### 1.2 关键缺口（本计划要补的）

1. **没有长程记忆**。`conversation-memory` 只是会话窗口（thread-level，`maxHistoryTurns` 默认 20），会话结束即丢。`server/src/models/` 只有 `SchemaEmbedding`，无 `AgentMemory`；全仓 grep `longterm/agentMemory/userMemory` 无结果。跨会话的用户偏好/历史决策/过往交互完全无沉淀。
2. **RAG 只检索"文档"，不检索"记忆"**。`ragService` 索引 schema/flow/document，不索引用户画像/偏好/事件。RAG 与 Memory 是两类东西，但共享检索基础设施。
3. **无 Agentic RAG 指引**。`agent-loop` 可调 `rag__search`，但工具描述与系统提示未引导 LLM「自主决定是否检索、改写 query、迭代检索」。
4. **agent-team 无并行模式**。只有 sequential/discussion，缺 `parallel`（独立子任务并行执行，降延迟）。
5. **无 worker 结果精炼**。子 workflow/成员结果若原样回灌 supervisor，会污染 orchestrator 上下文（Anthropic 多智能体经验：worker 必须返回精炼 summary）。
6. **无 handoff**。Phase V 的"自动路由到 workflow"是"调用拿结果"，不是"会话控制权转移"。handoff = 转移 persona + 记忆上下文 + 工具集。

### 1.3 与 Phase U/V 的关系

- Phase U 的 U-1（子 workflow 调用）**已落地**（`agent-loop` 面板已有"子工作流"分组）。
- 本计划的**轴 B（长程记忆）是全新增量**，不依赖 U/V。
- 本计划的**轴 A（多智能体增强）是 agent-team 的扩展**，与 Phase U 并行。
- 本计划的**轴 D（handoff）是 Phase V 的进阶**，依赖 V-1/V-2。

---

## 二、技术调研（精炼到与本项目相关的）

### 2.1 多智能体系统（2024–2025 主流模式）

| 模式 | 代表 | 机制 | 本项目契合度 |
|---|---|---|---|
| **Supervisor-Worker** | LangGraph / Anthropic 研究系统 | orchestrator 拆任务、分派 worker、汇总 | ⭐ `agent-team` 已是其雏形 |
| **Hierarchical** | LangGraph | 多层 supervisor，树状 | 中：复杂场景才需要，暂不做 |
| **Handoff / Swarm** | OpenAI Swarm / Agents SDK | agent A 把**控制权**完全交给 agent B | 中：chat 路由进阶（轴 D） |
| **Network / GroupChat** | AutoGen | agent 间自由对话 | 低：难控、token 失控，不做 |

**Anthropic 多智能体研究系统的关键经验**（本计划抄这几点）：

1. **Orchestrator-Worker**：orchestrator 维护全局计划，worker 只拿子任务上下文，不需要全局上下文——避免上下文污染。
2. **Sub-agent 返回精炼结果**，不是原始数据——worker 要总结后回灌，否则 orchestrator 的 context 会爆。
3. **并行化**：独立子任务并行执行，降延迟。
4. **工具设计是第一优先级**：工具名/描述/schema 为 LLM 优化（本项目 `domain__action` 命名已对齐）。

### 2.2 RAG 进化 -> 长程记忆

RAG 进化阶梯：

```
Naive RAG -> Advanced RAG -> Modular RAG -> Agentic RAG -> Memory-augmented
 (本项目)   (query rewrite/rerank)  (可插拔)   (agent 自主检索)  (长程记忆)
```

**长程记忆三种主流技术栈**：

| 方案 | 核心思想 | 记忆类型 | 本项目选型 |
|---|---|---|---|
| **Mem0** | extract -> consolidate -> retrieve；LLM 从对话提取事实/偏好，去重合并后向量检索 | episodic / semantic / procedural | ⭐ MVP 选型，最易落地，复用现有 embedding |
| **Letta (MemGPT)** | 分层记忆：core（context 内）+ archival（向量）+ recall（历史）；agent self-edit | 分层 block | 进阶：agent 自主管理记忆时 |
| **Zep** | 时序知识图谱：实体/事实建图，图谱+向量混合检索 | 图谱 + 向量 | 暂不做：复杂度高 |

**长程记忆的关键机制**（无论用哪个方案）：

1. **提取（Extraction）**：从交互中提取值得记住的事实/偏好/事件（LLM 提取）
2. **整合（Consolidation）**：去重、合并、冲突解决（"用户喜欢简洁" vs "用户喜欢详细" -> 覆盖/合并）
3. **检索（Retrieval）**：语义 + 时序衰减 + 重要性加权
4. **写入（Write）**：显式写 vs agent 自主写
5. **遗忘（Forgetting）**：时间衰减、容量限制（不能无限增长）
6. **反思（Reflection）**：定期从原始记忆提炼更高层洞察

---

## 三、设计方案

### 3.1 核心判断

本项目不另起炉灶。两条线都自然挂在已有 workflow 节点体系上：

- **长程记忆** = 新增 `memory-*` 节点族 + `AgentMemory` model，复用 RAG 的 `embeddingService`/`vectorStore` 基础设施，与 `conversation-memory`（会话窗口）分层共存。
- **多智能体深化** = `agent-team` 扩展 parallel 模式 + worker 结果精炼，不新建运行时。

### 3.2 记忆分层模型

| 层 | 节点/机制 | 生命周期 | 隔离 | 状态 |
|---|---|---|---|---|
| **L1 会话窗口** | `conversation-memory`（read/append/reset） | 单会话 | 按 conversationId | ✅ 已有 |
| **L2 长程记忆** | `memory-extract` / `memory-write` / `memory-recall` | 跨会话持久化 | 按 tenantId + userId | 🆕 本计划 |
| **L3 反思洞察** | `memory-reflect`（可选） | 定期从 L2 提炼 | 同 L2 | 🆕 进阶 |

### 3.3 轴 B：长程记忆节点族

新增三个 workflow 节点（与 `conversation-memory` 并列，职责不同）：

| 节点 | 作用 | 对应机制 | 输入 | 输出 |
|---|---|---|---|---|
| `memory-recall` | 检索用户长程记忆，注入下游 prompt | Retrieval | query（默认 `{{$input.message}}`） | 记忆文本（注入 `$node`） |
| `memory-write` | 写入一条记忆（带类型/重要性） | Write | content + namespace + importance | 写入结果 |
| `memory-extract` | LLM 从对话/节点输出提取值得记忆的事实 | Extraction | 文本来源 | 提取的记忆条目（可接 `memory-write`） |

**与 `conversation-memory` 的边界**：`conversation-memory` 管会话内窗口（短期）；`memory-*` 管跨会话持久化（长期）。两者可串联：会话内先 `memory-recall` 注入历史偏好，结束前 `memory-extract` + `memory-write` 沉淀新记忆。

### 3.4 AgentMemory 数据模型（Mem0 风格，复用 embedding 基础设施）

```typescript
// server/src/models/AgentMemory.ts
{
  tenantId, userId,           // 双重隔离
  namespace: 'preference' | 'fact' | 'event' | 'skill',  // 记忆类型
  content,                    // "用户偏好简洁回答"
  embedding,                  // 复用 embeddingService（BGE-M3）
  importance: 0-1,            // 影响检索排序与遗忘
  lastAccessedAt,             // 时间衰减依据
  accessCount,                // 被检索次数
  source: { conversationId?, messageId?, workflowId?, nodeId? },  // 溯源
  supersededBy?,              // 冲突解决：旧记忆被新记忆取代
  createdAt, updatedAt,
}
```

**复用点**：
- embedding：复用 `embeddingService.ts`（BGE-M3 SiliconFlow）✅
- 向量检索：复用 `vectorStore.ts` 的余弦 top-k 逻辑 ✅
- model pattern：照 `SchemaEmbedding.ts`（mongoose + tenantPlugin）✅

### 3.5 轴 A：多智能体深化

#### A-1：agent-team 加 parallel 模式

当前 `agentTeamMode: 'sequential' | 'discussion'`，新增 `'parallel'`：

```
parallel 模式：
  supervisor 一次性分派所有独立子任务给成员
  -> 成员并行执行（Promise.all）
  -> 各自结果过 summarizer 精炼
  -> supervisor 合成最终结果
```

适用：子任务相互独立（如"同时分析三个维度"）。不适用：子任务有依赖（用 sequential）。

#### A-2：worker 结果精炼回灌

无论 sequential/discussion/parallel，成员/子 workflow 的结果回灌 supervisor 前，过一道 summarize（防上下文污染）：

- agent-team 成员输出 -> 截断/摘要 -> 回 supervisor
- agent-loop 调子 workflow -> 子 workflow 末尾 summarizer -> summary 作为 ToolMessage 回灌

实现：复用已有 `summarizer` 节点能力，在 supervisor 调用层包一层。

### 3.6 轴 C：Agentic RAG

不新建节点，优化 `rag__search` 工具描述 + agent-loop 系统提示：

- `rag__search` 工具 description 加："可改写 query 多次检索；若结果不足以回答，可再检索"
- agent-loop 默认 system prompt 加 Agentic RAG 指引："遇到知识性问题时，先调 `rag__search` 检索；判断结果是否充分，不充分则改写 query 再检索"

### 3.7 轴 D：handoff 节点（进阶，依赖 Phase V）

新增 `handoff` 节点 + chat 路由控制权转移：handoff 时把当前会话的 conversation-memory 快照传给目标 workflow，目标 workflow 用自己的 persona 接管。比 Phase V 的 `workflow-exec`（调用拿结果）更深。

---

## 四、Task 清单（按项目标注）

> **项目隔离说明**：按 CLAUDE.md，ai（前端）禁止改 `server/`。下表标注每个 task 的归属项目。
> - 🟢 `shared/platform-shared`：公共类型层，本计划在 ai 上下文扩展（节点类型定义）
> - 🟢 `ai/app`：前端，可直接实现
> - 🔴 `server`：后端，需切到 server 项目上下文实现（本计划给设计与代码片段，不直接改）

### 轴 B：长程记忆

| Task | 内容 | 项目 | 文件 | 状态 |
|---|---|---|---|---|
| **B0** | `AgentNodeType` 加 `memory-recall`/`memory-write`/`memory-extract`；`AgentWorkflowNodeData` 加对应字段 | 🟢 shared | `shared/platform-shared/ai/agentWorkflow/types.ts` | 待实现 |
| **B1** | `AgentMemory` model（mongoose + tenantPlugin，照 SchemaEmbedding pattern） | 🔴 server | `server/src/models/AgentMemory.ts`（新建） | 待实现 |
| **B2** | `memoryService.ts`：extract/write/recall/consolidate/forget；复用 embeddingService + vectorStore | 🔴 server | `server/src/ai/services/memoryService.ts`（新建） | 待实现 |
| **B3** | executor 加三个 memory 节点 case（`executeMemoryRecallNode` 等） | 🔴 server | `server/src/ai/services/agentWorkflowExecutor.ts` + `nodes/` | 待实现 |
| **B4** | 三个 memory 节点面板 + palette 注册 + 颜色 | 🟢 ai/app | `panels/MemoryRecallNodePanel.vue` 等 + `constants/agentNodes.ts` | 待实现 |
| **B5** | memory API（recall/write/list/delete） | 🟢 ai/app | `api/aiApi/memory.ts`（新建） | 待实现 |
| **B6** | memoryRoutes：记忆管理 API（查询/删除/按用户查询） | 🔴 server | `server/src/ai/memoryRoutes.ts`（新建） | 待实现 |
| **B7** | chat 集成 memory-recall：chatStreamRunner 组装 prompt 时并行检索用户记忆 | 🔴 server | `server/src/ai/chatStreamRunner.ts` | 待实现 |
| **B8** | 记忆整合 + 遗忘：去重、冲突解决（supersededBy）、时间衰减、容量上限 | 🔴 server | `memoryService.ts` | 待实现 |

### 轴 A：多智能体深化

| Task | 内容 | 项目 | 文件 | 状态 |
|---|---|---|---|---|
| **A1** | agent-team 加 `parallel` 模式（`agentTeamMode` 扩展 + executor 并行执行） | 🔴 server | `agentWorkflowExecutor.ts` `executeAgentTeamNode` | 待实现 |
| **A2** | agent-team 面板加 parallel 选项 | 🟢 ai/app | `AgentTeamNodePanel.vue` | 待实现 |
| **A3** | worker 结果精炼：成员/子 workflow 输出过 summarizer 回灌 | 🔴 server | `agentWorkflowExecutor.ts` | 待实现 |

### 轴 C：Agentic RAG

| Task | 内容 | 项目 | 文件 | 状态 |
|---|---|---|---|---|
| **C1** | 优化 `rag__search` 工具描述 + agent-loop 默认 prompt 加 Agentic RAG 指引 | 🔴 server | `ragService.ts` / `agentWorkflowExecutor.ts` | 待实现 |

### 轴 D：handoff（进阶，依赖 Phase V）

| Task | 内容 | 项目 | 文件 | 状态 |
|---|---|---|---|---|
| **D1** | `handoff` 节点类型 + executor case + 面板 | 🟢+🔴 | types / executor / panel | 待实现 |
| **D2** | chat 路由 handoff 指令（resolveIntent 返回 handoff） | 🔴 server | `chatStreamRunner.ts` | 待实现 |

---

## 五、批次执行计划

| 批次 | 内容 | 工期 | 依赖 | 优先级 |
|---|---|---|---|---|
| **批次 1** | B0（类型）+ B4（前端面板）+ B5（前端 API） | 2d | 无 | 高（前端可先做，不阻塞 server） |
| **批次 2** | B1（model）+ B2（service）+ B3（executor case） | 3d | B0 | 高（后端核心，需切 server） |
| **批次 3** | B7（chat 集成）+ B8（整合/遗忘） | 2d | 批次 2 | 高 |
| **批次 4** | C1（Agentic RAG 指引） | 0.5d | 无 | 高（成本极低、收益高） |
| **批次 5** | B6（记忆管理 API）+ 前端记忆管理页 | 1.5d | 批次 2 | 中 |
| **批次 6** | A1+A2+A3（agent-team parallel + 精炼） | 2d | 无 | 中 |
| **批次 7** | D1+D2（handoff） | 3d | Phase V | 低（可选） |

**本会话先做**：批次 1（B0+B4+B5，纯前端 + 公共类型，不跨项目）+ 批次 4（C1 的前端可做部分）。server 部分（B1/B2/B3/B6/B7/B8/A1/A3/C1/D1/D2）在文档中给完整设计，需切到 server 上下文实现。

---

## 六、成功度量

- `memory-recall`/`memory-write`/`memory-extract` 三节点可在 designer 拖出、配置、连线
- 一个 workflow 能：会话开始 `memory-recall` 注入用户偏好 -> 处理 -> 结束前 `memory-extract` + `memory-write` 沉淀新记忆
- 跨会话验证：同一用户第二次对话，`memory-recall` 能召回上一次沉淀的记忆
- agent-team parallel 模式能并行执行 2+ 成员，延迟低于 sequential
- Agentic RAG：agent-loop 遇知识问题自主调 `rag__search`，可改写 query 再检索
- 现有测试不退化，新增 memory 节点测试

---

## 七、验收清单（待真机验证）

1. designer 能拖出 `memory-recall` 节点，配置 query，连线到 llm 节点，`{{$node.memory-recall-1}}` 能注入记忆
2. `memory-write` 节点能写入一条记忆，mongo `agentmemories` 集合可见
3. 跨会话：第一次对话写入"用户偏好简洁"，第二次对话 `memory-recall` 能召回
4. agent-team parallel 模式：3 个成员并行，总耗时 ≈ 最慢成员（非三者之和）
5. agent-loop 遇知识问题自主调 `rag__search`，结果不足时改写 query 再检索
6. 记忆管理 API：`GET /api/ai/memory?userId=xxx` 能列出用户记忆，`DELETE` 能删除

验证报错贴给 AI，按 [[no-skip-issues]] 找根因修复。

---

## 八、待确认决策

1. **记忆的写入触发**：仅显式（workflow 里接 memory-write 节点），还是 chat 默认自动提取（每次对话后后台 extract）？建议：MVP 仅显式，自动提取放批次 5 之后。
2. **记忆隔离粒度**：按 userId 还是按 conversationId？建议：按 userId（跨会话才有意义），匿名用户按 conversationId 临时存。
3. **embedding 模型**：长程记忆复用 RAG 的 BGE-M3，还是单独配？建议：复用，同一 embedding 服务。
4. **handoff 是否本期做**：依赖 Phase V 进度，建议先不做，放 Phase V 之后。
