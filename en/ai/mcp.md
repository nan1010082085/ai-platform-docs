# MCP Details

> Model Context Protocol concepts, implementation, and usage

## 1. MCP Overview

### 1.1 What Is MCP

MCP (Model Context Protocol) is a protocol that lets AI agents access external tools and data sources via a standardized interface.

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agent                              │
│              (LangGraph / SDK)                           │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Protocol Layer                    │
├─────────────────────────────────────────────────────────┤
│  Tool discovery │ Tool call │ Resource access │ Prompts │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                            │
├─────────────────────────────────────────────────────────┤
│  Schema │ Flow │ Widget │ RAG │ Industry Server         │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Sources                          │
├─────────────────────────────────────────────────────────┤
│  MongoDB  │  File system  │  External API               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 MCP Core Concepts

| Concept | Description |
|------|------|
| **Tool** | a callable function that performs a specific task |
| **Resource** | an accessible data source providing contextual info |
| **Prompt** | a predefined prompt template |
| **Server** | the server providing tools, resources, and prompts |
| **Client** | the client calling the Server (usually an AI Agent) |

### 1.3 MCP vs REST API

| Feature | MCP | REST API |
|------|-----|----------|
| Discovery | auto tool discovery | needs docs |
| Type safety | built-in validation | needs extra handling |
| Streaming | native | needs SSE/WebSocket |
| Context mgmt | built-in resource mgmt | self-implemented |
| Use case | AI Agent tool calls | general API |

---

## 2. MCP Server Implementation

### 2.1 Server Structure

```
server/src/ai/mcp/
├── index.ts            # export all servers
├── schemaServer.ts     # Schema-related tools
├── flowServer.ts       # Flow-related tools
├── widgetServer.ts     # Widget-related tools
├── ragServer.ts        # RAG knowledge base retrieval
├── industryServer.ts   # industry templates
└── bridge.ts           # InMemoryTransport bridge layer
```

