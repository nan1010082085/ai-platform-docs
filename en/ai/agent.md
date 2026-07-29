# Agent Details

> Chat LangGraph expert agent types, responsibilities, execution flow, and config

> **Note**: this doc describes the **Chat engine** (`server/src/ai/graph/graph.ts`). Experts uniformly execute via **`pluginExpert`** + the plugin Registry; for the workflow side see the `expert` / `agent-intent` nodes in [agent-workflow.md](./agent-workflow.md).

**Doc version**: v2 (2026-07-13) - aligned with baseline 1.0: unified pluginExpert, removed legacy Agent classes

---

## 1. Agent Architecture

### 1.1 Baseline 1.0: Unified Expert Path

**Removed**: the standalone `EditorAgent`, `FlowAgent`, `PageAgent`, `GeneralAgent` classes and their graph nodes (`editor`, `flow`, `page`, `general`).

**Current**: all experts are configured via the **plugin center Registry** and uniformly executed by the **`pluginExpert`** node in the graph.

```
User message
    │
    ▼
┌─────────────────────────────────────────────────┐
│              Router (router node)                │
├─────────────────────────────────────────────────┤
│ 1. Analyze user intent                          │
│ 2. Check context.source (user-selected mode)    │
│ 3. Write session.currentAgent (legacyAgentKey)  │
└─────────────────────────────────────────────────┘
    │
    ▼
requirementAnalyzer -> taskPlanner -> taskChain
    │
    ▼
┌─────────────────────────────────────────────────┐
│          pluginExpert (only expert exec node)   │
├─────────────────────────────────────────────────┤
│ 1. resolveExpertForSession -> Registry expert    │
│ 2. buildExpertSystemPrompt + getExpertTools      │
│ 3. LLM stream -> tool_calls loop                 │
└─────────────────────────────────────────────────┘
```

### 1.2 Routing Logic

Routing still dispatches by **`legacyAgentKey`** (`editor` / `flow` / `page` / `general`), but all converge on the same `pluginExpert` node:

- If `context.source === 'editor'`, set `session.currentAgent = 'editor'` directly
- If `context.source === 'flow'`, set `session.currentAgent = 'flow'` directly
- Otherwise, intelligently match the expert's `routing.keywords` / `routing.contextSources` in the Registry by user message content

### 1.3 Four Built-in Experts (plugin config)

| Expert ID | legacyAgentKey | Responsibility | Skills |
|-----------|---------------|------|--------|
| `platform.editor` | `editor` | Generate/edit form Schema | `platform.schema-quality`, `platform.reply-zh` |
| `platform.flow` | `flow` | Generate/edit BPMN flows | `platform.flow-design`, `platform.reply-zh` |
| `platform.page` | `page` | Generate page layout | `platform.page-layout`, `platform.reply-zh` |
| `platform.general` | `general` | General Q&A | `platform.reply-zh` |

Config path: `server/config/plugins/experts/*.json`

---

## 2. Graph Node Execution Flow

### 2.1 v2 Full Flow

```typescript
// server/src/ai/graph/graph.ts
const graph = new StateGraph(AgentStateAnnotation)
  .addNode('router', routerNode)
  .addNode('requirementAnalyzer', requirementAnalyzerNode)
  .addNode('requirementConfirm', requirementConfirmNode)
  .addNode('taskPlanner', taskPlannerNode)
  .addNode('taskChain', taskChainNode)
  .addNode('pluginExpert', pluginExpertAgentNode)  // only expert node
  .addNode('allTools', allToolNodeWithErrorHandling)
  .addNode('afterTools', afterToolsNode)
  .addNode('summarizer', summarizerNode)
  .compile({ checkpointer })
```

**Flow diagram**:

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

### 2.2 Conditional Edges

| Function | File | Behavior |
|------|------|------|
| `routeAfterRequirementAnalyzer` | `requirementAnalyzer.ts` | needs confirm -> `requirementConfirm`; else -> `taskPlanner` |
| `routeAfterTaskPlanner` | `taskPlanner.ts` | -> `taskChain` |
| `routeAfterTaskChain` | `graph.ts` | `summarize` -> `summarizer`; else -> `pluginExpert` |
| `afterAgent` | `graph.ts` | has `tool_calls` -> `allTools`; task chain incomplete -> `taskChain`; else `END` / `summarizer` |
| `afterToolsRoute` | `graph.ts` | collaboration / task chain -> `taskChain`; else -> `pluginExpert` |

### 2.3 Expert Execution (`pluginExpertAgent.ts`)

```typescript
// 1. resolveExpertForSession(state.session) -> Registry expert
// 2. buildExpertSystemPrompt(expert) + getExpertTools(expert)
// 3. buildExpertUserContent(state, expert)  // Schema/Flow/collaboration context
// 4. LLM stream -> if tool_calls -> allTools loop
```

Implementation: `graph/pluginExpertAgent.ts`, `graph/resolveGraphExpert.ts`, `graph/expertUserContext.ts`.

---

## 3. Agent Config

### 3.1 Expert Config (plugin JSON)

Expert config is managed by the plugin center; AgentConfig in code is no longer used:

