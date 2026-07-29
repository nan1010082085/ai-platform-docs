# Information Architecture & Layout

## 1. App Shell

### 1.1 Standalone Mode Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│ AiLayout                                                                 │
├────────────┬─────────────────────────────────────────────────────────────┤
│  Sidebar   │  Main content (router-view)                                 │
│  200px     │                                                             │
│            │                                                             │
│  [AI Logo] │                                                             │
│  Assistant │                                                             │
│ ────────── │                                                             │
│ ● AI Chat  │                                                             │
│   Workflow │                                                             │
│   RAG KB   │                                                             │
│   Monitor  │                                                             │
│ ────────── │                                                             │
│   Sidebar  │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### 1.2 qiankun Embed Mode

When the Shell already provides the main navigation, the sub-app hides its left sidebar and the main content fills the width:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Shell top bar / menu                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                    AI sub-app main content (100% width)                  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Embed detection: `useShellEmbed().shouldHideSubAppMenu`

### 1.3 Full-screen Pages (outside the AiLayout sidebar)

The designer and execution detail are standalone full-screen routes with their own top toolbar:

| Route | Layout |
|------|------|
| `/workflows/:id` | top Toolbar + three-pane designer |
| `/executions/:id` | top status bar + canvas + bottom/side panel |

---

## 2. Routes & Navigation Highlight

```mermaid
flowchart LR
  subgraph nav [Sidebar nav]
    Chat["/  AI Chat"]
    WF["/workflows  Workflow"]
    RAG["/rag  RAG KB"]
    Mon["/monitor  Monitor"]
  end

  subgraph wf_child [Workflow sub-routes - highlight Workflow]
    List["/workflows"]
  end

  subgraph exec_child [Execution sub-routes - highlight Workflow]
    ExecList["/workflows/:id/executions"]
    ExecDetail["/executions/:id"]
  end

  WF --> List
  WF --> ExecList
  WF --> ExecDetail
```

`activeNav` rule: both `/workflows*` and `/executions*` activate "Workflow".

---

## 3. Embedding Integration (editor / flow)

### 3.1 Bridge Events

```mermaid
sequenceDiagram
  participant Host as Editor/Flow host
  participant Bridge as qiankun bridge
  participant AI as AI sub-app
  participant Store as ai store

  Host->>Bridge: ai:set-context { source, schemaId, flowId, nodeId }
  Bridge->>Store: setContext()
  Note over Store: explicit mode routes to the corresponding agent

  Host->>Bridge: ai:current-schema { widgets, ... }
  Bridge->>Store: setCurrentSchema()

  AI->>Bridge: ai:published { id, publishId, type }
  Bridge->>Host: notify publish complete

  AI->>Bridge: ai:open-in-editor { schema, flow, id, type }
  Bridge->>Host: open in editor
```

### 3.2 Sidebar Mode (`/sidebar`)

A 400px-wide compact Chat embedded in the editor/flow right panel:

```
┌──────────────────────────────┐ 400px
│ Context bar [Schema ▼] [Node]│
│ WS ● connected  [History] [WF▼]│
├──────────────────────────────┤
│                              │
│   Message list (no preview)  │
│                              │
├──────────────────────────────┤
│  Agent: Auto ▼               │
│  ┌────────────────────────┐  │
│  │ Type a message...      │  │
│  └────────────────────────┘  │
│  [Attach] [RAG] [Send]       │
└──────────────────────────────┘
```

Differences from full-screen Chat:

| Capability | Full-screen Chat | Sidebar |
|------|-----------|--------|
| Conversation history | right Drawer | Popover |
| Preview panel | none (single column) | none |
| Context bar | none | yes (Schema/Flow/Node) |
| Publish jump | open editor/flow in new window | bridge notifies host |

---

## 4. Colors & Agent Identity

| Agent | Use case | Message label color |
|-------|------|-----------|
| `auto` / router | auto-routing | default blue |
| `editor` | form | green |
| `flow` | flow | orange |
| `page` | page | purple |
| `general` | general | gray |

Workflow node colors in `constants/agentNodes.ts` `AGENT_NODE_COLORS`.

---

## 5. Global State Store Relationships

```mermaid
flowchart TB
  subgraph stores [Pinia Stores]
    ai["ai.ts - chat main state"]
    conv["conversation.ts"]
    stream["stream.ts - WebSocket events"]
    chatSettings["chatSettings.ts - model/workflow selection"]
    designer["agentWorkflowDesigner.ts - canvas state"]
    pubWF["publishedAgentWorkflows.ts - published list cache"]
  end

  subgraph views [Main views]
    ChatView["AiChatView"]
    Designer["AgentWorkflowDesignerView"]
    ExecDetail["AgentExecutionDetailView"]
    RagView["RagKnowledgeBase"]
  end

  ChatView --> ai
  ChatView --> chatSettings
  ai --> stream
  ai --> conv
  Designer --> designer
  ExecDetail --> designer
  ChatView --> pubWF
```

---

## 6. Runtime Overview

```mermaid
flowchart LR
  subgraph ui [Frontend]
    Chat["Chat"]
    WF["Workflow"]
    RAG["RAG"]
  end

  subgraph engines [Server engines]
    LG["LangGraph\nstreaming WS"]
    EX["Workflow Executor\nWS workflow:event"]
    RS["ragService"]
  end

  Chat --> LG
  Chat --> EX
  WF --> EX
  RAG --> RS
  LG --> Tools["tools/registry"]
  EX --> Tools
  Tools --> RS
```

See [runtime.md](./runtime.md).
