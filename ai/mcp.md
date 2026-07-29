# MCP 详细说明

> Model Context Protocol 的概念、实现和使用

## 一、MCP 概述

### 1.1 什么是 MCP

MCP（Model Context Protocol）是一种协议，允许 AI Agent 通过标准化接口访问外部工具和数据源。

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent                              │
│              (LangGraph / SDK)                           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP 协议层                            │
├─────────────────────────────────────────────────────────┤
│  工具发现  │  工具调用  │  资源访问  │  提示词模板      │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                            │
├─────────────────────────────────────────────────────────┤
│  Schema │ Flow │ Widget │ RAG │ Industry Server       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    数据源                                │
├─────────────────────────────────────────────────────────┤
│  MongoDB  │  文件系统  │  外部 API                      │
└─────────────────────────────────────────────────────────┘
```

### 1.2 MCP 核心概念

| 概念 | 说明 |
|------|------|
| **Tool** | 可调用的函数，执行特定任务 |
| **Resource** | 可访问的数据源，提供上下文信息 |
| **Prompt** | 预定义的提示词模板 |
| **Server** | 提供工具、资源和提示词的服务端 |
| **Client** | 调用 Server 的客户端（通常是 AI Agent） |

### 1.3 MCP 与 REST API 的区别

| 特性 | MCP | REST API |
|------|-----|----------|
| 发现机制 | 自动发现工具 | 需要文档 |
| 类型安全 | 内置类型验证 | 需要额外处理 |
| 流式支持 | 原生支持 | 需要 SSE/WebSocket |
| 上下文管理 | 内置资源管理 | 需要自行实现 |
| 适用场景 | AI Agent 工具调用 | 通用 API |

---

## 二、MCP Server 实现

### 2.1 Server 结构

```
server/src/ai/mcp/
├── index.ts            # 导出所有 Server
├── schemaServer.ts     # Schema 相关工具
├── flowServer.ts       # Flow 相关工具
├── widgetServer.ts     # Widget 相关工具
├── ragServer.ts        # RAG 知识库检索
├── industryServer.ts   # 行业模板
└── bridge.ts           # InMemoryTransport 桥接层
```

### 2.2 创建 MCP Server

```typescript
// server/src/ai/mcp/schemaServer.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { handleSchemaSearch, handleSchemaGetDetail } from '../tools/toolHandlers.js'

