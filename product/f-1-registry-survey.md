# F-1 Registry -> Chat/Workflow 消费链走读

## 1. 配置层现状

### 1.1 配置目录结构

```
server/config/plugins/
  experts/          4 个平台专家 JSON
  skills/           4 个平台 Skill JSON
  tools/            7 个工具声明 JSON (langgraph / http / mcp-*)
  mcp/              5 个 MCP Server 声明 JSON
  local/            本地覆盖层（开发用，gitignore）
  local.example/    示例覆盖层
  packs/            插件包（含 example.support 示例包）
  tenants/{id}/     多租户覆盖层（运行时按 AI_PLUGIN_TENANT_ID 加载）
```

### 1.2 Expert 声明现状

| id | legacyAgentKey | dynamicPrompt | systemPrompt | runtime | tools 数量 | skills |
|---|---|---|---|---|---|---|
| platform.editor | editor | editor | -- | langgraph + workflow | 11 | schema-quality, reply-zh |
| platform.flow | flow | flow | -- | langgraph + workflow | 13 | flow-design, reply-zh |
| platform.page | page | page | -- | langgraph + workflow | 11 | page-layout, reply-zh |
| platform.general | general | general | -- | langgraph + workflow | 0 | reply-zh |
| example.support | -- | -- | 静态内联 | langgraph + workflow | 2 (disabled) | support-tone (disabled) |

**结论**：4 个平台专家全部使用 `dynamicPrompt`，无一使用 `systemPrompt`。`example.support` 作为示例包使用 `systemPrompt` 静态内联，默认禁用。

### 1.3 Skill 声明现状

| id | 内联 content | file 引用 | enabled |
|---|---|---|---|
| platform.flow-design | 内联 Markdown | -- | true |
| platform.page-layout | 内联 Markdown | -- | true |
| platform.reply-zh | 内联 Markdown | -- | true |
| platform.schema-quality | 内联 Markdown | -- | true |
| example.support-tone | -- | example.support-tone.md | false |

**结论**：平台 Skill 全部内联 content，仅示例包使用 file 引用。

### 1.4 Tool 声明现状

| name | kind | category | source |
|---|---|---|---|
| update_schema | graph | langgraph | -- |
| generate_schema | graph | langgraph | -- |
| update_flow | graph | langgraph | -- |
| save_and_bind_schema | graph | langgraph | -- |
| bind_schema_to_flow_node | graph | langgraph | -- |
| request_collaboration | graph | langgraph | -- |
| rag_index | graph | langgraph | -- |
| http_request | http | workflow | -- |
| schema__search | mcp | mcp-schema | platform.schema |
| schema__get_detail | mcp | mcp-schema | platform.schema |
| schema__search_published | mcp | mcp-schema | platform.schema |
| schema__fuzzy_search | mcp | mcp-schema | platform.schema |
| schema__validate | mcp | mcp-schema | platform.schema |
| schema__find_flow_references | mcp | mcp-schema | platform.schema |
| schema__validate_widgets | mcp | mcp-schema | platform.schema |
| flow__search | mcp | mcp-flow | platform.flow |
| flow__get_detail | mcp | mcp-flow | platform.flow |
| flow__get_node_schema | mcp | mcp-flow | platform.flow |
| flow__search_users | mcp | mcp-flow | platform.flow |
| flow__validate | mcp | mcp-flow | platform.flow |
| widget__query | mcp | mcp-widget | platform.widget |
| widget__validate | mcp | mcp-widget | platform.widget |
| rag__search | mcp | mcp-rag | platform.rag |
| industry__search_templates | mcp | mcp-industry | platform.industry |
| industry__validate_form | mcp | mcp-industry | platform.industry |

**Tool kind 分布**：
- `graph` (LangGraph 专有): 7 个 — HITL interrupt、LLM 调用、复合写入、图路由
- `http`: 1 个 — 通用 HTTP 请求执行器
- `mcp` (MCP 桥接): 17 个 — 读取/校验类，由 MCP Server 发现

