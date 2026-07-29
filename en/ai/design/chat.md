# AI Chat - Design Draft & Interaction Flow

## 1. Page Wireframe (AiChatView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Top bar                                                                  │
│  [AI] Assistant       ● connected  [🕐 History]  [+ New chat]           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ TaskChainBar (shown for multi-step tasks) ──────────────────────┐  │
│  │ ① Generate page ✓ -> ② Generate form ● -> ③ Summarize             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Message area (scroll) ───────────────────────────────────────────┐  │
│  │  You: Build me a leave approval flow                              │  │
│  │                                                                      │  │
│  │  Flow Agent                                                          │  │
│  │  ┌─ FlowCard ─────────────────────────────────────────────────┐   │  │
│  │  │  Leave approval flow  [Start] [Approval] [End]                │   │  │
│  │  │  [Publish to flow designer]  [Open in editor]                 │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  │  ▼ Thinking (collapsible)                                          │  │
│  │  🔧 flow__search  ✓                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  Input area AiChatPanel                                                  │
│  ┌─ RAG selected context chips ─────────────────────────────────────┐  │
│  │  📄 Leave flow spec ×    📄 Schema design guide ×                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌─ AiMentionInput ─────────────────────────────────────────────────┐  │
│  │  @schema reference...                                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  [📎 Doc] [🔍 RAG] [⚙ Settings]  Agent: Auto ▼  [WF: Smart Assistant ▼] [Send]│
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Responsibility |
|------|------|
| `AiChatPanel` | message list + input container |
| `AiMessage` | single message: text, thinking, tool call, card |
| `TaskChainBar` | multi-agent task chain progress |
| `AiMentionInput` | @ reference Schema/Flow |
| `AiRagSearch` | input-area RAG retrieval overlay |
| `AgentWorkflowPicker` | select a published workflow as the backend |
| `RequirementConfirmCard` | requirement confirmation HITL card |
| `ConversationDrawer` | conversation history side drawer |
| `AiChatSettings` | settings drawer (model, workflow, health check) |

---

## 2. Chat Backend Selection

Users can choose the chat engine in settings or the input area:

```mermaid
flowchart TD
  Send["User clicks send"] --> CheckWF{"chatSettings.agentWorkflowId?"}

  CheckWF -->|yes| WFPath["runWorkflowChatTurn"]
  CheckWF -->|no| LGPath["store.sendMessage -> WebSocket"]

  WFPath --> Execute["POST /workflows/:id/execute"]
  WFPath --> Continue["or POST .../continue"]
  WFPath --> Resume["or POST .../resume (HITL)"]
  Execute --> WS["workflow:subscribe"]
  WS --> Parse["extractWorkflowChatResponse"]
  Parse --> ShowMsg["append assistant message"]

  LGPath --> Socket["chat:send"]
  Socket --> Events["chat:event stream events"]
  Events --> StreamUI["real-time update messages/cards/tool status"]
```

| Mode | Transport | Streaming | HITL |
|------|------|------|------|
| LangGraph (default) | WebSocket | ✅ char/event | `interrupt` + `chat:resume` |
| Published workflow | WebSocket + REST start | ✅ `workflow:event` | `waiting` + resume API |

---

## 3. LangGraph Chat Interaction Flow

### 3.1 Standard Generation Flow

```mermaid
sequenceDiagram
  actor User as User
  participant UI as AiChatPanel
  participant Store as ai store
  participant WS as WebSocket
  participant Srv as LangGraph

  User->>UI: Type message + send
  UI->>Store: sendMessage(msg, mentions, attachments)
  Store->>WS: chat:send { message, context, settings }
  WS->>Srv: start Graph

  loop stream events
    Srv-->>WS: chat:event
    WS-->>Store: dispatch events
    Store-->>UI: update messages / taskChain / streamStatus
  end

  Srv-->>WS: done
  WS-->>Store: complete
  Store-->>UI: loading=false
```

### 3.2 v2 Requirement Confirmation (HITL)

