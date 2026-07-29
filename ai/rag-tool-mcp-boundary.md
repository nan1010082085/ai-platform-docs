# RAG 与 Tool/MCP 边界扩展文档

> **版本**：v1 (2026-07-16)
> **目标**：明确 RAG、Tool、MCP 三者的职责边界和扩展方式。

---

## 一、概念定义

### 1.1 RAG（Retrieval-Augmented Generation）

**定义**：检索增强生成，通过向量检索为 LLM 提供上下文知识。

**职责**：
- 文档索引与向量化
- 语义检索与召回
- 上下文注入

**使用场景**：
- 知识库问答
- 文档摘要
- 上下文增强对话

### 1.2 Tool（工具）

**定义**：LLM 可调用的函数或 API，用于执行具体操作。

**职责**：
- 执行具体任务（查询、创建、更新）
- 返回结构化结果
- 支持参数校验

**类型**：
- `mcp`：MCP Server 提供的工具
- `graph`：LangGraph 专有工具
- `http`：通用 HTTP 请求工具

### 1.3 MCP Server

**定义**：Model Context Protocol 服务端，提供工具和资源的标准化接口。

**职责**：
- 工具注册与发现
- 资源管理
- 传输层抽象（inmemory/stdio/sse）

---

## 二、职责边界

| 维度 | RAG | Tool | MCP Server |
|------|-----|------|------------|
| **输入** | 查询文本 | 参数对象 | 请求消息 |
| **输出** | 相关文档片段 | 执行结果 | 响应消息 |
| **状态** | 无状态（检索） | 可有状态 | 可有状态 |
| **副作用** | 无 | 可有（写入、修改） | 可有 |
| **调用方式** | 自动注入 | LLM 决定调用 | LLM 决定调用 |

### 2.1 RAG vs Tool

| 场景 | 使用 RAG | 使用 Tool |
|------|----------|-----------|
| 查询知识库 | ✅ | ❌ |
| 创建文档 | ❌ | ✅ |
| 更新索引 | ❌ | ✅ |
| 语义搜索 | ✅ | ❌ |
| 精确查询 | ❌ | ✅ |

### 2.2 Tool vs MCP Server

| 维度 | Tool | MCP Server |
|------|------|------------|
| **定义位置** | `config/plugins/tools/` | `config/plugins/mcp/` |
| **注册方式** | JSON 配置 | JSON 配置 + Factory |
| **传输层** | N/A | inmemory/stdio/sse |
| **工具发现** | 直接引用 | 动态发现 |
| **适用场景** | 简单工具 | 复杂服务 |

---

## 三、扩展方式

### 3.1 扩展 RAG

**方式 1：添加文档**
```bash
# 通过 UI 上传
RAG 知识库 > 上传文档

# 通过 API
curl -X POST /api/ai/rag/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"
```

**方式 2：自定义 Embedding**
```env
# .env
EMBEDDING_API_KEY=your-key
EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSIONS=1024
```

**方式 3：扩展检索策略**
```typescript
// server/src/ai/services/ragService.ts
export async function searchRag(query: string, options?: {
  limit?: number
  threshold?: number
  filter?: Record<string, unknown>
}): Promise<RagSearchResult[]>
```

### 3.2 扩展 Tool

**方式 1：添加 JSON 配置**
```json
// server/config/plugins/tools/custom.json
{
  "tools": [
    {
      "name": "custom__search",
      "kind": "mcp",
      "label": "自定义搜索",
      "category": "custom",
      "argsHint": "{\"query\":\"搜索关键词\"}",
      "description": "自定义搜索工具"
    }
  ]
}
```

**方式 2：注册 LangGraph 工具**
```typescript
// server/src/ai/tools/langgraphTools.ts
export const customTool = new DynamicStructuredTool({
  name: 'custom_tool',
  description: '自定义工具',
  schema: z.object({
    input: z.string().describe('输入'),
  }),
  func: async ({ input }) => {
    // 实现逻辑
    return result
  },
})
```

**方式 3：HTTP 工具**
```json
// server/config/plugins/tools/http.json
{
  "tools": [
    {
      "name": "http__request",
      "kind": "http",
      "label": "HTTP 请求",
      "category": "http",
      "argsHint": "{\"url\":\"https://api.example.com\",\"method\":\"GET\"}",
      "description": "通用 HTTP 请求工具"
    }
  ]
}
```

### 3.3 扩展 MCP Server

**方式 1：inmemory Factory**
```typescript
// server/config/plugins/local.custom/factory.ts
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'custom.server',
    version: '1.0.0',
  })

  server.tool('custom__action', '自定义操作', {
    param: z.string(),
  }, async ({ param }) => {
    return { content: [{ type: 'text', text: `结果: ${param}` }] }
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

**方式 2：stdio 外部进程**
```json
{
  "id": "external.server",
  "transport": "stdio",
  "command": "node",
  "args": ["./mcp-server.js"],
  "namespace": "external__"
}
```

**方式 3：SSE 远程服务**
```json
{
  "id": "remote.server",
  "transport": "sse",
  "url": "https://mcp.example.com/sse",
  "namespace": "remote__"
}
```

---

## 四、最佳实践

### 4.1 选择指南

| 需求 | 推荐方案 |
|------|----------|
| 查询知识库 | RAG |
| 精确数据查询 | Tool (mcp/graph) |
| 复杂业务逻辑 | MCP Server (factory) |
| 外部 API 调用 | Tool (http) 或 MCP Server (sse) |
| 状态管理 | MCP Server |
| 简单计算 | Tool (graph) |

### 4.2 命名规范

**Tool 命名**：`{domain}__{action}`
- 示例：`schema__search`、`flow__create`、`custom__query`

**MCP Server 命名**：`{namespace}`
- 示例：`platform.schema`、`custom.example`

**RAG 索引**：按文档类型分组
- 示例：`schema`、`flow`、`document`

### 4.3 性能考虑

| 场景 | 建议 |
|------|------|
| 高频查询 | 使用缓存（Redis） |
| 大量文档 | 分批索引 |
| 复杂工具 | 异步执行 |
| 外部 API | 超时 + 重试 |

---

## 五、常见问题

### Q1: RAG 和 Tool 可以一起使用吗？

A: 可以。典型流程：
1. RAG 检索相关文档
2. LLM 分析文档内容
3. LLM 决定调用 Tool 执行操作

### Q2: 如何调试 MCP Server？

A: 使用插件中心的 MCP Server 列表查看状态，或使用路由调试 UI 测试工具调用。

### Q3: Tool 和 MCP Server 如何选择？

A:
- 简单工具（无状态、单函数）→ Tool
- 复杂服务（多工具、有状态）→ MCP Server

---

## 六、相关文档

- [Tool 系统](./tool.md)
- [MCP 协议](./mcp.md)
- [插件中心](./plugin.md)
- [RAG 知识库](./design/rag.md)

---

**最后更新**：2026-07-16
