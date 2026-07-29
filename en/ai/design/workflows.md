# Agent Orchestration - Design Draft & Interaction Flow

## 1. List Page Wireframe (AgentWorkflowListView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Agent orchestration                       [+ New workflow]                │
├──────────────────────────────────────────────────────────────────────────┤
│ [All] [Draft] [Published] [Templates]  🔍 Search...  Sort: [Recent ▼]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ 📋 Doc Summary  │  │ 🤖 Smart Q&A    │  │ 📝 My Workflow  │          │
│  │ Published v2026.│  │ Draft           │  │ Draft           │          │
│  │ Updated 2h ago  │  │ Updated yesterday│  │ Updated 3d ago  │          │
│  │ [Design][Publish]│  │ [Design][Publish]│  │ [Design][Delete]│          │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tab Behavior

| Tab | Content |
|-----|------|
| All | all workflow cards |
| Draft | `status === draft` |
| Published | `status === published` |
| Templates | system template cards (`AGENT_WORKFLOW_TEMPLATES`, excludes blank) |

### New Flow

```mermaid
flowchart TD
  New["Click New workflow"] --> Dialog["Create dialog"]
  Dialog --> Name["Enter name"]
  Dialog --> Template["Select template"]
  Template --> Preview["Optional: template preview AgentWorkflowTemplatePreviewDialog"]
  Preview --> Create["POST /workflows { templateId }"]
  Create --> Navigate["Jump to /workflows/:id designer"]
```

---

## 2. Designer Wireframe (AgentWorkflowDesignerView)

Full-screen three-pane layout, no AiLayout sidebar:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Toolbar: ← Back │ Name [editable] │ [Save][Publish][Test run][Version][Validate]│
├──────────┬───────────────────────────────────────────────┬───────────────┤
│ Palette  │              Canvas (Vue Flow)               │ PropertyPanel │
│ 200px    │                                              │ 320px         │
│          │   ┌─────────┐      ┌─────────┐                │               │
│ ▼ Trigger│   │Manual    │─────▶│  LLM    │────▶ [End]    │ Node: LLM     │
│  Manual  │   │trigger   │      │         │                │  Prompt: ...  │
│  Webhook │   └─────────┘      └─────────┘                │  Model: default│
│ ▼ AI     │                                              │  {{$input...}} │
│  LLM     │      Drag to connect / select highlight      │               │
│  Doc parse│  Exec highlight: green=done blue=running red=failed│ [Variable ref]│
│ ▼ Expert │                                              │               │
│ ▼ Tool   │                                              │               │
│ ▼ Logic  │                                              │               │
│  [◀][▶] collapse panel                                 │  [◀][▶] collapse│
└──────────┴───────────────────────────────────────────────┴───────────────┘
```

### Panel Collapse

- `showLeft` / `showRight` toggle the left/right panels
- The canvas area adapts and expands

### Node Panel Categories (Palette)

```mermaid
mindmap
  root((Node Panel))
    Trigger
      manual-trigger
      webhook-trigger
    AI
      llm
      document-parse
      vision-analyze
      conversation-memory
    Expert
      agent-intent
      expert
    Tool
      tool
    Logic
      [if]
      hitl
      [end]
```

Drag onto the canvas -> auto-select -> the right shows the corresponding PropertyPanel.

---

## 3. Designer Core Interaction Flow

### 3.1 Edit -> Save

```mermaid
sequenceDiagram
  actor User as User
  participant TB as Toolbar
  participant Store as designer store
  participant Val as validateAgentWorkflowGraph
  participant API as agentWorkflowApi

  User->>TB: Click save
  TB->>Store: getGraph()
  Store-->>TB: draftGraph
  TB->>Val: validate
  alt has errors
    Val-->>User: Toast first error
  else pass
    TB->>API: PUT /workflows/:id
    API-->>Store: dirty=false
    TB-->>User: Saved
  end
```

### 3.2 Publish

```mermaid
flowchart TD
  Pub["Click publish"] --> Save["Save first"]
  Save --> Confirm["Confirm dialog: publishing creates a new version"]
  Confirm --> API["POST /workflows/:id/publish"]
  API --> Sync["aiStore.updateAgentWorkflowId"]
  Sync --> Toast["Published; synced to chat workflow picker"]
```

### 3.3 Test Run

```mermaid
flowchart TD
  Exec["Click test run"] --> Save2["Save first"]
  Save2 --> NeedFile{"Graph has document-parse/vision?"}
  NeedFile -->|yes| Pick["Pop file picker"]
  NeedFile -->|no| DefaultInput["input.message = manual test run"]
  Pick --> Upload["Upload file -> documentId"]
  Upload --> Run["POST /workflows/:id/execute"]
  DefaultInput --> Run
  Run --> Nav["Jump to /executions/:id"]
```

Canvas node real-time highlight: `store.applyExecutionHighlight(active, completed, records)`

---

## 4. Property Panel Interaction

`useAgentNodePropertyPanel` maps panel components by node type:

| Node type | Panel component |
|----------|----------|
| `manual-trigger` | TriggerNodePanel |
| `webhook-trigger` | WebhookTriggerNodePanel |
| `llm` | LlmNodePanel + VariableReferencePanel |
| `document-parse` | DocumentParseNodePanel |
| `vision-analyze` | VisionAnalyzeNodePanel |
| `conversation-memory` | ConversationMemoryNodePanel |
| `agent*` | AgentNodePanel |
| `tool*` | ToolNodePanel |
| `if` | IfNodePanel |
| `hitl` | HitlNodePanel |
| other | DefaultNodePanel |

### Variable Reference Panel

```
┌─ Available variables ───────────────┐
│ {{$input.message}}                  │
│ {{$node.parse-1.text}}              │
│ {{$conversation}}                   │
│ {{$json}}                           │
│         [Click to insert into prompt]│
└──────────────────────────────────────┘
```

### HITL Node Config

```
Confirm message: [Please confirm the following info]
▼ Confirm questions
  Q1: [Approval levels?]
  Options: One, Two, Three
  [+ Add question]
