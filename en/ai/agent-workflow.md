# Agent Workflow Orchestration System

> n8n-style visual DAG workflow: design, publish, execute, monitor

**Difference from Chat LangGraph**: Chat is conversational single-request multi-agent collaboration; Workflow is reusable automated orchestration supporting Webhook, multi-turn chat, document pipelines, etc. The two share the MCP tool registry, **plugin center** (`server/config/plugins/`), and ai-shared types. See [plugin.md](./plugin.md).

**When Chat picks a workflow**: the assistant message shows a node timeline + LLM streaming body (`workflow:event` WebSocket push). Terminology in [product/workflow-terminology.md](./product/workflow-terminology.md) (internal).

---

## 1. System Overview

```
┌──────────────┐     save      ┌─────────────┐    publish    ┌────────────────┐
│   Designer   │ ────────────► │ draftGraph  │ ────────────► │ publishedGraph │
│  (Vue Flow)  │               │ + version   │               │ + publishId    │
└──────────────┘               └─────────────┘               └────────────────┘
                                                                      │
         ┌────────────────────────────────────────────────────────────┤
         ▼                            ▼                               ▼
   POST .../execute            Webhook trigger                 Chat picks workflow
   (manual)                    (webhook-trigger)                 (trigger: chat)
         │                            │                               │
         └────────────────────────────┴───────────────────────────────┘
                                      ▼
                           agentWorkflowExecutor
                           (sequential DAG traversal + node records)
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        nodeRecords[]            waiting (HITL)          success / error
              │                       │                       │
              ▼                       ▼                       ▼
   AgentExecutionDetailView    POST .../resume         list / detail views
```

### Core Modules

| Layer | Path | Responsibility |
|----|------|------|
| Types & templates | `shared/platform-shared/ai/agentWorkflow.ts` | node types, graph structure, built-in templates, validation |
| Frontend designer | `ai/app/src/views/AgentWorkflowDesignerView.vue` | Vue Flow canvas, property panel |
| State management | `ai/app/src/stores/agentWorkflowDesigner.ts` | nodes/edges, dirty, execution highlight |
| API client | `ai/app/src/api/agentWorkflowApi.ts` | REST wrapper |
| Chat integration | `ai/app/src/composables/useWorkflowChatExecution.ts` | execute/continue/resume in chat |
| Execution engine | `server/src/ai/services/agentWorkflowExecutor.ts` | DAG traversal, node execution |
| Template resolver | `server/src/ai/services/agentWorkflowTemplateResolver.ts` | `{{$...}}` variable substitution |
| Data model | `server/src/ai/models/agentWorkflow.ts` | MongoDB persistence |

---

## 2. Node Type Reference

### 2.1 Trigger Nodes

#### `manual-trigger`

Manually started from the designer toolbar, REST API, or Chat.

- Entry is specified by `graph.entryNodeId`
- Execution input comes via the `input` field of `POST /workflows/:id/execute`

#### `webhook-trigger`

HTTP external trigger; `webhookSecret` is auto-generated on publish.

| Config field | Description |
|----------|------|
| `webhookPath` | path suffix, e.g. `/document-summary` |
| `webhookMethod` | `GET` or `POST` |
| `webhookSecret` | injected on publish, for HMAC-SHA256 verification |

The `X-Webhook-Signature` header carries the signature. Endpoint: `/api/ai/webhooks/*path`, returns `202` + `executionId`.

### 2.2 AI Processing Nodes

#### `llm`

Direct LLM call, supports template variables.

| Config field | Description |
|----------|------|
| `prompt` | user prompt (supports `{{$...}}`) |
| `systemPrompt` | system prompt |
| `model` | model id; `default` uses the platform default |
| `useConversationHistory` | whether to inject conversation history |
| `maxHistoryTurns` | history turn cap |
| `appendAssistantReply` | whether to append the reply to conversation history |

#### `document-parse`

