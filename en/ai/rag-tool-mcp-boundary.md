# RAG & Tool/MCP Boundary Extension Doc

> **Version**: v1 (2026-07-16)
> **Goal**: clarify the responsibility boundaries and extension methods of RAG, Tool, and MCP.

---

## 1. Concept Definitions

### 1.1 RAG (Retrieval-Augmented Generation)

**Definition**: retrieval-augmented generation; provides contextual knowledge to the LLM via vector retrieval.

**Responsibilities**:
- Document indexing and vectorization
- Semantic retrieval and recall
- Context injection

**Use cases**:
- Knowledge base Q&A
- Document summarization
- Context-enhanced conversation

### 1.2 Tool

**Definition**: a function or API callable by the LLM to perform concrete operations.

**Responsibilities**:
- Execute concrete tasks (query, create, update)
- Return structured results
- Support parameter validation

**Types**:
- `mcp`: tools provided by an MCP Server
- `graph`: LangGraph-specific tools
- `http`: general HTTP request tools

### 1.3 MCP Server

**Definition**: a Model Context Protocol server providing a standardized interface for tools and resources.

**Responsibilities**:
- Tool registration and discovery
- Resource management
- Transport abstraction (inmemory/stdio/sse)

---

## 2. Responsibility Boundaries

| Dimension | RAG | Tool | MCP Server |
|------|-----|------|------------|
| **Input** | Query text | Param object | Request message |
| **Output** | Relevant doc fragments | Execution result | Response message |
| **State** | Stateless (retrieval) | May have state | May have state |
| **Side effects** | None | May have (write, modify) | May have |
| **Invocation** | Auto-injected | LLM decides to call | LLM decides to call |

### 2.1 RAG vs Tool

| Scenario | Use RAG | Use Tool |
|------|----------|-----------|
| Query the knowledge base | ✅ | ❌ |
| Create a document | ❌ | ✅ |
| Update the index | ❌ | ✅ |
| Semantic search | ✅ | ❌ |
| Exact query | ❌ | ✅ |

### 2.2 Tool vs MCP Server

| Dimension | Tool | MCP Server |
|------|------|------------|
| **Defined in** | `config/plugins/tools/` | `config/plugins/mcp/` |
| **Registration** | JSON config | JSON config + Factory |
| **Transport** | N/A | inmemory/stdio/sse |
| **Tool discovery** | Direct reference | Dynamic discovery |
| **Use case** | Simple tools | Complex services |

---

## 3. Extension Methods

### 3.1 Extending RAG

**Option 1: add documents**
```bash
# Upload via UI
RAG Knowledge Base > Upload document

# Via API
curl -X POST /api/ai/rag/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"
```

**Option 2: custom embedding**
```env
# .env
EMBEDDING_API_KEY=your-key
EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSIONS=1024
```

**Option 3: extend the retrieval strategy**
```typescript
// server/src/ai/services/ragService.ts
export async function searchRag(query: string, options?: {
  limit?: number
  threshold?: number
  filter?: Record<string, unknown>
}): Promise<RagSearchResult[]>
```

### 3.2 Extending Tool

**Option 1: add JSON config**
```json
// server/config/plugins/tools/custom.json
{
  "tools": [
    {
      "name": "custom__search",
      "kind": "mcp",
      "label": "Custom Search",
      "category": "custom",
      "argsHint": "{\"query\":\"search keyword\"}",
      "description": "Custom search tool"
    }
  ]
}
```

**Option 2: register a LangGraph tool**
```typescript
// server/src/ai/tools/langgraphTools.ts
export const customTool = new DynamicStructuredTool({
  name: 'custom_tool',
  description: 'Custom tool',
  schema: z.object({
    input: z.string().describe('input'),
  }),
  func: async ({ input }) => {
    // implementation
    return result
  },
})
```

**Option 3: HTTP tool**
```json
// server/config/plugins/tools/http.json
{
  "tools": [
    {
      "name": "http__request",
      "kind": "http",
      "label": "HTTP Request",
      "category": "http",
      "argsHint": "{\"url\":\"https://api.example.com\",\"method\":\"GET\"}",
      "description": "General HTTP request tool"
    }
  ]
}
```

### 3.3 Extending MCP Server

**Option 1: inmemory Factory**
```typescript
// server/config/plugins/local.custom/factory.ts
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'custom.server',
    version: '1.0.0',
  })

  server.tool('custom__action', 'Custom action', {
    param: z.string(),
  }, async ({ param }) => {
    return { content: [{ type: 'text', text: `result: ${param}` }] }
  })

  return server
}
```

```json
// server/config/plugins/local.custom/server.json
{
  "id": "custom.server",
  "transport": "inmemory",
  "factoryModule": "./factory.ts",
  "namespace": "custom__"
}
```

**Option 2: stdio external process**
```json
{
  "id": "external.server",
  "transport": "stdio",
  "command": "node",
  "args": ["./mcp-server.js"],
  "namespace": "external__"
}
```

**Option 3: SSE remote service**
```json
{
  "id": "remote.server",
  "transport": "sse",
  "url": "https://mcp.example.com/sse",
  "namespace": "remote__"
}
```

---

## 4. Best Practices

### 4.1 Selection Guide

| Need | Recommended |
|------|----------|
| Query the knowledge base | RAG |
| Exact data query | Tool (mcp/graph) |
| Complex business logic | MCP Server (factory) |
| External API call | Tool (http) or MCP Server (sse) |
| State management | MCP Server |
| Simple computation | Tool (graph) |

### 4.2 Naming Conventions

**Tool naming**: `{domain}__{action}`
- Examples: `schema__search`, `flow__create`, `custom__query`

**MCP Server naming**: `{namespace}`
- Examples: `platform.schema`, `custom.example`

**RAG index**: grouped by document type
- Examples: `schema`, `flow`, `document`

### 4.3 Performance Considerations

| Scenario | Suggestion |
|------|------|
| High-frequency query | Use cache (Redis) |
| Large doc set | Batch indexing |
| Complex tool | Async execution |
| External API | Timeout + retry |

---

## 5. FAQ

### Q1: Can RAG and Tool be used together?

A: Yes. Typical flow:
1. RAG retrieves relevant docs
2. LLM analyzes the doc content
3. LLM decides to call a Tool to perform an action

### Q2: How to debug an MCP Server?

A: Use the Plugin Center MCP Server list to view status, or the routing debug UI to test tool calls.

### Q3: How to choose between Tool and MCP Server?

A:
- Simple tool (stateless, single function) -> Tool
- Complex service (multi-tool, stateful) -> MCP Server

---

## 6. Related Docs

- [Tool system](./tool.md)
- [MCP protocol](./mcp.md)
- [Plugin center](./plugin.md)
- [RAG knowledge base](./design/rag.md)

---

**Last updated**: 2026-07-16
