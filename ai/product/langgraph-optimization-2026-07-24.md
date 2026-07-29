# LangGraph 多 Agent 架构优化方案

> 日期：2026-07-27
> 基于：server/src/ai/graph/graph.ts (843 行) 及全部关联模块
> 参考：LangGraph 官方文档 (docs.langchain.com/oss/javascript/langgraph/overview) + LangGraph README + LangGraph 源码

---

## 一、现状分析

### 1.1 Graph 架构图

```
START
  │
  ▼
router ──────────────────────────────────────────► requirementAnalyzer
  (意图路由: 关键词+插件Registry)                    (LLM 需求分析+RAG)
  │                                                  │
  │                                  ┌───────────────┴───────────────┐
  │                                  ▼                               ▼
  │                      requirementConfirm                    taskPlanner
  │                      (interrupt HITL 等待确认)               (LLM 任务链规划)
  │                                  │                               │
  │                                  └──────────► taskPlanner ◄──────┘
  │                                                  │
  │                                                  ▼
  │                                               taskChain
  │                                          (任务链步进+协作插入)
  │                                                  │
  │                              ┌───────────────────┴───────────────────┐
  │                              ▼                                       ▼
  │                          pluginExpert                           summarizer ──► END
  │                      (唯一专家执行节点)                         (多步结果摘要)
  │                              │
  │                    ┌─────────┴─────────┐
  │                    ▼                   ▼
  │                 allTools            taskChain
  │            (ToolNode 执行)        (下一步/完成)
  │                    │                   │
  │                    ▼                   ▼
  │               afterTools          summarizer ──► END
  │          (协作检测+上下文提取)
  │                    │
  │                    ▼
  │           collaborationRouter
  │          (空节点, 仅做路由)
  │                    │
  │           ┌────────┼────────┐
  │           ▼        ▼        ▼
  │      pluginExpert taskChain summarizer
  │      (continue)  (nextStep) (完成)
  │           │        │           │
  └───────────┴────────┘           ▼
                                 END
```

### 1.2 节点职责

| 节点 | 文件 | 职责 | LLM 调用 |
|------|------|------|----------|
| router | graph.ts | 关键词匹配 + 插件 Registry 路由，设置 session.currentAgent | 否（纯函数 resolveIntent） |
| requirementAnalyzer | graph.ts (wrapper) + requirementAnalyzer.ts (impl) | LLM 分析意图/实体/复杂度/完整性，RAG 上下文注入 | 是（jsonMode, 可选工具调用） |
| requirementConfirm | requirementConfirm.ts | interrupt() 等待用户确认需求 | 否 |
| taskPlanner | graph.ts (wrapper) + taskPlanner.ts (impl) | LLM 生成任务链（JSON），显式模式跳过 LLM | 是（jsonMode） |
| taskChain | graph.ts | 任务链步进管理，协作请求插入，上下文提取与传递 | 否 |
| pluginExpert | pluginExpertAgent.ts | 唯一专家执行入口，RAG 上下文 + system prompt + tools | 是（stream + bindTools） |
| allTools | graph.ts (ToolNode 包装) | 执行 LLM 返回的 tool_calls | 否 |
| afterTools | graph.ts | 协作检测 (routeCollaboration)，上下文提取，toolIterationCount++ | 否 |
| collaborationRouter | graph.ts | 空节点，仅做三路路由决策 | 否 |
| summarizer | graph.ts | 多步结果摘要，LLM 生成总结文本 | 是（stream） |

### 1.3 条件边路由函数

| 路由函数 | 位置 | 分支 |
|----------|------|------|
| routeAfterRequirementAnalyzer | requirementAnalyzer.ts | taskPlanner / requirementConfirm |
| routeAfterTaskPlanner | taskPlanner.ts | taskChain（ thinker 未启用） |
| routeAfterTaskChain | graph.ts | summarizer / pluginExpert |
| afterAgent | graph.ts | allTools / taskChain / summarizer / END |
| routeAfterCollaborationRouter | graph.ts | pluginExpert / taskChain / summarizer |

