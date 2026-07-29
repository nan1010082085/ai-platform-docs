# 运行时架构图

> 服务端执行路径、数据流、状态持久化 — 与 UI 交互流（[chat](./chat.md) / [workflows](./workflows.md) / [rag](./rag.md)）对照阅读

---

## 一、平台运行时总览

```mermaid
flowchart TB
  subgraph client [前端 @ai-app]
    ChatUI["AiChatView / AiSidebarView"]
    WFUI["Workflow Designer / Execution"]
    RagUI["RagKnowledgeBase"]
  end

  subgraph transport [传输层]
    WS["Socket.IO\nchat:send / chat:event / chat:resume"]
    REST["REST /api/ai/*"]
  end

  subgraph server [server/src/ai]
    Handler["chatStreamHandler"]
    Runner["chatStreamRunner"]
    Graph["graph/graph.ts\nLangGraph StateGraph"]
    WFExec["agentWorkflowExecutor"]
    WFService["agentWorkflowService"]
    Registry["tools/registry.ts"]
    MCPBridge["mcp/bridge.ts"]
    RAG["ragService"]
    Docs["documentService"]
    Conv["conversationService"]
  end

  subgraph external [外部依赖]
    LLM["LLM API\n(DeepSeek 等)"]
    Embed["Embedding API"]
  end

  subgraph storage [MongoDB]
    ConvDB["Conversations"]
    CkptDB["LangGraph Checkpoints"]
    WFDB["AgentWorkflow\nAgentWorkflowExecution"]
    SchemaDB["FormSchema / FlowVersion"]
    EmbDB["SchemaEmbedding"]
    DocDB["Documents"]
  end

  ChatUI --> WS
  ChatUI --> REST
  WFUI --> REST
  RagUI --> REST

  WS --> Handler --> Runner --> Graph
  Runner --> Conv
  Graph --> Registry
  Graph --> LLM
  Graph --> CkptDB

  REST --> WFService --> WFExec
  WFExec --> Registry
  WFExec --> LLM
  WFExec --> Docs
  WFExec --> WFDB

  REST --> RAG
  RAG --> Embed
  RAG --> EmbDB
  RAG --> SchemaDB

  Registry --> MCPBridge
  MCPBridge --> SchemaDB
  Docs --> DocDB
  Conv --> ConvDB
```

### 双引擎运行时对比

| 维度 | Chat LangGraph | Agent Workflow |
|------|----------------|----------------|
| 入口 | `chat:send`（WebSocket） | `POST .../execute` / Webhook |
| 编排 | `graph.streamEvents()` | `executeAgentWorkflow()` while 循环 |
| 状态 | Checkpointer + threadId | `AgentWorkflowExecution.nodeRecords` |
| 输出 | 流式 `chat:event` | `workflow:event` 推送 nodeRecords / streamingOutput |
| 取消 | `graphAbort.abort()` | execution `cancelled` |
| HITL | `interrupt` + `chat:resume` | `hitl` 节点 + `POST .../resume` |

---

## 二、Chat LangGraph 运行时

### 2.1 请求处理链路

```mermaid
sequenceDiagram
  participant C as Client
  participant H as chatStreamHandler
  participant R as chatStreamRunner
  participant G as graph (LangGraph)
  participant CP as Checkpointer
  participant DB as MongoDB

  C->>H: chat:send { message, context, conversationId? }
  H->>R: executeChatStream(request, send, onDone)
  R->>DB: getConversation / createConversation
  R->>DB: 加载 schemaId / flowId 上下文
  R->>R: 文档附件 → summarizeDocument
  R->>G: graph.streamEvents(input, { thread_id, signal })
  loop on_chain / on_chat_model_stream / on_tool_end
    G-->>R: LangGraph 事件
    R-->>C: chat:event { type, ... }
  end
  R->>DB: appendMessage(assistant)
  R-->>C: chat:event { type: done }
```

**核心**：`chatStreamRunner.executeChatStream` 由 WebSocket `chatStreamHandler` 调用，通过 `send` 回调推送 `chat:event`。

### 2.2 LangGraph 编译图（运行时节点）

```mermaid
flowchart TD
  START((START)) --> router

  router -->|v2 默认| requirementAnalyzer
  router -->|v1 回退| routeAfterRouter

  requirementAnalyzer -->|需确认| requirementConfirm
  requirementAnalyzer -->|跳过确认| taskPlanner
  requirementConfirm --> taskPlanner

  taskPlanner --> routeAfterTaskPlanner
  routeAfterTaskPlanner --> taskChain

  routeAfterRouter --> editor
  routeAfterRouter --> flow
  routeAfterRouter --> page
  routeAfterRouter --> general
  routeAfterRouter --> taskChain

  taskChain --> routeAfterTaskChain
  routeAfterTaskChain --> editor
  routeAfterTaskChain --> flow
  routeAfterTaskChain --> page
  routeAfterTaskChain --> general
  routeAfterTaskChain --> summarizer

  editor --> afterAgent
  flow --> afterAgent
  page --> afterAgent

  afterAgent -->|tool_calls ≤3轮| allTools
  afterAgent -->|无工具| summarizer
  afterAgent -->|general 模式| END

  allTools --> afterTools
  afterTools -->|协作/任务链| taskChain
  afterTools -->|链完成| summarizer
  afterTools -->|继续| editor
  afterTools -->|继续| flow
  afterTools -->|继续| page

  general --> END
  summarizer --> END
```

