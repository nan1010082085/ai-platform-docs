# Event Protocol

> Event types and data formats for AI streaming communication (over WebSocket / Socket.IO)

**Authoritative definition**: `shared/platform-shared/ai/events.ts`

## Version Notes

| Version | Events | Emit status |
|------|------|----------|
| v1 | text stream, Schema/Flow, tools, task chain, HITL, done/error | ✅ implemented |
| v2 requirement analysis | `requirement_analysis_*`, `requirement_confirm_*` | ✅ implemented |
| v2 task planning | `task_plan_*` | ✅ implemented |
| v2 thinking/reasoning | `thinker_*` | ✅ chat stream implemented (`chatStreamRunner` emits; frontend writes thinking) |
| v2 quality check | `quality_check_*` | ✅ chat stream implemented; workflow graph nodes land by node type |

> **Chat LangGraph**: `chat:event` (WebSocket).
> **Chat x Workflow**: REST starts execution + `workflow:event` (WebSocket push, see §2).

## 1. Chat LangGraph Event Overview

### 1.1 Event Flow (LangGraph)

```
Server                              Client
   │                                   │
   │──── chat:event ──────────────────►│  (WebSocket)
   │     { type, content, ... }        │
   │                                   │
   │◄─── chat:send ───────────────────│  (WebSocket)
   │     { message, context }          │
   │                                   │
   │◄─── chat:cancel ─────────────────│  (WebSocket)
   │                                   │
   │◄─── chat:resume ─────────────────│  (WebSocket)
   │     { threadId, confirmed }       │
```

## 2. Agent Workflow Execution Events (Chat)

When Chat picks a published workflow, startup still goes through REST; progress is pushed via WebSocket:

```
Client                              Server
   │                                   │
   │ POST /api/ai/workflows/:id/execute│
   │     { input, trigger: "chat" }    │
   │◄── executionId ───────────────────│
   │                                   │
   │── workflow:subscribe ────────────►│
   │     { executionId }               │
   │◄── workflow:event ────────────────│
   │     { executionId, execution }    │
   │     (nodeRecords, streamingOutput)│
   │                                   │
   │── workflow:unsubscribe ──────────►│
```

Terminal: subscription ends when `execution.status` is `success` | `error` | `waiting` | `cancelled`.

Terminology in [product/workflow-terminology.md](./product/workflow-terminology.md) (internal).

### 1.2 Event Types

```typescript
type AgentEventType =
  // text stream
  | 'text_delta'
  | 'thinking_delta'
  // Schema generation
  | 'schema_start'
  | 'schema_progress'
  | 'schema_complete'
  | 'schema_diff'
  // Flow generation
  | 'flow_start'
  | 'flow_progress'
  | 'flow_complete'
  | 'flow_diff'
  // tool calls
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_error'
  // agent collaboration
  | 'agent_switch'
  | 'agent_collaboration'
  // task chain
  | 'chain_start'
  | 'chain_step'
  | 'chain_complete'
  // human-in-the-loop
  | 'interrupt'
  | 'resume'
  // status
  | 'done'
  | 'error'
  // v2: requirement analysis
  | 'requirement_analysis_start'
  | 'requirement_analysis_complete'
  | 'requirement_confirm_request'
  | 'requirement_confirm_response'
  // v2: task planning
  | 'task_plan_start'
  | 'task_plan_complete'
  // v2: chat stream implemented (chatStreamRunner); workflow graph nodes land by node type
  | 'thinker_start'
  | 'thinker_complete'
  | 'quality_check_start'
  | 'quality_check_complete'
```

---

## 2. Text Stream Events

### 2.1 text_delta

**Direction**: Server -> Client

**Description**: LLM-generated text delta

**Data format**:
```typescript
interface TextDeltaEvent {
  type: 'text_delta'
  content: string  // text delta
  agent?: string   // source agent
}
```

**Example**:
```json
{
  "type": "text_delta",
  "content": "Hello!",
  "agent": "editor"
}
```

### 2.2 thinking_delta

**Direction**: Server -> Client

**Description**: LLM thinking-process delta

**Data format**:
```typescript
interface ThinkingDeltaEvent {
  type: 'thinking_delta'
  content: string  // thinking content delta
  agent?: string   // source agent
}
```

**Example**:
```json
{
  "type": "thinking_delta",
  "content": "The user wants to create a user registration form...",
  "agent": "editor"
}
```

---

## 3. Schema Generation Events

### 3.1 schema_start

**Direction**: Server -> Client

**Description**: Schema generation starts

**Data format**:
```typescript
interface SchemaStartEvent {
  type: 'schema_start'
  description?: string  // task description
}
```

### 3.2 schema_progress

