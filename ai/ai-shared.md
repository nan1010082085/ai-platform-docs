# @schema-platform/ai-shared

> AI 跨端共享包：类型、事件、Prompt、工作流域模型、工具名权威定义

**包路径**：`shared/platform-shared/ai/`  
**NPM 名**：`@schema-platform/platform-shared/ai`  
**消费者**：`@ai-app`（前端）、`@server`（后端，通过仓库根 `ai-shared` symlink）

---

## 一、安装与引用

### 同仓开发（推荐）

```json
// ai/app/package.json
"@schema-platform/ai-shared": "file:../shared"
```

Vite 通过 `scripts/vite-shared-source.mjs` alias 到 sibling 源码，改 shared 后无需先 build dist。

### 子路径导出

```typescript
import { ... } from '@schema-platform/ai-shared'
import { buildEditorSystemPrompt } from '@schema-platform/ai-shared/promptBuilder'
import { SCHEMA_SEARCH, normalizeToolName } from '@schema-platform/ai-shared/toolNames'
import { validateAgentWorkflowGraph } from '@schema-platform/ai-shared/agentWorkflow'
import type { DocumentRecord } from '@schema-platform/ai-shared/document'
import { EVENT_ACTION_TYPES } from '@schema-platform/ai-shared/systemKnowledge'
```

| 子路径 | 模块 |
|--------|------|
| `.` | 全量 re-export |
| `./promptBuilder` | System Prompt 构建 |
| `./toolNames` | 工具名常量与别名 |
| `./agentWorkflow` | 工作流域类型与模板 |
| `./document` | 文档管道类型 |
| `./systemKnowledge` | 编辑器/流程引擎知识常量 |

---

## 二、模块清单

### 2.1 `events.ts` — 统一事件协议

定义 Agent → 前端的 WebSocket `chat:event` 流式协议事件类型。

```typescript
type AgentEventType =
  // v1: 文本流
  | 'text_delta' | 'thinking_delta'
  // v1: Schema / Flow 生成
  | 'schema_start' | 'schema_progress' | 'schema_complete' | 'schema_diff'
  | 'flow_start' | 'flow_progress' | 'flow_complete' | 'flow_diff'
  // v1: 工具
  | 'tool_call_start' | 'tool_call_end' | 'tool_error'
  // v1: 协作与任务链
  | 'agent_switch' | 'agent_collaboration'
  | 'chain_start' | 'chain_step' | 'chain_complete'
  // v1: HITL 与终态
  | 'interrupt' | 'resume' | 'done' | 'error'
  // v2: 需求分析
  | 'requirement_analysis_start' | 'requirement_analysis_complete'
  | 'requirement_confirm_request' | 'requirement_confirm_response'
  // v2: 任务规划
  | 'task_plan_start' | 'task_plan_complete'
  // v2: 预留（图节点未实现）
  | 'thinker_start' | 'thinker_complete'
  | 'quality_check_start' | 'quality_check_complete'

type AgentType = 'router' | 'editor' | 'page' | 'flow' | 'general'
```

每个事件类型有对应的 TypeScript interface（如 `TextDeltaEvent`、`SchemaCompleteEvent`）。联合类型 `AgentStreamEvent` 覆盖全部（`SSEEvent` 为历史别名）。

详见 [events.md](./events.md)。

### 2.2 `toolNames.ts` — 工具名权威定义

**命名规范**：

- MCP 工具：`{domain}__{action}`（双下划线）
- LangGraph 专有：无前缀（如 `update_schema`）

**MCP Schema**

| 常量 | 值 |
|------|-----|
| `SCHEMA_SEARCH` | `schema__search` |
| `SCHEMA_GET_DETAIL` | `schema__get_detail` |
| `SCHEMA_VALIDATE` | `schema__validate` |
| `SCHEMA_VALIDATE_WIDGETS` | `schema__validate_widgets` |
| `SCHEMA_SEARCH_PUBLISHED` | `schema__search_published` |
| `SCHEMA_FUZZY_SEARCH` | `schema__fuzzy_search` |
| `SCHEMA_FIND_FLOW_REFERENCES` | `schema__find_flow_references` |

**MCP Flow**

| 常量 | 值 |
|------|-----|
| `FLOW_SEARCH` | `flow__search` |
| `FLOW_GET_DETAIL` | `flow__get_detail` |
| `FLOW_VALIDATE` | `flow__validate` |
| `FLOW_SEARCH_USERS` | `flow__search_users` |
| `FLOW_GET_NODE_SCHEMA` | `flow__get_node_schema` |

**MCP Widget / RAG / Industry**

| 常量 | 值 |
|------|-----|
| `WIDGET_QUERY` | `widget__query` |
| `WIDGET_VALIDATE` | `widget__validate` |
| `RAG_SEARCH` | `rag__search` |
| `INDUSTRY_SEARCH_TEMPLATES` | `industry__search_templates` |
| `INDUSTRY_VALIDATE_FORM` | `industry__validate_form` |

**LangGraph 专有**

| 常量 | 值 |
|------|-----|
| `UPDATE_SCHEMA` | `update_schema` |
| `GENERATE_SCHEMA` | `generate_schema` |
| `UPDATE_FLOW` | `update_flow` |
| `SAVE_AND_BIND_SCHEMA` | `save_and_bind_schema` |
| `BIND_SCHEMA_TO_FLOW_NODE` | `bind_schema_to_flow_node` |
| `REQUEST_COLLABORATION` | `request_collaboration` |
| `RAG_INDEX` | `rag_index` |

