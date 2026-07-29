# AI 架构文档

> `ai/` 项目整体架构：Chat LangGraph 与 Agent Workflow 双引擎。  
> **三能力关系、JWT、凭证、开源小平台定位**见 [platform.md](./platform.md)。

**文档版本**：v7 (2026-07-13) — 去除旧架构引用，对齐当前实现

---

## 一、项目结构

`ai/` 为多包并列仓库（非 monorepo workspace），各子包独立 `package.json`、独立构建与部署。

```
ai/
├── app/              @ai-app                         Vue 3 微前端：Chat、RAG、监控、工作流设计器、插件中心
├── shared/           @schema-platform/ai-shared       跨端类型、事件、Prompt、工作流域模型
└── docs/             本文档目录
```

| 包 | 消费者 | 职责 |
|---|---|---|
| `@ai-app` | shell（qiankun） | 前端 UI：Chat、工作流设计器、执行监控、RAG、插件中心 `/plugins` |
| `@schema-platform/platform-shared/ai` | app、server | 事件协议、工具名、Prompt、工作流类型 |

**依赖方向**：`app → ai-shared + platform-shared`；`server → ai-shared`。

**插件中心**：Expert / Skill / Tool / MCP 由 `server/config/plugins/` 分目录配置（见 [plugin.md](../ai/docs/plugin.md)），支持 `plugin:pack` / `plugin:install` 与 SIGHUP 热重载。

**同仓开发**：`app/package.json` 通过 `file:../shared` 引用 ai-shared；Vite alias 可直连 shared 源码，改公共包后 dev/build 自动生效。

---

## 二、双 Agent 系统

平台运行两套并行的 Agent 引擎，共享 MCP 工具注册表与 `@schema-platform/platform-shared/ai`，但执行模型不同：

| 维度 | Chat LangGraph | Agent Workflow DAG |
|------|----------------|-------------------|
| 入口 | AiChatView、editor/flow 嵌入 | 设计器、REST API、Webhook、Chat 选工作流 |
| 引擎 | `server/src/ai/graph/graph.ts` | `server/src/ai/services/agentWorkflowExecutor.ts` |
| 编排模型 | LangGraph StateGraph + Checkpoint | n8n 风格顺序 DAG 遍历 |
| 状态持久化 | LangGraph checkpointer | MongoDB `AgentWorkflowExecution` |
| HITL | LangGraph `interrupt` / `chat:resume` | `hitl` 节点 + `POST .../resume` |
| 工具 | MCP Bridge + LangGraph 专有工具 | 同上 + 内置 `http_request` |
| 文档 | [agent.md](./agent.md) | [agent-workflow.md](./agent-workflow.md) |

```
                    ┌─────────────────────────────────────┐
                    │     @schema-platform/ai-shared      │
                    │  events · toolNames · promptBuilder │
                    │  agentWorkflow · document           │
                    └─────────────────────────────────────┘
                           ▲                    ▲
                           │                    │
              ┌────────────┴──────┐   ┌────────┴────────────┐
              │  Chat LangGraph   │   │  Agent Workflow     │
              │  (对话式生成)      │   │  (可视化编排)        │
              └────────────┬──────┘   └────────┬────────────┘
                           │                    │
                           └────────┬───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  tools/registry.ts  │
                         │  MCP Bridge (5 服务) │
                         └─────────────────────┘
```

---

## 三、Chat LangGraph 架构

### 3.1 编译图节点（当前代码）

`server/src/ai/graph/graph.ts` 注册的节点：

| 节点 | 职责 |
|------|------|
| `router` | 显式模式路由、关键词多意图检测、任务链预建 |
| `requirementAnalyzer` | v2：深度需求分析（默认开启） |
| `requirementConfirm` | v2：需求确认卡片（HITL） |
| `taskPlanner` | v2：任务规划，生成 task chain |
| `taskChain` | 任务链推进、Agent 协作插入；写入 `session.currentExpertId` |
| **`pluginExpert`** | **唯一专家执行节点**（Registry prompt/tools + 领域上下文） |
| `allTools` | ToolNode 执行（带错误兜底） |
| `afterTools` | 工具后处理、协作请求提取、上下文传递 |
| `summarizer` | 多步任务结果汇总 |

专家解析与 session 同步：`graph/resolveGraphExpert.ts`。领域用户上下文（Schema/Flow/协作）：`graph/expertUserContext.ts`。

> **基线 1.0**：已删除 `editor` / `flow` / `page` / `general` 图节点及 `*Agent.ts`；内置与第三方专家均走 `pluginExpert`。

