# Runtime Architecture

> Server execution paths, data flow, state persistence - read alongside the UI interaction flows ([chat](./chat.md) / [workflows](./workflows.md) / [rag](./rag.md))

---

## 1. Platform Runtime Overview

```mermaid
flowchart TB
  subgraph client [Frontend @ai-app]
    ChatUI["AiChatView / AiSidebarView"]
    WFUI["Workflow Designer / Execution"]
    RagUI["RagKnowledgeBase"]
  end

  subgraph transport [Transport Layer]
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

  subgraph external [External Deps]
    LLM["LLM API\n(DeepSeek etc.)"]
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

### Dual-engine Runtime Comparison

| Dimension | Chat LangGraph | Agent Workflow |
|------|----------------|----------------|
| Entry | `chat:send` (WebSocket) | `POST .../execute` / Webhook |
| Orchestration | `graph.streamEvents()` | `executeAgentWorkflow()` while loop |
| State | Checkpointer + threadId | `AgentWorkflowExecution.nodeRecords` |
| Output | streaming `chat:event` | `workflow:event` pushes nodeRecords / streamingOutput |
| Cancel | `graphAbort.abort()` | execution `cancelled` |
| HITL | `interrupt` + `chat:resume` | `hitl` node + `POST .../resume` |

---

## 2. Chat LangGraph Runtime

### 2.1 Request Processing Path

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
  R->>DB: load schemaId / flowId context
  R->>R: document attachment -> summarizeDocument
  R->>G: graph.streamEvents(input, { thread_id, signal })
  loop on_chain / on_chat_model_stream / on_tool_end
    G-->>R: LangGraph events
    R-->>C: chat:event { type, ... }
  end
  R->>DB: appendMessage(assistant)
  R-->>C: chat:event { type: done }
```

**Core**: `chatStreamRunner.executeChatStream` is called by the WebSocket `chatStreamHandler` and pushes `chat:event` via the `send` callback.

### 2.2 LangGraph Compiled Graph (runtime nodes)

```mermaid
flowchart TD
  START((START)) --> router

  router -->|v2 default| requirementAnalyzer
  router -->|v1 fallback| routeAfterRouter

  requirementAnalyzer -->|needs confirm| requirementConfirm
  requirementAnalyzer -->|skip confirm| taskPlanner
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

  afterAgent -->|tool_calls <=3 rounds| allTools
  afterAgent -->|no tools| summarizer
  afterAgent -->|general mode| END

  allTools --> afterTools
  afterTools -->|collab/task chain| taskChain
  afterTools -->|chain done| summarizer
  afterTools -->|continue| editor
  afterTools -->|continue| flow
  afterTools -->|continue| page

  general --> END
  summarizer --> END
```

**Env switch** (`graph.ts` `V2_CONFIG`):

- `AI_ENABLE_TASK_PLANNER !== 'false'` -> enable taskPlanner

### 2.3 streamEvents -> Frontend Event Mapping

```mermaid
flowchart LR
  subgraph lg [LangGraph events]
    CS["on_chain_start"]
    CE["on_chain_end"]
    CMS["on_chat_model_stream"]
    TE["on_tool_end"]
  end

  subgraph fe [chat:event types]
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

### 2.4 Tool Call Runtime

```mermaid
sequenceDiagram
  participant Agent as editor/flow/page Agent
  participant AT as afterAgent
  participant TN as allTools (ToolNode)
  participant Reg as tools/registry
  participant MCP as mcp/bridge
  participant H as toolHandlers

  Agent->>AT: AIMessage + tool_calls
  AT->>TN: route allTools
  TN->>Reg: getToolSync(name)
  alt MCP tool schema__*
    Reg->>MCP: InMemoryTransport.callTool
    MCP->>H: handleSchemaSearch etc.
  else LangGraph-specific update_schema
    Reg->>H: direct handler
  end
  H-->>TN: ToolMessage
  TN->>AT: afterTools
  AT->>AT: extract collaborationRequest
  AT->>Agent: continue or taskChain
```

**Limits**:
- `afterAgent`: at most 3 tool iterations per round (`MAX_TOOL_ITERATIONS`)
- `router`: `session.maxNodeExecutions` global node cap

### 2.5 Checkpoint & HITL Resume

```mermaid
stateDiagram-v2
  [*] --> Running: graph.streamEvents
  Running --> Interrupted: GraphInterrupt\n(requirementConfirm)
  Interrupted --> Memory: interruptedThreads.set(threadId)
  Memory --> Client: chat:event interrupt + done
  Client --> Resume: chat:resume { threadId, confirmed }
  Resume --> Command: Command({ resume: value })
  Command --> Running: continue from checkpoint
  Running --> Done: stream ends
  Done --> [*]