### 1.4 防循环机制

| 机制 | 位置 | 限制 |
|------|------|------|
| maxNodeExecutions | state.ts default 25 | 全局节点执行计数上限 |
| recursionLimit | chatStreamRunner.ts:368 | LangGraph 递归上限 30 |
| MAX_TOOL_ITERATIONS | graph.ts:609 | 工具迭代上限 3（硬编码） |
| collaboration loop detection | collaborationRouter.ts | 协作反向边检测 + maxRounds 3 |

### 1.5 持久化与流式

- **Checkpoint**: 自定义 MongoDBCheckpointer（checkpointMongo.ts），两个集合 ai_checkpoints + ai_checkpoint_writes
- **流式**: graph.streamEvents(input, { version: 'v2' }) 事件循环，处理 on_chain_start/end, on_chat_model_stream, on_tool_start/end
- **HITL**: interrupt() 在 requirementConfirm 节点，通过 Command({ resume }) 恢复
- **中断跟踪**: 内存 Map（interruptedThreads），非持久化

---

## 二、LangGraph 最佳实践对照

### 2.1 多 Agent 模式

LangGraph 官方定义三种多 Agent 模式：

| 模式 | 官方描述 | 我们的实现 | 对照结果 |
|------|----------|-----------|----------|
| **Supervisor** | 中央 supervisor 节点决定下一步执行哪个 agent，agent 执行后返回 supervisor | router → requirementAnalyzer → taskPlanner → taskChain → pluginExpert | **部分对齐**：router 类似 supervisor，但后续多了 requirementAnalyzer/taskPlanner 两层"预决策"，削弱了 supervisor 的集中调度能力 |
| **Swarm** | Agent 间直接 handoff，无中央调度，每个 agent 自主决定下一步 | collaborationRouter + afterTools 检测 request_collaboration 工具调用 | **部分对齐**：协作 handoff 机制存在，但通过 afterTools → collaborationRouter 两步完成，且 collaborationRouter 是空节点 |
| **Hierarchical** | 多层 supervisor，子图封装子团队 | 无子图，全部扁平 | **未实现**：10 个节点全部在同一层 StateGraph 中 |

**关键差距**：
- router 做了路由决策后无条件进入 requirementAnalyzer，两者职责重叠（router 用关键词匹配，requirementAnalyzer 用 LLM 分析，都在判断"该用哪个 agent"）
- 没有 subgraph 封装，"需求分析阶段"和"执行阶段"混在同一个 graph 中，checkpoint 保存的是全量状态

### 2.2 Agent Loop

LangGraph 官方推荐的 agent loop 模式：

```
agent -> tools -> agent -> tools -> ... -> END
```

通过条件边实现，agent 节点检查 last message 是否有 tool_calls，有则路由到 tools，无则结束。

**我们的实现**：
```
pluginExpert -> afterAgent(条件边) -> allTools -> afterTools -> collaborationRouter(条件边) -> pluginExpert
```

**差距**：
- 官方模式是 `agent -> tools -> agent`（2 节点循环），我们是 `pluginExpert -> allTools -> afterTools -> collaborationRouter -> pluginExpert`（4 节点循环）
- afterTools 和 collaborationRouter 都是中间节点，增加了节点执行计数和 checkpoint 写入
- afterAgent 条件边同时处理 tool_calls 检测和 task chain 推进，职责混合

### 2.3 Checkpoint 持久化

LangGraph 官方提供了 BaseCheckpointSaver 接口，推荐实践：
- 实现 getTuple / put / putWrites / list 四个方法
- 使用 JSON 序列化存储 checkpoint 和 writes
- 支持 thread_id + checkpoint_ns + checkpoint_id 三元组定位

**我们的实现**：
- 完整实现了 BaseCheckpointSaver 的全部方法
- MongoDB 两集合设计合理（checkpoints + writes）
- 复合索引设计正确

