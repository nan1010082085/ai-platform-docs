# Tool 详细说明

> AI 工具的定义、注册、执行和扩展

**权威工具名**：`shared/platform-shared/ai/toolNames.ts`

## 命名规范

| 类别 | 格式 | 示例 |
|------|------|------|
| MCP 工具 | `{domain}__{action}` | `schema__search`、`flow__validate` |
| LangGraph 专有 | 无前缀 | `update_schema`、`generate_schema` |
| 工作流内置 | 无前缀 | `http_request`（仅 Workflow Executor） |

工具名使用 MCP 规范：`{domain}__{action}`（如 `schema__search`）。权威定义见 `shared/platform-shared/ai/toolNames.ts`。

## 一、工具概述

### 1.1 什么是工具

工具是 Agent 可以调用的函数，用于执行特定任务：

```
Agent (LLM)
    │
    ├── 分析用户意图
    │
    ├── 决定调用工具
    │
    ▼
┌─────────────────────────────────────────────────┐
│                    工具层                        │
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
返回结果给 Agent
```

### 1.2 工具分类

| 分类 | 工具 | 功能 |
|------|------|------|
| **Schema (MCP)** | `schema__search` | 搜索表单 Schema 列表 |
| | `schema__get_detail` | 获取 Schema 完整信息 |
| | `schema__validate_widgets` | 验证 Schema 结构 |
| | `schema__search_published` | 搜索已发布版本 |
| | `schema__fuzzy_search` | 模糊搜索 |
| | `schema__find_flow_references` | 查找流程引用 |
| **Schema (LangGraph)** | `update_schema` | 更新 Schema |
| | `generate_schema` | 生成 Schema |
| **Flow (MCP)** | `flow__search` | 搜索流程列表 |
| | `flow__get_detail` | 获取流程详情 |
| | `flow__validate` | 验证流程结构 |
| | `flow__search_users` | 搜索用户 |
| | `flow__get_node_schema` | 获取节点 Schema |
| **Flow (LangGraph)** | `update_flow` | 更新流程 |
| | `save_and_bind_schema` | 保存并绑定 Schema |
| | `bind_schema_to_flow_node` | 绑定到流程节点 |
| **Widget (MCP)** | `widget__query` | 查询组件目录 |
| | `widget__validate` | 校验组件 |
| **RAG** | `rag__search` | 知识库检索 (MCP) |
| | `rag_index` | RAG 索引 (LangGraph) |
| **Industry (MCP)** | `industry__search_templates` | 行业模板搜索 |
| | `industry__validate_form` | 行业表单校验 |
| **协作 (LangGraph)** | `request_collaboration` | 请求其他 Agent 协作 |
| **工作流内置** | `http_request` | HTTP 请求（仅 Workflow Executor） |

---

## 二、工具定义

### 2.1 ToolDefinition

```typescript
interface ToolDefinition {
  // 工具名称（唯一标识）
  name: string

  // 工具描述（LLM 用于理解工具用途）
  description: string

  // 参数定义（JSON Schema 格式）
  parameters: ToolParameterDefinition

  // 执行函数
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
  // 调用来源
  source: 'editor' | 'flow' | 'page' | 'standalone'

  // 会话 ID
  conversationId?: string

  // 当前 Schema
  currentSchema?: Record<string, unknown>[]

  // 当前 Flow
  currentFlow?: { nodes, edges }

  // 用户信息
  userId?: string
}
```

---

## 三、工具创建

### 3.1 方式一：直接创建

```typescript
import { createTool } from '@schema-form/ai-sdk'

const searchSchemasTool = createTool({
  name: 'search_schemas',
  description: '搜索表单 Schema 列表，支持按关键词和类型筛选。',
  parameters: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: '搜索关键词',
      },
      type: {
        type: 'string',
        description: 'Schema 类型',
        enum: ['form', 'search_list'],
      },
      limit: {
        type: 'number',
        description: '返回数量上限',
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

### 3.2 方式二：使用构建器

```typescript
import { buildTool } from '@schema-form/ai-sdk'

const searchSchemasTool = buildTool()
  .name('search_schemas')
  .description('搜索表单 Schema 列表，支持按关键词和类型筛选。')
  .parameters(b =>
    b
      .string('keyword', '搜索关键词')
      .string('type', 'Schema 类型', { enum: ['form', 'search_list'] })
      .number('limit', '返回数量上限', { default: 10 })
  )
  .execute(async (params, context) => {
    const { keyword, type, limit } = params
    const result = await searchSchemas({ keyword, type, limit })
    return result
  })
  .build()
```

### 3.3 参数构建器方法

```typescript
class ToolParameterBuilder {
  // 字符串参数
  string(name, description, options?: {
    required?: boolean
    enum?: string[]
    default?: string
  }): this

  // 数字参数
  number(name, description, options?: {
    required?: boolean
    default?: number
  }): this

  // 布尔参数
  boolean(name, description, options?: {
    required?: boolean
    default?: boolean
  }): this

  // 数组参数
  array(name, description, options?: {
    required?: boolean
  }): this

  // 对象参数
  object(name, description, options?: {
    required?: boolean
  }): this
}
```

---

## 四、工具注册

### 4.1 ToolRegistry

```typescript
import { createToolRegistry } from '@schema-form/ai-sdk'

// 创建注册表
const registry = createToolRegistry()

// 注册单个工具
registry.register(searchSchemasTool)

// 批量注册
registry.registerAll([
  searchSchemasTool,
  getSchemaDetailTool,
  validateSchemaTool,
])