**工具函数**：

```typescript
normalizeToolName(name: string): string    // 旧名 → MCP 名
getToolDisplayLabel(name: string): string // UI 显示标签
```

**Prompt 片段**（注入 System Prompt）：

- `EDITOR_MCP_TOOLS_PROMPT`
- `FLOW_MCP_TOOLS_PROMPT`
- `PAGE_MCP_TOOLS_PROMPT`
- `REQUIREMENT_ANALYZER_TOOLS_PROMPT`

**工具名**：仅 MCP 规范名；`normalizeToolName()` 为恒等。定义见 `toolNames.ts`。

### 2.3 `promptBuilder.ts` — System Prompt 构建

从 editor widget configs 和 flow node definitions 动态构建，保证 AI 知识与编辑器/流程引擎单一数据源。

```typescript
buildEditorSystemPrompt(metadata: AIMetadata): string
buildFlowSystemPrompt(metadata: AIMetadata): string
buildPageSystemPrompt(metadata: AIMetadata): string
ROUTER_SYSTEM_PROMPT: string
```

`metadata` 由服务端 `getMetadata()` 从 widget/flow 配置提取。

### 2.4 `agentWorkflow.ts` — 工作流域模型

详见 [agent-workflow.md](./agent-workflow.md)。

**核心类型**：

```typescript
type AgentNodeType = 'manual-trigger' | 'webhook-trigger' | 'llm' | ...
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

**工厂函数**：

```typescript
createDefaultAgentWorkflowGraph(): AgentWorkflowGraph
createDocumentSummaryWorkflowGraph(): AgentWorkflowGraph
createDocImageRecognitionWorkflowGraph(): AgentWorkflowGraph
createIntelligentAssistantWorkflowGraph(): AgentWorkflowGraph
createAgentWorkflowGraphByTemplate(id: AgentWorkflowTemplateId): AgentWorkflowGraph
layoutAgentWorkflowGraph(graph): AgentWorkflowGraph
validateAgentWorkflowGraph(graph): AgentWorkflowValidationIssue[]
```

**模板元数据**：`AGENT_WORKFLOW_TEMPLATES`

### 2.5 `document.ts` — 文档管道类型

```typescript
interface DocumentRecord { id, filename, mimeType, size, status, ... }
interface DocumentPreview { text, chunks, extractionMethod, ... }
interface MessageDocumentAttachment { documentId, filename, mimeType }
interface StructuredSummary { title, sections, keyPoints, ... }
```

用于 Chat 附件上传、工作流 `document-parse` / `vision-analyze` 节点。

### 2.6 `types.ts` — AI 元数据类型

```typescript
interface WidgetAIMetadata { type, label, group, props, ... }
interface FlowNodeAIMetadata { type, label, category, ... }
interface AIMetadata { widgets: WidgetAIMetadata[], flowNodes: FlowNodeAIMetadata[] }
```

### 2.7 `runtimeAgent.ts` — 流程运行时 AI 客户端

供 flow 引擎在审批/分配/异常检测场景调用：

```typescript
class RuntimeAgent {
  recommendAssignee(ctx: ExecutionContext): Promise<AssigneeRecommendation>
  predictOutcome(ctx: ExecutionContext): Promise<OutcomePrediction>
  detectAnomaly(ctx: ExecutionContext): Promise<AnomalyDetection>
}
```

### 2.8 `systemKnowledge.ts` — 平台知识常量

编辑器事件、联动、变量、API 配置等领域知识，注入 Agent System Prompt：

- `EVENT_ACTION_TYPES` / `EVENT_ACTION_DESCRIPTIONS` / `EVENT_ACTION_FIELDS`
- `EVENT_TRIGGERS`
- `LINKAGE_TYPES` / `LINKAGE_DESCRIPTIONS`
- `VARIABLE_TYPES` / `VARIABLE_SCOPE_DESCRIPTIONS`
- `API_CONFIG_FIELDS`
- `OUTPUT_TAGS`

---

## 三、构建与发布

```bash
cd shared/platform-shared && pnpm build   # tsc → dist/（含 ai/ 子路径）
```

同仓开发通常不需要 build（Vite alias 直连源码）。跨仓消费时才需 semver 发布到 GitHub Packages。

---

## 四、依赖

```json
{
  "dependencies": {
    "@schema-platform/flow-shared": "file:../../flow-shared"
  }
}
```

ai-shared 从 flow-shared 提取流程节点元数据，**不反向依赖**上层包。

---

## 五、变更指南

| 变更类型 | 涉及文件 | 注意事项 |
|----------|----------|----------|
| 新增事件类型 | `events.ts` | 同步更新前端事件处理器 + events.md |
| 新增 MCP 工具 | `toolNames.ts` | 同步 server MCP server + registry |
| 新增工作流节点 | `agentWorkflow.ts` | 同步 executor + 前端面板 |
| 新增模板 | `agentWorkflow.ts` | 注册到 `AGENT_WORKFLOW_TEMPLATES` |
| Prompt 调整 | `promptBuilder.ts` | 影响 Chat 和所有专家 Agent 节点 |