**差距**：
- `_docToTuple` 方法做了 3 次串行 DB 查询（pendingSends + writes + checkpoint），可以并行化
- checkpoint 数据以 JSON 字符串存储，大 state（含完整 messages 数组）会导致单文档过大
- 没有 TTL 或清理机制，ai_checkpoints 集合会无限增长
- `list()` 方法对每个 threadId 执行单独查询，跨 thread 列表效率低

### 2.4 流式输出

LangGraph 官方推荐：
- `graph.streamEvents(input, { version: 'v2' })` 获取全量事件
- `on_chat_model_stream` 获取 LLM token 流
- `on_tool_start` / `on_tool_end` 获取工具执行事件
- `on_chain_start` / `on_chain_end` 获取节点执行事件

**我们的实现**：
- chatStreamRunner.ts 完整处理了上述四类事件
- 支持 thinking_delta（reasoning_content）和 text_delta 分离
- 支持 `<think>` 标签解析（兼容非 reasoning_content 模型）
- 工具结果中提取 schema/flow payload 并发送结构化事件

**差距**：
- `executeResumeStream`（HITL 恢复后）的事件处理大幅简化，缺少 on_chain_start/end 事件、缺少 payload 提取、缺少 assistant 消息持久化
- 没有使用 LangGraph 的 `streamMode` 参数（如 'values' / 'updates' / 'messages'），只用了 streamEvents
- 节点间状态更新不会流式推送（如 task.chain 变化只在 on_chain_end 时推送，中间无增量）

### 2.5 Human-in-the-Loop

LangGraph 官方 HITL 模式：
- `interrupt(value)` 在节点内暂停执行，将 value 返回给调用方
- 调用方通过 `new Command({ resume: value })` 恢复执行
- 支持多次 interrupt/resume 循环
- interrupt 状态由 checkpointer 持久化，进程重启后可恢复

**我们的实现**：
- requirementConfirm 节点使用 `interrupt({ type, message, data })` 暂停
- chatStreamHandler 监听 `chat:resume` 事件，调用 `executeResumeStream`
- 通过 `isGraphInterrupt(err)` 捕获中断异常
- `interruptedThreads` 内存 Map 跟踪中断线程

**差距**：
- interruptedThreads 是内存 Map，进程重启后丢失（虽然 checkpoint 仍有状态，但前端无法感知可恢复的线程）
- HITL 仅用于需求确认，未用于工具审批（如高风险 schema 修改前的确认）
- resume 路径的事件处理不完整（见 2.4）
- 没有利用 LangGraph 的时间旅行（time travel）能力查看历史 checkpoint 并从任意点恢复

### 2.6 状态管理

LangGraph 官方推荐：
- `MessagesAnnotation` 处理 messages 字段（自动 reducer 合并）
- 自定义字段使用 `Annotation<T>({ reducer, default })` 定义
- 状态应保持精简，避免在 state 中存储大量临时数据

**我们的实现**：
- 正确使用 `MessagesAnnotation.spec` 继承 messages reducer
- 9 个嵌套状态组（session/task/tools/error/interaction/requirement/taskPlan/thinking/quality）
- 所有自定义字段使用 `(_, next) => next` replace reducer

**差距**：
- 状态非常庞大（9 个组 + messages），每次 checkpoint 序列化全量状态
- thinking 和 quality 组定义了但未在 graph 中使用（预留字段）
- task 和 taskPlan 有大量重叠字段（chain、currentStepIndex vs plan.chain、currentStepId）
- session.nodeExecutionCount 在 router 和 afterTools 两个节点分别递增，逻辑分散

---

## 三、优化项（按优先级排序）

### P0-1: 消除 router 与 requirementAnalyzer 的职责重叠

**问题**：router 用关键词匹配做意图路由，随后无条件进入 requirementAnalyzer 用 LLM 做需求分析。两者都在判断"该用哪个 agent"，但 router 的关键词匹配结果会被 requirementAnalyzer 的 LLM 分析覆盖（requirementAnalyzer 也输出 suggestedChain）。