Parse an uploaded document; outputs full text, chunks, and metadata.

| Config field | Description |
|----------|------|
| `documentSource` | `documentId` (fixed id) or `inputField` (from input) |
| `documentId` / `inputField` | document source |

Output example: `{ text, chunks, filename, extractionMethod, ... }`

#### `vision-analyze`

Visual description of an image (not verbatim OCR); used with the `document-parse` OCR branch.

| Config field | Description |
|----------|------|
| `visionPrompt` | visual analysis instruction (supports `{{$...}}`) |
| `documentSource` / `documentId` / `inputField` | same as document-parse |
| `visionImageWidth` | compress width (px) before sending; no compression if unset |
| `visionImageQuality` | JPEG quality 1-100; no compression if unset |

Compression preprocessing uses sharp, greatly reducing vision-model token usage. Typical: Phase1 small image 400px/50 quick extract, Phase2 large image 1024px/85 deep analysis.

#### `conversation-memory`

Read/write `conversationHistory` on the execution record; supports multi-turn Chat workflows.

| Config field | Description |
|----------|------|
| `memoryMode` | `read` / `append` / `reset` |
| `memoryRole` | `user` / `assistant` (when append) |
| `messageField` | field name to take the message from input |
| `contentSource` | `input` or `lastOutput` |
| `maxHistoryTurns` | history truncation cap |

### 2.3 Expert Nodes

Share the Registry + `runRegisteredExpert` (Workflow executor) / `pluginExpert` (Chat graph) with Chat.

| Node type | Config | Responsibility |
|----------|------|------|
| `agent-intent` | - | intent recognition -> auto-select and execute an expert |
| `expert` | `expertId` | plugin-center registered expert (Palette drag carries the id) |

The four built-in experts (`platform.editor` / `platform.flow` / `platform.page` / `platform.general`) are configured via plugin JSON; `agent-editor` and other standalone node types are no longer used.

### 2.4 Tool Nodes

| Node type | Config | Description |
|----------|------|------|
| `tool` | `toolName` | Registry tool name (MCP `schema__search` or LangGraph-specific `update_schema`, etc.) |

Authoritative tool names in `shared/platform-shared/ai/toolNames.ts`. The Palette tool list comes from the plugin Registry.

### 2.5 Conversational Intelligence Nodes (Phase J)

> Detailed spec in [langgraph-workflow-nodes-roadmap.md](./product/langgraph-workflow-nodes-roadmap.md) (internal)

Maps the conversational intelligence layer inside the Chat LangGraph black box to white-box Workflow nodes, sharing the `server/src/ai/runtime/*` runtime.

| Node type | Palette category | LangGraph counterpart | Description |
|----------|-------------|----------------|------|
| `intent-router` | `logic` | `routerNode` + `resolveRoutedExpert` | intent recognition & expert routing; supports multi-intent chain pre-build |
| `requirement-analyzer` | `ai` | `requirementAnalyzer` | requirement analysis (RAG + tools); outputs completeness + confirmQuestions |
| `task-planner` | `ai` | `taskPlanner` | task decomposition into a multi-step chain (`TaskPlanStep[]`) |
| `task-chain` | `logic` | `taskChainNode` | in-node loop advancing dynamic steps; sub-step event push |
| `collaboration-router` | `logic` | `afterToolsNode` + `afterToolsRoute` | detect collaboration requests; decide continue/next/summarize |
| `summarizer` | `ai` | `summarizerNode` | multi-step result summary; supports streaming push |

`hitl` node enhancement: new `questionSource: upstream` config auto-takes `confirmQuestions` from the upstream `requirement-analyzer` output.

### 2.6 Logic Control Nodes

#### `if`

JavaScript expression branch. The edge `data.branch` is `'true'` or `'false'`.

