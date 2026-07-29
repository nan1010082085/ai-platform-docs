# AI Architecture

> Overall architecture of the `ai/` project: Chat LangGraph and Agent Workflow dual engines.
> For the **three-capability relationship, JWT, credentials, open-source small-platform positioning** see [platform.md](./platform.md).

**Doc version**: v7 (2026-07-13) - removed legacy architecture references, aligned with current implementation

---

## 1. Project Structure

`ai/` is a multi-package parallel repo (not a monorepo workspace); each sub-package has its own `package.json` and independent build/deploy.

```
ai/
├── app/              @ai-app                         Vue 3 micro-frontend: Chat, RAG, monitoring, workflow designer, plugin center
├── shared/           @schema-platform/ai-shared       cross-end types, events, prompt, workflow domain models
└── docs/             this docs directory
```

| Package | Consumers | Responsibility |
|---|---|---|
| `@ai-app` | shell (qiankun) | Frontend UI: Chat, workflow designer, execution monitoring, RAG, plugin center `/plugins` |
| `@schema-platform/platform-shared/ai` | app, server | Event protocol, tool names, prompt, workflow types |

**Dependency direction**: `app -> ai-shared + platform-shared`; `server -> ai-shared`.

**Plugin center**: Expert / Skill / Tool / MCP are configured per directory in `server/config/plugins/` (see [plugin.md](./plugin.md)); supports `plugin:pack` / `plugin:install` and SIGHUP hot-reload.

**In-repo dev**: `app/package.json` references ai-shared via `file:../shared`; Vite alias can connect directly to shared source, so dev/build picks up shared changes automatically.

---

## 2. Dual Agent System

The platform runs two parallel agent engines, sharing the MCP tool registry and `@schema-platform/platform-shared/ai`, but with different execution models:

| Dimension | Chat LangGraph | Agent Workflow DAG |
|------|----------------|-------------------|
| Entry | AiChatView, editor/flow embed | Designer, REST API, Webhook, Chat workflow pick |
| Engine | `server/src/ai/graph/graph.ts` | `server/src/ai/services/agentWorkflowExecutor.ts` |
| Orchestration model | LangGraph StateGraph + Checkpoint | n8n-style sequential DAG traversal |
| State persistence | LangGraph checkpointer | MongoDB `AgentWorkflowExecution` |
| HITL | LangGraph `interrupt` / `chat:resume` | `hitl` node + `POST .../resume` |
| Tools | MCP Bridge + LangGraph-specific tools | same + built-in `http_request` |
| Docs | [agent.md](./agent.md) | [agent-workflow.md](./agent-workflow.md) |

```
                    ┌─────────────────────────────────────┐
                    │     @schema-platform/ai-shared      │
                    │  events · toolNames · promptBuilder │
                    │  agentWorkflow · document           │
                    └─────────────────────────────────────┘
                           ▲                    ▲
                           │                    │
              ┌────────────┴──────┐   ┌────────┴────────────┐
              │  Chat LangGraph   │   │  Agent Workflow     │
              │  (conversational) │   │  (visual orchestration)│
              └────────────┬──────┘   └────────┬────────────┘
                           │                    │
                           └────────┬───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  tools/registry.ts  │
                         │  MCP Bridge (5 svcs)│
                         └─────────────────────┘
```

---

## 3. Chat LangGraph Architecture

### 3.1 Compiled Graph Nodes (current code)

Nodes registered in `server/src/ai/graph/graph.ts`:

| Node | Responsibility |
|------|------|
| `router` | Explicit mode routing, keyword multi-intent detection, task chain pre-build |
| `requirementAnalyzer` | v2: deep requirement analysis (on by default) |
| `requirementConfirm` | v2: requirement confirmation card (HITL) |
| `taskPlanner` | v2: task planning, generates task chain |
| `taskChain` | Task chain advancement, agent collaboration insertion; writes `session.currentExpertId` |
| **`pluginExpert`** | **The only expert execution node** (Registry prompt/tools + domain context) |
| `allTools` | ToolNode execution (with error fallback) |
| `afterTools` | Post-tool processing, collaboration request extraction, context passing |
| `summarizer` | Multi-step task result summary |

Expert resolution & session sync: `graph/resolveGraphExpert.ts`. Domain user context (Schema/Flow/collaboration): `graph/expertUserContext.ts`.

> **Baseline 1.0**: removed the `editor` / `flow` / `page` / `general` graph nodes and `*Agent.ts`; both built-in and third-party experts go through `pluginExpert`.