### 1.5 MCP Server 声明现状

| id | transport | builtin | namespace | factoryModule |
|---|---|---|---|---|
| platform.schema | inmemory | schema | schema__ | -- |
| platform.flow | inmemory | flow | flow__ | -- |
| platform.widget | inmemory | widget | widget__ | -- |
| platform.rag | inmemory | rag | rag__ | -- |
| platform.industry | inmemory | industry | industry__ | -- |
| example.external-kb | sse | -- | kb__ | -- (disabled) |

**MCP Transport 矩阵**：

| transport | 实现方式 | 连接方式 | 当前使用 |
|---|---|---|---|
| inmemory | InMemoryTransport.createLinkedPair() | 内存直连，零网络开销 | 5 个内置 Server |
| stdio | StdioClientTransport | 子进程 stdin/stdout | 未使用（类型已支持） |
| sse | SSEServerTransport + SSEClientTransport | HTTP SSE 长连接 | 示例包声明（disabled） |

**额外**：5 个内置 MCP Server 同时通过 `routes/mcp.ts` 以 SSE transport 暴露给外部 MCP 客户端（`GET /api/mcp/{domain}/sse` + `POST /api/mcp/{domain}/messages`）。

---

## 2. 消费链：Registry -> Chat (LangGraph)

### 2.1 初始化链

```
server 启动
  -> tools/registry.ts 顶层 await
    -> initPluginRegistry()          // registrySingleton.ts, 按 tenant 缓存 LRU(32)
      -> loadPluginConfig.ts         // 4 层合并: plugins/ -> local/ -> tenants/{id}/ -> AI_PLUGIN_CONFIG_PATH
        -> loadPluginDirectory()     // 遍历 mcp/ tools/ experts/ skills/ 子目录
        -> mergeManifests()          // mcpServers by id, tools by name, skills by id, experts by id
      -> new PluginRegistry().registerManifest()
    -> initMcpBridge()               // bridge.ts, 遍历 registry.listMcpServers()
      -> createMcpClient()           // 按 transport 创建 Client (inmemory/stdio/sse)
      -> convertMcpTools()           // MCP tool -> LangGraph StructuredTool (JSON Schema -> Zod)
    -> loadHttpToolsFromRegistry()   // registry kind:http -> buildHttpStructuredTool()
    -> _allTools = [...mcpTools, ...langgraphOnlyTools, ...httpTools]
```

### 2.2 Chat 请求消费链

```
WebSocket chat:send
  -> chatStreamHandler.ts
    -> executeChatStream()
      -> 构建 graphInput (messages, context, session, interaction)
      -> graph.streamEvents(graphInput, { thread_id })
        -> router 节点
          -> 显式模式 (source=editor/flow/page): sessionForAgent() 直接路由
          -> standalone: resolveRoutedExpert() -> PluginRegistry.matchExpertsByRouting()
            -> 按 keywords + contextSources + priority 评分
            -> 返回最佳 expert
          -> sessionForAgent() 设置 session.currentAgent + session.currentExpertId
        -> requirementAnalyzer (v2, 可选)
        -> taskPlanner (v2, 可选)
        -> pluginExpert 节点 (唯一专家执行入口)
          -> resolveExpertForSession()  // 按 expertId 或 legacyAgentKey 从 Registry 获取 ExpertDeclaration
          -> buildExpertSystemPrompt()  // -> resolveExpertPrompt.ts
            -> dynamicPrompt? 调用 promptBuilder (editor/flow/page/general)
            -> systemPrompt? 直接使用
            -> 拼接 skill blocks (expert.skills -> registry.getSkill().content)
          -> getExpertTools()           // -> PluginRegistry.resolveExpertToolNames()
            -> expert.tools + expert.skills[].tools 去重合并
            -> getToolsByNames() 从全局 _toolMap 获取 StructuredTool[]
          -> LLM.bindTools(tools).stream(messages)
        -> allTools 节点 (ToolNode)
        -> afterTools 节点 (协作提取)
        -> taskChain 节点 (多步任务链)
        -> summarizer 节点
```