**Direction**: Server -> Client

**Description**: Schema generation progress

**Data format**:
```typescript
interface SchemaProgressEvent {
  type: 'schema_progress'
  step: 'layout' | 'components' | 'validation' | 'styling'
  description?: string
  schema?: unknown[]  // current Schema state
}
```

**Example**:
```json
{
  "type": "schema_progress",
  "step": "components",
  "description": "Generating form components...",
  "schema": ["..."]
}
```

### 3.3 schema_complete

**Direction**: Server -> Client

**Description**: Schema generation complete

**Data format**:
```typescript
interface SchemaCompleteEvent {
  type: 'schema_complete'
  schema: unknown[]      // full Schema
  description?: string   // task description
}
```

**Example**:
```json
{
  "type": "schema_complete",
  "schema": [
    {
      "id": "widget-1",
      "type": "input",
      "label": "Username",
      "field": "username",
      "required": true
    }
  ],
  "description": "User registration form generated"
}
```

### 3.4 schema_diff

**Direction**: Server -> Client

**Description**: Schema update diff

**Data format**:
```typescript
interface SchemaDiffEvent {
  type: 'schema_diff'
  diff: {
    added: unknown[]
    removed: unknown[]
    modified: unknown[]
  }
  description?: string
}
```

---

## 4. Flow Generation Events

### 4.1 flow_start

**Direction**: Server -> Client

**Description**: Flow generation starts

**Data format**:
```typescript
interface FlowStartEvent {
  type: 'flow_start'
  description?: string
}
```

### 4.2 flow_progress

**Direction**: Server -> Client

**Description**: Flow generation progress

**Data format**:
```typescript
interface FlowProgressEvent {
  type: 'flow_progress'
  step: string           // current step
  description?: string
  flow?: unknown         // current flow state
}
```

### 4.3 flow_complete

**Direction**: Server -> Client

**Description**: Flow generation complete

**Data format**:
```typescript
interface FlowCompleteEvent {
  type: 'flow_complete'
  flow: {
    nodes: unknown[]
    edges: unknown[]
  }
  description?: string
}
```

**Example**:
```json
{
  "type": "flow_complete",
  "flow": {
    "nodes": [
      { "id": "start", "type": "startEvent", "data": { "label": "Start" } },
      { "id": "task1", "type": "userTask", "data": { "label": "Approval" } },
      { "id": "end", "type": "endEvent", "data": { "label": "End" } }
    ],
    "edges": [
      { "source": "start", "target": "task1" },
      { "source": "task1", "target": "end" }
    ]
  },
  "description": "Approval flow generated"
}
```

### 4.4 flow_diff

**Direction**: Server -> Client

**Description**: Flow update diff

**Data format**:
```typescript
interface FlowDiffEvent {
  type: 'flow_diff'
  diff: {
    added: { nodes: unknown[], edges: unknown[] }
    removed: { nodes: unknown[], edges: unknown[] }
    modified: { nodes: unknown[], edges: unknown[] }
  }
  description?: string
}
```

---

## 5. Tool Call Events

### 5.1 tool_call_start

**Direction**: Server -> Client

**Description**: Tool call starts

**Data format**:
```typescript
interface ToolCallStartEvent {
  type: 'tool_call_start'
  tools: Array<{
    id?: string           // call id
    name: string          // tool name
    arguments?: Record<string, unknown>  // arguments
  }>
}
```

**Example**:
```json
{
  "type": "tool_call_start",
  "tools": [
    {
      "id": "call-1",
      "name": "search_schemas",
      "arguments": { "keyword": "user", "limit": 10 }
    }
  ]
}
```

### 5.2 tool_call_end

**Direction**: Server -> Client

**Description**: Tool call complete

**Data format**:
```typescript
interface ToolCallEndEvent {
  type: 'tool_call_end'
  tools: Array<{
    id?: string           // call id
    name: string          // tool name
    result?: unknown      // execution result
  }>
}
```

**Example**:
```json
{
  "type": "tool_call_end",
  "tools": [
    {
      "id": "call-1",
      "name": "search_schemas",
      "result": {
        "success": true,
        "schemas": ["..."]
      }
    }
  ]
}
```

### 5.3 tool_error

**Direction**: Server -> Client

**Description**: Tool execution error

**Data format**:
```typescript
interface ToolErrorEvent {
  type: 'tool_error'
  toolName?: string       // tool name
  runId?: string          // call id
  content?: string        // error info
}
```

**Example**:
```json
{
  "type": "tool_error",
  "toolName": "search_schemas",
  "runId": "call-1",
  "content": "Database connection failed"
}
```

---

## 6. Agent Collaboration Events

### 6.1 agent_switch

