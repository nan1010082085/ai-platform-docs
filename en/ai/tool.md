# Tool Details

> AI tool definition, registration, execution, and extension

**Authoritative tool names**: `shared/platform-shared/ai/toolNames.ts`

## Naming Convention

| Category | Format | Example |
|------|------|------|
| MCP tools | `{domain}__{action}` | `schema__search`, `flow__validate` |
| LangGraph-specific | no prefix | `update_schema`, `generate_schema` |
| Workflow built-in | no prefix | `http_request` (Workflow Executor only) |

Tool names use the MCP spec: `{domain}__{action}` (e.g. `schema__search`). Authoritative definition in `shared/platform-shared/ai/toolNames.ts`.

## 1. Tool Overview

### 1.1 What Is a Tool

A tool is a function an Agent can call to perform a specific task:

```
Agent (LLM)
    │
    ├── analyze user intent
    │
    ├── decide to call a tool
    │
    ▼
┌─────────────────────────────────────────────────┐
│                    Tool Layer                    │
├─────────────────────────────────────────────────┤
│  schema__search    │  schema__get_detail        │
│  schema__validate  │  update_schema             │
│  flow__search      │  flow__get_detail          │
│  flow__validate    │  update_flow               │
│  rag__search       │  rag_index                 │
│  ...               │  ...                       │
└─────────────────────────────────────────────────┘
    │
    ▼
return result to the Agent
```

### 1.2 Tool Categories

| Category | Tool | Function |
|------|------|------|
| **Schema (MCP)** | `schema__search` | search form Schema list |
| | `schema__get_detail` | get full Schema info |
| | `schema__validate_widgets` | validate Schema structure |
| | `schema__search_published` | search published versions |
| | `schema__fuzzy_search` | fuzzy search |
| | `schema__find_flow_references` | find flow references |
| **Schema (LangGraph)** | `update_schema` | update Schema |
| | `generate_schema` | generate Schema |
| **Flow (MCP)** | `flow__search` | search flow list |
| | `flow__get_detail` | get flow detail |
| | `flow__validate` | validate flow structure |
| | `flow__search_users` | search users |
| | `flow__get_node_schema` | get node Schema |
| **Flow (LangGraph)** | `update_flow` | update flow |
| | `save_and_bind_schema` | save and bind Schema |
| | `bind_schema_to_flow_node` | bind to a flow node |
| **Widget (MCP)** | `widget__query` | query widget catalog |
| | `widget__validate` | validate widget |
| **RAG** | `rag__search` | knowledge base retrieval (MCP) |
| | `rag_index` | RAG index (LangGraph) |
| **Industry (MCP)** | `industry__search_templates` | industry template search |
| | `industry__validate_form` | industry form validation |
| **Collaboration (LangGraph)** | `request_collaboration` | request another Agent to collaborate |
| **Workflow built-in** | `http_request` | HTTP request (Workflow Executor only) |

---

## 2. Tool Definition

### 2.1 ToolDefinition

```typescript
interface ToolDefinition {
  // tool name (unique identifier)
  name: string

  // tool description (LLM uses this to understand the tool's purpose)
  description: string

  // parameter definition (JSON Schema format)
  parameters: ToolParameterDefinition

  // execution function
  execute: (params: Record<string, unknown>, context: ToolExecutionContext) => Promise<unknown>
}
```

### 2.2 ToolParameterDefinition

```typescript
interface ToolParameterDefinition {
  type: 'object'
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    description: string
    enum?: string[]
    default?: unknown
  }>
  required?: string[]
}
```

### 2.3 ToolExecutionContext

```typescript
interface ToolExecutionContext {
  // call source
  source: 'editor' | 'flow' | 'page' | 'standalone'

  // session id
  conversationId?: string

  // current Schema
  currentSchema?: Record<string, unknown>[]

  // current Flow
  currentFlow?: { nodes, edges }

  // user info
  userId?: string
}
```

---

## 3. Tool Creation

### 3.1 Option 1: Direct Creation