// 检查工具是否存在
registry.has('search_schemas') // true

// 获取工具
const tool = registry.get('search_schemas')

// 获取所有工具
const allTools = registry.getAll()

// 获取工具名称列表
const names = registry.getNames()
```

### 4.2 转换为 OpenAI 格式

```typescript
// 转换为 OpenAI tools 格式（用于 LLM 调用）
const openAITools = registry.toOpenAITools()
// [
//   {
//     type: 'function',
//     function: {
//       name: 'search_schemas',
//       description: '搜索表单 Schema 列表',
//       parameters: { ... }
//     }
//   },
//   ...
// ]
```

---

## 五、工具执行

### 5.1 直接执行

```typescript
const result = await registry.execute(
  'search_schemas',
  { keyword: '用户', type: 'form', limit: 10 },
  { source: 'editor', conversationId: 'xxx' }
)
```

### 5.2 在 Agent 中执行

```typescript
// Agent 自动处理工具调用
const result = await agent.execute(
  '搜索用户相关的表单',
  { source: 'editor' }
)

// result.toolCalls 包含工具调用日志
console.log(result.toolCalls)
// [
//   {
//     name: 'search_schemas',
//     params: { keyword: '用户' },
//     result: { schemas: [...] },
//     duration: 150
//   }
// ]
```

### 5.3 流式执行

```typescript
const stream = agent.executeStream(
  '搜索用户相关的表单',
  { source: 'editor' }
)

for await (const event of stream) {
  if (event.type === 'tool_call_start') {
    console.log(`开始调用工具: ${event.toolCall.name}`)
  }
  if (event.type === 'tool_call_end') {
    console.log(`工具完成: ${event.toolCall.name}`, event.toolCall.result)
  }
}
```

---

## 六、工具实现

### 6.1 服务端工具

`packages/server/src/ai/tools/` 目录下的工具实现：

```typescript
// editorTools.ts
export const searchSchemasTool = tool(
  async ({ keyword, type, limit }) => {
    const result = await handleSchemaSearch({ keyword, type, limit })
    return JSON.stringify(result)
  },
  {
    name: 'search_schemas',
    description: '搜索表单 Schema 列表',
    schema: z.object({
      keyword: z.string().optional(),
      type: z.enum(['form', 'search_list']).optional(),
      limit: z.number().default(10),
    }),
  }
)
```

### 6.2 工具处理器

`packages/server/src/ai/tools/toolHandlers.ts` 包含所有工具的业务逻辑：

```typescript
// 共享的业务逻辑
export async function handleSchemaSearch(params) {
  const { keyword, type, limit } = params
  const query = {}
  if (keyword) query.name = { $regex: keyword, $options: 'i' }
  if (type) query.type = type
  const schemas = await FormSchemaModel.find(query).limit(limit)
  return { success: true, schemas }
}
```

### 6.3 统一工具集

`packages/server/src/ai/tools/allTools.ts` 合并所有工具：

```typescript
export const allTools = [
  // Schema 工具
  searchSchemasTool,
  getSchemaDetailTool,
  validateSchemaTool,
  updateSchemaTool,
  // ...

  // Flow 工具
  searchFlowsTool,
  getFlowDetailTool,
  validateFlowTool,
  updateFlowTool,
  // ...

  // Widget 工具
  ...widgetTools,

  // RAG 工具
  ...ragTools,

  // 协作工具
  requestCollaborationTool,
]
```

---

## 七、工具最佳实践

### 7.1 工具命名

- 使用小写字母和下划线：`search_schemas`、`get_flow_detail`
- 名称应该清晰表达工具功能
- 避免缩写，保持可读性

### 7.2 工具描述

- 简洁明了，一句话说明工具功能
- 包含关键参数说明
- 避免歧义

```typescript
// ❌ 不好的描述
description: '搜索'

// ✅ 好的描述
description: '搜索表单 Schema 列表，支持按关键词和类型筛选。'
```

### 7.3 参数设计

- 只定义必要参数，避免冗余
- 提供合理的默认值
- 使用 `enum` 限制可选值
- 为每个参数提供清晰的描述

```typescript
parameters: b =>
  b
    .string('keyword', '搜索关键词')
    .string('type', 'Schema 类型', {
      enum: ['form', 'search_list'],
    })
    .number('limit', '返回数量上限', {
      default: 10,
    })
```

### 7.4 返回值

- 返回结构化的数据，便于 LLM 理解
- 包含 `success` 字段表示执行状态
- 错误时返回清晰的错误信息

```typescript
// ✅ 好的返回值
{
  success: true,
  schemas: [...],
  total: 10
}

// ✅ 错误时的返回值
{
  success: false,
  error: 'Schema not found'
}
```

### 7.5 错误处理

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

## 八、扩展工具

### 8.1 添加新工具

1. 在 `packages/server/src/ai/tools/` 创建工具定义
2. 在 `toolHandlers.ts` 添加业务逻辑
3. 在 `allTools.ts` 注册工具
4. 更新 Agent 的 System Prompt（如果需要）

### 8.2 示例：添加导出工具

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

    // 其他格式...
    return JSON.stringify({ success: false, error: 'Unsupported format' })
  },
  {
    name: 'export_schema',
    description: '导出 Schema 为指定格式（JSON、Excel 等）',
    schema: z.object({
      schemaId: z.string().describe('Schema ID'),
      format: z.enum(['json', 'excel']).default('json').describe('导出格式'),
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