```mermaid
stateDiagram-v2
  [*] --> Streaming: user sends
  Streaming --> ReqAnalysis: requirement_analysis_start
  ReqAnalysis --> ConfirmCard: requirement_confirm_request
  ConfirmCard --> WaitingInput: show RequirementConfirmCard
  WaitingInput --> UserAnswers: answer each / skip
  UserAnswers --> Resume: confirmRequirement()
  Resume --> TaskPlan: task_plan_start
  TaskPlan --> AgentExec: route to editor/flow/page
  AgentExec --> Done: done event
  ConfirmCard --> Skip: skipRequirement()
  Skip --> TaskPlan
```

**RequirementConfirmCard interaction**:

```
┌─ Requirement confirmation ──────────────────────┐
│  Question 1/3: How many approval levels?        │
│  ○ One   ● Two   ○ Three                        │
│  [Prev]  [Next]  [Skip all]  [Confirm & continue]│
└──────────────────────────────────────────────────┘
```

After confirmation, the input placeholder changes to `requirementInputPlaceholder`.

### 3.3 Task Chain (multi-agent collaboration)

```mermaid
flowchart LR
  subgraph chain [TaskChainBar]
    S1["① Page generate list page"]
    S2["② Editor generate form"]
    S3["③ Summarizer summarize"]
  end

  S1 -->|done| S2
  S2 -->|request_collaboration| S2b["insert Flow collaboration step"]
  S2b --> S3
```

`CollaborationBar` briefly shows the collaboration source on agent switch.

### 3.4 Schema / Flow Card Actions

```mermaid
flowchart TD
  Card["Message-embedded SchemaCard / FlowCard"]
  Card --> Primary["Primary button: publish"]
  Card --> Secondary["Secondary button: open in editor"]

  Primary --> Publish["store.publishCurrent()"]
  Publish --> Qiankun{"Embed mode?"}
  Qiankun -->|yes| Bridge["bridge: ai:open-in-editor"]
  Qiankun -->|no| NewWin["window.open /editor or /flow"]

  Secondary --> OpenEditor["same, skip publish prompt"]
```

---

## 4. Workflow-mode Chat Interaction Flow

```mermaid
sequenceDiagram
  actor User as User
  participant UI as AiChatPanel
  participant Hook as useWorkflowChatExecution
  participant API as agentWorkflowApi

  User->>UI: Send message (workflow selected)
  UI->>Hook: runWorkflowChatTurn()

  alt first turn
    Hook->>API: executeWorkflow(workflowId, input)
  else multi-turn continue
    Hook->>API: continueExecution(lastExecutionId, input)
  else HITL resume
    Hook->>API: resumeExecution(pendingExecutionId, { approved, comment })
  end

  API-->>Hook: executionId
  Hook->>WS: workflow:subscribe
  loop workflow:event
    WS-->>Hook: execution snapshot
    Hook-->>UI: update timeline / streaming text
  end

  Hook-->>UI: responseText + execution

  alt waiting
    UI->>User: show HITL confirm (same as RequirementConfirmCard or text reply)
  else success
    UI->>User: show assistant reply
  end
```

**Input payload mapping** (with document attachments):

```
input.message          <- user text
input.documentId       <- first attachment id
input.documentIds      <- all attachment ids
input.documentAttachments
input.file             <- workflow file reference
```

---

## 5. Input Area Feature Interaction

### 5.1 Document Attachments

```mermaid
flowchart TD
  Click["Click 📎"] --> Pick["Select file"]
  Pick --> Validate{"Allowed format?"}
  Validate -->|no| Err["Show unsupported format"]
  Validate -->|yes| Upload["uploadFile API"]
  Upload --> Card["DocumentAttachmentCard above input"]
  Card --> Send["Carry attachments on send"]
  Send --> LG["LangGraph: send with context"]
  Send --> WF["Workflow: write input.documentId"]
```

Supported formats in `@schema-platform/ai-shared/document` `DOCUMENT_UPLOAD_ACCEPT`.

### 5.2 Inline RAG Retrieval