> **Note**: `thinker` and `qualityCheck` are only defined in `events.ts` types, **not registered as graph nodes**; the server does not emit the corresponding events.

### 3.2 v2 Default Flow

```
START
  -> router
  -> requirementAnalyzer
      ├─ (needs confirm) -> requirementConfirm -> taskPlanner
      └─ (skip confirm) ─────────────────────-> taskPlanner
  -> taskPlanner -> taskChain
  -> taskChain -> pluginExpert | summarizer
  -> pluginExpert
      ├─ (has tool_calls) -> allTools -> afterTools -> taskChain | pluginExpert | summarizer
      └─ (no tool_calls) -> END or summarizer / taskChain
  -> summarizer -> END
```

**Environment variables**:

| Variable | Default | Description |
|------|------|------|
| `AI_ENABLE_TASK_PLANNER` | `true` | Enable the task planning node |

### 3.3 Experts & Plugin Center

| Concept | Description |
|------|------|
| **Registry expert** | `server/config/plugins/experts/*.json`, e.g. `platform.editor` |
| **`legacyAgentKey`** | Scheduling key for the four built-in experts (`editor`/`flow`/`page`/`general`), used for task chain, collaboration, explicit `context.source`; **no longer** corresponds to independent graph nodes |
| **`session.currentExpertId`** | Runtime authoritative expert id; `pluginExpert` executes by it |
| **System Prompt** | `buildExpertSystemPrompt` (plugin `systemPrompt` + Skill); `dynamicPrompt` goes through ai-shared `promptBuilder` |
| **Third-party expert** | Just add plugin JSON + pack; no new `graph/*Agent.ts` needed |

### 3.4 Key Behaviors

- **Explicit mode**: when `context.source === editor|flow|page`, skip keyword guessing and enter the corresponding expert directly
- **Multi-intent**: router detects "page + form/flow" combos and pre-builds a task chain
- **Tool loop**: at most 3 tool iterations per agent round; global `session.maxNodeExecutions` prevents infinite loops
- **Collaboration**: `request_collaboration` tool -> `afterTools` extracts -> `taskChain` inserts a collaboration step
- **Streaming**: WebSocket / Socket.IO; event types in [events.md](./events.md)

---

## 4. Agent Workflow Architecture (summary)

Visual DAG orchestration system; see [agent-workflow.md](./agent-workflow.md) for details.

### 4.1 Lifecycle

```
Design (draftGraph) -> Save (version snapshot) -> Publish (publishedGraph + publishId) -> Execute -> Monitor
```

### 4.2 Node Categories (baseline 1.0)

| Category | Node types |
|------|----------|
| Trigger | `manual-trigger`, `webhook-trigger` |
| AI | `llm`, `document-parse`, `vision-analyze`, `conversation-memory`, `image-generate`, `ppt-generate` |
| Conversational intelligence | `intent-router`, `requirement-analyzer`, `task-planner`, `task-chain`, `collaboration-router`, `summarizer` |
| Expert | `agent-intent` (auto-routing), `expert` (`expertId` -> plugin center) |
| Tool | `tool` (`toolName` -> Registry / MCP) |
| Logic | `if`, `hitl`, `end` |

Palette expert and tool entries come from the plugin registry (`usePluginRegistry`), not hardcoded `agent-editor` / `tool-mcp-*`.

### 4.3 Built-in Templates (16)

| ID | Name | Trigger |
|----|------|------|
| `blank` | Blank workflow | Manual |
| `document-summary` | Document summary | Webhook |
| `doc-image-recognition` | Document/image recognition | Manual |
| `intelligent-assistant` | Smart assistant Q&A | Manual |
| `contract-extract` | Contract clause extraction | Webhook |
| `kb-faq` | Knowledge base FAQ generation | Webhook |
| `http-notify` | HTTP callback notification | Webhook |
| `rag-ingest-qa` | RAG ingest QA | Webhook |
| `multi-doc-batch` | Multi-doc batch processing | Webhook |
| `smart-suggestions` | Smart suggestions | Manual |
| `smart-action-proposals` | Smart action proposals | Webhook |
| `image-text-generation` | Image-text generation | Manual |
| `ppt-generation` | PPT generation | Manual |
| `image-analysis` | Image smart analysis | Manual |
| `chat-parity-assistant` | Smart assistant v2 | Manual |
| `requirement-gated-build` | Requirement-gated build | Manual |