> **注意**：`thinker`、`qualityCheck` 仅在 `events.ts` 类型中定义，**未注册为图节点**，服务端不发射对应事件。

### 3.2 v2 默认流程

```
START
  → router
  → requirementAnalyzer
      ├─ (需确认) → requirementConfirm → taskPlanner
      └─ (跳过确认) ─────────────────────→ taskPlanner
  → taskPlanner → taskChain
  → taskChain → pluginExpert | summarizer
  → pluginExpert
      ├─ (有 tool_calls) → allTools → afterTools → taskChain | pluginExpert | summarizer
      └─ (无 tool_calls) → END 或 summarizer / taskChain
  → summarizer → END
```

**环境变量**：

| 变量 | 默认 | 说明 |
|------|------|------|
| `AI_ENABLE_TASK_PLANNER` | `true` | 启用任务规划节点 |

### 3.3 专家与插件中心

| 概念 | 说明 |
|------|------|
| **Registry 专家** | `server/config/plugins/experts/*.json`，如 `platform.editor` |
| **`legacyAgentKey`** | 内置四专家的调度键（`editor`/`flow`/`page`/`general`），用于 task chain、协作、显式 `context.source`；**不**再对应独立图节点 |
| **`session.currentExpertId`** | 运行时权威专家 id；`pluginExpert` 据此执行 |
| **System Prompt** | `buildExpertSystemPrompt`（插件 `systemPrompt` + Skill）；`dynamicPrompt` 走 ai-shared `promptBuilder` |
| **第三方专家** | 仅加插件 JSON + pack，无需新增 `graph/*Agent.ts` |

### 3.4 关键行为

- **显式模式**：`context.source === editor|flow|page` 时跳过关键词猜测，直接进入对应专家
- **多意图**：router 检测「页面 + 表单/流程」组合时预建 task chain
- **工具循环**：每轮 Agent 最多 3 次 tool iteration；全局 `session.maxNodeExecutions` 防死循环
- **协作**：`request_collaboration` 工具 → `afterTools` 提取 → `taskChain` 插入协作步骤
- **流式传输**：WebSocket / Socket.IO，事件类型见 [events.md](./events.md)

---

## 四、Agent Workflow 架构（概要）

可视化 DAG 编排系统，详见 [agent-workflow.md](./agent-workflow.md)。

### 4.1 生命周期

```
设计 (draftGraph) → 保存 (版本快照) → 发布 (publishedGraph + publishId) → 执行 → 监控
```

### 4.2 节点分类（基线 1.0）

| 分类 | 节点类型 |
|------|----------|
| 触发 | `manual-trigger`、`webhook-trigger` |
| AI | `llm`、`document-parse`、`vision-analyze`、`conversation-memory`、`image-generate`、`ppt-generate` |
| 对话智能 | `intent-router`、`requirement-analyzer`、`task-planner`、`task-chain`、`collaboration-router`、`summarizer` |
| 专家 | `agent-intent`（自动路由）、`expert`（`expertId` → 插件中心） |
| 工具 | `tool`（`toolName` → Registry / MCP） |
| 逻辑 | `if`、`hitl`、`end` |

Palette 专家与工具条目来自插件 Registry（`usePluginRegistry`），非硬编码 `agent-editor` / `tool-mcp-*`。

### 4.3 内置模板（16 个）

| ID | 名称 | 触发 |
|----|------|------|
| `blank` | 空白工作流 | 手动 |
| `document-summary` | 文档摘要 | Webhook |
| `doc-image-recognition` | 文档/图片识别 | 手动 |
| `intelligent-assistant` | 智能助手问答 | 手动 |
| `contract-extract` | 合同条款提取 | Webhook |
| `kb-faq` | 知识库 FAQ 生成 | Webhook |
| `http-notify` | HTTP 回调通知 | Webhook |
| `rag-ingest-qa` | RAG 入库质检 | Webhook |
| `multi-doc-batch` | 多文档批量处理 | Webhook |
| `smart-suggestions` | 智能建议 | 手动 |
| `smart-action-proposals` | 智能拟办 | Webhook |
| `image-text-generation` | 图文生成 | 手动 |
| `ppt-generation` | PPT 生成 | 手动 |
| `image-analysis` | 图片智能分析 | 手动 |
| `chat-parity-assistant` | 智能助手 v2 | 手动 |
| `requirement-gated-build` | 需求门控构建 | 手动 |