Expression context: `lastOutput` (upstream output), `input` (execution input), `nodeOutputs` (each node's output).

Example: `lastOutput && lastOutput.extractionMethod === 'ocr'`

#### `hitl`

Human confirmation pause. Execution status becomes `waiting`; resume API needed to continue.

| Config field | Description |
|----------|------|
| `confirmMessage` | confirmation prompt text |
| `confirmQuestions` | structured question list (aligned with the Chat requirement-confirm card) |
| `inheritUpstreamQuestions` | whether to inherit upstream HITL questions |

#### `end`

Terminal node. Supports configuring the output source:

| Config field | Description |
|----------|------|
| `outputSource` | `lastOutput` (default, last node output) / `node` (specified node) / `custom` (custom JSON template) |
| `outputNodeId` | specify node id when `outputSource=node` |
| `outputTemplate` | JSON template when `outputSource=custom`; supports `{{$node.xxx}}` variables |

The callback URL is configured at the workflow level (`onCompleteWebhook`), not on the end node.

#### `image-generate`

AI image generation node.

| Config field | Description |
|----------|------|
| `imagePrompt` | image description prompt |
| `imageModel` | `dall-e-3` / `dall-e-2` / `mimo-image` |
| `imageSize` | `1024x1024` / `1024x1792` / `1792x1024` |
| `imageStyle` | `natural` / `vivid` |
| `imageQuality` | `standard` / `hd` |

#### `ppt-generate`

AI PPT generation node.

| Config field | Description |
|----------|------|
| `pptTemplate` | `business` / `tech` / `education` / `creative` |
| `pptMaxSlides` | max slide count |
| `pptStyle` | `professional` / `casual` / `academic` |
| `pptIncludeImages` | whether to include images |

---

## 3. Template Variable Syntax

Resolved at execution by `agentWorkflowTemplateResolver`:

| Syntax | Meaning |
|------|------|
| `{{$input.field}}` | execution input field |
| `{{$node.<nodeId>.<field>}}` | specified node's output field |
| `{{$json}}` | `lastOutput` (most recent upstream output) |
| `{{$conversation}}` | formatted conversation history |

Example (smart assistant template):

```
Current question: {{$input.message}}
Knowledge base retrieval result: {{$node.rag-1}}
Conversation history: {{$conversation}}
```

---

## 4. Built-in Templates

Defined in `shared/platform-shared/ai/agentWorkflow.ts`; created via `createAgentWorkflowGraphByTemplate(id)`.

| ID | Name | Trigger | Scenario |
|----|------|------|------|
| `blank` | Blank workflow | Manual | manual -> LLM -> end |
| `document-summary` | Document summary | Webhook | receive documentId -> parse -> LLM summary |
| `doc-image-recognition` | Document/image recognition | Manual | parse -> if(OCR) -> vision+structured \| document structured |
| `intelligent-assistant` | Smart assistant Q&A | Manual | record question -> RAG retrieval -> LLM answer |
| `contract-extract` | Contract clause extraction | Webhook | parse -> LLM structured extraction |
| `kb-faq` | Knowledge base FAQ generation | Webhook | parse -> LLM generate FAQ -> RAG ingest |
| `http-notify` | HTTP callback notification | Webhook | content process -> HTTP notify external |
| `rag-ingest-qa` | RAG ingest QA | Webhook | parse -> LLM QA -> qualified ingest / human review |
| `multi-doc-batch` | Multi-doc batch processing | Webhook | parse -> LLM summary -> memory accumulate -> summarize |
| `smart-suggestions` | Smart suggestions | Manual | context -> RAG -> LLM -> if -> HITL |
| `smart-action-proposals` | Smart action proposals | Webhook | doc parse -> LLM extract action items -> HITL -> notify |
| `image-text-generation` | Image-text generation | Manual | LLM outline -> LLM copy |
| `ppt-generation` | PPT generation | Manual | memory -> LLM outline -> LLM detail |
| `image-analysis` | Image smart analysis | Manual | Phase1 small image extract -> Phase2 large image sentiment copy |
| `chat-parity-assistant` | Smart assistant v2 | Manual | intent routing -> requirement analysis -> human confirm -> task planning -> multi-expert collaboration -> summary output |
| `requirement-gated-build` | Requirement-gated build | Manual | requirement analysis -> human confirm -> task planning -> editor expert -> flow expert -> summary output |

Metadata list: `AGENT_WORKFLOW_TEMPLATES` (16).

Create API: `POST /api/ai/workflows` body `{ "templateId": "document-summary", "name": "..." }`

---

## 5. Version & Publish

### 5.1 Draft Version

- Each save generates a timestamp version number `yyyymmddhhmmss`
- On save, a snapshot is pushed to `versions[]` (up to 20 kept)

### 5.2 Publish

`POST /workflows/:id/publish`:

- Copy `draftGraph` -> `publishedGraph`
- Assign a stable `publishId` (UUID, immutable)
- Record `publishedVersion`
- Inject `webhookSecret` for `webhook-trigger` nodes

### 5.3 Status

| Status | Description |
|------|------|
| `draft` | draft only, not published |
| `published` | has publishedGraph |
| `archived` | archived |

---

## 6. Execution Engine

`agentWorkflowExecutor.ts` core behavior:

1. Sequentially traverse the DAG from `entryNodeId`
2. Cycle detection: visited set prevents infinite loops
3. Each node produces an `AgentNodeRecord` (pending -> running -> success/error/waiting/skipped)
4. Node output is written to `nodeOutputs[nodeId]`, as the data source for downstream `{{$node.*}}`
5. Expert nodes: reuse the same MCP registry as Chat; up to 3 tool rounds
6. HITL: `hitl` node sets `wait: true` -> execution `waiting` -> waits for resume
7. `continue`: creates a new execution based on `parentExecutionId`, inheriting `conversationHistory`

### 6.1 Execution Status

| Status | Description |
|------|------|
| `running` | executing |
| `success` | done |
| `error` | node or engine error |
| `waiting` | HITL paused |
| `cancelled` | cancelled |

### 6.2 Node Record Status

`pending` -> `running` -> `success` | `error` | `waiting` | `skipped`

### 6.3 Trigger Sources

| trigger | Entry |
|---------|------|
| `manual` | designer / REST execute |
| `webhook` | webhook route |
| `chat` | AiChatPanel picks a published workflow |

---

## 7. REST API

Prefix: `/api/ai`

### Workflow CRUD

| Method | Path | Description |
|------|------|------|
| GET | `/workflows` | list (includes status, hasRunningExecution) |
| POST | `/workflows` | create, `{ name, description?, templateId? }` |
| GET | `/workflows/:id` | detail + `draftGraph` |
| PUT | `/workflows/:id` | update name/description/draftGraph |
| DELETE | `/workflows/:id` | delete (refused if there's a running execution) |
| POST | `/workflows/:id/publish` | publish |
| GET | `/workflows/:id/versions` | version list |
| GET | `/workflows/:id/versions/:version` | version snapshot graph |

### Execution

| Method | Path | Description |
|------|------|------|
| POST | `/workflows/:id/execute` | `{ input: {...} }` start execution |
| GET | `/workflow-executions` | list, `?workflowId=` filter |
| GET | `/workflow-executions/:id` | detail + `nodeRecords` + `conversationHistory` |
| POST | `/workflow-executions/:id/resume` | HITL resume, `{ answers: {...} }` |
| POST | `/workflow-executions/:id/continue` | multi-turn continue, `{ input: {...} }` |

### Webhook

| Method | Path | Description |
|------|------|------|
| GET/POST/... | `/webhooks/*path` | match a published workflow's webhook-trigger |

---

## 8. Frontend Designer

### 8.1 Routes

| Route | Component | Function |
|------|------|------|
| `/workflows` | `AgentWorkflowListView` | list, filter, create from template |
| `/workflows/:id` | `AgentWorkflowDesignerView` | full-screen designer |
| `/workflows/:id/executions` | `AgentExecutionListView` | execution history |
| `/executions/:id` | `AgentExecutionDetailView` | node-level monitoring |

### 8.2 Core Components

| Component | Responsibility |
|------|------|
| `AgentWorkflowPalette` | left node panel (drag) |
| `AgentWorkflowCanvas` | Vue Flow canvas |
| `AgentWorkflowPropertyPanel` | right property config |
| `AgentWorkflowToolbar` | save/publish/execute/validate/version |
| `AgentFlowNode` / `AgentFlowEdge` | node/edge rendering (with execution status styles) |
| `AgentWorkflowTemplatePreviewDialog` | template preview |

### 8.3 Store & Composable

| Module | Responsibility |
|------|------|
| `agentWorkflowDesigner.ts` | graph state, dirty, entryNodeId, execution highlight |
| `useAgentNodePropertyPanel.ts` | node type -> property panel component mapping |
| `useWorkflowChatExecution.ts` | Chat execute/continue/resume + WebSocket progress |
| `usePublishedAgentWorkflows.ts` | load published workflows for Chat selection |
| `constants/agentNodes.ts` | palette items, categories, default data |
| `constants/expertNodeTypes.ts` | expert node metadata |
| `constants/toolNodeTypes.ts` | tool node metadata |

### 8.4 Graph Validation

Before saving, the frontend calls `validateAgentWorkflowGraph(graph)` (ai-shared):

- Must have an entry node
- At least one trigger node
- Edge references valid nodes
- Node IDs not duplicated (error)
- `if` nodes must have both true/false branches (error)
- `webhook-trigger` must have `webhookPath` (error)
- Required config checks for LLM/tool/expert nodes (warning)

---

## 9. Chat Integration

After selecting a published workflow in `AiChatSettings`, the conversation goes through the workflow engine instead of LangGraph:

```
User message -> useWorkflowChatExecution
  -> POST /workflows/:id/execute (trigger: chat) or /continue / resume
  -> workflow:subscribe -> workflow:event real-time progress
  -> workflowChatResponse parses the final output
```

HITL scenario: the frontend shows a confirm card; after the user answers, `POST .../resume`.

---

## 10. Data Model (summary)

### AgentWorkflow

```typescript
{
  name, description, status,
  draftGraph: AgentWorkflowGraph,
  publishedGraph?: AgentWorkflowGraph,
  publishId?: string,
  version: string,           // current draft version
  publishedVersion?: string,
  versions: [{ version, graph, createdAt, published, current }]
}
```

### AgentWorkflowExecution

```typescript
{
  workflowId, workflowName, version, versionId,
  status, trigger,           // manual | chat | webhook
  nodeRecords: AgentNodeRecord[],
  conversationHistory?: AgentConversationTurn[],
  parentExecutionId?: string,
  startedAt, finishedAt, durationMs, error?
}
```

Full type definitions in [ai-shared.md](./ai-shared.md).

---

## 11. Environment Variables

| Variable | Description |
|------|------|
| `AI_WEBHOOK_SKIP_HMAC` | skip Webhook HMAC verification in dev |

---

## 12. Extension Guide

### Add a Node Type

1. Add to the `AgentNodeType` union in `shared/platform-shared/ai/agentWorkflow.ts`
2. Add config fields to `AgentWorkflowNodeData`
3. Frontend: `constants/agentNodes.ts` palette item + property panel component
4. Server: add a `case` branch in `agentWorkflowExecutor.ts`
5. Add validation rules to `validateAgentWorkflowGraph`

### Add a Built-in Template

1. Add a `createXxxWorkflowGraph()` factory in `agentWorkflow.ts`
2. Register in `AGENT_WORKFLOW_TEMPLATES` and `createAgentWorkflowGraphByTemplate`
3. The frontend list auto-reads `AGENT_WORKFLOW_TEMPLATES`