**环境开关**（`graph.ts` `V2_CONFIG`）：

- `AI_ENABLE_TASK_PLANNER !== 'false'` → 启用 taskPlanner

### 2.3 streamEvents → 前端事件映射

```mermaid
flowchart LR
  subgraph lg [LangGraph 事件]
    CS["on_chain_start"]
    CE["on_chain_end"]
    CMS["on_chat_model_stream"]
    TE["on_tool_end"]
  end

  subgraph fe [chat:event 类型]
    RA_S["requirement_analysis_start"]
    RA_C["requirement_analysis_complete"]
    TP_S["task_plan_start"]
    TP_C["task_plan_complete"]
    AS["agent_switch"]
    CS2["chain_step"]
    TD["text_delta"]
    TH["thinking_delta"]
    TCS["tool_call_start"]
    TCE["tool_call_end"]
    SC["schema_complete"]
    FC["flow_complete"]
    INT["interrupt"]
    DONE["done"]
  end

  CS --> RA_S
  CS --> TP_S
  CS --> AS
  CE --> RA_C
  CE --> TP_C
  CE --> CS2
  CMS --> TD
  CMS --> TH
  TE --> TCS
  TE --> TCE
  TE --> SC
  TE --> FC
```

### 2.4 工具调用运行时

```mermaid
sequenceDiagram
  participant Agent as editor/flow/page Agent
  participant AT as afterAgent
  participant TN as allTools (ToolNode)
  participant Reg as tools/registry
  participant MCP as mcp/bridge
  participant H as toolHandlers

  Agent->>AT: AIMessage + tool_calls
  AT->>TN: 路由 allTools
  TN->>Reg: getToolSync(name)
  alt MCP 工具 schema__*
    Reg->>MCP: InMemoryTransport.callTool
    MCP->>H: handleSchemaSearch 等
  else LangGraph 专有 update_schema
    Reg->>H: 直接 handler
  end
  H-->>TN: ToolMessage
  TN->>AT: afterTools
  AT->>AT: 提取 collaborationRequest
  AT->>Agent: 继续或 taskChain
```

**限制**：
- `afterAgent`：单轮最多 3 次 tool iteration（`MAX_TOOL_ITERATIONS`）
- `router`：`session.maxNodeExecutions` 全局节点上限

### 2.5 Checkpoint 与 HITL Resume

```mermaid
stateDiagram-v2
  [*] --> Running: graph.streamEvents
  Running --> Interrupted: GraphInterrupt\n(requirementConfirm)
  Interrupted --> Memory: interruptedThreads.set(threadId)
  Memory --> Client: chat:event interrupt + done
  Client --> Resume: chat:resume { threadId, confirmed }
  Resume --> Command: Command({ resume: value })
  Command --> Running: 从 checkpoint 继续
  Running --> Done: stream 结束
  Done --> [*]
```

| 存储 | 内容 |
|------|------|
| MongoDB Checkpointer | LangGraph thread 状态（生产必选） |
| `interruptedThreads` Map | 内存中 HITL 中断元数据 |
| Conversations | 消息历史、schema/flow 版本 |

---

## 三、Agent Workflow 运行时

### 3.1 触发与异步执行

```mermaid
sequenceDiagram
  participant API as agentWorkflowRoutes
  participant Svc as agentWorkflowService
  participant DB as MongoDB
  participant Exec as agentWorkflowExecutor

  API->>Svc: executeWorkflow(id, input, trigger)
  Svc->>DB: 创建 AgentWorkflowExecution\nstatus=running
  Svc-->>API: { executionId } 立即返回
  Svc->>Exec: executeAgentWorkflow() 异步

  Note over API,Exec: Webhook 同样 202 异步

  loop workflow:event（WebSocket）
    Exec-->>API: push execution 快照
  end
```

### 3.2 执行器主循环