完整模板流程图见 [agent-workflow.md](./agent-workflow.md)。定义与工厂函数在 `shared/platform-shared/ai/agentWorkflow.ts`。

### 4.4 前端路由

| 路由 | 视图 |
|------|------|
| `/workflows` | 工作流列表 |
| `/workflows/:id` | 设计器 |
| `/workflows/:id/executions` | 执行历史 |
| `/executions/:id` | 执行详情（节点级监控） |

Chat 可通过 `AgentWorkflowPicker` 选择已发布工作流作为对话后端。

---

## 五、工具层

### 5.1 三层工具

```
LangGraph Chat / Workflow Executor
         │
         ▼
   tools/registry.ts
         │
    ┌────┴────────────────┐
    ▼                     ▼
 MCP Bridge            LangGraph 专有
 (5 个 MCP Server)     (无前缀命名)
```

**MCP 命名**：`{domain}__{action}`（如 `schema__search`）

**LangGraph 专有**（无 `__` 前缀）：`update_schema`、`generate_schema`、`update_flow`、`save_and_bind_schema`、`bind_schema_to_flow_node`、`request_collaboration`、`rag_index`

**工作流专有**：`http_request`（executor 内置，不在 MCP 注册表）

权威定义：`shared/platform-shared/ai/toolNames.ts`（MCP 规范名 `{domain}__{action}`，无旧名别名表）。

详见 [tool.md](./tool.md)、[mcp.md](./mcp.md)。

### 5.2 MCP Server（5 个）

| Server | 域前缀 | 职责 |
|--------|--------|------|
| schemaServer | `schema__` | Schema 搜索、详情、校验 |
| flowServer | `flow__` | 流程搜索、详情、校验、用户 |
| widgetServer | `widget__` | 组件目录查询与校验 |
| ragServer | `rag__` | 知识库检索 |
| industryServer | `industry__` | 行业模板搜索与校验 |

Bridge 实现：`server/src/ai/mcp/bridge.ts`（InMemoryTransport → LangGraph StructuredTool）。

---

## 六、事件协议

统一事件类型定义在 `shared/platform-shared/ai/events.ts`，经 WebSocket `chat:event` 推送到前端。

- **v1**：文本流、Schema/Flow 生成、工具调用、任务链、HITL、done/error
- **v2**：需求分析、任务规划（已实现并发射）
- **v2 预留**：`thinker_*`、`quality_check_*`（类型已定义，图节点未实现）

完整清单见 [events.md](./events.md)。

---

## 七、服务端 API 概览

Chat 与 Workflow 的 REST / WebSocket 端点由 `server/src/ai/` 提供（前端按已有接口适配，不修改 server 代码）。

### Chat（WebSocket）

| 事件 | 方向 | 说明 |
|------|------|------|
| `chat:send` | Client → Server | 发送消息 |
| `chat:event` | Server → Client | 流式事件 |
| `chat:resume` | Client → Server | HITL 恢复 |
| `chat:cancel` | Client → Server | 取消生成 |

### Workflow（REST，`/api/ai`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/workflows` | 列表 / 创建 |
| GET/PUT/DELETE | `/workflows/:id` | 详情 / 更新 / 删除 |
| POST | `/workflows/:id/publish` | 发布 |
| GET | `/workflows/:id/versions` | 版本列表 |
| POST | `/workflows/:id/execute` | 手动执行（JWT） |
| POST | `/workflows/invoke/:slugOrId` | 外部集成执行（`X-API-Key` / `X-Workflow-Key`） |
| GET | `/workflows/invoke/executions/:id` | invoke 执行查询 |
| GET | `/workflow-executions` | 执行列表 |
| GET | `/workflow-executions/:id` | 执行详情 |
| POST | `/workflow-executions/:id/resume` | HITL 恢复 |
| POST | `/workflow-executions/:id/continue` | 多轮继续 |
| * | `/webhooks/*path` | Webhook 触发 |

---

## 八、相关文档

| 文档 | 内容 |
|------|------|
| [agent.md](./agent.md) | Chat 专家 Agent 详解 |
| [agent-workflow.md](./agent-workflow.md) | 工作流编排完整指南 |
| [ai-shared.md](./ai-shared.md) | 共享包 API 与类型 |
| [tool.md](./tool.md) | 工具注册与扩展 |
| [mcp.md](./mcp.md) | MCP 协议与 Server |
| [events.md](./events.md) | 事件协议完整清单 |
| [design/](./design/README.md) | 产品设计：线框图、交互流、运行时图 |
| [README.md](./README.md) | 快速开始与文档索引 |