```

| Storage | Content |
|------|------|
| MongoDB Checkpointer | LangGraph thread state (required in production) |
| `interruptedThreads` Map | in-memory HITL interrupt metadata |
| Conversations | message history, schema/flow versions |

---

## 3. Agent Workflow Runtime

### 3.1 Trigger & Async Execution

```mermaid
sequenceDiagram
  participant API as agentWorkflowRoutes
  participant Svc as agentWorkflowService
  participant DB as MongoDB
  participant Exec as agentWorkflowExecutor

  API->>Svc: executeWorkflow(id, input, trigger)
  Svc->>DB: create AgentWorkflowExecution\nstatus=running
  Svc-->>API: { executionId } returns immediately
  Svc->>Exec: executeAgentWorkflow() async

  Note over API,Exec: Webhook also 202 async

  loop workflow:event (WebSocket)
    Exec-->>API: push execution snapshot
  end
```

### 3.2 Executor Main Loop

```mermaid
flowchart TD
  Start["executeAgentWorkflow"] --> Init["build RuntimeContext\ninput / nodeOutputs / conversationHistory"]
  Init --> Resume{resumeFromWaiting?}
  Resume -->|yes| Restore["restore waiting node\nrebuild ctx.nodeOutputs"]
  Resume -->|no| Entry["currentId = entryNodeId"]
  Restore --> Loop
  Entry --> Loop

  Loop["while currentId"] --> Cancel{cancelled?}
  Cancel -->|yes| Stop["return"]
  Cancel -->|no| Cycle{visited has currentId?}
  Cycle -->|yes| ErrCycle["error: cycle detected"]
  Cycle -->|no| Mark["visited.add"]
  Mark --> Record["appendNodeRecord running"]
  Record --> RunNode["runNode(node, ctx)"]
  RunNode --> Wait{result.wait?}
  Wait -->|yes| HITL["update waiting\nfinishExecution(waiting)\nreturn"]
  Wait -->|no| Err{node error?}
  Err -->|yes| Fail["finishExecution(error)"]
  Err -->|no| Success["ctx.lastOutput = output\nctx.nodeOutputs[id] = output"]
  Success --> EndType{node.type === end?}
  EndType -->|yes| Done["finishExecution(success)"]
  EndType -->|no| Next["pickNextNode\n(if branch)"]
  Next --> Loop
```

### 3.3 RuntimeContext Data Flow

```mermaid
flowchart LR
  Input["execution.input"] --> Ctx["RuntimeContext"]
  Ctx --> Tpl["resolveWorkflowTemplate\n{{$input.*}} {{$node.*}}"]
  Tpl --> LLM["llm node prompt"]
  Tpl --> Tool["tool node args"]
  Ctx --> If["if expression\neval lastOutput"]
  RunNode["runNode output"] --> Ctx
  Ctx --> Mem["conversation-memory\nread/write execution.conversationHistory"]
```

### 3.4 Node Dispatch (runNode)

```mermaid
flowchart TB
  Node["runNode(type)"] --> T1["manual-trigger / webhook-trigger\npassthrough input"]
  Node --> T2["llm -> getLLM + messages"]
  Node --> T3["document-parse -> documentService"]
  Node --> T4["vision-analyze -> analyzeDocumentVision"]
  Node --> T5["conversation-memory -> read/write history"]
  Node --> T6["agent-* -> expert Agent\nup to 3 tool rounds"]
  Node --> T7["tool-* -> dispatchTool\nregistry / http_request"]
  Node --> T8["if -> evaluateIfExpression\nbranch true/false"]
  Node --> T9["hitl -> wait: true"]
  Node --> T10["end -> lastOutput"]

  T6 --> Registry["tools/registry"]
  T7 --> Registry
```

### 3.5 Chat-triggered Workflow Runtime

```mermaid
sequenceDiagram
  participant UI as AiChatPanel
  participant Hook as useWorkflowChatExecution
  participant API as agentWorkflowApi
  participant Exec as agentWorkflowExecutor

  UI->>Hook: runWorkflowChatTurn
  alt first turn
    Hook->>API: executeWorkflow(workflowId, input)
  else multi-turn
    Hook->>API: continueExecution(parentId, input)
  else HITL
    Hook->>API: resumeExecution(pendingId, { approved, comment })
  end
  API->>Exec: async execute
  Hook->>WS: workflow:subscribe(executionId)
  loop workflow:event
    Exec-->>WS: push nodeRecords / streamingOutput
    WS-->>Hook: execution snapshot
    Hook-->>UI: timeline + streaming text
  end
  Hook->>Hook: extractWorkflowChatResponse
  Hook-->>UI: assistant message
