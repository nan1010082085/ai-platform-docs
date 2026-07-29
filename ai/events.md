# 事件协议

> AI 流式通信的事件类型和数据格式（基于 WebSocket / Socket.IO）

**权威定义**：`shared/platform-shared/ai/events.ts`

## 版本说明

| 版本 | 事件 | 发射状态 |
|------|------|----------|
| v1 | 文本流、Schema/Flow、工具、任务链、HITL、done/error | ✅ 已实现 |
| v2 需求分析 | `requirement_analysis_*`、`requirement_confirm_*` | ✅ 已实现 |
| v2 任务规划 | `task_plan_*` | ✅ 已实现 |
| v2 思考推理 | `thinker_*` | ✅ 对话流已实现（`chatStreamRunner` 发射，前端写入 thinking） |
| v2 质量检查 | `quality_check_*` | ✅ 对话流已实现；工作流图节点仍见 [reserved-events-decision.md](./product/reserved-events-decision.md) |

> **Chat LangGraph**：`chat:event`（WebSocket）。  
> **Chat × Workflow**：REST 启动执行 + `workflow:event`（WebSocket 推送，见 §二）。

## 一、Chat LangGraph 事件概述

### 1.1 事件流向（LangGraph）

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

## 二、Agent Workflow 执行事件（Chat）

Chat 选择已发布工作流时，启动仍走 REST，进度通过 WebSocket 推送：

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

终态：`execution.status` 为 `success` | `error` | `waiting` | `cancelled` 时结束订阅。

术语见 [product/workflow-terminology.md](./product/workflow-terminology.md)。

### 1.2 事件类型

```typescript
type AgentEventType =
  // 文本流
  | 'text_delta'
  | 'thinking_delta'
  // Schema 生成
  | 'schema_start'
  | 'schema_progress'
  | 'schema_complete'
  | 'schema_diff'
  // Flow 生成
  | 'flow_start'
  | 'flow_progress'
  | 'flow_complete'
  | 'flow_diff'
  // 工具调用
  | 'tool_call_start'
  | 'tool_call_end'
  | 'tool_error'
  // Agent 协作
  | 'agent_switch'
  | 'agent_collaboration'
  // 任务链
  | 'chain_start'
  | 'chain_step'
  | 'chain_complete'
  // 人工介入
  | 'interrupt'
  | 'resume'
  // 状态
  | 'done'
  | 'error'
  // v2: 需求分析
  | 'requirement_analysis_start'
  | 'requirement_analysis_complete'
  | 'requirement_confirm_request'
  | 'requirement_confirm_response'
  // v2: 任务规划
  | 'task_plan_start'
  | 'task_plan_complete'
  // v2: 对话流已实现（chatStreamRunner）；工作流图节点另见 reserved-events-decision
  | 'thinker_start'
  | 'thinker_complete'
  | 'quality_check_start'
  | 'quality_check_complete'
```

---

## 二、文本流事件

### 2.1 text_delta

**方向**：Server → Client

**说明**：LLM 生成的文本增量

**数据格式**：
```typescript
interface TextDeltaEvent {
  type: 'text_delta'
  content: string  // 文本增量
  agent?: string   // 来源 Agent
}
```

**示例**：
```json
{
  "type": "text_delta",
  "content": "您好！",
  "agent": "editor"
}
```

### 2.2 thinking_delta

**方向**：Server → Client

**说明**：LLM 的思考过程增量

**数据格式**：
```typescript
interface ThinkingDeltaEvent {
  type: 'thinking_delta'
  content: string  // 思考内容增量
  agent?: string   // 来源 Agent
}
```

**示例**：
```json
{
  "type": "thinking_delta",
  "content": "用户想要创建一个用户注册表单...",
  "agent": "editor"
}
```

---

## 三、Schema 生成事件

### 3.1 schema_start

**方向**：Server → Client

**说明**：Schema 生成开始

**数据格式**：
```typescript
interface SchemaStartEvent {
  type: 'schema_start'
  description?: string  // 任务描述
}
```

### 3.2 schema_progress

**方向**：Server → Client

**说明**：Schema 生成进度

**数据格式**：
```typescript
interface SchemaProgressEvent {
  type: 'schema_progress'
  step: 'layout' | 'components' | 'validation' | 'styling'
  description?: string
  schema?: unknown[]  // 当前 Schema 状态
}
```

**示例**：
```json
{
  "type": "schema_progress",
  "step": "components",
  "description": "正在生成表单组件...",
  "schema": [...]
}
```

### 3.3 schema_complete

**方向**：Server → Client

**说明**：Schema 生成完成

**数据格式**：
```typescript
interface SchemaCompleteEvent {
  type: 'schema_complete'
  schema: unknown[]      // 完整 Schema
  description?: string   // 任务描述
}
```

**示例**：
```json
{
  "type": "schema_complete",
  "schema": [
    {
      "id": "widget-1",
      "type": "input",
      "label": "用户名",
      "field": "username",
      "required": true
    }
  ],
  "description": "用户注册表单已生成"
}
```

### 3.4 schema_diff

**方向**：Server → Client

**说明**：Schema 更新差异