**Direction**: Server -> Client

**Description**: Agent switch

**Data format**:
```typescript
interface AgentSwitchEvent {
  type: 'agent_switch'
  agent: string           // target agent
  collaboration?: boolean // whether collaboration
  description?: string    // collaboration description
}
```

**Example**:
```json
{
  "type": "agent_switch",
  "agent": "flow",
  "collaboration": true,
  "description": "Need to create an approval flow"
}
```

### 6.2 agent_collaboration

**Direction**: Server -> Client

**Description**: Agent collaboration details

**Data format**:
```typescript
interface AgentCollaborationEvent {
  type: 'agent_collaboration'
  fromAgent: string       // initiating agent
  toAgent: string         // target agent
  description: string     // collaboration description
}
```

---

## 7. Task Chain Events

### 7.1 chain_start

**Direction**: Server -> Client

**Description**: Task chain starts

**Data format**:
```typescript
interface ChainStartEvent {
  type: 'chain_start'
  steps: Array<{
    agent: string
    description: string
    status: 'pending' | 'running' | 'done' | 'error'
  }>
}
```

### 7.2 chain_step

**Direction**: Server -> Client

**Description**: Task chain step update

**Data format**:
```typescript
interface ChainStepEvent {
  type: 'chain_step'
  steps: Array<{
    agent: string
    description: string
    status: 'pending' | 'running' | 'done' | 'error'
  }>
  currentIndex: number
}
```

**Example**:
```json
{
  "type": "chain_step",
  "steps": [
    { "agent": "router", "description": "Analyze user intent", "status": "done" },
    { "agent": "editor", "description": "Generate form Schema", "status": "running" },
    { "agent": "flow", "description": "Create approval flow", "status": "pending" }
  ],
  "currentIndex": 1
}
```

### 7.3 chain_complete

**Direction**: Server -> Client

**Description**: Task chain complete

**Data format**:
```typescript
interface ChainCompleteEvent {
  type: 'chain_complete'
}
```

---

## 8. Human-in-the-loop Events

### 8.1 interrupt

**Direction**: Server -> Client

**Description**: Human confirmation needed

**Data format**:
```typescript
interface InterruptEvent {
  type: 'interrupt'
  threadId: string        // session id
  interruptType: string   // interrupt type
  message: string         // prompt message
  data?: unknown          // extra data
}
```

**Example**:
```json
{
  "type": "interrupt",
  "threadId": "ws-xxx-1234567890",
  "interruptType": "confirm_schema_update",
  "message": "About to update the Schema, confirm?",
  "data": {
    "schemaId": "xxx",
    "changes": { "added": 2, "removed": 1, "modified": 3 }
  }
}
```

### 8.2 resume

**Direction**: Client -> Server

**Description**: Resume an interrupted session

**Data format**:
```typescript
interface ResumePayload {
  threadId: string        // session id
  confirmed: boolean      // whether confirmed
}
```

**Example**:
```json
{
  "threadId": "ws-xxx-1234567890",
  "confirmed": true
}
```

---

## 9. Thinking & Quality-check Events

> v2 events, chat stream implemented (`chatStreamRunner` emits); workflow graph nodes land by corresponding node types.

### 9.1 thinker_start

**Direction**: Server -> Client

**Description**: the router node starts thinking/reasoning; the frontend can enter a "thinking" state.

**Data format**:
```typescript
interface ThinkerStartEvent {
  type: 'thinker_start'
}
```

**Trigger timing**: emitted when LangGraph `onChainEnd` hits the `router` node (`chatStreamRunner.ts`).

### 9.2 thinker_complete

**Direction**: Server -> Client

**Description**: the router node finishes reasoning, giving the routing result and whether to enter the task chain.

**Data format**:
```typescript
interface ThinkerCompleteEvent {
  type: 'thinker_complete'
  agent?: string       // routed target agent
  hasTaskChain: boolean // whether to enter task-chain execution
}
```

**Example**:
```json
{
  "type": "thinker_complete",
  "agent": "editor",
  "hasTaskChain": true
}
```

### 9.3 quality_check_start

**Direction**: Server -> Client

**Description**: after Schema generation completes and before formally sending `schema_complete`, quality check starts.

**Data format**:
```typescript
interface QualityCheckStartEvent {
  type: 'quality_check_start'
}
```

**Trigger timing**: in `sendSchemaComplete`, emitted when the quality check starts.

### 9.4 quality_check_complete

**Direction**: Server -> Client

**Description**: quality check complete, returns whether passed and the issue list. When `passed=true`, `issues` is empty.