```json
// server/config/plugins/experts/platform.editor.json
{
  "id": "platform.editor",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor",
  "tools": ["schema__search", "generate_schema", "update_schema", "save_and_bind_schema"],
  "skills": ["platform.schema-quality", "platform.reply-zh"],
  "routing": {
    "keywords": ["form", "schema"],
    "contextSources": ["editor", "standalone"]
  }
}
```

### 3.2 LLM Config

LLM config is managed uniformly via env vars and the model management module:

| Variable | Description |
|------|------|
| `AI_LLM_PROVIDER` | LLM provider (`deepseek` / `openai` / `custom`) |
| `AI_LLM_MODEL` | Model name |
| `AI_LLM_API_KEY` | API key |
| `AI_LLM_BASE_URL` | Custom base URL |

### 3.3 Runtime Parameters

| Parameter | Default | Description |
|------|------|------|
| `maxToolRounds` | 3 | Max tool iterations per agent round |
| `maxNodeExecutions` | 50 | Global anti-infinite-loop cap |

---

## 4. Agent Collaboration

### 4.1 Collaboration Mechanism

Inter-agent collaboration via the `request_collaboration` tool:

```typescript
// pluginExpert requests collaboration
const result = await toolRegistry.execute('request_collaboration', {
  targetAgent: 'flow',
  description: 'Need to create an approval flow',
  context: { schemaId: 'xxx' },
})
```

### 4.2 Collaboration Flow

```
pluginExpert (currentAgent=editor)
    │
    ├── user says "create an approval flow"
    │
    ▼
request_collaboration(targetAgent: 'flow')
    │
    ▼
afterTools extracts collaborationRequest
    │
    ▼
taskChain inserts a collaboration step (currentAgent=flow)
    │
    ▼
pluginExpert (currentAgent=flow) handles the task
    │
    ▼
returns result, continues the task chain
```

### 4.3 agent_switch Event

On agent switch, an `agent_switch` event is emitted:

```typescript
{
  type: 'agent_switch',
  agent: 'flow',
  collaboration: true,
  description: 'Need to create an approval flow'
}
```

The frontend updates the UI by this event, showing the actually-executing agent label.

---

## 5. Agent State

### 5.1 AgentStateAnnotation

```typescript
const AgentStateAnnotation = Annotation.Root({
  // message list
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // session info
  session: Annotation({
    id: string,
    conversationId: string,
    currentAgent: 'editor' | 'flow' | 'page' | 'general',  // legacyAgentKey
    currentExpertId: string,  // runtime authoritative expert id
  }),

  // context info
  context: Annotation({
    source: 'editor' | 'flow' | 'page' | 'standalone',
    schemaId?: string,
    flowId?: string,
    nodeId?: string,
    currentSchema?: Record<string, unknown>[],
    currentFlow?: { nodes, edges },
    turnCount: number,
  }),

  // task info
  task: Annotation({
    chain: Array<{ agent, description, status }>,
    currentStepIndex: number,
    type: string,
  }),

  // requirement analysis
  requirement: Annotation({
    analysis: RequirementAnalysis | null,
    needsConfirmation: boolean,
  }),
})
```

---

## 6. Key Behaviors

- **Explicit mode**: when `context.source === editor|flow|page`, skip keyword guessing and enter the corresponding expert directly
- **Multi-intent**: router detects "page + form/flow" combos and pre-builds a task chain
- **Tool loop**: at most 3 tool iterations per agent round; global `session.maxNodeExecutions` prevents infinite loops
- **Collaboration**: `request_collaboration` tool -> `afterTools` extracts -> `taskChain` inserts a collaboration step
- **Streaming**: WebSocket / Socket.IO; event types in [events.md](./events.md)

---

## 7. Best Practices

### 7.1 Expert Selection

- **Form-related**: router auto-routes to `platform.editor`
- **Flow-related**: router auto-routes to `platform.flow`
- **Page layout**: router auto-routes to `platform.page`
- **General Q&A**: router auto-routes to `platform.general`
- **Uncertain**: let the router match by keywords
- **Custom**: register a new Expert in the plugin center; no graph code change

### 7.2 System Prompt Design

- Clarify the agent's responsibilities and capability boundaries
- Provide clear tool usage instructions
- Inject necessary context (Widget metadata, Schema rules, etc.)
- Constrain output format (JSON, Markdown, etc.)
- Append instructions via Skills (e.g. `platform.schema-quality`)

### 7.3 Tool Calls

- Limit max tool-call rounds (default 3)
- Provide clear error info on tool failure
- Tool results should be concise, avoiding redundant info

---

## 8. Code Entry Points

| Path | Responsibility |
|------|------|
| `server/src/ai/graph/graph.ts` | graph compilation and conditional edges |
| `server/src/ai/graph/pluginExpertAgent.ts` | pluginExpert execution logic |
| `server/src/ai/graph/resolveGraphExpert.ts` | expert resolution (Registry lookup) |
| `server/src/ai/graph/expertUserContext.ts` | domain user context injection |
| `server/src/ai/graph/requirementAnalyzer.ts` | requirement analysis node |
| `server/src/ai/graph/taskPlanner.ts` | task planning node |
| `server/src/ai/graph/taskChain.ts` | task chain advancement node |
| `server/src/ai/plugins/dispatchExpert.ts` | `runRegisteredExpert` |
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Skill prompt assembly |
| `server/config/plugins/experts/` | expert config |