**数据格式**：
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

## 四、Flow 生成事件

### 4.1 flow_start

**方向**：Server → Client

**说明**：流程生成开始

**数据格式**：
```typescript
interface FlowStartEvent {
  type: 'flow_start'
  description?: string
}
```

### 4.2 flow_progress

**方向**：Server → Client

**说明**：流程生成进度

**数据格式**：
```typescript
interface FlowProgressEvent {
  type: 'flow_progress'
  step: string           // 当前步骤
  description?: string
  flow?: unknown         // 当前流程状态
}
```

### 4.3 flow_complete

**方向**：Server → Client

**说明**：流程生成完成

**数据格式**：
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

**示例**：
```json
{
  "type": "flow_complete",
  "flow": {
    "nodes": [
      { "id": "start", "type": "startEvent", "data": { "label": "开始" } },
      { "id": "task1", "type": "userTask", "data": { "label": "审批" } },
      { "id": "end", "type": "endEvent", "data": { "label": "结束" } }
    ],
    "edges": [
      { "source": "start", "target": "task1" },
      { "source": "task1", "target": "end" }
    ]
  },
  "description": "审批流程已生成"
}
```

### 4.4 flow_diff

**方向**：Server → Client

**说明**：流程更新差异

**数据格式**：
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

## 五、工具调用事件

### 5.1 tool_call_start

**方向**：Server → Client

**说明**：工具调用开始

**数据格式**：
```typescript
interface ToolCallStartEvent {
  type: 'tool_call_start'
  tools: Array<{
    id?: string           // 调用 ID
    name: string          // 工具名
    arguments?: Record<string, unknown>  // 参数
  }>
}
```

**示例**：
```json
{
  "type": "tool_call_start",
  "tools": [
    {
      "id": "call-1",
      "name": "search_schemas",
      "arguments": { "keyword": "用户", "limit": 10 }
    }
  ]
}
```

### 5.2 tool_call_end

**方向**：Server → Client

**说明**：工具调用完成

**数据格式**：
```typescript
interface ToolCallEndEvent {
  type: 'tool_call_end'
  tools: Array<{
    id?: string           // 调用 ID
    name: string          // 工具名
    result?: unknown      // 执行结果
  }>
}
```

**示例**：
```json
{
  "type": "tool_call_end",
  "tools": [
    {
      "id": "call-1",
      "name": "search_schemas",
      "result": {
        "success": true,
        "schemas": [...]
      }
    }
  ]
}
```

### 5.3 tool_error

**方向**：Server → Client

**说明**：工具执行错误

**数据格式**：
```typescript
interface ToolErrorEvent {
  type: 'tool_error'
  toolName?: string       // 工具名
  runId?: string          // 调用 ID
  content?: string        // 错误信息
}
```

**示例**：
```json
{
  "type": "tool_error",
  "toolName": "search_schemas",
  "runId": "call-1",
  "content": "Database connection failed"
}
```

---

## 六、Agent 协作事件

### 6.1 agent_switch

**方向**：Server → Client

**说明**：Agent 切换

**数据格式**：
```typescript
interface AgentSwitchEvent {
  type: 'agent_switch'
  agent: string           // 目标 Agent
  collaboration?: boolean // 是否协作
  description?: string    // 协作描述
}
```

**示例**：
```json
{
  "type": "agent_switch",
  "agent": "flow",
  "collaboration": true,
  "description": "需要创建一个审批流程"
}
```

### 6.2 agent_collaboration

**方向**：Server → Client

**说明**：Agent 协作详情

**数据格式**：
```typescript
interface AgentCollaborationEvent {
  type: 'agent_collaboration'
  fromAgent: string       // 发起协作的 Agent
  toAgent: string         // 目标 Agent
  description: string     // 协作描述
}
```

---

## 七、任务链事件

### 7.1 chain_start

**方向**：Server → Client

**说明**：任务链开始

**数据格式**：
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

**方向**：Server → Client

**说明**：任务链步骤更新

**数据格式**：
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

**示例**：
```json
{
  "type": "chain_step",
  "steps": [
    { "agent": "router", "description": "分析用户意图", "status": "done" },
    { "agent": "editor", "description": "生成表单 Schema", "status": "running" },
    { "agent": "flow", "description": "创建审批流程", "status": "pending" }
  ],
  "currentIndex": 1
}
```

### 7.3 chain_complete

**方向**：Server → Client

**说明**：任务链完成

**数据格式**：
```typescript
interface ChainCompleteEvent {
  type: 'chain_complete'
}
```

---

## 八、人工介入事件

### 8.1 interrupt

**方向**：Server → Client

**说明**：需要人工确认

**数据格式**：
```typescript
interface InterruptEvent {
  type: 'interrupt'
  threadId: string        // 会话 ID
  interruptType: string   // 中断类型
  message: string         // 提示信息
  data?: unknown          // 附加数据
}
```

**示例**：
```json
{
  "type": "interrupt",
  "threadId": "ws-xxx-1234567890",
  "interruptType": "confirm_schema_update",
  "message": "即将更新 Schema，是否确认？",
  "data": {
    "schemaId": "xxx",
    "changes": { "added": 2, "removed": 1, "modified": 3 }
  }
}
```