### 2.3 关键数据流

**Expert 解析**：`session.currentAgent` (editor/flow/page/general) 或 `session.currentExpertId` (自定义专家 id) -> `PluginRegistry.getExpert()` / `getExpertByLegacyKey()`

**Prompt 构建**：`ExpertDeclaration.dynamicPrompt` (editor/flow/page/general) -> `@schema-platform/ai-shared/promptBuilder` 的 `buildEditorSystemPrompt()` / `buildFlowSystemPrompt()` / `buildPageSystemPrompt()`，基于 `metadata.json` 动态生成 Widget 表格 + 系统知识。Skill 内容追加到 prompt 末尾。

**Tool 绑定**：`ExpertDeclaration.tools` (直接引用 tool name) + `ExpertDeclaration.skills[].tools` (skill 附带的 tool name) -> 去重 -> `getToolsByNames()` 从全局 tool map 获取 `StructuredTool[]` -> `LLM.bindTools()`

---

## 3. 消费链：Registry -> Workflow (Agent Workflow Executor)

### 3.1 Workflow 节点类型

```
agentWorkflowExecutor.ts runNode() 支持的节点类型：
  manual-trigger    -> 直接透传 input
  webhook-trigger   -> 直接透传 input
  llm               -> 独立 LLM 调用 (systemPrompt + prompt，不走 Registry)
  tool              -> dispatchTool() -> getToolSync() / executeHttpRequest()
  expert            -> dispatchAgent() -> runRegisteredExpert()
  agent-intent      -> detectAgentIntent() -> dispatchAgent() -> runRegisteredExpert()
  document-parse    -> 文档解析
  vision-analyze    -> 图片分析
  conversation-memory -> 对话历史管理
  if                -> 条件分支
  hitl              -> 人工确认暂停
  end               -> 结束
```

### 3.2 Workflow Expert 节点消费链

```
runNode(node.type === 'expert')
  -> resolveAgentTargetFromNode()   // 从 node.data.expertId 获取
  -> dispatchAgent(expertId, input, ctx)
    -> ref = { expertId } 或 { legacyAgentKey }
    -> runRegisteredExpert(ref, ...)
      -> resolveExpertRef()         // PluginRegistry.getExpert() / getExpertByLegacyKey()
      -> buildExpertSystemPrompt()  // 同 Chat 链：dynamicPrompt + skills
      -> getExpertTools()           // 同 Chat 链：resolveExpertToolNames -> getToolsByNames
      -> runExpertLoop()            // 独立 ReAct 循环 (最多 3 轮 tool call)
        -> LLM.bindTools(tools).invoke()
        -> 解析 tool_calls -> 匹配 tools -> 执行 -> ToolMessage -> 下一轮
        -> 返回 { text, truncated }
```

### 3.3 Workflow Tool 节点消费链

```
runNode(node.type === 'tool')
  -> dispatchTool(toolName, rawArgs, ctx)
    -> resolveTemplateInArgs()      // 模板变量替换 {{$input.xxx}} 等
    -> normalizeToolName()          // ai-shared/toolNames 统一命名
    -> isHttpTool()?                // Registry kind:http
      -> executeHttpRequest()       // 通用 HTTP 执行器
    -> getToolSync(normalized)      // 从全局 _toolMap 获取 StructuredTool
      -> tool.invoke(args)          // MCP 桥接工具或 LangGraph 专有工具
```

### 3.4 Workflow Agent-Intent 节点消费链

```
runNode(node.type === 'agent-intent')
  -> detectAgentIntent(input, ctx)
    -> autoDetectAgentType()        // PluginRegistry.matchExpertsByRouting() 关键词匹配
    -> 匹配失败? LLM router prompt 深度分析
  -> dispatchAgent(detectedAgent, input, ctx)
    -> 同 Expert 节点消费链
```

---

## 4. dynamicPrompt vs systemPrompt 现状