```typescript
import { createTool } from '@schema-form/ai-sdk'

const searchSchemasTool = createTool({
  name: 'search_schemas',
  description: 'Search the form Schema list, supports filtering by keyword and type.',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'search keyword',
      },
      type: {
        type: 'string',
        description: 'Schema type',
        enum: ['form', 'search_list'],
      },
      limit: {
        type: 'number',
        description: 'max return count',
        default: 10,
      },
    },
    required: [],
  },
  execute: async (params, context) => {
    const { keyword, type, limit } = params
    const result = await searchSchemas({ keyword, type, limit })
    return result
  },
})
```

### 3.2 Option 2: Using the Builder

```typescript
import { buildTool } from '@schema-form/ai-sdk'

const searchSchemasTool = buildTool()
  .name('search_schemas')
  .description('Search the form Schema list, supports filtering by keyword and type.')
  .parameters(b =>
    b
      .string('keyword', 'search keyword')
      .string('type', 'Schema type', { enum: ['form', 'search_list'] })
      .number('limit', 'max return count', { default: 10 })
  )
  .execute(async (params, context) => {
    const { keyword, type, limit } = params
    const result = await searchSchemas({ keyword, type, limit })
    return result
  })
  .build()
```

### 3.3 Parameter Builder Methods

```typescript
class ToolParameterBuilder {
  // string parameter
  string(name, description, options?: {
    required?: boolean
    enum?: string[]
    default?: string
  }): this

  // number parameter
  number(name, description, options?: {
    required?: boolean
    default?: number
  }): this

  // boolean parameter
  boolean(name, description, options?: {
    required?: boolean
    default?: boolean
  }): this

  // array parameter
  array(name, description, options?: {
    required?: boolean
  }): this

  // object parameter
  object(name, description, options?: {
    required?: boolean
  }): this
}
```

---

## 4. Tool Registration

### 4.1 ToolRegistry

```typescript
import { createToolRegistry } from '@schema-form/ai-sdk'

// create registry
const registry = createToolRegistry()

// register a single tool
registry.register(searchSchemasTool)

// batch register
registry.registerAll([
  searchSchemasTool,
  getSchemaDetailTool,
  validateSchemaTool,
])

// check if a tool exists
registry.has('search_schemas') // true

// get a tool
const tool = registry.get('search_schemas')

// get all tools
const allTools = registry.getAll()

// get tool name list
const names = registry.getNames()
```

### 4.2 Convert to OpenAI Format

```typescript
// convert to OpenAI tools format (for LLM calls)
const openAITools = registry.toOpenAITools()
// [
//   {
//     type: 'function',
//     function: {
//       name: 'search_schemas',
//       description: 'Search the form Schema list',
//       parameters: { ... }
//     }
//   },
//   ...
// ]
```

---

## 5. Tool Execution

### 5.1 Direct Execution

```typescript
const result = await registry.execute(
  'search_schemas',
  { keyword: 'user', type: 'form', limit: 10 },
  { source: 'editor', conversationId: 'xxx' }
)
```

### 5.2 Execute in an Agent

```typescript
// the Agent handles tool calls automatically
const result = await agent.execute(
  'search user-related forms',
  { source: 'editor' }
)

// result.toolCalls contains the tool call log
console.log(result.toolCalls)
// [
//   {
//     name: 'search_schemas',
//     params: { keyword: 'user' },
//     result: { schemas: [...] },
//     duration: 150
//   }
// ]
```

### 5.3 Streaming Execution

```typescript
const stream = agent.executeStream(
  'search user-related forms',
  { source: 'editor' }
)

for await (const event of stream) {
  if (event.type === 'tool_call_start') {
    console.log(`start tool: ${event.toolCall.name}`)
  }
  if (event.type === 'tool_call_end') {
    console.log(`tool done: ${event.toolCall.name}`, event.toolCall.result)
  }
}
```

---

## 6. Tool Implementation

### 6.1 Server-side Tools

Tool implementations under `packages/server/src/ai/tools/`:

```typescript
// editorTools.ts
export const searchSchemasTool = tool(
  async ({ keyword, type, limit }) => {
    const result = await handleSchemaSearch({ keyword, type, limit })
    return JSON.stringify(result)
  },
  {
    name: 'search_schemas',
    description: 'Search the form Schema list',
    schema: z.object({
      keyword: z.string().optional(),
      type: z.enum(['form', 'search_list']).optional(),
      limit: z.number().default(10),
    }),
  }
)
```

### 6.2 Tool Handlers

`packages/server/src/ai/tools/toolHandlers.ts` contains all tools' business logic:

```typescript
// shared business logic
export async function handleSchemaSearch(params) {
  const { keyword, type, limit } = params
  const query = {}
  if (keyword) query.name = { $regex: keyword, $options: 'i' }
  if (type) query.type = type
  const schemas = await FormSchemaModel.find(query).limit(limit)
  return { success: true, schemas }
}
```

### 6.3 Unified Tool Set

`packages/server/src/ai/tools/allTools.ts` merges all tools:

```typescript
export const allTools = [
  // Schema tools
  searchSchemasTool,
  getSchemaDetailTool,
  validateSchemaTool,
  updateSchemaTool,
  // ...

  // Flow tools
  searchFlowsTool,
  getFlowDetailTool,
  validateFlowTool,
  updateFlowTool,
  // ...

  // Widget tools
  ...widgetTools,

  // RAG tools
  ...ragTools,

  // collaboration tool
  requestCollaborationTool,
]
```

---

## 7. Tool Best Practices

### 7.1 Tool Naming

- Use lowercase letters and underscores: `search_schemas`, `get_flow_detail`
- Names should clearly express the tool's function
- Avoid abbreviations; keep readable

### 7.2 Tool Description

- Concise; one sentence describing the function
- Include key parameter notes
- Avoid ambiguity

```typescript
// bad description
description: 'search'

// good description
description: 'Search the form Schema list, supports filtering by keyword and type.'
```

### 7.3 Parameter Design

- Define only necessary parameters; avoid redundancy
- Provide sensible defaults
- Use `enum` to constrain options
- Provide a clear description for each parameter

```typescript
parameters: b =>
  b
    .string('keyword', 'search keyword')
    .string('type', 'Schema type', {
      enum: ['form', 'search_list'],
    })
    .number('limit', 'max return count', {
      default: 10,
    })
```

### 7.4 Return Values

- Return structured data for the LLM to understand
- Include a `success` field for execution status
- Return clear error info on failure

```typescript
// good return value
{
  success: true,
  schemas: [...],
  total: 10
}

// good error return
{
  success: false,
  error: 'Schema not found'
}
```

### 7.5 Error Handling

```typescript
execute: async (params, context) => {
  try {
    const result = await doSomething(params)
    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

---

## 8. Extending Tools

### 8.1 Add a New Tool

1. Create the tool definition in `packages/server/src/ai/tools/`
2. Add business logic in `toolHandlers.ts`
3. Register the tool in `allTools.ts`
4. Update the Agent's System Prompt (if needed)

### 8.2 Example: Add an Export Tool

```typescript
// packages/server/src/ai/tools/exportTools.ts
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export const exportSchemaTool = tool(
  async ({ schemaId, format }) => {
    const schema = await FormSchemaModel.findById(schemaId)
    if (!schema) {
      return JSON.stringify({ success: false, error: 'Schema not found' })
    }

    if (format === 'json') {
      return JSON.stringify({ success: true, data: schema.json })
    }

    // other formats...
    return JSON.stringify({ success: false, error: 'Unsupported format' })
  },
  {
    name: 'export_schema',
    description: 'Export a Schema to a specified format (JSON, Excel, etc.)',
    schema: z.object({
      schemaId: z.string().describe('Schema ID'),
      format: z.enum(['json', 'excel']).default('json').describe('export format'),
    }),
  }
)

// packages/server/src/ai/tools/allTools.ts
import { exportSchemaTool } from './exportTools.js'

export const allTools = [
  // ...existing tools,
  exportSchemaTool,
]
```