**方案**：
- 将 router 简化为"快速通道"：仅在显式模式（context.source !== 'standalone'）或明确问候时直接决定路由，跳过 requirementAnalyzer
- standalone 模式下，router 仅做会话初始化（设置 session），路由决策全部交给 requirementAnalyzer
- requirementAnalyzer 的 suggestedChain 直接作为 taskPlanner 的输入，不再经过 router 的 chainPreview 逻辑

**预期收益**：减少一次节点执行 + 减少 token 消耗（router 的 resolveIntent 在 standalone 模式下不再调用）

### P0-2: 合并 afterTools + collaborationRouter 为单节点

**问题**：afterTools 做协作检测和上下文提取，collaborationRouter 是空节点（返回 `{}`）仅做路由。两个节点串行执行，增加 2 次节点执行计数和 2 次 checkpoint 写入。

**方案**：
- 删除 collaborationRouter 节点
- afterTools 直接作为条件边源节点，使用 `addConditionalEdges('afterTools', routeAfterCollaborationRouter)`
- routeAfterCollaborationRouter 的逻辑不变，只是从 afterTools 节点直接路由

**预期收益**：每次工具循环减少 1 次节点执行 + 1 次 checkpoint 写入，在 3 次工具迭代场景下节省 3 次 checkpoint

### P0-3: 统一 requirementAnalyzer / taskPlanner 的双实现

**问题**：graph.ts 中有 `requirementAnalyzerNode` 和 `taskPlannerNode`（wrapper 版本），同时 requirementAnalyzer.ts 和 taskPlanner.ts 中有独立实现。两套代码逻辑相似但不完全一致（graph.ts 版本调用 runtime 纯函数，独立版本直接实现 LLM 调用）。

**方案**：
- 保留 runtime 纯函数版本（intentRouter.ts / runtime/summarizer.ts 等），graph.ts 的 wrapper 节点仅做 state ↔ runtime 类型转换
- 删除 requirementAnalyzer.ts 和 taskPlanner.ts 中的独立 node 实现，仅保留 routing function
- 或者反过来：删除 graph.ts 中的 wrapper，直接使用 requirementAnalyzer.ts / taskPlanner.ts 的实现

**预期收益**：消除代码重复，减少维护负担，避免两套实现行为不一致

### P1-1: 工具迭代上限从硬编码改为可配置

**问题**：`graph.ts:609` 硬编码 `const MAX_TOOL_ITERATIONS = 3`，而 config.ts 已有 `MAX_TOOL_ITERATIONS` 环境变量（默认 3）。graph.ts 没有引用 config.ts 的值。

**方案**：
```typescript
import { MAX_TOOL_ITERATIONS } from '../config.js'
// 删除 graph.ts 内的 const MAX_TOOL_ITERATIONS = 3
```

**预期收益**：可通过环境变量调整工具迭代上限，无需改代码。对于复杂场景（如多表单+流程联合生成），3 次工具迭代可能不够。

### P1-2: executeResumeStream 补齐事件处理

**问题**：`chatStreamRunner.ts:858` 的 `executeResumeStream` 函数事件处理大幅简化：
- 缺少 on_chain_start/end 事件（前端无法感知节点切换）
- 缺少 schema/flow payload 提取（工具结果中的 schema 不会推送给前端）
- 缺少 assistant 消息持久化（resume 后的对话不保存到 DB）
- 缺少 thinking_delta 处理

**方案**：
- 将 runChatStream 中的事件处理逻辑提取为共享函数 `handleStreamEvent(event, context)`
- executeResumeStream 复用该函数
- 补齐 assistant 消息持久化逻辑

**预期收益**：HITL 恢复后前端体验与首次请求一致，不丢失结构化事件和数据持久化

### P1-3: MongoDBCheckpointer.getTuple 并行化查询

**问题**：`checkpointMongo.ts:102-166` 的 `_docToTuple` 方法串行执行 3 次 DB 查询：
1. `_getPendingSends` (查询 CheckpointWriteModel)
2. 查询 writes (查询 CheckpointWriteModel)
3. 反序列化 checkpoint + metadata

**方案**：
- `_getPendingSends` 和 writes 查询可以 `Promise.all` 并行
- 如果 parent_checkpoint_id 为空，跳过 `_getPendingSends`

