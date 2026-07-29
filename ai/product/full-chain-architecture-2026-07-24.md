# Schema-Platform 全链路架构文档

> 从 Chat 输入 -> LangGraph 路由 -> LLM 调用 -> Workflow 执行 -> 31 个模板的完整链路说明。
>
> 生成时间：2026-07-27
> 源码基线：`server/src/ai/`、`shared/platform-shared/ai/`

---

## 目录

- [第一章 Chat 全链路](#第一章-chat-全链路)
- [第二章 LangGraph 架构](#第二章-langgraph-架构)
- [第三章 LLM 调用清单](#第三章-llm-调用清单)
- [第四章 31 个模板详解](#第四章-31-个模板详解)
- [第五章 数据流与 MongoDB Collections](#第五章-数据流与-mongodb-collections)

---

## 第一章 Chat 全链路

### 1.1 入口与事件流

用户在 editor / flow / page / standalone 前端输入消息后，前端通过 Socket.IO 发送 `chat:send` 事件，服务端 `chatStreamHandler.ts` 接收并转交 `chatStreamRunner.ts` 执行 LangGraph 流式推理。

```
浏览器 (ChatPanel)
  │  socket.emit('chat:send', { message, context, conversationId? })
  ▼
Socket.IO Server (server/src/socket.ts)
  │  io.on('connection') -> registerChatHandlers(socket, io)
  ▼
chatStreamHandler.ts  registerChatHandlers()
  │  - ensureToolsReady()
  │  - 取消同 socket 上的旧流
  │  - socket.join(`chat:${threadId}`)
  │  - executeChatStream(data, send, onDone, onError, userId)
  ▼
chatStreamRunner.ts  executeChatStream() -> runChatStream()
  │  1. 解析/创建 Conversation (conversations collection)
  │  2. 加载 currentSchema / currentFlow (dataBridge)
  │  3. 加载文档附件摘要 (documentService)
  │  4. appendMessage(userMessage)
  │  5. 构建 graphInput (HumanMessage + context + session + interaction)
  │  6. graph.streamEvents(graphInput, { configurable: { thread_id }, recursionLimit: 30 })
  ▼
graph.ts (LangGraph StateGraph)
  │  router -> requirementAnalyzer -> [requirementConfirm] -> taskPlanner
  │  -> taskChain -> pluginExpert <-> allTools -> afterTools
  │  -> collaborationRouter -> summarizer -> END
  ▼
chatStreamRunner.ts  for await (event of eventStream)
  │  - on_chain_start / on_chain_end  -> agent_switch / requirement_analysis_* / task_plan_*
  │  - on_chat_model_stream          -> text_delta / thinking_delta
  │  - on_tool_start / on_tool_end    -> tool_call_start / tool_call_end / schema_complete / flow_complete
  │  - interrupt (HITL)               -> 保存 interruptedThreads，发送 interrupt + done(interrupted=true)
  ▼
socket.emit('chat:event', { threadId, type, ... })
  ▼
浏览器  ChatPanel 接收事件，渲染思考过程、文本增量、Schema/Flow 卡片、工具调用气泡
```

### 1.2 ChatRequest 数据结构

`chatStreamRunner.ts` 中定义的 `ChatRequest`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `conversationId` | string? | 已有会话 ID；不传则新建 |
| `message` | string | 用户消息原文 |
| `context.source` | `'editor' \| 'flow' \| 'page' \| 'standalone'` | 来源决定路由模式（显式 vs 自动） |
| `context.schemaId` / `flowId` / `nodeId` / `version` | string? | 当前编辑资源引用 |
| `context.currentSchema` | object[]? | 前端当前 Widget 树（回退来源） |
| `context.currentFlow` | { nodes, edges }? | 前端当前流程图（回退来源） |
| `context.selectedWidget` | { id, type, field?, label? }? | 编辑器选中组件 |
| `context.editorMode` | `'edit' \| 'preview'` | 编辑器模式 |
| `context.documentAttachments` | Array? | 附件文档（documentId/filename/mimetype/size/excerpt） |
| `context.preferences` | Record? | 用户偏好，含 `llmModel` 覆盖 |
| `context.historySummary` | string? | 历史摘要（前端传入） |
| `mentions` | Array? | @ 引用资源 |

### 1.3 graphInput 构建

`runChatStream` 将 `ChatRequest` 转换为 LangGraph 输入状态：

```typescript
{
  messages: [new HumanMessage(llmMessage)],   // llmMessage 可能拼接文档摘要
  context: {
    source, schemaId, flowId, nodeId,
    currentSchema, currentFlow, selectedWidget, editorMode, turnCount,
  },
  session: {
    id: threadId,
    conversationId: convo._id,
    currentAgent: 'router',
    nodeExecutionCount: 0,
    maxNodeExecutions: 25,                     // 死循环防护上限
  },
  interaction: {
    clarificationRequest: null,
    clarificationOptions: [],
    preferences,
    historySummary,
    collaborationRequest: null,
    collaborationHistory: [],
  },
}
```

### 1.4 流式事件类型

`chatStreamRunner.ts` 通过 `graph.streamEvents(input, { version: 'v2' })` 订阅四类事件：

| LangGraph 事件 | 处理逻辑 | 发送到前端的事件 type |
|---|---|---|
| `on_chain_start` | 节点开始执行 | `requirement_analysis_start` / `task_plan_start` / `thinker_start` / `agent_switch` |
| `on_chain_end` | 节点执行完成 | `requirement_analysis_complete` / `task_plan_complete` / `thinker_complete` / `chain_step` |
| `on_chat_model_stream` | LLM token 流 | `text_delta` / `thinking_delta`（支持 `<think>` 标签与 `reasoning_content`） |
| `on_tool_start` | 工具调用开始 | `tool_call_start` |
| `on_tool_end` | 工具调用结束 | `tool_call_end` / `tool_error` / `schema_complete` / `flow_complete` / `schema_diff` / `flow_diff` / `schema_bound` / `version_created` |

特殊事件：
- `interrupt`：HITL 中断（`requirement_confirm` / 工具确认），前端展示确认 UI 后通过 `chat:resume` 恢复
- `done`：流结束（可能 `interrupted: true`）
- `error`：错误事件

### 1.5 HITL 恢复流程

```
前端 chat:resume { threadId, resumeValue }
  ▼
chatStreamHandler.ts  -> getInterruptedThread(threadId) -> clearInterruptedThread
  ▼
executeResumeStream(threadId, resumeValue, send, onDone)
  │  const command = new Command({ resume: resumeValue })
  │  graph.streamEvents(command, { configurable: { thread_id }, recursionLimit: 30 })
  ▼
LangGraph 从 interrupt 处恢复，继续执行 requirementConfirm -> taskPlanner -> ...
```

`interruptedThreads` 是进程内 Map，保存 `{ conversationId, threadId, interruptValue, timestamp }`。MongoDB checkpoint 持久化保证进程重启后可恢复（通过 `thread_id` 从 `ai_checkpoints` 重建状态）。

### 1.6 消息持久化

- 用户消息：`runChatStream` 开头 `appendMessage(convo._id, userMessage)`
- 助手消息：流结束后 `appendMessage(convo._id, assistantMessage)`，包含 `content` / `thinking` / `toolCalls` / `schema` / `flow` / `documentSummaries`
- 版本快照：工具产出 Schema/Flow 时 `createVersion({ conversationId, type, content, description })`
- 会话摘要：`maybeGenerateSummary(convo._id)` 异步触发，超过 `SUMMARY_THRESHOLD=20` 条消息时生成

---

## 第二章 LangGraph 架构

### 2.1 节点拓扑图

```
                          START
                            │
                            ▼
                        ┌─router─┐
                        │ 意图路由 │
                        └────┬────┘
                             │
                             ▼
                  ┌─requirementAnalyzer─┐
                  │  需求分析 (LLM+RAG)  │
                  └─────────┬──────────┘
                            │
                  routeAfterRequirementAnalyzer
                            │
              ┌─────────────┴──────────────┐
              │ needsConfirmation          │ !needsConfirmation
              ▼                            ▼
      ┌─requirementConfirm─┐          ┌─taskPlanner─┐
      │  interrupt() 等待   │          │ 任务规划(LLM)│
      │  用户确认           │          └──────┬──────┘
      └─────────┬──────────┘                 │
                │                            │
                └─────────────┬──────────────┘
                              ▼
                         routeAfterTaskPlanner
                              │
                              ▼
                        ┌─taskChain─┐
                        │ 任务链推进 │◄─────────────────┐
                        └─────┬─────┘                   │
                              │                         │
                   routeAfterTaskChain                   │
                              │                         │
              ┌───────────────┼─────────────┐           │
              │ task.type     │ task.type   │           │
              │ == summarize  │ else        │           │
              ▼               ▼             │           │
        ┌─summarizer─┐  ┌─pluginExpert─┐    │           │
        │  摘要生成   │  │ 专家执行(LLM) │    │           │
        └─────┬──────┘  └──────┬────────┘    │           │
              │                │             │           │
              ▼         afterAgent           │           │
             END              │              │           │
                    ┌─────────┼──────────┐   │           │
                    │ hasTool │ !hasTool │   │           │
                    │ Calls   │          │   │           │
                    ▼         ▼          │   │           │
              ┌─allTools─┐  END          │   │           │
              │ 工具执行  │               │   │           │
              └─────┬────┘               │   │           │
                    │                    │   │           │
                    ▼                    │   │           │
              ┌─afterTools─┐             │   │           │
              │ 协作检测    │             │   │           │
              └─────┬──────┘             │   │           │
                    │                    │   │           │
                    ▼                    │   │           │
           ┌─collaborationRouter─┐       │   │           │
           │   协作路由（三路）   │       │   │           │
           └──────────┬──────────┘       │   │           │
                      │                  │   │           │
         ┌────────────┼──────────────────┼───┘           │
         │            │                  │               │
    continue      nextStep           summarize           │
    (协作循环)    (任务链下一步)      (摘要)              │
         │            │                  │               │
         ▼            ▼                  ▼               │
    pluginExpert  taskChain ◄──────── summarizer         │
         │            │                                     │
         └────────────┘                                     │
```

### 2.2 节点详解

#### router（`graph.ts: routerNode`）

**职责**：意图路由，决定目标专家和任务链结构。

**路由优先级**：
1. 任务链进行中 -> 直接路由到 `taskChain`
2. `resolveIntent()` 纯函数解析：
   - **显式模式**（`context.source` = editor/flow/page）：直接映射到对应专家
   - **多意图链**：page + form / page + flow 关键词共存 -> 生成 chain
   - **插件中心 routing 匹配**：`registry.matchExpertsByRouting({ text, contextSource, runtime: 'langgraph' })`
   - **通用问候**：`GENERAL_PATTERN`（你好/你是谁/能做什么/帮助/介绍）
   - **兜底**：`platform.general` 专家
3. 全局节点执行计数 `nodeExecutionCount` >= `maxNodeExecutions`(25) -> 强制结束

**不调 LLM**：纯规则匹配（关键词正则 + 插件 registry）。

**输出**：`session.currentAgent` / `session.currentExpertId` / `task.chain` / `task.type`

#### requirementAnalyzer（`graph/requirementAnalyzer.ts` + `runtime/requirementAnalyzer.ts`）

**职责**：深度理解用户需求，提取结构化信息。

**LLM 调用**：
- Model: `resolveUserModel(preferences, getModelForTask('analyze'))`
- Temperature: **0**
- MaxTokens: 4096
- JSON mode: true
- System Prompt: `REQUIREMENT_ANALYZER_PROMPT`（需求分析专家，输出 intent/type/complexity/entities/completeness/confirmQuestions/suggestedChain）

**流程**：
1. RAG 检索（`rag__search` 工具，limit=5）
2. 构建 contextInfo（用户消息 + RAG 结果 + 显式模式标注）
3. LLM invoke -> 可能触发工具调用（搜索流程/表单）-> 工具结果回填 -> 二次 LLM 分析
4. 解析 JSON -> 转换为 `RequirementAnalysis` state 结构
5. `needsConfirmation = complexity !== 'simple' || completeness.score < 80`

**路由出口**：`routeAfterRequirementAnalyzer`
- `needsConfirmation` -> `requirementConfirm`
- 否则 -> `taskPlanner`

#### requirementConfirm（`graph/requirementConfirm.ts`）

**职责**：通过 LangGraph `interrupt()` 暂停执行，等待用户确认需求分析结果。

**不调 LLM**：纯中断等待。

**resumeValue** 格式：
- `false` -> 拒绝
- `{ skipped: true }` -> 跳过
- `{ answers: { q1: '...', q2: '...' } }` -> 用户确认答案
- `{ q1: '...', q2: '...' }` -> 直接键值对

**输出**：`requirement.userConfirmations` / `requirement.status = 'confirmed' | 'rejected'`

#### taskPlanner（`graph/taskPlanner.ts` + `runtime/taskPlanner.ts`）

**职责**：根据确认后的需求生成动态任务链。

**LLM 调用**（仅 standalone 模式）：
- Model: `resolveUserModel(preferences, getModelForTask('analyze'))`
- Temperature: **0**
- MaxTokens: 4096
- JSON mode: true
- System Prompt: `buildTaskPlannerPrompt()`（任务规划专家，输出 chain/strategy/contextFlow，含插件中心专家目录）

**显式模式**（editor/flow/page）：不调 LLM，直接创建单步计划 `createSimplePlan(agent, description)`

**输出**：`taskPlan.plan` / `task.chain` / `task.currentStepIndex`

#### taskChain（`graph.ts: taskChainNode`）

**职责**：任务链推进管理。

**不调 LLM**：纯状态管理。

**功能**：
1. 协作请求处理：插入新步骤到当前位置之后，去重防循环
2. 所有步骤完成 -> `task.type = 'summarize'` -> 路由到 summarizer
3. 步骤上下文提取与传递：`extractAgentContext(state)` -> `step.context`
4. 上游上下文合并到当前步骤

**路由出口**：`routeAfterTaskChain`
- `task.type == 'summarize'` -> `summarizer`
- 否则 -> `pluginExpert`

#### pluginExpert（`graph/pluginExpertAgent.ts`）

**职责**：唯一专家执行节点，通过插件中心 Registry 解析 prompt 和 tools。

**LLM 调用**：
- Model: `resolveUserModel(preferences, getModelForTask(expert.model?.task ?? 'generate_complex'))`
- Temperature: `expert.model?.temperature ?? 0.7`
- MaxTokens: `expert.model?.maxTokens ?? 8192`
- System Prompt: `buildExpertSystemPrompt(expert)`（从插件中心解析，支持 dynamicPrompt: editor/flow/page/general -> `promptBuilder.ts` 生成）
- Tools: `getExpertTools(expert)` -> `llm.bindTools(tools)`（如有）

**流程**：
1. `resolveExpertForSession(state.session)` -> 获取 ExpertDeclaration
2. `retrieveRagContext(userQueryText)` -> RAG 上下文注入
3. `buildExpertSystemPrompt(expert)` -> 系统提示词
4. `buildExpertUserContent(state, expert)` + RAG context -> 用户消息
5. `truncateMessagesForLangGraph(state.messages)` -> 历史截断（60K token 预算）
6. `model.stream(messages)` -> 流式生成（通过 `callLLMWithFallback` 包装错误处理）

**路由出口**：`afterAgent`
- `hasToolCalls && toolIterationCount < 3` -> `allTools`
- `toolIterationCount >= 3` -> `summarizer`（工具迭代上限）
- standalone + chain 有剩余步骤 -> `taskChain`
- standalone + chain 完成 -> `summarizer`
- 显式模式 + 无 tool_calls -> `END`

#### allTools（`graph.ts: allToolNodeWithErrorHandling`）

**职责**：执行 LLM 请求的工具调用。

**不调 LLM**：使用 LangGraph `ToolNode(getAllToolsSync())`。

**错误处理**：捕获 MongoDB 断连等异常，为每个失败的 tool_call 生成错误 ToolMessage，记录 `ai:thinker:error` 结构化日志。

#### afterTools（`graph.ts: afterToolsNode`）

**职责**：工具执行后协作检测。

**不调 LLM**：调用 `routeCollaboration()` 纯函数。

**功能**：
1. 从消息中提取工具调用结果
2. `routeCollaboration({ toolResults, currentExpertId, taskChain, collaborationHistory })` 检测 `request_collaboration` 工具调用
3. 协作循环检测：反向边存在 / 轮次超 `maxCollaborationRounds`(3) -> 拦截
4. 提取当前步骤上下文 `extractAgentContext(state)`

#### collaborationRouter（`graph.ts: collaborationRouterNode`）

**职责**：三路路由决策（与前端设计器 collaboration-router 对齐）。

**不调 LLM**：纯路由。

**路由出口**：`routeAfterCollaborationRouter`
- `collaborationRequest` 存在 -> `pluginExpert`（continue 协作循环）
- standalone + chain 有剩余 -> `taskChain`（nextStep）
- standalone + chain 完成 -> `summarizer`
- 单步完成 -> `pluginExpert`（continue 单步后续）

#### summarizer（`graph.ts: summarizerNode` + `runtime/summarizer.ts`）

**职责**：多步骤结果摘要生成。

**LLM 调用**：
- Model: `resolveUserModel(preferences, getModelForTask('analyze'))`
- Temperature: **0.7**
- MaxTokens: 2048
- System Prompt: `DEFAULT_SUMMARIZER_PROMPT` + 步骤执行结果 + 用户需求

**输出**：`messages: [new AIMessage({ content })]` -> 流式输出到前端

### 2.3 Checkpoint 持久化

**实现**：`graph/checkpointMongo.ts` -> `MongoDBCheckpointer extends BaseCheckpointSaver`

**Collections**：
- `ai_checkpoints`：每个 thread 的 checkpoint 快照（`thread_id` + `checkpoint_ns` + `checkpoint_id`）
- `ai_checkpoint_writes`：pending writes 链接到 checkpoint

**机制**：
- 每个 graph 节点执行后自动 put checkpoint
- `thread_id` = `conversationId` = MongoDB `_id`
- HITL interrupt 时 checkpoint 保存当前状态，resume 时从 checkpoint 恢复
- 进程重启后可通过 `thread_id` 恢复中断的会话

**编译**：`builder.compile({ checkpointer })`，`recursionLimit: 30`

### 2.4 流式输出机制

LangGraph `streamEvents(input, { version: 'v2' })` 产出事件流：

1. **节点生命周期**：`on_chain_start` / `on_chain_end`（含节点输出数据）
2. **LLM token**：`on_chat_model_stream`（含 `chunk.content` 和 `additional_kwargs.reasoning_content`）
3. **工具调用**：`on_tool_start` / `on_tool_end`（含工具输入输出）

`chatStreamRunner.ts` 消费事件流，通过 `sendEvent()` -> `socket.emit('chat:event')` 推送到前端。

**Think 标签处理**：支持 `<think>...</think>` 标签和 DeepSeek `reasoning_content`，内容路由到 `thinking_delta` 事件，前端在折叠区域展示。

---

## 第三章 LLM 调用清单

### 3.1 Graph 节点 LLM 调用

| 节点 | 调用位置 | System Prompt 摘要 | Temperature | MaxTokens | 输出格式 | 模型选择 |
|---|---|---|---|---|---|---|
| **router** | 不调 LLM | - | - | - | - | - |
| **requirementAnalyzer** | `runtime/requirementAnalyzer.ts: analyzeRequirement()` | 需求分析专家：理解意图、分类、复杂度评估、提取实体、评估完整性、生成确认问题、建议任务链 | **0** | 4096 | JSON (`jsonMode: true`) | `getModelForTask('analyze')` + 用户偏好覆盖 |
| **requirementConfirm** | 不调 LLM | - | - | - | - | - |
| **taskPlanner** | `runtime/taskPlanner.ts: planTasks()` | 任务规划专家：拆解任务、确定依赖、选择执行策略，含插件中心专家目录 | **0** | 4096 | JSON (`jsonMode: true`) | `getModelForTask('analyze')` + 用户偏好覆盖 |
| **taskChain** | 不调 LLM | - | - | - | - | - |
| **pluginExpert** | `graph/pluginExpertAgent.ts: pluginExpertAgentNode()` | 专家系统提示词（从插件中心 Registry 解析，支持 dynamicPrompt: editor/flow/page/general） | `expert.model?.temperature ?? 0.7` | `expert.model?.maxTokens ?? 8192` | 流式文本 + tool_calls | `getModelForTask(expert.model?.task ?? 'generate_complex')` + 用户偏好覆盖 |
| **allTools** | 不调 LLM | - | - | - | - | - |
| **afterTools** | 不调 LLM | - | - | - | - | - |
| **collaborationRouter** | 不调 LLM | - | - | - | - | - |
| **summarizer** | `runtime/summarizer.ts: generateSummaryText()` | schema-platform AI 助手，总结专家执行结果，给出后续建议 | **0.7** | 2048 | 流式文本 | `getModelForTask('analyze')` + 用户偏好覆盖 |

### 3.2 Workflow 节点 LLM 调用

| 节点类型 | 调用位置 | Temperature | MaxTokens | 说明 |
|---|---|---|---|---|
| **llm** | `services/nodes/llm.ts: executeLlmNode()` | **0.3** | 默认 8192 | 通用 LLM 文本生成，支持对话历史、流式输出、自定义 systemPrompt |
| **agent-loop** | `services/nodes/agentLoop.ts: executeAgentLoopNode()` | **0.2** | 默认 8192 | 自主智能体循环（LLM 推理 -> 工具调用 -> 最终回答），maxIterations 1-20 |
| **agent-team** | `services/nodes/agentTeam.ts: executeAgentTeamNode()` | supervisor **0.2** / member **0.3** | 默认 8192 | 多 Agent 协作（supervisor agent-loop + 团队成员作为工具） |
| **intent-router** | `services/nodes/intentRouter.ts` | 不调 LLM | - | 调用 `resolveIntent()` 纯函数 |
| **requirement-analyzer** | `services/nodes/requirementAnalyzer.ts` | **0** | 4096 | 复用 `runtime/requirementAnalyzer.ts` |
| **task-planner** | `services/nodes/taskPlanner.ts` | **0** | 4096 | 复用 `runtime/taskPlanner.ts` |
| **summarizer** | `services/nodes/summarizer.ts` | **0.7** | 2048 | 复用 `runtime/summarizer.ts` |
| **expert** | `services/nodes/expert.ts` -> `dispatchExpert.ts: runRegisteredExpert()` | `expert.model?.temperature ?? 0.5` | `expert.model?.maxTokens ?? 4096` | 插件中心专家执行 |
| **vision-analyze** | `services/nodes/visionAnalyze.ts` | 视觉模型默认 | - | 图片视觉分析（多模态 LLM） |
| **image-generate** | `services/nodes/imageGenerate.ts` | - | - | 图片生成（DALL-E / mimo-image） |
| **video-generate** | `services/nodes/videoGenerate.ts` | - | - | 视频生成（异步轮询） |
| **document-parse** | `services/nodes/documentParse.ts` | - | - | 文档解析（非 LLM） |
| **if / switch** | `services/nodes/if.ts` / `switch.ts` | 不调 LLM | - | 条件分支（表达式求值） |
| **hitl** | `services/nodes/hitl.ts` | 不调 LLM | - | 人工确认暂停 |
| **tool** | `services/nodes/tool.ts` | 不调 LLM | - | 工具执行（MCP / langgraph / http） |
| **code-execute** | `services/nodes/codeExecute.ts` | - | - | JavaScript 沙箱执行 |
| **variable-set** | `services/nodes/variableSet.ts` | - | - | 变量设置 |
| **conversation-memory** | `services/nodes/conversationMemory.ts` | - | - | 会话记忆读写 |
| **approval-analyze** | `services/nodes/approvalAnalyze.ts` | LLM | - | 审批分析 |
| **flow-interact** | `services/nodes/flowInteract.ts` | LLM | - | 流程交互 |
| **compliance-check** | `services/nodes/complianceCheck.ts` | LLM | - | 合规检查 |
| **module-assemble** | `services/nodes/moduleAssemble.ts` | LLM | - | 模块组装 |
| **form-query** | `services/nodes/formQuery.ts` | LLM | - | 表单查询 |
| **anomaly-detect** | `services/nodes/anomalyDetect.ts` | LLM | - | 异常检测 |
| **chart-generate** | `services/nodes/chartGenerate.ts` | LLM | - | 图表生成 |

### 3.3 LLM 配置解析（4 层优先级）

`services/llmCache.ts: resolveConfig()` 按优先级解析 LLM 配置：

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | Request user config | `opts.userConfig`（per-request apiKey/provider/baseURL） |
| 2 | Tenant default (DB) | Provider + Model 两级查询，回退 legacy ModelConfig |
| 3 | Platform demo | LLMManager 环境变量注册的 provider（`PLATFORM_LLM_ENABLED != false`） |
| 4 | Env fallback | `DEEPSEEK_API_KEY` 环境变量 |

**默认值**：
- `DEFAULT_TEMPERATURE = 0.7`
- `DEFAULT_MAX_TOKENS = 8192`
- `DEFAULT_FALLBACK_MODEL = 'deepseek-v4-flash'`
- `LLM_TIMEOUT_MS = 120_000`

**任务类型模型**（`agentBase.ts: getModelForTask()`）：
- `router` -> `process.env.LLM_MODEL_ROUTER`
- `generate_simple` -> `process.env.LLM_MODEL_GENERATE_SIMPLE`
- `generate_complex` -> `process.env.LLM_MODEL_GENERATE_COMPLEX`
- `analyze` -> `process.env.LLM_MODEL_ANALYZE`
- 未设置 -> 空字符串，由 `getLLM()` 从 DB 解析

**JSON Mode**：`temperature > 0` 时才启用 `response_format: { type: 'json_object' }`（低温 + json_object 可能不稳定）

**缓存**：`llmCache: Map<string, ChatOpenAI>`，key = `providerName|source|model|temperature|maxTokens|jsonMode`

---

## 第四章 31 个模板详解

模板定义位于 `shared/platform-shared/ai/agentWorkflow/templates.ts`，工厂函数位于 `shared/platform-shared/ai/agentWorkflow/templateFactories/*.ts`。

### 4.1 通用类（general）

#### blank - 空白工作流

| 属性 | 值 |
|---|---|
| **分类** | general |
| **节点编排** | manual-trigger -> llm -> end |
| **关键提示词** | 无预设（用户自定义） |
| **适用场景** | 从零开始搭建工作流 |
| **触发方式** | 手动触发 |

#### image-text-generation - 图文生成

| 属性 | 值 |
|---|---|
| **分类** | general |
| **节点编排** | manual-trigger -> llm(生成文案大纲) -> llm(生成完整文案) -> end |
| **关键提示词** | LLM1: "你是内容策划..." / LLM2: "你是文案撰写专家..." |
| **适用场景** | 公众号文章、产品介绍、营销素材 |
| **触发方式** | 手动触发 |

#### ppt-generation - PPT 生成

| 属性 | 值 |
|---|---|
| **分类** | general |
| **节点编排** | manual-trigger -> conversation-memory(读取上下文) -> llm(生成 PPT 大纲) -> llm(生成每页详细内容) -> end |
| **关键提示词** | LLM1: "你是 PPT 大纲生成专家..." / LLM2: "你是 PPT 内容撰写专家..." |
| **适用场景** | 根据用户描述或文档内容生成演示文稿 |
| **触发方式** | 手动触发 |

#### multimodal-image-text - 图文批量生成

| 属性 | 值 |
|---|---|
| **分类** | general |
| **节点编排** | manual-trigger -> llm(文案+配图 prompt 生成) -> image-generate(批量配图) -> end |
| **关键提示词** | "你是内容营销专家。根据用户需求生成一篇图文素材：包含正文文案和配图 prompt。输出 JSON { title, body, imagePrompts[] }" |
| **适用场景** | 图文素材批量生产 |
| **触发方式** | 手动触发 |

#### multimodal-video-promo - 视频营销生成

| 属性 | 值 |
|---|---|
| **分类** | general |
| **节点编排** | manual-trigger -> llm(视频脚本生成) -> video-generate(视频生成) -> end |
| **关键提示词** | "你是视频脚本编剧。生成 6-15 秒短视频画面描述脚本。输出 JSON { title, videoPrompt, duration }" |
| **适用场景** | 营销/宣传短视频快速生产 |
| **触发方式** | 手动触发 |

### 4.2 文档类（document）

#### document-summary - 文档摘要

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | webhook-trigger -> document-parse -> llm(生成摘要) -> end |
| **关键提示词** | "你是文档摘要助手，请根据解析后的文档内容生成简洁的中文摘要。" |
| **适用场景** | Webhook 接收 documentId，解析后生成摘要 |
| **触发方式** | Webhook POST `/document-summary` |

#### doc-image-recognition - 文档/图片识别

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | manual-trigger -> document-parse -> if(是否图片 OCR) -> vision-analyze(图片视觉描述) -> llm(图片结构化识别) / llm(文档结构化提取) -> end |
| **关键提示词** | 图片分支: "你是图片识别专家..." / 文档分支: "你是文档结构化提取专家..." |
| **适用场景** | 上传文件，图片走 OCR 分支，文档走结构化提取 |
| **触发方式** | 手动触发 |

#### contract-extract - 合同条款提取

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | webhook-trigger -> document-parse -> llm(条款结构化提取) -> end |
| **关键提示词** | "你是合同分析专家。提取关键条款、金额、日期、责任方，标注风险点。输出 JSON" |
| **适用场景** | 上传合同文档，LLM 结构化提取关键条款与风险点 |
| **触发方式** | Webhook POST `/contract-extract` |

#### image-analysis - 图片智能分析

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | manual-trigger -> vision-analyze(Phase1 小图 400px) -> llm(解析结构化数据) -> if(分类判断) -> vision-analyze(Phase2 大图 1024px 情感分析) -> llm(情感文案润色/事件摘要) -> end |
| **关键提示词** | 多阶段视觉分析：结构化提取 -> 分类 -> 情感/事件/信息微叙事 |
| **适用场景** | 图片分析 -> 结构化提取 -> 根据类型生成情感/事件/信息微叙事 |
| **触发方式** | 手动触发 |

#### multi-doc-compare - 多文档对比

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | manual-trigger -> conversation-memory(会话记忆) -> llm(多文档对比) -> end |
| **关键提示词** | "你是文档对比专家。基于会话中累积的多份文档内容，输出差异对比、一致性检查与合并建议。输出 JSON { differences, consistencyIssues, mergeSuggestions }" |
| **适用场景** | 多份文档差异对比、一致性检查与合并建议 |
| **触发方式** | 手动触发（结合会话记忆累积文档） |

#### structured-extract - 结构化字段提取

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | webhook-trigger -> document-parse -> llm(字段结构化提取) -> end |
| **关键提示词** | "你是信息提取专家。按指定 schema 提取字段并输出 JSON" |
| **适用场景** | 文档按指定 schema 提取字段，输出 JSON 供下游消费 |
| **触发方式** | Webhook POST `/structured-extract` |

#### smart-action-proposals - 智能拟办

| 属性 | 值 |
|---|---|
| **分类** | document |
| **节点编排** | webhook-trigger -> document-parse -> llm(提取行动项) -> hitl(人工审核) -> if(用户确认) -> tool(http 通知) -> end |
| **关键提示词** | "你是项目管理助手。从文档中提取可执行的行动项、待办事项、审批需求。输出 JSON { actionItems[], approvalChain[] }" |
| **适用场景** | 从文档/对话中提取行动项，生成待办、审批流程、任务分配方案 |
| **触发方式** | Webhook POST `/smart-actions` |

### 4.3 助手类（assistant）

#### intelligent-assistant - 智能助手问答

| 属性 | 值 |
|---|---|
| **分类** | assistant |
| **节点编排** | manual-trigger -> conversation-memory(记录用户问题) -> tool(rag__search 知识库检索) -> llm(生成回答) -> end |
| **关键提示词** | "你是 Schema 平台智能助手。根据知识库检索结果与对话历史回答用户问题，语气简洁专业。" |
| **适用场景** | RAG 检索知识库后由 LLM 生成帮助回答 |
| **触发方式** | 手动触发 |

#### kb-faq - 知识库 FAQ 生成

| 属性 | 值 |
|---|---|
| **分类** | assistant |
| **节点编排** | webhook-trigger -> document-parse -> llm(生成 FAQ 问答对) -> tool(rag__ingest 写入知识库) -> end |
| **关键提示词** | "你是 FAQ 生成专家。根据文档内容生成问答对。输出 JSON { faqs[] }" |
| **适用场景** | Webhook 接收文档，LLM 自动生成问答对并写入知识库 |
| **触发方式** | Webhook POST `/kb-faq` |

#### rag-ingest-qa - RAG 入库质检

| 属性 | 值 |
|---|---|
| **分类** | assistant |
| **节点编排** | webhook-trigger -> document-parse -> llm(内容质量检查) -> if(质检是否通过) -> tool(rag__ingest 写入) / hitl(人工审核) -> if(用户选择) -> tool(强制入库) -> end |
| **关键提示词** | "你是 RAG 数据质检员。检查文档质量：完整性、准确性、可检索性。输出 JSON { passed, score, issues[] }" |
| **适用场景** | 文档解析后经 LLM 质检，合格自动入库，不合格触发人工审核 |
| **触发方式** | Webhook POST `/rag-ingest-qa` |

#### smart-suggestions - 智能建议

| 属性 | 值 |
|---|---|
| **分类** | assistant |
| **节点编排** | manual-trigger -> conversation-memory(读取上下文) -> tool(rag__search 检索相关 Schema) -> llm(生成智能建议) -> if(是否有建议) -> hitl(用户确认) -> end |
| **关键提示词** | "你是 schema-platform 智能助手。根据用户操作上下文推荐下一步操作、优化方案、相关 Schema/Flow" |
| **适用场景** | AI 主动推荐下一步操作、优化方案、相关资源 |
| **触发方式** | 手动触发 |

#### chat-parity-assistant - 智能助手 v2

| 属性 | 值 |
|---|---|
| **分类** | assistant |
| **节点编排** | manual-trigger -> intent-router -> (needsAnalysis: requirement-analyzer -> hitl -> task-planner -> task-chain -> expert -> collaboration-router) / (matched: expert) -> summarizer -> end |
| **协作路由三路** | continue -> expert / nextStep -> task-chain / summarize -> summarizer |
| **关键提示词** | 复用 LangGraph 全链路节点（intent-router / requirement-analyzer / task-planner / expert / collaboration-router / summarizer） |
| **适用场景** | Chat 全链路对等实现，支持快捷匹配与协作循环 |
| **触发方式** | 手动触发 |

#### requirement-gated-build - 需求门控构建

| 属性 | 值 |
|---|---|
| **分类** | assistant |
| **节点编排** | manual-trigger -> requirement-analyzer -> hitl -> task-planner -> task-chain(editor) -> expert(editor) -> task-chain(flow) -> expert(flow) -> summarizer -> end |
| **关键提示词** | 复用 LangGraph requirement-analyzer / task-planner / expert / summarizer |
| **适用场景** | 按需求门控逐步构建：需求分析 -> 人工确认 -> 任务规划 -> 编辑器专家 -> 流程专家 -> 摘要 |
| **触发方式** | 手动触发 |

### 4.4 集成类（integration）

#### http-notify - HTTP 回调通知

| 属性 | 值 |
|---|---|
| **分类** | integration |
| **节点编排** | webhook-trigger -> llm(内容处理) -> tool(http__request HTTP 回调) -> end |
| **关键提示词** | "你是数据处理助手。对输入内容进行分析和摘要，输出结构化 JSON 结果。" |
| **适用场景** | Webhook 接收数据 -> LLM 处理 -> HTTP POST 结果到外部系统 |
| **触发方式** | Webhook POST `/process-and-notify` |

#### webhook-batch-dispatch - 批量任务分发

| 属性 | 值 |
|---|---|
| **分类** | integration |
| **节点编排** | webhook-trigger -> task-planner(任务规划) -> task-chain(任务链执行) -> summarizer(结果汇总) -> end |
| **关键提示词** | 复用 task-planner + task-chain + summarizer 节点 |
| **适用场景** | 批量任务，任务规划拆解 -> 任务链逐步执行 -> 摘要汇总 |
| **触发方式** | Webhook POST `/batch-dispatch` |

### 4.5 批处理类（batch）

#### multi-doc-batch - 多文档批量处理

| 属性 | 值 |
|---|---|
| **分类** | batch |
| **节点编排** | webhook-trigger -> document-parse -> llm(单文档摘要) -> conversation-memory(追加摘要) -> llm(汇总所有摘要) -> end |
| **关键提示词** | LLM1: "你是文档摘要助手..." / LLM2: "你是文档汇总助手..." |
| **适用场景** | 多文档批量处理，生成摘要并汇总（多次调用可累积） |
| **触发方式** | Webhook POST `/multi-doc-batch` |

#### excel-report - Excel 报表洞察

| 属性 | 值 |
|---|---|
| **分类** | batch |
| **节点编排** | webhook-trigger -> document-parse(Excel/CSV 解析) -> llm(报表洞察生成) -> end |
| **关键提示词** | "你是数据分析专家。基于表格文本生成数据摘要、关键趋势、异常点与行动建议。输出 JSON { summary, metrics[], anomalies[], recommendations[] }" |
| **适用场景** | Excel/CSV 文件解析后生成数据摘要、趋势洞察与异常提示 |
| **触发方式** | Webhook POST `/excel-report` |

### 4.6 客服类（customer-service）

#### cs-ticket-triage - 客服工单智能分流

| 属性 | 值 |
|---|---|
| **分类** | customer-service |
| **节点编排** | webhook-trigger -> llm(工单分类) -> if(是否需专员) -> end(专员队列) / end(普通队列) |
| **关键提示词** | "你是客服工单分流助手。判断类别（咨询/投诉/退款/技术）、优先级（high/medium/low）、建议团队。输出 JSON" |
| **适用场景** | 工单文本分类分流 |
| **触发方式** | Webhook POST `/cs-ticket-triage` |

#### cs-kb-reply - 客服知识库回复

| 属性 | 值 |
|---|---|
| **分类** | customer-service |
| **节点编排** | manual-trigger -> tool(rag__search 知识库检索) -> llm(生成回复草稿) -> end |
| **关键提示词** | "你是客服回复助手。根据知识库检索结果生成专业、有同理心的回复草稿。" |
| **适用场景** | 检索知识库后生成客服回复草稿 |
| **触发方式** | 手动触发 |

#### cs-sentiment-escalate - 情绪检测与升级

| 属性 | 值 |
|---|---|
| **分类** | customer-service |
| **节点编排** | webhook-trigger -> llm(情绪分析) -> if(是否负面升级) -> hitl(人工审核升级) / end |
| **关键提示词** | "你是客户情绪分析专家。判断情绪（positive/neutral/negative）、严重程度、是否需升级。输出 JSON" |
| **适用场景** | 客户消息情绪分析，负面情绪进入人工审核 |
| **触发方式** | Webhook POST `/cs-sentiment-escalate` |

### 4.7 审计类（audit）

#### content-compliance - 内容合规审查

| 属性 | 值 |
|---|---|
| **分类** | audit |
| **节点编排** | webhook-trigger -> llm(合规审查) -> if(是否违规) -> hitl(人工审核) / end |
| **关键提示词** | "你是内容合规审查员。判断是否违反法律法规、平台政策或品牌规范。输出 JSON { compliant, violations[], severity, suggestion }" |
| **适用场景** | 内容合规审查，命中违规进入人工审核 |
| **触发方式** | Webhook POST `/content-compliance` |

#### contract-risk-tag - 合同风险标注

| 属性 | 值 |
|---|---|
| **分类** | audit |
| **节点编排** | manual-trigger -> document-parse(合同解析) -> llm(风险标注) -> hitl(人工确认) -> end |
| **关键提示词** | "你是合同风险分析专家。标注风险等级与条款。输出 JSON { riskLevel, riskClauses[], suggestions[] }" |
| **适用场景** | 合同风险标注，经人工确认输出终稿 |
| **触发方式** | 手动触发 |

#### faq-quality-check - FAQ 质检

| 属性 | 值 |
|---|---|
| **分类** | audit |
| **节点编排** | webhook-trigger -> llm(FAQ 质检) -> if(是否合格) -> hitl(人工复核) / end |
| **关键提示词** | "你是 FAQ 质检员。检查准确性、完整性、可理解性。输出 JSON { passed, score, issues[] }" |
| **适用场景** | FAQ 条目质检，不合格进入人工复核 |
| **触发方式** | Webhook POST `/faq-quality-check` |

### 4.8 HR 类（hr）

#### resume-screening - 简历筛选

| 属性 | 值 |
|---|---|
| **分类** | hr |
| **节点编排** | webhook-trigger -> document-parse(简历解析) -> llm(信息提取与评分) -> end |
| **关键提示词** | "你是资深 HR。从简历中提取关键信息，与岗位要求匹配后打分。输出 JSON { candidate, matchScore, strengths[], weaknesses[], recommendation, reason }" |
| **适用场景** | 简历解析，提取关键信息，匹配岗位要求，输出评分与录用建议 |
| **触发方式** | Webhook POST `/resume-screening` |

### 4.9 财务类（finance）

#### expense-audit - 报销单审核

| 属性 | 值 |
|---|---|
| **分类** | finance |
| **节点编排** | webhook-trigger -> document-parse(凭证解析) -> llm(合规审核) -> if(是否合规) -> hitl(人工复核) / end(审核通过) |
| **关键提示词** | "你是财务审核员。核对报销单的金额、项目、票据合规性。输出 JSON { compliant, totalAmount, items[], anomalies[], suggestion }" |
| **适用场景** | 报销凭证解析，核对金额与项目合规性，异常项人工复核 |
| **触发方式** | Webhook POST `/expense-audit` |

### 4.10 运营类（operations）

#### feedback-analysis - 客户反馈分析

| 属性 | 值 |
|---|---|
| **分类** | operations |
| **节点编排** | manual-trigger -> llm(反馈数据汇总) -> llm(情感与主题分析) -> end |
| **关键提示词** | LLM2: "你是数据分析专家。对客户反馈进行情感分类和主题提取。输出 JSON { summary, topThemes[], insights[], actionItems[] }" |
| **适用场景** | 批量处理客户反馈，情感分类 + 主题提取，生成汇总报告 |
| **触发方式** | 手动触发 |

### 4.11 模板分类汇总

| 分类 | 数量 | 模板 ID |
|---|---|---|
| general | 5 | blank, image-text-generation, ppt-generation, multimodal-image-text, multimodal-video-promo |
| document | 7 | document-summary, doc-image-recognition, contract-extract, image-analysis, multi-doc-compare, structured-extract, smart-action-proposals |
| assistant | 6 | intelligent-assistant, kb-faq, rag-ingest-qa, smart-suggestions, chat-parity-assistant, requirement-gated-build |
| integration | 2 | http-notify, webhook-batch-dispatch |
| batch | 2 | multi-doc-batch, excel-report |
| customer-service | 3 | cs-ticket-triage, cs-kb-reply, cs-sentiment-escalate |
| audit | 3 | content-compliance, contract-risk-tag, faq-quality-check |
| hr | 1 | resume-screening |
| finance | 1 | expense-audit |
| operations | 1 | feedback-analysis |
| **合计** | **31** | |

---

## 第五章 数据流与 MongoDB Collections

### 5.1 Collection 关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Chat 链路 Collections                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  conversations                                                   │
│  ├── _id (threadId)                                              │
│  ├── userId, source, schemaId, flowId, nodeId, version           │
│  ├── messages[]                                                  │
│  │   ├── role: user|assistant|system                             │
│  │   ├── content, thinking, tip                                  │
│  │   ├── toolCalls[]                                             │
│  │   ├── schema / flow                                           │
│  │   ├── attachments[]                                           │
│  │   └── documentSummaries[]                                     │
│  └── summary (异步生成)                                          │
│        │                                                         │
│        │ 1:N                                                     │
│        ▼                                                         │
│  versions (conversation 版本快照)                                 │
│  ├── conversationId                                              │
│  ├── messageId                                                   │
│  ├── type: schema|flow                                           │
│  ├── content (Widget 树 / Flow 图)                               │
│  └── version (自动递增)                                          │
│                                                                  │
│  ai_checkpoints (LangGraph 状态持久化)                            │
│  ├── thread_id (= conversationId)                                │
│  ├── checkpoint_ns                                               │
│  ├── checkpoint_id                                               │
│  ├── parent_checkpoint_id                                        │
│  ├── checkpoint (序列化状态)                                     │
│  └── metadata                                                    │
│        │                                                         │
│        │ 1:N                                                     │
│        ▼                                                         │
│  ai_checkpoint_writes (pending writes)                           │
│  ├── thread_id, checkpoint_ns, checkpoint_id                     │
│  ├── task_id, idx, channel                                       │
│  └── value (序列化)                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Workflow 链路 Collections                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  agentworkflows (工作流定义)                                      │
│  ├── _id, name, description, status (draft/published/archived)  │
│  ├── slug (租户内唯一，Open API by-slug)                          │
│  ├── draftGraph { nodes[], edges[], entryNodeId }                │
│  ├── publishedGraph                                              │
│  ├── versions[] { version, graph, createdAt, published }         │
│  ├── routingKeywords[] (chat 意图匹配)                           │
│  ├── onCompleteWebhook { url, secret }                           │
│  ├── invokeKey (脱敏)                                            │
│  └── tenantId                                                    │
│        │                                                         │
│        │ 1:N                                                     │
│        ▼                                                         │
│  agentworkflowversions (工作流版本)                               │
│  ├── workflowId, version                                         │
│  ├── graph { nodes[], edges[], entryNodeId }                     │
│  └── published, current                                          │
│        │                                                         │
│        │ 1:N                                                     │
│        ▼                                                         │
│  agentworkflowexecutions (执行记录)                               │
│  ├── _id, workflowId, workflowName, versionId, version           │
│  ├── status: running|success|error|waiting|cancelled             │
│  ├── trigger: manual|chat|webhook|api|schedule                   │
│  ├── startedAt, finishedAt, durationMs                           │
│  ├── nodeRecords[]                                               │
│  │   ├── nodeId, nodeType, nodeName                              │
│  │   ├── status: pending|running|success|error|skipped|waiting   │
│  │   ├── startedAt, finishedAt, durationMs                       │
│  │   ├── input, output                                           │
│  │   └── error                                                   │
│  ├── conversationHistory[]                                       │
│  ├── parentExecutionId (子 workflow 调用)                        │
│  ├── streamingOutput                                             │
│  └── error                                                       │
│                                                                  │
│  workflownodemetrics (节点指标)                                   │
│  ├── executionId, nodeId, nodeType, nodeName                     │
│  ├── duration, success, error                                    │
│  └── tenantId                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     业务数据 Collections                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  formschemas (表单 Schema)                                       │
│  ├── _id, name, description                                      │
│  ├── json (Widget 树)                                            │
│  ├── versions[] { version, json }                                │
│  └── tenantId                                                    │
│                                                                  │
│  flowdefinitions (流程定义)                                      │
│  ├── _id, name, description                                      │
│  └── tenantId                                                    │
│        │                                                         │
│        │ 1:N                                                     │
│        ▼                                                         │
│  flowversions (流程版本)                                          │
│  ├── definitionId, version                                       │
│  ├── graph { nodes[], edges[] }                                  │
│  └── published                                                   │
│                                                                  │
│  flowinstances (流程实例)                                         │
│  ├── definitionId, versionId, status                             │
│  ├── variables, startedAt, finishedAt                            │
│  └── tenantId                                                    │
│                                                                  │
│  taskinstances (任务实例)                                         │
│  ├── instanceId, nodeId, assignee                                │
│  ├── status, variables                                           │
│  └── tenantId                                                    │
│                                                                  │
│  documents (AI 文档库)                                            │
│  ├── _id, filename, mimetype, size                               │
│  ├── text (解析后文本)                                            │
│  ├── summary { summary, keyPoints[] }                            │
│  └── userId                                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     LLM / 插件 Collections                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  providers (LLM Provider)                                        │
│  ├── _id, name, type (openai/deepseek/...), baseUrl              │
│  ├── apiKey (加密存储)                                            │
│  ├── isActive                                                    │
│  └── tenantId                                                    │
│        │                                                         │
│        │ 1:N                                                     │
│        ▼                                                         │
│  models (LLM Model)                                              │
│  ├── _id, name, providerId, model (标识符)                       │
│  ├── parameters { temperature, maxTokens, topP }                 │
│  ├── isDefault, isActive                                         │
│  └── tenantId                                                    │
│                                                                  │
│  modelconfigs (legacy LLM 配置，向后兼容)                         │
│  ├── provider, apiKey, baseUrl, model                            │
│  ├── parameters { temperature, maxTokens }                       │
│  └── isDefault                                                   │
│                                                                  │
│  prompttemplates (内置 Prompt 模板)                               │
│  ├── name, description, category (schema/flow/general/custom)    │
│  ├── template (含 {{variables}})                                 │
│  └── tags[]                                                      │
│                                                                  │
│  promptversions (Prompt 版本管理)                                 │
│                                                                  │
│  agentmetrics (Agent 性能指标)                                    │
│  ├── agentName, operation (invoke/tool_call/think/stream)        │
│  ├── duration, success, error                                    │
│  └── tokenUsage { prompt, completion, total }                    │
│                                                                  │
│  plugs / userplugins (插件包安装)                                 │
│                                                                  │
│  pluginmetrics (插件使用指标)                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       RAG Collections                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  schemaembeddings (向量存储)                                      │
│  ├── _id, documentId, content (文本块)                           │
│  ├── embedding (向量)                                            │
│  ├── metadata { source, type, tags[] }                           │
│  └── tenantId                                                    │
│                                                                  │
│  evaluations (评测记录)                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 关键字段说明

#### conversations

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | ObjectId | 会话 ID，同时作为 LangGraph `thread_id` |
| `userId` | string | 用户标识 |
| `source` | string | 来源：editor / flow / page / standalone |
| `schemaId` / `flowId` / `nodeId` | ObjectId? | 关联资源 |
| `messages[]` | Array | 消息数组，每条含 role / content / thinking / toolCalls / schema / flow / attachments |
| `summary` | string? | 异步生成的会话摘要（超过 20 条消息触发） |

#### agentworkflows

| 字段 | 类型 | 说明 |
|---|---|---|
| `draftGraph` | Mixed | 草稿图（nodes + edges + entryNodeId） |
| `publishedGraph` | Mixed? | 已发布图 |
| `versions[]` | Array | 版本历史（version + graph + createdAt + published） |
| `slug` | string? | 租户内唯一 slug，Open API by-slug 执行 |
| `routingKeywords[]` | string[]? | chat 意图匹配关键词 |
| `onCompleteWebhook` | { url, secret }? | 执行完成回调 |
| `invokeKey` | string? | 调用密钥（脱敏存储） |
| `status` | string | draft / published / archived |

#### agentworkflowexecutions

| 字段 | 类型 | 说明 |
|---|---|---|
| `status` | string | running / success / error / waiting / cancelled |
| `trigger` | string | manual / chat / webhook / api / schedule |
| `nodeRecords[]` | Array | 每个节点的执行记录（status / input / output / durationMs / error） |
| `conversationHistory[]` | Array | 会话历史（role / content / at） |
| `parentExecutionId` | ObjectId? | 父执行 ID（子 workflow 调用） |
| `streamingOutput` | object? | 当前流式输出（nodeId / nodeType / text / updatedAt） |

#### ai_checkpoints

| 字段 | 类型 | 说明 |
|---|---|---|
| `thread_id` | string | 线程 ID（= conversationId） |
| `checkpoint_ns` | string | 命名空间（默认空字符串） |
| `checkpoint_id` | string | checkpoint 唯一 ID（递增） |
| `parent_checkpoint_id` | string? | 父 checkpoint ID |
| `checkpoint` | string | 序列化的 LangGraph 状态（JSON） |
| `metadata` | string | 序列化的元数据 |

### 5.3 数据访问层

`services/dataBridge.ts` 是 AI 模块访问业务数据的统一收敛层：

- **读操作**：`getFormSchemaById` / `listFormSchemas` / `getLatestFlowVersion` / `listFlowInstances` 等，统一使用 `lean()` 返回纯对象
- **写操作**：返回 `toObject()` 纯对象
- **设计目的**：为未来 server 换语言做准备，换语言时只需改此文件为 HTTP 调用

### 5.4 Workflow 触发方式

| 触发方式 | 入口 | 说明 |
|---|---|---|
| **manual** | `agentWorkflowRoutes.ts` | 前端手动触发 |
| **chat** | `plugins/registry.ts` | Chat 意图匹配 `workflow:*` 专家 -> 自动执行 |
| **webhook** | `agentWorkflowWebhookRoutes.ts` | 外部系统 POST 调用，HMAC 验签 |
| **api** | `agentWorkflowInvokeRoutes.ts` | Open API by-slug 调用（invokeKey 鉴权） |
| **schedule** | `services/scheduleService.ts` | cron 表达式定时触发 |

### 5.5 Workflow 执行主循环

`agentWorkflowExecutor.ts: executeAgentWorkflow()` 的核心循环：

```
1. 加载已发布 graph（resolveWorkflowTemplate）
2. 检查是否有 waiting 节点（HITL 恢复）
3. while (currentId):
   a. 检查取消 / 循环检测（visited Set）
   b. 获取节点 -> appendNodeRecord(running)
   c. runNode(node, ctx) -> switch(node.type) 分发到 33 种节点执行器
   d. result.wait? -> 更新 waiting -> finishExecution('waiting') -> return
   e. 错误? -> 更新 error -> finishExecution('error') -> return
   f. node.type === 'end'? -> finishExecution('success') -> return
   g. pickNextNode(graph, node.id, result.branch) -> currentId
4. finishExecution('success')
```

**HITL 恢复**：`executeAgentWorkflow` 检测 `execution.nodeRecords` 中 `status === 'waiting'` 的节点，从其 `output.savedMessages` 恢复 agent-loop 状态，继续执行。

**子 Workflow 调用**：`agent-loop` 节点支持 `workflow:*` 工具，通过 `invokeWorkflowSync(wfId, userId, input, { timeoutMs })` 同步调用子工作流，结果作为工具返回值。

---

## 附录：关键文件索引

| 模块 | 文件路径 |
|---|---|
| Chat WebSocket handler | `server/src/ai/chatStreamHandler.ts` |
| Chat 流式执行核心 | `server/src/ai/chatStreamRunner.ts` |
| LangGraph 图定义 | `server/src/ai/graph/graph.ts` |
| LangGraph State 定义 | `server/src/ai/graph/state.ts` |
| 插件专家节点 | `server/src/ai/graph/pluginExpertAgent.ts` |
| 需求分析节点 | `server/src/ai/graph/requirementAnalyzer.ts` |
| 任务规划节点 | `server/src/ai/graph/taskPlanner.ts` |
| 需求确认节点 | `server/src/ai/graph/requirementConfirm.ts` |
| MongoDB Checkpoint | `server/src/ai/graph/checkpointMongo.ts` |
| Runtime 纯函数层 | `server/src/ai/runtime/*.ts` |
| LLM 配置解析 | `server/src/ai/services/llmCache.ts` |
| Agent 基础设施 | `server/src/ai/graph/agentBase.ts` |
| Workflow 执行引擎 | `server/src/ai/services/agentWorkflowExecutor.ts` |
| Workflow 节点执行器 | `server/src/ai/services/nodes/*.ts` |
| 插件中心注册表 | `server/src/ai/plugins/registry.ts` |
| 插件中心调度 | `server/src/ai/plugins/dispatchExpert.ts` |
| Prompt 构建器 | `shared/platform-shared/ai/promptBuilder.ts` |
| 模板元数据 | `shared/platform-shared/ai/agentWorkflow/templates.ts` |
| 模板工厂 | `shared/platform-shared/ai/agentWorkflow/templateFactories/*.ts` |
| Workflow 类型定义 | `shared/platform-shared/ai/agentWorkflow/types.ts` |
| 数据访问层 | `server/src/ai/services/dataBridge.ts` |
| AI 配置 | `server/src/ai/config.ts` |
| 行业 Agent 配置 | `server/src/ai/config/industryAgents.ts` |
| 内置 Prompt 模板 | `server/src/ai/config/promptTemplates.ts` |