☑ Inherit upstream confirm questions
```

---

## 5. Execution Monitoring

### 5.1 Execution List (AgentExecutionListView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Back to workflow │ Doc Summary - execution records                     │
├──────────────────────────────────────────────────────────────────────────┤
│  ID          Trigger   Status    Start time     Duration                │
│  exec-001    manual   ● success 14:30:00      12.3s                     │
│  exec-002    webhook  ● failed  14:25:00      3.1s                      │
│  exec-003    chat     ◐ waiting 14:20:00      -                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Execution Detail Wireframe (AgentExecutionDetailView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Back │ Execution exec-003  ◐ waiting │ Trigger: chat │ [Cancel]        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│              Canvas (read-only, node status coloring)                    │
│         [Manual trigger]──▶[RAG]──▶[LLM]──▶[HITL ●]──▶[End]             │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ▼ Bottom panel [Node records] [Logs] [Node detail]              [Expand] │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ ● hitl-1  waiting  14:20:05                                         │   │
│ │ ✓ rag-1   success  14:20:03  -> click to expand AgentNodeExecutionDetail│   │
│ │ ✓ trigger success  14:20:01                                         │   │
│ └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Execution State Machine

```mermaid
stateDiagram-v2
  [*] --> running: execute / webhook / chat
  running --> success: all nodes done
  running --> error: node failed
  running --> waiting: hitl node
  running --> cancelled: user cancel
  waiting --> running: resume (approved)
  waiting --> error: resume (rejected)
  success --> [*]
  error --> [*]
  cancelled --> [*]
```

### 5.4 HITL Resume Interaction

```mermaid
sequenceDiagram
  actor User as Operator
  participant View as ExecutionDetailView
  participant API as agentWorkflowApi

  Note over View: status=waiting, hitl node highlighted
  User->>View: Click "Handle confirmation"
  View->>View: HitlConfirmQuestions dialog
  User->>View: Fill answers / approve or reject
  View->>API: POST /workflow-executions/:id/resume
  API-->>View: continue execution
  loop workflow:event
    View->>WS: subscribe
    WS-->>View: execution snapshot
  end
  View-->>User: update node status
```

In-designer test runs that hit HITL also jump to the execution detail page.

---

## 6. Webhook Trigger Flow

```mermaid
sequenceDiagram
  participant Ext as External system
  participant Hook as /api/ai/webhooks/*
  participant Srv as agentWorkflowService
  participant Exec as agentWorkflowExecutor

  Ext->>Hook: POST /webhooks/document-summary
  Note over Ext,Hook: Header: X-Webhook-Signature (HMAC-SHA256)
  Hook->>Srv: match webhook-trigger in publishedGraph
  Srv->>Exec: async start execution
  Hook-->>Ext: 202 { executionId }
```

Webhook config is in the designer `webhook-trigger` node: `webhookPath` + `webhookMethod`; after publish you get `webhookSecret`.

---

## 7. Integration with Chat

```mermaid
flowchart LR
  subgraph chat [AiChatPanel]
    Picker["AgentWorkflowPicker"]
    Input["Input area"]
  end

  subgraph settings [AiChatSettings]
    WFSelect["Select workflow"]
  end

  subgraph published [Published workflows]
    WF1["Smart Q&A"]
    WF2["Doc Summary"]
  end

  Picker --> WF1
  WFSelect --> WF1
  Input -->|send| Exec["execute / continue / resume"]
  Exec --> WS["workflow:event push"]
  Poll --> Reply["assistant message"]
```

After publishing a workflow, `updateAgentWorkflowId` auto-syncs so users can pick it in Chat.

---

## 8. Node Visual States (canvas)

| State | Node border/icon | Scenario |
|------|--------------|------|
| Default | gray | design mode |
| Selected | blue highlight | editing properties |
| running | blue pulse | executing |
| success | green | done |
| error | red | failed |
| waiting | orange | HITL paused |

Edges (`AgentFlowEdge`): `if` branches labeled `true` / `false`; during execution the active path is highlighted.

---

## 9. Version Management

Toolbar "Version" dropdown:

```
┌─ Version history ───────────────┐
│ ● v20260706143000  (current draft)│
│   v20260705120000               │
│   v20260704100000  [published]   │
│   ...                           │
│ [View snapshot]                 │
└─────────────────────────────────┘
```

Selecting a historical version shows the graph snapshot (read-only) and does not overwrite the current draft.

---

## 10. Runtime Architecture

> Full runtime diagram in [runtime.md](./runtime.md)

### Executor Main Loop

```mermaid
flowchart TD
  API["POST execute"] --> Create["Create Execution\nstatus=running"]
  Create --> Async["async executeAgentWorkflow"]
  Async --> Loop["while currentId"]
  Loop --> Run["runNode -> write nodeRecords"]
  Run --> Wait{hitl?}
  Wait -->|yes| Pause["status=waiting\nclient workflow:subscribe"]
  Wait -->|no| Next["pickNextNode"]
  Next --> Loop
  Pause --> Resume["POST resume"]
  Resume --> Loop
```

### Runtime Relationship with Chat

| Trigger | API | Execution engine |
|------|-----|----------|
| Designer test | `POST /workflows/:id/execute` | agentWorkflowExecutor |
| Webhook | `/api/ai/webhooks/*` | same, 202 async |
| Chat workflow pick | execute / continue / resume | WebSocket `workflow:event` |