**Data format**:
```typescript
interface QualityCheckCompleteEvent {
  type: 'quality_check_complete'
  passed: boolean      // whether passed (no issues = pass)
  issues: string[]     // issue list (e.g. "component missing label")
}
```

**Example**:
```json
{
  "type": "quality_check_complete",
  "passed": false,
  "issues": ["Component missing label"]
}
```

---

## 10. Status Events

### 10.1 done

**Direction**: Server -> Client

**Description**: streaming response complete

**Data format**:
```typescript
interface DoneEvent {
  type: 'done'
  conversationId?: string  // session id
}
```

**Example**:
```json
{
  "type": "done",
  "conversationId": "conv-xxx"
}
```

### 10.2 error

**Direction**: Server -> Client

**Description**: an error occurred

**Data format**:
```typescript
interface ErrorEvent {
  type: 'error'
  content?: string        // error info
  agent?: string          // agent where the error occurred
}
```

**Example**:
```json
{
  "type": "error",
  "content": "LLM API rate limit exceeded",
  "agent": "editor"
}
```

---

## 11. Client Request Events

### 11.1 chat:send

**Direction**: Client -> Server

**Description**: send a chat message

**Data format**:
```typescript
interface ChatSendPayload {
  conversationId?: string  // session id (optional; omit for a new session)
  message: string          // user message
  context: {
    source: 'editor' | 'flow' | 'page' | 'standalone'
    schemaId?: string
    flowId?: string
    nodeId?: string
    version?: string
    preferences?: Record<string, unknown>
    historySummary?: string
    currentSchema?: Record<string, unknown>[]
    currentFlow?: { nodes, edges }
    selectedWidget?: { id, type, field, label }
    editorMode?: 'edit' | 'preview'
  }
  mentions?: Array<{ id, type, name, label }>
}
```

### 11.2 chat:cancel

**Direction**: Client -> Server

**Description**: cancel the current streaming response

**Data format**:
```typescript
interface ChatCancelPayload {
  threadId?: string  // optional, specify the session to cancel
}
```

### 11.3 chat:resume

**Direction**: Client -> Server

**Description**: resume an interrupted session

**Data format**:
```typescript
interface ChatResumePayload {
  threadId: string   // session id
  confirmed: boolean // whether confirmed
}
```

---

## 12. Event Handling

### 12.1 Server-side Send

```typescript
// chatStreamHandler.ts
function sendEvent(event: Record<string, unknown>) {
  if (signal.aborted) return
  socket.emit('chat:event', { threadId, ...event })
}

// send a text delta
sendEvent({ type: 'text_delta', content: 'Hello!' })

// send a tool call
sendEvent({
  type: 'tool_call_start',
  tools: [{ id: 'call-1', name: 'search_schemas', arguments: { keyword: 'user' } }]
})
```

### 12.2 Client-side Receive

```typescript
// stream.ts
unsubscribeChatEvent = onChatEvent((chatEvent) => {
  const event = chatEvent as StreamEvent

  if (event.type === 'done') {
    doneResolve?.()
  }

  handlers.onStreamEvent(event, assistantIndex)
})

// ai.ts
function handleStreamEvent(event: StreamEvent, assistantIndex: number) {
  switch (event.type) {
    case 'text_delta':
      updateMessage({ content: msg.content + event.content })
      break
    case 'thinking_delta':
      updateMessage({ thinking: msg.thinking + event.content })
      break
    case 'tool_call_start':
      // add tool call to the message
      break
    case 'schema_complete':
      // update the Schema
      break
    // ...
  }
}
```

---

## 13. Event Type Definitions

### 13.1 Shared Types

`packages/shared/platform-shared/ai/events.ts` defines all event types:

```typescript
export type StreamEvent =
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | SchemaStartEvent
  | SchemaProgressEvent
  | SchemaCompleteEvent
  | SchemaDiffEvent
  | FlowStartEvent
  | FlowProgressEvent
  | FlowCompleteEvent
  | FlowDiffEvent
  | ToolCallStartEvent
  | ToolCallEndEvent
  | ToolErrorEvent
  | AgentSwitchEvent
  | AgentCollaborationEvent
  | ChainStartEvent
  | ChainStepEvent
  | ChainCompleteEvent
  | InterruptEvent
  | ResumeEvent
  | DoneEvent
  | ErrorEvent

/** @deprecated use StreamEvent instead */
export type SSEEvent = StreamEvent
```

### 13.2 Usage

```typescript
import type { StreamEvent } from '@schema-platform/ai-shared'

// type-safe event handling
function handleEvent(event: StreamEvent) {
  switch (event.type) {
    case 'text_delta':
      // event.content is typed as string
      break
    case 'schema_complete':
      // event.schema is typed as unknown[]
      break
  }
}
```