```mermaid
flowchart TD
  Start["executeAgentWorkflow"] --> Init["构建 RuntimeContext\ninput / nodeOutputs / conversationHistory"]
  Init --> Resume{resumeFromWaiting?}
  Resume -->|是| Restore["恢复 waiting 节点\n重建 ctx.nodeOutputs"]
  Resume -->|否| Entry["currentId = entryNodeId"]
  Restore --> Loop
  Entry --> Loop

  Loop["while currentId"] --> Cancel{已取消?}
  Cancel -->|是| Stop["return"]
  Cancel -->|否| Cycle{visited 含 currentId?}
  Cycle -->|是| ErrCycle["error: 检测到循环"]
  Cycle -->|否| Mark["visited.add"]
  Mark --> Record["appendNodeRecord running"]
  Record --> RunNode["runNode(node, ctx)"]
  RunNode --> Wait{result.wait?}
  Wait -->|是| HITL["update waiting\nfinishExecution(waiting)\nreturn"]
  Wait -->|否| Err{node error?}
  Err -->|是| Fail["finishExecution(error)"]
  Err -->|否| Success["ctx.lastOutput = output\nctx.nodeOutputs[id] = output"]
  Success --> EndType{node.type === end?}
  EndType -->|是| Done["finishExecution(success)"]
  EndType -->|否| Next["pickNextNode\n(if 分支)"]
  Next --> Loop
```

### 3.3 RuntimeContext 数据流

```mermaid
flowchart LR
  Input["execution.input"] --> Ctx["RuntimeContext"]
  Ctx --> Tpl["resolveWorkflowTemplate\n{{$input.*}} {{$node.*}}"]
  Tpl --> LLM["llm 节点 prompt"]
  Tpl --> Tool["tool 节点 args"]
  Ctx --> If["if 表达式\neval lastOutput"]
  RunNode["runNode 输出"] --> Ctx
  Ctx --> Mem["conversation-memory\n读/写 execution.conversationHistory"]
```

### 3.4 节点分发（runNode）

```mermaid
flowchart TB
  Node["runNode(type)"] --> T1["manual-trigger / webhook-trigger\n透传 input"]
  Node --> T2["llm → getLLM + messages"]
  Node --> T3["document-parse → documentService"]
  Node --> T4["vision-analyze → analyzeDocumentVision"]
  Node --> T5["conversation-memory → 读/写历史"]
  Node --> T6["agent-* → 专家 Agent\n最多 3 轮 tool"]
  Node --> T7["tool-* → dispatchTool\nregistry / http_request"]
  Node --> T8["if → evaluateIfExpression\nbranch true/false"]
  Node --> T9["hitl → wait: true"]
  Node --> T10["end → lastOutput"]

  T6 --> Registry["tools/registry"]
  T7 --> Registry
```

### 3.5 Chat 触发工作流运行时

```mermaid
sequenceDiagram
  participant UI as AiChatPanel
  participant Hook as useWorkflowChatExecution
  participant API as agentWorkflowApi
  participant Exec as agentWorkflowExecutor

  UI->>Hook: runWorkflowChatTurn
  alt 首次
    Hook->>API: executeWorkflow(workflowId, input)
  else 多轮
    Hook->>API: continueExecution(parentId, input)
  else HITL
    Hook->>API: resumeExecution(pendingId, { approved, comment })
  end
  API->>Exec: 异步执行
  Hook->>WS: workflow:subscribe(executionId)
  loop workflow:event
    Exec-->>WS: push nodeRecords / streamingOutput
    WS-->>Hook: execution 快照
    Hook-->>UI: 时间线 + 流式文本
  end
  Hook->>Hook: extractWorkflowChatResponse
  Hook-->>UI: assistant 消息
```

---

## 四、RAG 运行时

### 4.1 索引管道

```mermaid
flowchart TD
  Trigger["触发索引"] --> Which{来源}
  Which -->|管理页| Admin["reindexAll / reindexSingleRag"]
  Which -->|Agent 工具| Tool["rag_index (LangGraph)"]
  Which -->|Schema 变更| Hook["业务钩子（如有）"]

  Admin --> Index["indexSchema(schemaId)"]
  Tool --> Index

  Index --> Load["FormSchemaModel.findById"]
  Load --> Hash["computeContentHash"]
  Hash --> Compare{hash 变化?}
  Compare -->|否| Skip["跳过"]
  Compare -->|是| Extract["extractTextForEmbedding"]
  Extract --> Embed{"isEmbeddingConfigured?"}
  Embed -->|是| API["embedText / embedBatch"]
  Embed -->|否| NoEmbed["标记未索引"]
  API --> Store["SchemaEmbeddingModel\nupsert vector"]
```

### 4.2 检索管道