### 8.2 resume

**方向**：Client → Server

**说明**：恢复中断的会话

**数据格式**：
```typescript
interface ResumePayload {
  threadId: string        // 会话 ID
  confirmed: boolean      // 是否确认
}
```

**示例**：
```json
{
  "threadId": "ws-xxx-1234567890",
  "confirmed": true
}
```

---

## 九、思考与质检事件

> v2 事件，对话流已实现（`chatStreamRunner` 发射）；工作流图节点中的保留事件另见 [reserved-events-decision.md](./product/reserved-events-decision.md)。

### 9.1 thinker_start

**方向**：Server -> Client

**说明**：路由节点（router）开始思考推理，前端可进入"思考中"状态。

**数据格式**：
```typescript
interface ThinkerStartEvent {
  type: 'thinker_start'
}
```

**触发时机**：LangGraph `onChainEnd` 命中 `router` 节点时发射（`chatStreamRunner.ts`）。

### 9.2 thinker_complete

**方向**：Server -> Client

**说明**：路由节点完成推理，给出路由结果与是否进入任务链。

**数据格式**：
```typescript
interface ThinkerCompleteEvent {
  type: 'thinker_complete'
  agent?: string       // 路由到的目标 agent
  hasTaskChain: boolean // 是否进入任务链执行
}
```

**示例**：
```json
{
  "type": "thinker_complete",
  "agent": "editor",
  "hasTaskChain": true
}
```

### 9.3 quality_check_start

**方向**：Server -> Client

**说明**：Schema 生成完成后、正式下发 `schema_complete` 前，开始质量检查。

**数据格式**：
```typescript
interface QualityCheckStartEvent {
  type: 'quality_check_start'
}
```

**触发时机**：`sendSchemaComplete` 中，质量检查开始时发射。

### 9.4 quality_check_complete

**方向**：Server -> Client

**说明**：质量检查完成，返回是否通过与问题清单。`passed=true` 时 `issues` 为空。

**数据格式**：
```typescript
interface QualityCheckCompleteEvent {
  type: 'quality_check_complete'
  passed: boolean      // 是否通过（无问题即通过）
  issues: string[]     // 问题清单（如"组件缺少 label"）
}
```

**示例**：
```json
{
  "type": "quality_check_complete",
  "passed": false,
  "issues": ["组件缺少 label"]
}
```

---

## 十、状态事件

### 10.1 done

**方向**：Server → Client

**说明**：流式响应完成

**数据格式**：
```typescript
interface DoneEvent {
  type: 'done'
  conversationId?: string  // 会话 ID
}
```

**示例**：
```json
{
  "type": "done",
  "conversationId": "conv-xxx"
}
```

### 10.2 error

**方向**：Server → Client

**说明**：发生错误

**数据格式**：
```typescript
interface ErrorEvent {
  type: 'error'
  content?: string        // 错误信息
  agent?: string          // 发生错误的 Agent
}
```

**示例**：
```json
{
  "type": "error",
  "content": "LLM API rate limit exceeded",
  "agent": "editor"
}
```

---

## 十一、客户端请求事件

### 11.1 chat:send

**方向**：Client → Server

**说明**：发送聊天消息

**数据格式**：
```typescript
interface ChatSendPayload {
  conversationId?: string  // 会话 ID（可选，新建会话时不传）
  message: string          // 用户消息
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

**方向**：Client → Server

**说明**：取消当前流式响应

**数据格式**：
```typescript
interface ChatCancelPayload {
  threadId?: string  // 可选，指定取消的会话
}
```

### 11.3 chat:resume

**方向**：Client → Server

**说明**：恢复中断的会话

**数据格式**：
```typescript
interface ChatResumePayload {
  threadId: string   // 会话 ID
  confirmed: boolean // 是否确认
}
```

---

## 十二、事件处理

### 12.1 服务端发送

```typescript
// chatStreamHandler.ts
function sendEvent(event: Record<string, unknown>) {
  if (signal.aborted) return
  socket.emit('chat:event', { threadId, ...event })
}

// 发送文本增量
sendEvent({ type: 'text_delta', content: '您好！' })

// 发送工具调用
sendEvent({
  type: 'tool_call_start',
  tools: [{ id: 'call-1', name: 'search_schemas', arguments: { keyword: '用户' } }]
})
```

### 12.2 客户端接收

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
      // 添加工具调用到消息
      break
    case 'schema_complete':
      // 更新 Schema
      break
    // ...
  }
}
```

---

## 十三、事件类型定义

### 13.1 共享类型

`packages/shared/platform-shared/ai/events.ts` 定义了所有事件类型：

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

/** @deprecated 使用 StreamEvent 替代 */
export type SSEEvent = StreamEvent
```

### 13.2 使用方式

```typescript
import type { StreamEvent } from '@schema-platform/ai-shared'

// 类型安全的事件处理
function handleEvent(event: StreamEvent) {
  switch (event.type) {
    case 'text_delta':
      // event.content 类型为 string
      break
    case 'schema_complete':
      // event.schema 类型为 unknown[]
      break
  }
}
```