```
Click [🔍 RAG]
    ↓
┌─ AiRagSearch overlay ─────────────────────┐
│  Search: [leave flow____________] [Search] │
│  ─────────────────────────────────────────  │
│  ○ Leave approval spec (score 0.92)        │
│  ○ Flow node notes (score 0.85)            │
└─────────────────────────────────────────────┘
    ↓ select
RAG chip appears above input -> injected as ragContext on send
```

### 5.3 @ Mention Reference

`AiMentionInput` typing `@` triggers Schema/Flow search; the selection is sent as `mentions` with the message for the Agent to precisely locate context.

### 5.4 Settings Drawer

```
┌─ Chat settings (320px Drawer) ─────────┐
│ ▼ Connection status                     │
│   ● API key configured                  │
│   DeepSeek deepseek-chat [default]      │
│ ▼ Model                                 │
│   Chat model: [DeepSeek Chat ▼]         │
│ ▼ Workflow                              │
│   [Select published workflow ▼]         │
│   Leave empty to use LangGraph engine   │
│ [Cancel]  [Save]                        │
└─────────────────────────────────────────┘
```

---

## 6. Message Component States

### 6.1 Assistant Message Structure

```mermaid
flowchart TB
  Msg["AiMessage (assistant)"]
  Msg --> Label["Agent label + color"]
  Msg --> Think["thinking collapsible area"]
  Msg --> Tools["tool call list AiStepCard"]
  Msg --> Content["Markdown body"]
  Msg --> Cards["embedded cards"]
  Msg --> Docs["DocumentSummaryCard"]
  Msg --> Actions["Copy / Regenerate / Feedback"]

  Cards --> SchemaCard
  Cards --> FlowCard
  Cards --> RequirementConfirmCard
```

### 6.2 Streaming Connection State

| streamStatus | UI |
|--------------|---------|
| `idle` | normal |
| `connecting` | send disabled, showing connecting |
| `streaming` | show stop button, message updates char by char |
| `reconnecting` | show retry count `retryCount / MAX_AUTO_RETRIES` |
| `error` | show retry button |

Top-bar WS indicator: `isConnected()` polled every second; green dot = connected.

---

## 7. Conversation History

```mermaid
flowchart LR
  Click["Top bar 🕐"] --> Drawer["ConversationDrawer opens"]
  Drawer --> Load["loadConversations()"]
  Load --> List["Conversation list (title + time)"]
  List --> Select["Click item"]
  Select --> LoadOne["loadConversation(id)"]
  LoadOne --> Close["Close drawer, restore messages"]
  List --> Delete["Delete item"]
  Delete --> Remove["removeConversation(id)"]
```

---

## 8. Empty States & Errors

| Scenario | UI |
|------|------|
| New chat | empty message area + welcome hint |
| WS disconnected | top-bar red dot "disconnected", send may fail |
| Conversation 404 | Toast "conversation not found or deleted", refresh list |
| Workflow execution failed | assistant message shows error text |
| Tool call failed | AiStepCard red state + retry button |

---

## 9. Runtime Architecture

> Full runtime diagram in [runtime.md](./runtime.md)

### LangGraph Request Path

```mermaid
sequenceDiagram
  participant UI as AiChatPanel
  participant WS as Socket.IO
  participant R as chatStreamRunner
  participant G as LangGraph
  participant CP as Checkpointer

  UI->>WS: chat:send
  WS->>R: executeChatStream
  R->>G: streamEvents(thread_id)
  loop streaming
    G-->>R: on_chain / on_chat_model_stream / on_tool_end
    R-->>UI: chat:event
  end
  G->>CP: persist thread state
  R-->>UI: done
```

### Dual-backend Runtime Branch

```mermaid
flowchart TD
  Send["User sends"] --> Mode{agentWorkflowId?}
  Mode -->|no| LG["chatStreamRunner -> LangGraph\nWebSocket streaming"]
  Mode -->|yes| WF["agentWorkflowExecutor\nREST start + workflow:event WS"]
  LG --> MCP["tools/registry -> MCP Bridge"]
  WF --> MCP
  MCP --> DB["MongoDB"]
  LG --> LLM["LLM API"]
  WF --> LLM
```