```mermaid
flowchart TD
  Query["查询文本"] --> Entry{入口}
  Entry -->|管理页测试| Route["POST /api/ai/rag/search"]
  Entry -->|Chat ragContext| Inject["注入 System Prompt"]
  Entry -->|Agent 工具| MCP["rag__search"]
  Entry -->|Workflow 节点| ToolNode["tool-mcp-rag"]

  Route --> Search["semanticSearch(query)"]
  MCP --> Search
  ToolNode --> Search

  Search --> Configured{"Embedding 已配置?"}
  Configured -->|是| Vec["embedText(query)\n余弦相似度 top-k"]
  Configured -->|否| KW["fuzzySearchSchemas\nJaccard 关键词回退"]
  Vec --> Results["RagSearchResult[]"]
  KW --> Results
```

### 4.3 RAG 在 Chat Agent 中的运行时位置

```mermaid
flowchart LR
  subgraph chat_runtime [Chat 运行时]
    Send["chat:send"] --> Runner["chatStreamRunner"]
    Runner --> Graph["LangGraph"]
    Graph --> Agent["general / editor Agent"]
    Agent --> Tool["rag__search 工具调用"]
    RagCtx["前端 ragContext"] --> Runner
    RagCtx --> Prompt["合并进 LLM messages"]
  end

  Tool --> RAG["ragService.semanticSearch"]
  Prompt --> Agent
  RAG --> EmbDB["SchemaEmbedding"]
```

---

## 五、工具注册表启动时序

```mermaid
sequenceDiagram
  participant S as Server 启动
  participant Reg as tools/registry
  participant Bridge as mcp/bridge
  participant S1 as schemaServer
  participant S2 as flowServer
  participant S3 as widgetServer
  participant S4 as ragServer
  participant S5 as industryServer
  participant LG as langgraphTools

  S->>Reg: import (top-level await)
  Reg->>Bridge: initMcpBridge()
  Bridge->>S1: InMemoryTransport
  Bridge->>S2: InMemoryTransport
  Bridge->>S3: InMemoryTransport
  Bridge->>S4: InMemoryTransport
  Bridge->>S5: InMemoryTransport
  Bridge-->>Reg: StructuredTool[] (MCP)
  Reg->>LG: langgraphOnlyTools
  Reg->>Reg: _toolMap 合并
  Note over Reg: ensureToolsReady() 后可安全调用
```

**降级**：MCP 桥接完全失败时退化为仅 `langgraphOnlyTools`，Chat 仍可运行（无 MCP 读取能力）。

---

## 六、文档管道运行时

```mermaid
flowchart TD
  Upload["前端 uploadFile"] --> DocDB["Document 记录"]
  DocDB --> ChatAttach["chat:send documentAttachments"]
  DocDB --> WFInput["workflow input.documentId"]

  ChatAttach --> Load["loadDocumentsForChat"]
  Load --> Sum["summarizeDocument"]
  Sum --> ChatEvent["document_summaries 事件"]
  Sum --> LLMMsg["注入 LLM HumanMessage"]

  WFInput --> Parse["document-parse 节点"]
  Parse --> Reprocess["reprocessDocumentFromStorage"]
  Reprocess --> OCR{图片?}
  OCR -->|是| OCRText["OCR 提取"]
  OCR -->|否| DocText["文档解析"]
  OCRText --> Vision["vision-analyze 可选"]
```

---

## 七、监控运行时（AiMonitorView）

```mermaid
flowchart LR
  UI["AiMonitorView\n30s 自动刷新"] --> API["GET /api/ai/monitor/*"]
  API --> Metrics["AgentMetric 集合"]
  Metrics --> Summary["summary / stats / recent / alerts"]
  Summary --> UI

  Graph["LangGraph 执行"] -.->|写入| Metrics
```

监控采集点在 LangGraph / Agent 执行期间写入 `AgentMetric`，与 Workflow 执行记录（`AgentWorkflowExecution`）**分离存储**。

---

## 八、关键运行时约束速查

| 约束 | 值 | 位置 |
|------|-----|------|
| Agent 单轮 tool 上限 | 3 | `graph.ts` afterAgent |
| Workflow 专家节点 tool 上限 | 3 | agentWorkflowExecutor |
| LangGraph recursionLimit | 30 | chatStreamRunner |
| Chat Workflow 进度 | WebSocket `workflow:event` | useWorkflowExecutionStream |
| 版本快照上限 | 20 | agentWorkflowService |
| MCP 工具失败 | 返回 recoverable JSON | mcp/bridge |
| RAG 无 Embedding | 关键词 Jaccard 回退 | ragService |
| Checkpointer 生产 | 必须 MongoDB | checkpointer.ts |

---

## 九、相关文档

| 文档 | 侧重 |
|------|------|
| [chat.md](./chat.md) | Chat UI 交互流 |
| [workflows.md](./workflows.md) | Workflow UI 交互流 |
| [rag.md](./rag.md) | RAG UI 交互流 |
| [../architecture.md](../architecture.md) | 架构说明 |
| [../agent-workflow.md](../agent-workflow.md) | 工作流 API 与节点 |
| [../events.md](../events.md) | 事件协议 |