```typescript
const [pendingSends, writes] = await Promise.all([
  doc.parent_checkpoint_id ? this._getPendingSends(threadId, checkpointNs, doc.parent_checkpoint_id) : Promise.resolve([]),
  CheckpointWriteModel.find({ thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: checkpointId }).lean(),
])
```

**预期收益**：每次 checkpoint 读取减少约 1 次 RTT（~5-20ms 取决于网络）

### P1-4: checkpoint 集合添加 TTL 索引

**问题**：ai_checkpoints 和 ai_checkpoint_writes 集合无 TTL，随使用量增长，MongoDB 存储成本持续上升。一次复杂对话可能产生 20-30 个 checkpoint。

**方案**：
```javascript
checkpointSchema.index({ created_at: 1 }, { expireAfterSeconds: 7 * 24 * 3600 }) // 7 天 TTL
checkpointWriteSchema.index({ /* 同上 */ })
```

**预期收益**：自动清理过期 checkpoint，控制 MongoDB 存储增长

### P2-1: 引入 Subgraph 封装需求分析阶段

**问题**：router → requirementAnalyzer → requirementConfirm → taskPlanner 四个节点属于"需求分析阶段"，与执行阶段（taskChain → pluginExpert → allTools → ...）混在同一层 graph 中。checkpoint 保存的是全量状态，包括需求分析阶段的中间状态。

**方案**：
- 将 router + requirementAnalyzer + requirementConfirm + taskPlanner 封装为 subgraph
- Subgraph 有自己的 state（requirement + taskPlan），与外层 graph 通过 input/output 对接
- 外层 graph 只关心 subgraph 的输出（taskPlan），不关心中间状态

```typescript
const analysisSubgraph = new StateGraph(AnalysisStateAnnotation)
  .addNode('router', routerNode)
  .addNode('analyzer', requirementAnalyzerNode)
  .addNode('confirm', requirementConfirmNode)
  .addNode('planner', taskPlannerNode)
  .addEdge(START, 'router')
  .addEdge('router', 'analyzer')
  .addConditionalEdges('analyzer', routeAfterRequirementAnalyzer)
  .addEdge('confirm', 'planner')
  .addConditionalEdges('planner', routeAfterTaskPlanner)

const mainGraph = new StateGraph(AgentStateAnnotation)
  .addNode('analysis', analysisSubgraph.compile())
  .addNode('taskChain', taskChainNode)
  .addNode('pluginExpert', pluginExpertAgentNode)
  // ...
```

**预期收益**：
- 外层 graph 更简洁（从 10 节点减到 6 节点）
- 需求分析阶段的中间状态不污染主 graph 的 checkpoint
- 可独立测试需求分析 subgraph

### P2-2: interruptedThreads 持久化

**问题**：`chatStreamRunner.ts:80` 的 `interruptedThreads` 是内存 Map，进程重启后丢失。虽然 LangGraph checkpoint 仍保存了中断状态，但前端无法知道哪些线程可恢复。

**方案**：
- 将 interruptedThreads 存入 MongoDB（新建 ai_interrupted_threads 集合或复用 conversation 表加字段）
- 启动时从 DB 加载未完成的中断线程
- 前端通过 API 查询可恢复的线程列表

**预期收益**：进程重启后 HITL 仍可恢复，提升系统鲁棒性

### P2-3: 状态精简——合并 task 与 taskPlan

**问题**：state.ts 中 `task` 和 `taskPlan` 两个组有大量重叠字段：
- task.chain vs taskPlan.plan.chain（都是任务步骤列表）
- task.currentStepIndex vs taskPlan.currentStepId（都是当前步骤指针）
- task.intermediateResults vs taskPlan.executionLog（都是执行记录）

**方案**：
- 统一为单一 `task` 组，包含 plan + executionLog + currentStepId
- 删除 taskPlan 组
- 逐步迁移引用（先加兼容层，后删除旧字段）

**预期收益**：减少状态体积约 30%，减少 checkpoint 序列化开销，消除数据不一致风险