```

---

## 4. RAG Runtime

### 4.1 Index Pipeline

```mermaid
flowchart TD
  Trigger["trigger index"] --> Which{source}
  Which -->|admin page| Admin["reindexAll / reindexSingleRag"]
  Which -->|Agent tool| Tool["rag_index (LangGraph)"]
  Which -->|Schema change| Hook["business hook (if any)"]

  Admin --> Index["indexSchema(schemaId)"]
  Tool --> Index

  Index --> Load["FormSchemaModel.findById"]
  Load --> Hash["computeContentHash"]
  Hash --> Compare{hash changed?}
  Compare -->|no| Skip["skip"]
  Compare -->|yes| Extract["extractTextForEmbedding"]
  Extract --> Embed{"isEmbeddingConfigured?"}
  Embed -->|yes| API["embedText / embedBatch"]
  Embed -->|no| NoEmbed["mark unindexed"]
  API --> Store["SchemaEmbeddingModel\nupsert vector"]
```

### 4.2 Retrieval Pipeline

```mermaid
flowchart TD
  Query["query text"] --> Entry{entry}
  Entry -->|admin test| Route["POST /api/ai/rag/search"]
  Entry -->|Chat ragContext| Inject["inject into System Prompt"]
  Entry -->|Agent tool| MCP["rag__search"]
  Entry -->|Workflow node| ToolNode["tool-mcp-rag"]

  Route --> Search["semanticSearch(query)"]
  MCP --> Search
  ToolNode --> Search

  Search --> Configured{"Embedding configured?"}
  Configured -->|yes| Vec["embedText(query)\ncosine similarity top-k"]
  Configured -->|no| KW["fuzzySearchSchemas\nJaccard keyword fallback"]
  Vec --> Results["RagSearchResult[]"]
  KW --> Results
```

### 4.3 RAG Position in the Chat Agent Runtime

```mermaid
flowchart LR
  subgraph chat_runtime [Chat runtime]
    Send["chat:send"] --> Runner["chatStreamRunner"]
    Runner --> Graph["LangGraph"]
    Graph --> Agent["general / editor Agent"]
    Agent --> Tool["rag__search tool call"]
    RagCtx["frontend ragContext"] --> Runner
    RagCtx --> Prompt["merge into LLM messages"]
  end

  Tool --> RAG["ragService.semanticSearch"]
  Prompt --> Agent
  RAG --> EmbDB["SchemaEmbedding"]
```

---

## 5. Tool Registry Startup Sequence

```mermaid
sequenceDiagram
  participant S as Server startup
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
  Reg->>Reg: _toolMap merge
  Note over Reg: ensureToolsReady() then safe to call
```

**Degradation**: if MCP bridging fails completely, falls back to `langgraphOnlyTools` only; Chat still runs (no MCP read capability).

---

## 6. Document Pipeline Runtime

```mermaid
flowchart TD
  Upload["frontend uploadFile"] --> DocDB["Document record"]
  DocDB --> ChatAttach["chat:send documentAttachments"]
  DocDB --> WFInput["workflow input.documentId"]

  ChatAttach --> Load["loadDocumentsForChat"]
  Load --> Sum["summarizeDocument"]
  Sum --> ChatEvent["document_summaries event"]
  Sum --> LLMMsg["inject into LLM HumanMessage"]

  WFInput --> Parse["document-parse node"]
  Parse --> Reprocess["reprocessDocumentFromStorage"]
  Reprocess --> OCR{image?}
  OCR -->|yes| OCRText["OCR extract"]
  OCR -->|no| DocText["document parse"]
  OCRText --> Vision["vision-analyze optional"]
```

---

## 7. Monitoring Runtime (AiMonitorView)

```mermaid
flowchart LR
  UI["AiMonitorView\n30s auto-refresh"] --> API["GET /api/ai/monitor/*"]
  API --> Metrics["AgentMetric collection"]
  Metrics --> Summary["summary / stats / recent / alerts"]
  Summary --> UI

  Graph["LangGraph execution"] -.->|writes| Metrics
```

Monitoring collection points write `AgentMetric` during LangGraph / Agent execution, **stored separately** from workflow execution records (`AgentWorkflowExecution`).

---

## 8. Key Runtime Constraint Quick Reference

| Constraint | Value | Location |
|------|-----|------|
| Agent per-round tool cap | 3 | `graph.ts` afterAgent |
| Workflow expert node tool cap | 3 | agentWorkflowExecutor |
| LangGraph recursionLimit | 30 | chatStreamRunner |
| Chat Workflow progress | WebSocket `workflow:event` | useWorkflowExecutionStream |
| Version snapshot cap | 20 | agentWorkflowService |
| MCP tool failure | returns recoverable JSON | mcp/bridge |
| RAG without Embedding | keyword Jaccard fallback | ragService |
| Checkpointer production | must be MongoDB | checkpointer.ts |

---

## 9. Related Docs

| Doc | Focus |
|------|------|
| [chat.md](./chat.md) | Chat UI interaction flow |
| [workflows.md](./workflows.md) | Workflow UI interaction flow |
| [rag.md](./rag.md) | RAG UI interaction flow |
| [../architecture.md](../architecture.md) | architecture description |
| [../agent-workflow.md](../agent-workflow.md) | workflow API & nodes |
| [../events.md](../events.md) | event protocol |