| 维度 | dynamicPrompt | systemPrompt |
|---|---|---|
| 来源 | `@schema-platform/ai-shared/promptBuilder` | Expert 声明 JSON 内联 |
| 生成时机 | 每次请求运行时生成 | 配置加载时静态读取 |
| 依赖 | `metadata.json` (Widget/FlowNode 元数据) | 无 |
| 适用场景 | 平台专家（需要最新 Widget/节点知识） | 自定义插件专家（固定角色设定） |
| 当前使用 | 4 个平台专家全部使用 | 仅 example.support 示例使用 |
| 可选值 | `editor` / `flow` / `page` / `general` | 任意字符串 |
| Skill 拼接 | 是（追加到 prompt 末尾） | 是（追加到 prompt 末尾） |

**resolveExpertPrompt.ts 优先级**：`dynamicPrompt` > `systemPrompt`。两者都为空时返回空字符串。

---

## 5. Tool kind 现状

| kind | 说明 | 执行方式 | 数量 |
|---|---|---|---|
| mcp | MCP Server 发现的工具 | InMemoryTransport 桥接 -> MCP Client.callTool() | 17 |
| graph | LangGraph 专有工具 | 直接 JS 函数调用（HITL/LLM/复合写入） | 7 |
| http | 通用 HTTP 请求 | fetch() 执行器 | 1 |

**graph 工具详细归属**：
- `update_schema` / `update_flow`：HITL interrupt，需要用户确认
- `generate_schema`：调用 LLM 生成 Schema
- `save_and_bind_schema` / `bind_schema_to_flow_node`：复合数据库写入
- `request_collaboration`：图路由协作请求
- `rag_index`：向量索引写入

---

## 6. MCP Transport 矩阵现状

| transport | SDK 类型 | 连接方式 | 内置 Server | 外部 Server | 外部客户端暴露 |
|---|---|---|---|---|---|
| inmemory | InMemoryTransport | 内存直连 (createLinkedPair) | 5 (schema/flow/widget/rag/industry) | -- | 否（仅内部 LangGraph 桥接） |
| stdio | StdioClientTransport | 子进程 stdin/stdout | -- | 类型已支持，未使用 | 否 |
| sse (client) | SSEClientTransport | HTTP SSE 长连接 | -- | 示例包声明 (disabled) | 否 |
| sse (server) | SSEServerTransport | HTTP SSE 长连接 | 5 (routes/mcp.ts) | -- | 是 (GET /api/mcp/{domain}/sse) |

**关键架构点**：
- 内置 MCP Server 同时服务于两个消费者：(1) LangGraph 桥接（inmemory，Chat Agent 使用）；(2) 外部 MCP 客户端（SSE，`routes/mcp.ts` 暴露）
- 两种消费者共享同一份工具定义（MCP Server 工厂函数），实现「MCP 作为权威工具源」
- 外部 MCP 客户端通过 SSE 连接，每个 domain 独立 Server 实例

---

## 7. 架构总结

### 7.1 四层能力模型

```
Expert（专家）    -- 角色 + prompt + routing + model 配置
  |
  +-- Skill（技能） -- 可复用的 prompt 片段 + 附带工具引用
  |
  +-- Tool（工具）  -- 三种 kind: mcp / graph / http
  |
  +-- MCP Server   -- 工具发现与执行的权威源
```

### 7.2 消费者矩阵

| 消费者 | Expert | Skill | Tool | MCP Server |
|---|---|---|---|---|
| Chat LangGraph | pluginExpertAgent -> Registry | resolveExpertPrompt 拼接 | getExpertTools -> toolMap | bridge -> InMemoryTransport |
| Workflow Executor | dispatchAgent -> runRegisteredExpert | 同上 | dispatchTool -> toolMap | 同上 |
| 外部 MCP 客户端 | -- | -- | -- | routes/mcp.ts SSE |
| Plugin Center UI | listExperts | listSkills | listToolDeclarations | listMcpServers |

### 7.3 关键文件索引