Full template flow diagrams in [agent-workflow.md](./agent-workflow.md). Definitions and factory functions in `shared/platform-shared/ai/agentWorkflow.ts`.

### 4.4 Frontend Routes

| Route | View |
|------|------|
| `/workflows` | Workflow list |
| `/workflows/:id` | Designer |
| `/workflows/:id/executions` | Execution history |
| `/executions/:id` | Execution detail (node-level monitoring) |

Chat can select a published workflow as the chat backend via `AgentWorkflowPicker`.

---

## 5. Tool Layer

### 5.1 Three-layer Tools

```
LangGraph Chat / Workflow Executor
         │
         ▼
   tools/registry.ts
         │
    ┌────┴────────────────┐
    ▼                     ▼
 MCP Bridge            LangGraph-specific
 (5 MCP servers)       (no prefix naming)
```

**MCP naming**: `{domain}__{action}` (e.g. `schema__search`)

**LangGraph-specific** (no `__` prefix): `update_schema`, `generate_schema`, `update_flow`, `save_and_bind_schema`, `bind_schema_to_flow_node`, `request_collaboration`, `rag_index`

**Workflow-specific**: `http_request` (built into the executor, not in the MCP registry)

Authoritative definition: `shared/platform-shared/ai/toolNames.ts` (MCP spec name `{domain}__{action}`, no legacy alias table).

See [tool.md](./tool.md), [mcp.md](./mcp.md).

### 5.2 MCP Servers (5)

| Server | Domain prefix | Responsibility |
|--------|--------|------|
| schemaServer | `schema__` | Schema search, detail, validation |
| flowServer | `flow__` | Flow search, detail, validation, user |
| widgetServer | `widget__` | Widget catalog query and validation |
| ragServer | `rag__` | Knowledge base retrieval |
| industryServer | `industry__` | Industry template search and validation |

Bridge implementation: `server/src/ai/mcp/bridge.ts` (InMemoryTransport -> LangGraph StructuredTool).

---

## 6. Event Protocol

Unified event types are defined in `shared/platform-shared/ai/events.ts` and pushed to the frontend via WebSocket `chat:event`.

- **v1**: text stream, schema/flow generation, tool calls, task chain, HITL, done/error
- **v2**: requirement analysis, task planning (implemented and emitted)
- **v2 reserved**: `thinker_*`, `quality_check_*` (types defined, graph nodes not implemented)

Full list in [events.md](./events.md).

---

## 7. Server API Overview

Chat and Workflow REST / WebSocket endpoints are provided by `server/src/ai/` (the frontend adapts to existing APIs; server code is not modified).

### Chat (WebSocket)

| Event | Direction | Description |
|------|------|------|
| `chat:send` | Client -> Server | Send message |
| `chat:event` | Server -> Client | Stream events |
| `chat:resume` | Client -> Server | HITL resume |
| `chat:cancel` | Client -> Server | Cancel generation |

### Workflow (REST, `/api/ai`)

| Method | Path | Description |
|------|------|------|
| GET/POST | `/workflows` | List / create |
| GET/PUT/DELETE | `/workflows/:id` | Detail / update / delete |
| POST | `/workflows/:id/publish` | Publish |
| GET | `/workflows/:id/versions` | Version list |
| POST | `/workflows/:id/execute` | Manual execute (JWT) |
| POST | `/workflows/invoke/:slugOrId` | External integration execute (`X-API-Key` / `X-Workflow-Key`) |
| GET | `/workflows/invoke/executions/:id` | Invoke execution query |
| GET | `/workflow-executions` | Execution list |
| GET | `/workflow-executions/:id` | Execution detail |
| POST | `/workflow-executions/:id/resume` | HITL resume |
| POST | `/workflow-executions/:id/continue` | Multi-turn continue |
| * | `/webhooks/*path` | Webhook trigger |

---

## 8. Related Docs

| Doc | Content |
|------|------|
| [agent.md](./agent.md) | Chat expert agent details |
| [agent-workflow.md](./agent-workflow.md) | Full workflow orchestration guide |
| [ai-shared.md](./ai-shared.md) | Shared package API and types |
| [tool.md](./tool.md) | Tool registration and extension |
| [mcp.md](./mcp.md) | MCP protocol and servers |
| [events.md](./events.md) | Full event protocol list |
| [design/](./design/README.md) | Product design: wireframes, interaction flows, runtime graphs |
| [README.md](./README.md) | Quick start and doc index |