### P2-4: 利用 streamMode: 'updates' 推送节点间状态变化

**问题**：当前只使用 `streamEvents`（v2 事件流），节点间的状态更新（如 task.chain 状态变化）只在 on_chain_end 时推送。前端在长任务链中缺乏实时进度反馈。

**方案**：
- 同时使用 `graph.stream(input, { streamMode: ['updates', 'messages'] })` 获取状态更新流
- 或在 streamEvents 基础上，增加 on_chain_end 时的 state diff 推送
- 前端实时显示任务链进度（如 "步骤 2/3: 生成流程..."）

**预期收益**：提升长任务链场景的用户体验，前端有实时进度感知

### P3-1: 清理未使用的状态字段

**问题**：state.ts 中 `thinking` 和 `quality` 两个组已定义但未在 graph 中使用。routeAfterTaskPlanner 中有注释 `// 如果启用了 thinker，进入 thinker 进行推理` 但 thinker 节点不存在。

**方案**：
- 如果 thinker/qualityCheck 短期内不实现，从 state 中移除这两个组
- 如果计划实现，标注为 `@planned` 并在 CLAUDE.md 中记录

**预期收益**：减少 checkpoint 序列化体积，降低认知负担

### P3-2: 统一 pluginExpert 与 runExpertLoop 的 ReAct 循环

**问题**：
- `pluginExpertAgent.ts` 在 graph 内通过 `model.stream()` + `afterAgent` 条件边 + `allTools` 节点实现 ReAct 循环
- `runExpertLoop.ts` 在 graph 外（workflow 场景）通过 `model.invoke()` + for 循环实现 ReAct 循环

两套 ReAct 实现逻辑不同（stream vs invoke，graph 循环 vs for 循环），维护成本高。

**方案**：
- 保留 graph 内的 ReAct 循环（享受 checkpoint、streaming、HITL 能力）
- workflow 场景如果需要独立执行，封装为 subgraph 调用
- 删除 runExpertLoop 的独立 ReAct 实现

**预期收益**：统一 ReAct 循环实现，所有执行路径共享 checkpoint/streaming/HITL 能力

---

## 四、多 Agent Loop 优化建议

### 4.1 router / pluginExpert / collaborationRouter 协作优化

当前三者关系：
```
router (决定 agent) → ... → pluginExpert (执行) → allTools → afterTools (检测协作) → collaborationRouter (路由)
```

**问题**：
1. router 做的路由决策在 standalone 模式下会被 requirementAnalyzer + taskPlanner 覆盖
2. collaborationRouter 是空节点，徒增一次 checkpoint 写入
3. afterTools 同时做"协作检测"和"上下文提取"两件事，职责混合

**优化后**：
```
router (仅显式模式快速通道) → requirementAnalyzer (LLM 路由+分析) → taskPlanner → taskChain
  → pluginExpert (执行) → afterAgent (条件边)
    → allTools → afterTools (协作检测+上下文提取, 条件边)
      → pluginExpert (continue) / taskChain (nextStep) / summarizer (完成)
```

关键变化：
- router 在 standalone 模式下仅初始化 session，不做路由
- afterTools 直接作为条件边源（替代 collaborationRouter）
- afterAgent 和 afterTools 的路由逻辑明确分离：afterAgent 处理"有无 tool_calls"，afterTools 处理"协作/下一步/完成"

### 4.2 Agent 间上下文传递优化

当前通过 `contextCarrier.ts` 的 `extractAgentContext` + `buildContextInjection` 实现上下文传递：
- afterTools 提取当前 agent 的上下文存入 task.chain[stepIndex].context
- taskChain 将上游 context 注入下游 agent 的 user message

**问题**：
- 上下文提取依赖消息中的 tool_calls 名称匹配（如 isSchemaWidgetValidateTool），脆弱
- 上下文注入是纯文本拼接，下游 LLM 需要自己解析
- 多步协作时上下文只有一级（直接上游），不支持跨级引用