export function createSchemaServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-schemas',
    version: '2.0.0',
  })

  // 注册工具
  server.tool(
    'schema__search',
    '搜索表单 Schema 列表，支持按关键词和类型筛选。',
    {
      keyword: z.string().optional().describe('搜索关键词'),
      type: z.enum(['form', 'search_list']).optional().describe('Schema 类型'),
      limit: z.number().default(10).describe('返回数量上限'),
    },
    async (params) => {
      const result = await handleSchemaSearch(params)
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      }
    },
  )

  return server
}
```

### 2.3 工具命名空间

MCP 工具使用双下划线前缀实现命名空间隔离：

| 前缀 | Server | 示例 |
|------|--------|------|
| `schema__` | Schema Server | `schema__search`、`schema__get_detail` |
| `flow__` | Flow Server | `flow__search`、`flow__get_detail` |
| `widget__` | Widget Server | `widget__query`、`widget__validate` |
| `rag__` | RAG Server | `rag__search` |
| `industry__` | Industry Server | `industry__search_templates` |

### 2.4 参数验证

使用 Zod 进行参数验证：

```typescript
server.tool(
  'schema__search',
  '搜索表单 Schema 列表',
  {
    // Zod schema 定义
    keyword: z.string().optional().describe('搜索关键词'),
    type: z.enum(['form', 'search_list']).optional().describe('Schema 类型'),
    limit: z.number().min(1).max(100).default(10).describe('返回数量上限'),
  },
  async (params) => {
    // params 已经过 Zod 验证
    const result = await handleSchemaSearch(params)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)
```

---

## 三、MCP Server 详解

### 3.1 Schema Server

**工具列表**：

| 工具名 | 功能 |
|--------|------|
| `schema__search` | 搜索表单 Schema 列表 |
| `schema__get_detail` | 获取 Schema 完整信息 |
| `schema__validate` | 验证 Schema 文档结构 |
| `schema__validate_widgets` | 校验 Widget 数组结构 |
| `schema__search_published` | 搜索已发布版本 |
| `schema__fuzzy_search` | 基于关键词模糊搜索 |
| `schema__find_flow_references` | 查找引用指定 Schema 的流程节点 |

**示例**：

```typescript
// 搜索表单
const result = await mcpClient.callTool('schema__search', {
  keyword: '用户',
  type: 'form',
  limit: 10,
})

// 获取详情
const detail = await mcpClient.callTool('schema__get_detail', {
  schemaId: 'xxx',
})

// 验证 Schema
const validation = await mcpClient.callTool('schema__validate', {
  schema: { widgets: [...] },
})
```

### 3.2 Flow Server

**工具列表**：

| 工具名 | 功能 |
|--------|------|
| `flow__search` | 搜索流程列表 |
| `flow__get_detail` | 获取流程详情 |
| `flow__validate` | 验证流程结构 |
| `flow__update` | 更新流程 |
| `flow__get_node_schema` | 获取流程节点 Schema |

**示例**：

```typescript
// 搜索流程
const flows = await mcpClient.callTool('flow__search', {
  keyword: '审批',
  limit: 10,
})

// 获取流程详情
const detail = await mcpClient.callTool('flow__get_detail', {
  flowId: 'xxx',
})

// 验证流程
const validation = await mcpClient.callTool('flow__validate', {
  flow: { nodes: [...], edges: [...] },
})
```

### 3.3 Widget Server

**工具列表**：

| 工具名 | 功能 |
|--------|------|
| `widget__query` | 查询组件目录与定义 |
| `widget__validate` | 校验组件 Schema |

### 3.4 RAG Server

**工具列表**：

| 工具名 | 功能 |
|--------|------|
| `rag__search` | 知识库语义检索 |

### 3.5 Industry Server

**工具列表**：

| 工具名 | 功能 |
|--------|------|
| `industry__search_templates` | 搜索行业模板 |
| `industry__validate_form` | 校验行业表单结构 |

**示例**：

```typescript
// 查询组件
const widgets = await mcpClient.callTool('widget__query', {
  keyword: 'input',
})

// RAG 检索
const results = await mcpClient.callTool('rag__search', {
  query: '如何创建审批流程',
  limit: 5,
})
```

---

## 四、MCP 与 LangGraph 集成

### 4.1 共享业务逻辑

MCP Server 和 LangGraph 工具共享同一份 `toolHandlers` 业务逻辑：

```
┌─────────────────────────────────────────────────────────┐
│                    toolHandlers.ts                       │
│              (共享业务逻辑层)                             │
├─────────────────────────────────────────────────────────┤
│  handleSchemaSearch()                                   │
│  handleSchemaGetDetail()                                │
│  handleSchemaValidate()                                 │
│  handleFlowSearch()                                     │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  LangGraph 工具 │  │   MCP Server    │
│  (直接调用)     │  │  (MCP 协议)     │
└─────────────────┘  └─────────────────┘
```

### 4.2 工具定义对比

**LangGraph 工具**：

```typescript
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

const searchSchemasTool = tool(
  async ({ keyword, type, limit }) => {
    const result = await handleSchemaSearch({ keyword, type, limit })
    return JSON.stringify(result)
  },
  {
    name: 'schema__search',
    description: '搜索表单 Schema 列表',
    schema: z.object({
      keyword: z.string().optional(),
      type: z.enum(['form', 'search_list']).optional(),
      limit: z.number().default(10),
    }),
  }
)
```

**MCP 工具**：

```typescript
server.tool(
  'schema__search',
  '搜索表单 Schema 列表',
  {
    keyword: z.string().optional(),
    type: z.enum(['form', 'search_list']).optional(),
    limit: z.number().default(10),
  },
  async (params) => {
    const result = await handleSchemaSearch(params)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)
```

### 4.3 桥接层

`packages/server/src/ai/mcp/bridge.ts` 提供了 MCP Server 与 LangGraph 的桥接：

```typescript
import { createSchemaServer } from './schemaServer.js'
import { createFlowServer } from './flowServer.js'
import { createWidgetServer } from './widgetServer.js'

// 创建所有 MCP Server
export function createMCPServers() {
  return {
    schema: createSchemaServer(),
    flow: createFlowServer(),
    widget: createWidgetServer(),
  }
}

// 获取工具列表（用于 LangGraph）
export function getMCPTools() {
  const servers = createMCPServers()
  const tools = []

  for (const server of Object.values(servers)) {
    // 从 MCP Server 提取工具定义
    // 转换为 LangGraph 工具格式
  }

  return tools
}
```

---

## 五、MCP Client 使用

### 5.1 创建 Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// 通过 stdio 连接
const transport = new StdioClientTransport({
  command: 'node',
  args: ['packages/server/dist/mcp/server.js'],
})

const client = new Client({
  name: 'ai-client',
  version: '1.0.0',
})

await client.connect(transport)
```

### 5.2 列出可用工具

```typescript
const tools = await client.listTools()
console.log(tools)
// {
//   tools: [
//     { name: 'schema__search', description: '...', inputSchema: {...} },
//     { name: 'schema__get_detail', description: '...', inputSchema: {...} },
//     ...
//   ]
// }
```

### 5.3 调用工具

```typescript
const result = await client.callTool({
  name: 'schema__search',
  arguments: {
    keyword: '用户',
    type: 'form',
    limit: 10,
  },
})

console.log(result)
// {
//   content: [
//     { type: 'text', text: '{"success":true,"schemas":[...]}' }
//   ]
// }
```

### 5.4 访问资源

```typescript
// 列出可用资源
const resources = await client.listResources()

// 读取资源
const resource = await client.readResource({
  uri: 'schema://schemas/xxx',
})
```

---

## 六、MCP 配置

### 6.1 Server 配置

```typescript
const server = new McpServer({
  // Server 名称
  name: 'schema-form-schemas',

  // 版本号
  version: '2.0.0',

  // 可选：Server 能力声明
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
})
```

### 6.2 环境变量

```bash
# MCP Server 端口（如果使用 HTTP 传输）
MCP_SERVER_PORT=3002

# MongoDB 连接（MCP Server 需要访问数据库）
MONGODB_URI=mongodb://localhost:27017/schema-form

# 日志级别
MCP_LOG_LEVEL=info
```

---

## 七、MCP 最佳实践

### 7.1 工具命名

- 使用命名空间前缀：`schema__`、`flow__`、`widget__`
- 使用小写字母和下划线
- 名称应该清晰表达功能

```typescript
// ❌ 不好的命名
'search'
'get'

// ✅ 好的命名
'schema__search'
'schema__get_detail'
'flow__validate'
```

### 7.2 参数设计

- 使用 Zod 进行参数验证
- 为每个参数提供 `.describe()` 说明
- 提供合理的默认值
- 使用 `enum` 限制可选值

```typescript
{
  keyword: z.string().optional().describe('搜索关键词'),
  type: z.enum(['form', 'search_list']).optional().describe('Schema 类型'),
  limit: z.number().min(1).max(100).default(10).describe('返回数量上限'),
}
```

### 7.3 返回值格式

```typescript
// 成功
return {
  content: [{
    type: 'text',
    text: JSON.stringify({ success: true, data: result })
  }],
}

// 错误
return {
  content: [{
    type: 'text',
    text: JSON.stringify({ success: false, error: 'Schema not found' })
  }],
  isError: true,
}
```

### 7.4 错误处理

```typescript
async (params) => {
  try {
    const result = await handleSchemaSearch(params)
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }],
      isError: true,
    }
  }
}
```

---

## 八、扩展 MCP Server

### 8.1 添加新工具

```typescript
// 1. 在 toolHandlers.ts 添加业务逻辑
export async function handleExportSchema(params) {
  const { schemaId, format } = params
  // 实现导出逻辑
  return { success: true, data: exportedData }
}

// 2. 在 MCP Server 注册工具
server.tool(
  'schema__export',
  '导出 Schema 为指定格式',
  {
    schemaId: z.string().describe('Schema ID'),
    format: z.enum(['json', 'excel']).default('json').describe('导出格式'),
  },
  async (params) => {
    const result = await handleExportSchema(params)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)
```

### 8.2 添加新 Server

```typescript
// 1. 创建新的 MCP Server
export function createExportServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-exports',
    version: '1.0.0',
  })

  // 注册工具...

  return server
}

// 2. 在 index.ts 导出
export { createExportServer } from './exportServer.js'

// 3. 在 bridge.ts 集成
import { createExportServer } from './exportServer.js'

export function createMCPServers() {
  return {
    schema: createSchemaServer(),
    flow: createFlowServer(),
    widget: createWidgetServer(),
    export: createExportServer(),  // 新增
  }
}
```