| 文件 | 职责 |
|---|---|
| `config/plugins/**/*.json` | 配置声明（Expert/Skill/Tool/MCP） |
| `plugins/loadPluginConfig.ts` | 配置加载 + 4 层合并 |
| `plugins/registry.ts` | PluginRegistry 类（Expert/Skill/Tool/MCP 注册表） |
| `plugins/registrySingleton.ts` | 多租户单例缓存 (LRU 32) |
| `plugins/resolveExpertPrompt.ts` | dynamicPrompt / systemPrompt / Skill 拼装 |
| `plugins/resolveRouterExpert.ts` | LangGraph 路由匹配 + Agent 能力目录 |
| `plugins/dispatchExpert.ts` | 统一 Expert 调度入口（Chat + Workflow 共用） |
| `plugins/runExpertLoop.ts` | 通用 ReAct 循环（最多 N 轮 tool call） |
| `plugins/pluginReload.ts` | 热重载（SIGHUP + local/ 文件监听） |
| `tools/registry.ts` | 全局工具注册表（MCP + graph + http 合并） |
| `tools/langgraphTools.ts` | LangGraph 专有工具集合 |
| `tools/httpToolExecutor.ts` | HTTP 工具执行器 |
| `mcp/bridge.ts` | MCP -> LangGraph 桥接（InMemoryTransport） |
| `mcp/createMcpClient.ts` | 按 transport 创建 MCP Client |
| `mcp/builtinFactories.ts` | 内置 MCP Server 工厂映射 |
| `mcp/customMcpFactory.ts` | 自定义 MCP Server 工厂（插件包用） |
| `graph/graph.ts` | LangGraph StateGraph 组装 |
| `graph/pluginExpertAgent.ts` | 唯一专家执行节点 |
| `graph/resolveGraphExpert.ts` | 会话专家解析 |
| `routes/mcp.ts` | MCP SSE 路由（外部客户端暴露） |
| `services/agentWorkflowExecutor.ts` | Workflow DAG 执行引擎 |

---

## 8. promptsRoutes / DB Prompt Model 与 Plugin Skill 的关系

### 8.1 DB Prompt Template 系统

`/api/ai/prompts` 路由 + `PromptTemplateModel` 构成独立的 **运营 Prompt 管理系统**：

| 维度 | DB Prompt Template | Plugin Skill |
|---|---|---|
| 存储 | MongoDB `PromptTemplate` 集合 | JSON 文件（`config/plugins/skills/`） |
| CRUD | 完整 REST API（创建/更新/删除/分析/优化/测试） | 文件编辑 + 热重载 |
| 版本 | `PromptVersionModel` 版本历史 | 无版本（文件覆盖） |
| 优化 | `promptOptimizer` 反馈驱动优化 + 成功率追踪 | 无 |
| 变量 | `variables[]` + `renderTemplate()` 模板渲染 | 无变量（纯静态 Markdown） |
| 分类 | `category: schema/flow/general/custom` | 无分类 |
| 用途 | 运营文案、A/B 测试、质量分析 | 可复用指令块，追加到 Expert system prompt |

**结论**：两套系统 **并存但不交叉**。DB Prompt Template 是运营级 Prompt 管理（版本、优化、测试），Plugin Skill 是配置级指令块（追加到 Expert prompt）。当前无代码将 DB Template 注入 Expert system prompt。

---

## 9. HTTP 工具安全现状

### 9.1 当前限制

`httpToolExecutor.ts` 使用原生 `fetch()` 执行 HTTP 请求，当前 **无安全限制**：

- 无 SSRF 防护（可请求内网地址）
- 无 allowlist / blocklist
- 无请求超时配置
- 无响应大小限制
- 无认证头注入

### 9.2 使用场景

- Workflow `tool` 节点：`node.data.toolName = 'http_request'`，args 由设计器配置
- Registry 声明：`tools/http.json` 中 `kind: http` 的工具
- 模板变量替换：`resolveTemplateInArgs()` 支持 `{{$input.xxx}}` 变量

**结论**：当前为 **无限制的通用 HTTP 执行器**，开源前需加 SSRF 策略。

---

**最后更新**：2026-07-08