### 2.2 Create an MCP Server

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

  // register a tool
  server.tool(
    'schema__search',
    'Search the form Schema list, supports filtering by keyword and type.',
    {
      keyword: z.string().optional().describe('search keyword'),
      type: z.enum(['form', 'search_list']).optional().describe('Schema type'),
      limit: z.number().default(10).describe('max return count'),
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

### 2.3 Tool Namespaces

MCP tools use a double-underscore prefix for namespace isolation:

| Prefix | Server | Example |
|------|--------|------|
| `schema__` | Schema Server | `schema__search`, `schema__get_detail` |
| `flow__` | Flow Server | `flow__search`, `flow__get_detail` |
| `widget__` | Widget Server | `widget__query`, `widget__validate` |
| `rag__` | RAG Server | `rag__search` |
| `industry__` | Industry Server | `industry__search_templates` |

### 2.4 Parameter Validation

Uses Zod for parameter validation:

```typescript
server.tool(
  'schema__search',
  'Search the form Schema list',
  {
    // Zod schema definition
    keyword: z.string().optional().describe('search keyword'),
    type: z.enum(['form', 'search_list']).optional().describe('Schema type'),
    limit: z.number().min(1).max(100).default(10).describe('max return count'),
  },
  async (params) => {
    // params already validated by Zod
    const result = await handleSchemaSearch(params)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)
```

---

## 3. MCP Server Details

### 3.1 Schema Server

**Tool list**:

| Tool name | Function |
|--------|------|
| `schema__search` | search form Schema list |
| `schema__get_detail` | get full Schema info |
| `schema__validate` | validate Schema document structure |
| `schema__validate_widgets` | validate Widget array structure |
| `schema__search_published` | search published versions |
| `schema__fuzzy_search` | keyword-based fuzzy search |
| `schema__find_flow_references` | find flow nodes referencing a Schema |

**Example**:

```typescript
// search forms
const result = await mcpClient.callTool('schema__search', {
  keyword: 'user',
  type: 'form',
  limit: 10,
})

// get detail
const detail = await mcpClient.callTool('schema__get_detail', {
  schemaId: 'xxx',
})

// validate Schema
const validation = await mcpClient.callTool('schema__validate', {
  schema: { widgets: ['...'] },
})
```

### 3.2 Flow Server

**Tool list**:

| Tool name | Function |
|--------|------|
| `flow__search` | search flow list |
| `flow__get_detail` | get flow detail |
| `flow__validate` | validate flow structure |
| `flow__update` | update flow |
| `flow__get_node_schema` | get flow node Schema |

**Example**:

```typescript
// search flows
const flows = await mcpClient.callTool('flow__search', {
  keyword: 'approval',
  limit: 10,
})

// get flow detail
const detail = await mcpClient.callTool('flow__get_detail', {
  flowId: 'xxx',
})

// validate flow
const validation = await mcpClient.callTool('flow__validate', {
  flow: { nodes: ['...'], edges: ['...'] },
})
```

### 3.3 Widget Server

**Tool list**:

| Tool name | Function |
|--------|------|
| `widget__query` | query widget catalog and definitions |
| `widget__validate` | validate widget Schema |

### 3.4 RAG Server

**Tool list**:

| Tool name | Function |
|--------|------|
| `rag__search` | knowledge base semantic retrieval |

### 3.5 Industry Server

**Tool list**:

| Tool name | Function |
|--------|------|
| `industry__search_templates` | search industry templates |
| `industry__validate_form` | validate industry form structure |

**Example**:

```typescript
// query widgets
const widgets = await mcpClient.callTool('widget__query', {
  keyword: 'input',
})

// RAG retrieval
const results = await mcpClient.callTool('rag__search', {
  query: 'how to create an approval flow',
  limit: 5,
})
```

---

## 4. MCP & LangGraph Integration

### 4.1 Shared Business Logic

MCP Servers and LangGraph tools share the same `toolHandlers` business logic:

```
┌─────────────────────────────────────────────────────────┐
│                    toolHandlers.ts                       │
│              (shared business logic layer)               │
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
│  LangGraph tool │  │   MCP Server    │
│  (direct call)  │  │  (MCP protocol) │
└─────────────────┘  └─────────────────┘
```

### 4.2 Tool Definition Comparison

**LangGraph tool**:

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
    description: 'Search the form Schema list',
    schema: z.object({
      keyword: z.string().optional(),
      type: z.enum(['form', 'search_list']).optional(),
      limit: z.number().default(10),
    }),
  }
)
```

**MCP tool**:

```typescript
server.tool(
  'schema__search',
  'Search the form Schema list',
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

### 4.3 Bridge Layer

`packages/server/src/ai/mcp/bridge.ts` bridges MCP Servers and LangGraph:

```typescript
import { createSchemaServer } from './schemaServer.js'
import { createFlowServer } from './flowServer.js'
import { createWidgetServer } from './widgetServer.js'

// create all MCP servers
export function createMCPServers() {
  return {
    schema: createSchemaServer(),
    flow: createFlowServer(),
    widget: createWidgetServer(),
  }
}

// get the tool list (for LangGraph)
export function getMCPTools() {
  const servers = createMCPServers()
  const tools = []

  for (const server of Object.values(servers)) {
    // extract tool definitions from the MCP Server
    // convert to LangGraph tool format
  }

  return tools
}
```

---

## 5. MCP Client Usage

### 5.1 Create a Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

// connect via stdio
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

### 5.2 List Available Tools

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

### 5.3 Call a Tool

```typescript
const result = await client.callTool({
  name: 'schema__search',
  arguments: {
    keyword: 'user',
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

### 5.4 Access Resources

```typescript
// list available resources
const resources = await client.listResources()

// read a resource
const resource = await client.readResource({
  uri: 'schema://schemas/xxx',
})
```

---

## 6. MCP Config

### 6.1 Server Config

```typescript
const server = new McpServer({
  // server name
  name: 'schema-form-schemas',

  // version
  version: '2.0.0',

  // optional: server capability declaration
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
})
```

### 6.2 Environment Variables

```bash
# MCP server port (if using HTTP transport)
MCP_SERVER_PORT=3002

# MongoDB connection (MCP server needs DB access)
MONGODB_URI=mongodb://localhost:27017/schema-form

# log level
MCP_LOG_LEVEL=info
```

---

## 7. MCP Best Practices

### 7.1 Tool Naming

- Use namespace prefixes: `schema__`, `flow__`, `widget__`
- Use lowercase letters and underscores
- Names should clearly express the function

```typescript
// bad naming
'search'
'get'

// good naming
'schema__search'
'schema__get_detail'
'flow__validate'
```

### 7.2 Parameter Design

- Use Zod for parameter validation
- Provide `.describe()` for each parameter
- Provide sensible defaults
- Use `enum` to constrain options

```typescript
{
  keyword: z.string().optional().describe('search keyword'),
  type: z.enum(['form', 'search_list']).optional().describe('Schema type'),
  limit: z.number().min(1).max(100).default(10).describe('max return count'),
}
```

### 7.3 Return Value Format

```typescript
// success
return {
  content: [{
    type: 'text',
    text: JSON.stringify({ success: true, data: result })
  }],
}

// error
return {
  content: [{
    type: 'text',
    text: JSON.stringify({ success: false, error: 'Schema not found' })
  }],
  isError: true,
}
```

### 7.4 Error Handling

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

## 8. Extending MCP Servers

### 8.1 Add a New Tool

```typescript
// 1. add business logic in toolHandlers.ts
export async function handleExportSchema(params) {
  const { schemaId, format } = params
  // implement export logic
  return { success: true, data: exportedData }
}

// 2. register the tool in the MCP Server
server.tool(
  'schema__export',
  'Export a Schema to a specified format',
  {
    schemaId: z.string().describe('Schema ID'),
    format: z.enum(['json', 'excel']).default('json').describe('export format'),
  },
  async (params) => {
    const result = await handleExportSchema(params)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)
```

### 8.2 Add a New Server

```typescript
// 1. create a new MCP Server
export function createExportServer(): McpServer {
  const server = new McpServer({
    name: 'schema-form-exports',
    version: '1.0.0',
  })

  // register tools...

  return server
}

// 2. export in index.ts
export { createExportServer } from './exportServer.js'

// 3. integrate in bridge.ts
import { createExportServer } from './exportServer.js'

export function createMCPServers() {
  return {
    schema: createSchemaServer(),
    flow: createFlowServer(),
    widget: createWidgetServer(),
    export: createExportServer(),  // new
  }
}
```
