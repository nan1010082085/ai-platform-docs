# @schema-platform/ai-shared

> AI cross-end shared package: types, events, prompt, workflow domain models, authoritative tool-name definitions

**Package path**: `shared/platform-shared/ai/`
**NPM name**: `@schema-platform/platform-shared/ai`
**Consumers**: `@ai-app` (frontend), `@server` (backend, via the repo-root `ai-shared` symlink)

---

## 1. Install & Import

### In-repo dev (recommended)

```json
// ai/app/package.json
"@schema-platform/ai-shared": "file:../shared"
```

Vite aliases to sibling source via `scripts/vite-shared-source.mjs`; after changing shared, no need to build dist first.

### Subpath Exports

```typescript
import { ... } from '@schema-platform/ai-shared'
import { buildEditorSystemPrompt } from '@schema-platform/ai-shared/promptBuilder'
import { SCHEMA_SEARCH, normalizeToolName } from '@schema-platform/ai-shared/toolNames'
import { validateAgentWorkflowGraph } from '@schema-platform/ai-shared/agentWorkflow'
import type { DocumentRecord } from '@schema-platform/ai-shared/document'
import { EVENT_ACTION_TYPES } from '@schema-platform/ai-shared/systemKnowledge'
```

| Subpath | Module |
|--------|------|
| `.` | full re-export |
| `./promptBuilder` | System Prompt builder |
| `./toolNames` | tool-name constants and aliases |
| `./agentWorkflow` | workflow domain types and templates |
| `./document` | document pipeline types |
| `./systemKnowledge` | editor/flow engine knowledge constants |

---

## 2. Module List

### 2.1 `events.ts` - Unified Event Protocol

Defines the Agent -> frontend WebSocket `chat:event` streaming protocol event types.

```typescript
type AgentEventType =
  // v1: text stream
  | 'text_delta' | 'thinking_delta'
  // v1: Schema / Flow generation
  | 'schema_start' | 'schema_progress' | 'schema_complete' | 'schema_diff'
  | 'flow_start' | 'flow_progress' | 'flow_complete' | 'flow_diff'
  // v1: tools
  | 'tool_call_start' | 'tool_call_end' | 'tool_error'
  // v1: collaboration & task chain
  | 'agent_switch' | 'agent_collaboration'
  | 'chain_start' | 'chain_step' | 'chain_complete'
  // v1: HITL & terminal
  | 'interrupt' | 'resume' | 'done' | 'error'
  // v2: requirement analysis
  | 'requirement_analysis_start' | 'requirement_analysis_complete'
  | 'requirement_confirm_request' | 'requirement_confirm_response'
  // v2: task planning
  | 'task_plan_start' | 'task_plan_complete'
  // v2: reserved (graph nodes not implemented)
  | 'thinker_start' | 'thinker_complete'
  | 'quality_check_start' | 'quality_check_complete'

type AgentType = 'router' | 'editor' | 'page' | 'flow' | 'general'
```

Each event type has a corresponding TypeScript interface (e.g. `TextDeltaEvent`, `SchemaCompleteEvent`). The union type `AgentStreamEvent` covers all (`SSEEvent` is a legacy alias).

See [events.md](./events.md).

### 2.2 `toolNames.ts` - Authoritative Tool-Name Definitions

**Naming convention**:

- MCP tools: `{domain}__{action}` (double underscore)
- LangGraph-specific: no prefix (e.g. `update_schema`)

**MCP Schema**

| Constant | Value |
|------|-----|
| `SCHEMA_SEARCH` | `schema__search` |
| `SCHEMA_GET_DETAIL` | `schema__get_detail` |
| `SCHEMA_VALIDATE` | `schema__validate` |
| `SCHEMA_VALIDATE_WIDGETS` | `schema__validate_widgets` |
| `SCHEMA_SEARCH_PUBLISHED` | `schema__search_published` |
| `SCHEMA_FUZZY_SEARCH` | `schema__fuzzy_search` |
| `SCHEMA_FIND_FLOW_REFERENCES` | `schema__find_flow_references` |

**MCP Flow**

| Constant | Value |
|------|-----|
| `FLOW_SEARCH` | `flow__search` |
| `FLOW_GET_DETAIL` | `flow__get_detail` |
| `FLOW_VALIDATE` | `flow__validate` |
| `FLOW_SEARCH_USERS` | `flow__search_users` |
| `FLOW_GET_NODE_SCHEMA` | `flow__get_node_schema` |

**MCP Widget / RAG / Industry**

| Constant | Value |
|------|-----|
| `WIDGET_QUERY` | `widget__query` |
| `WIDGET_VALIDATE` | `widget__validate` |
| `RAG_SEARCH` | `rag__search` |
| `INDUSTRY_SEARCH_TEMPLATES` | `industry__search_templates` |
| `INDUSTRY_VALIDATE_FORM` | `industry__validate_form` |

**LangGraph-specific**

| Constant | Value |
|------|-----|
| `UPDATE_SCHEMA` | `update_schema` |
| `GENERATE_SCHEMA` | `generate_schema` |
| `UPDATE_FLOW` | `update_flow` |
| `SAVE_AND_BIND_SCHEMA` | `save_and_bind_schema` |
| `BIND_SCHEMA_TO_FLOW_NODE` | `bind_schema_to_flow_node` |
| `REQUEST_COLLABORATION` | `request_collaboration` |
| `RAG_INDEX` | `rag_index` |

**Utility functions**:

```typescript
normalizeToolName(name: string): string    // legacy name -> MCP name
getToolDisplayLabel(name: string): string // UI display label
```

**Prompt fragments** (injected into the System Prompt):

- `EDITOR_MCP_TOOLS_PROMPT`
- `FLOW_MCP_TOOLS_PROMPT`
- `PAGE_MCP_TOOLS_PROMPT`
- `REQUIREMENT_ANALYZER_TOOLS_PROMPT`

**Tool names**: MCP spec names only; `normalizeToolName()` is an identity. Defined in `toolNames.ts`.

### 2.3 `promptBuilder.ts` - System Prompt Builder

Dynamically built from editor widget configs and flow node definitions, ensuring AI knowledge and the editor/flow engine share a single source of truth.

```typescript
buildEditorSystemPrompt(metadata: AIMetadata): string
buildFlowSystemPrompt(metadata: AIMetadata): string
buildPageSystemPrompt(metadata: AIMetadata): string
ROUTER_SYSTEM_PROMPT: string
```

`metadata` is extracted from widget/flow config by the server's `getMetadata()`.

### 2.4 `agentWorkflow.ts` - Workflow Domain Model

See [agent-workflow.md](./agent-workflow.md).

**Core types**:

```typescript
type AgentNodeType = 'manual-trigger' | 'webhook-trigger' | 'llm' | '...'
type AgentWorkflowStatus = 'draft' | 'published' | 'archived'
type AgentExecutionStatus = 'running' | 'success' | 'error' | 'waiting' | 'cancelled'

interface AgentWorkflowGraph {
  nodes: AgentWorkflowNode[]
  edges: AgentWorkflowEdge[]
  entryNodeId: string
  viewport?: { x, y, zoom }
}

interface AgentWorkflowExecution {
  id, workflowId, workflowName, version, status, trigger,
  nodeRecords: AgentNodeRecord[]
  conversationHistory?: AgentConversationTurn[]
  parentExecutionId?: string
}
```

**Factory functions**:

```typescript
createDefaultAgentWorkflowGraph(): AgentWorkflowGraph
createDocumentSummaryWorkflowGraph(): AgentWorkflowGraph
createDocImageRecognitionWorkflowGraph(): AgentWorkflowGraph
createIntelligentAssistantWorkflowGraph(): AgentWorkflowGraph
createAgentWorkflowGraphByTemplate(id: AgentWorkflowTemplateId): AgentWorkflowGraph
layoutAgentWorkflowGraph(graph): AgentWorkflowGraph
validateAgentWorkflowGraph(graph): AgentWorkflowValidationIssue[]
```

**Template metadata**: `AGENT_WORKFLOW_TEMPLATES`

### 2.5 `document.ts` - Document Pipeline Types

```typescript
interface DocumentRecord { id, filename, mimeType, size, status, ... }
interface DocumentPreview { text, chunks, extractionMethod, ... }
interface MessageDocumentAttachment { documentId, filename, mimeType }
interface StructuredSummary { title, sections, keyPoints, ... }
```

Used for Chat attachment upload and the workflow `document-parse` / `vision-analyze` nodes.

### 2.6 `types.ts` - AI Metadata Types

```typescript
interface WidgetAIMetadata { type, label, group, props, ... }
interface FlowNodeAIMetadata { type, label, category, ... }
interface AIMetadata { widgets: WidgetAIMetadata[], flowNodes: FlowNodeAIMetadata[] }
```

### 2.7 `runtimeAgent.ts` - Flow Runtime AI Client

Called by the flow engine in approval/assignment/anomaly-detection scenarios:

```typescript
class RuntimeAgent {
  recommendAssignee(ctx: ExecutionContext): Promise<AssigneeRecommendation>
  predictOutcome(ctx: ExecutionContext): Promise<OutcomePrediction>
  detectAnomaly(ctx: ExecutionContext): Promise<AnomalyDetection>
}
```

### 2.8 `systemKnowledge.ts` - Platform Knowledge Constants

Editor events, linkage, variables, API config and other domain knowledge injected into the Agent System Prompt:

- `EVENT_ACTION_TYPES` / `EVENT_ACTION_DESCRIPTIONS` / `EVENT_ACTION_FIELDS`
- `EVENT_TRIGGERS`
- `LINKAGE_TYPES` / `LINKAGE_DESCRIPTIONS`
- `VARIABLE_TYPES` / `VARIABLE_SCOPE_DESCRIPTIONS`
- `API_CONFIG_FIELDS`
- `OUTPUT_TAGS`

---

## 3. Build & Release

```bash
cd shared/platform-shared && pnpm build   # tsc -> dist/ (includes ai/ subpaths)
```

In-repo dev usually does not need a build (Vite alias connects to source directly). Cross-repo consumption requires semver publishing to GitHub Packages.

---

## 4. Dependencies

```json
{
  "dependencies": {
    "@schema-platform/flow-shared": "file:../../flow-shared"
  }
}
```

ai-shared pulls flow node metadata from flow-shared and **does not** reverse-depend on upper-layer packages.

---

## 5. Change Guide

| Change type | Files affected | Notes |
|----------|----------|----------|
| New event type | `events.ts` | sync the frontend event handler + events.md |
| New MCP tool | `toolNames.ts` | sync the server MCP server + registry |
| New workflow node | `agentWorkflow.ts` | sync the executor + frontend panel |
| New template | `agentWorkflow.ts` | register in `AGENT_WORKFLOW_TEMPLATES` |
| Prompt adjustment | `promptBuilder.ts` | affects Chat and all expert agent nodes |