**建议**：
- 上下文提取改为从 state.tools.results 中提取（结构化数据，不依赖消息解析）
- 上下文注入使用 JSON 格式（而非纯文本），LLM 更容易解析
- 多步协作时，累积所有上游 context（已有 upstreamContexts 逻辑但未完全启用）

### 4.3 Supervisor 模式演进方向

如果未来需要更复杂的多 Agent 协作（如 agent 自主请求其他 agent、agent 间对话），建议演进为标准 Supervisor 模式：

```
START → supervisor → (agent_A | agent_B | agent_C | tools | END)
  agent_A → supervisor
  agent_B → supervisor
  agent_C → supervisor
  tools → supervisor
```

- supervisor 是唯一路由决策点，接收所有 agent 和 tools 的返回
- 每个 agent 是独立节点，有自己的 system prompt 和 tools
- supervisor 可以是 LLM-based（用 LLM 决定路由）或 rule-based（用规则决定路由）
- 当前架构已接近此模式，只需将 afterTools 的路由逻辑提升为 supervisor 节点

---

## 五、实施路线图

| 阶段 | 优化项 | 预计工作量 | 风险 |
|------|--------|-----------|------|
| Phase 1 | P0-1 (router 简化) + P0-2 (合并 afterTools/collaborationRouter) + P0-3 (统一双实现) | 2-3 天 | 中（路由逻辑变更需充分测试） |
| Phase 2 | P1-1 (可配置迭代上限) + P1-2 (resume 事件补齐) + P1-3 (checkpoint 并行化) + P1-4 (TTL 索引) | 2-3 天 | 低（增量改进，不改变核心流程） |
| Phase 3 | P2-1 (subgraph 封装) + P2-2 (interruptedThreads 持久化) + P2-3 (状态精简) + P2-4 (streamMode) | 5-7 天 | 高（架构重构，需回归测试） |
| Phase 4 | P3-1 (清理未用字段) + P3-2 (统一 ReAct) | 2-3 天 | 低（清理性质） |

---

## 六、附录：关键文件清单

| 文件 | 行数 | 职责 |
|------|------|------|
| server/src/ai/graph/graph.ts | 843 | StateGraph 组装 + 节点实现 |
| server/src/ai/graph/state.ts | 404 | AgentStateAnnotation 定义 |
| server/src/ai/graph/checkpointMongo.ts | 369 | MongoDB Checkpointer 实现 |
| server/src/ai/graph/checkpointModels.ts | 89 | Mongoose 模型定义 |
| server/src/ai/graph/checkpointer.ts | 37 | Checkpointer 工厂 |
| server/src/ai/graph/pluginExpertAgent.ts | 75 | 专家执行节点 |
| server/src/ai/graph/requirementAnalyzer.ts | 471 | 需求分析节点（独立实现） |
| server/src/ai/graph/requirementConfirm.ts | 79 | HITL 确认节点 |
| server/src/ai/graph/taskPlanner.ts | 448 | 任务规划节点（独立实现） |
| server/src/ai/graph/agentBase.ts | 696 | 共享 agent 基础设施 |
| server/src/ai/graph/agentErrorHandler.ts | 146 | 错误处理 + LLM fallback |
| server/src/ai/graph/contextCarrier.ts | 257 | Agent 间上下文传递 |
| server/src/ai/graph/expertUserContext.ts | 164 | 专家用户内容构建 |
| server/src/ai/graph/ragContextRetriever.ts | 147 | RAG 上下文检索 |
| server/src/ai/graph/resolveGraphExpert.ts | 68 | 专家解析 |
| server/src/ai/chatStreamRunner.ts | 957 | 流式执行核心 |
| server/src/ai/chatStreamHandler.ts | 139 | WebSocket 处理器 |
| server/src/ai/runtime/intentRouter.ts | 199 | 意图路由纯函数 |
| server/src/ai/runtime/collaborationRouter.ts | 253 | 协作路由纯函数 |
| server/src/ai/plugins/runExpertLoop.ts | 98 | 独立 ReAct 循环 |
| server/src/ai/plugins/dispatchExpert.ts | 89 | 专家调度 |
