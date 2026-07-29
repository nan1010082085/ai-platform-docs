# Agent Workflow 编排系统

> n8n 风格可视化 DAG 工作流：设计、发布、执行、监控

**与 Chat LangGraph 的区别**：Chat 是对话式单次请求的多 Agent 协作；Workflow 是可复用的自动化编排，支持 Webhook、多轮对话、文档管道等场景。两者共享 MCP 工具注册表、**插件中心**（`server/config/plugins/`）与 ai-shared 类型。详见 [plugin.md](./plugin.md)。

**Chat 选工作流时**：助手消息展示节点时间线 + LLM 流式正文（`workflow:event` WebSocket 推送）。术语见 [product/workflow-terminology.md](./product/workflow-terminology.md)。

---

## 一、系统概览

```
┌──────────────┐     save      ┌─────────────┐    publish    ┌────────────────┐
│   Designer   │ ────────────► │ draftGraph  │ ────────────► │ publishedGraph │
│  (Vue Flow)  │               │ + version   │               │ + publishId    │
└──────────────┘               └─────────────┘               └────────────────┘
                                                                      │
         ┌────────────────────────────────────────────────────────────┤
         ▼                            ▼                               ▼
   POST .../execute            Webhook 触发                    Chat 选工作流
   (manual)                    (webhook-trigger)                 (trigger: chat)
         │                            │                               │
         └────────────────────────────┴───────────────────────────────┘
                                      ▼
                           agentWorkflowExecutor
                           (顺序 DAG 遍历 + 节点记录)
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        nodeRecords[]            waiting (HITL)          success / error
              │                       │                       │
              ▼                       ▼                       ▼
   AgentExecutionDetailView    POST .../resume         列表 / 详情视图
```

### 核心模块

| 层 | 路径 | 职责 |
|----|------|------|
| 类型与模板 | `shared/platform-shared/ai/agentWorkflow.ts` | 节点类型、图结构、内置模板、校验 |
| 前端设计器 | `ai/app/src/views/AgentWorkflowDesignerView.vue` | Vue Flow 画布、属性面板 |
| 状态管理 | `ai/app/src/stores/agentWorkflowDesigner.ts` | 节点/边、脏标记、执行高亮 |
| API 客户端 | `ai/app/src/api/agentWorkflowApi.ts` | REST 封装 |
| Chat 集成 | `ai/app/src/composables/useWorkflowChatExecution.ts` | 对话中执行/继续/恢复 |
| 执行引擎 | `server/src/ai/services/agentWorkflowExecutor.ts` | DAG 遍历、节点执行 |
| 模板解析 | `server/src/ai/services/agentWorkflowTemplateResolver.ts` | `{{$...}}` 变量替换 |
| 数据模型 | `server/src/ai/models/agentWorkflow.ts` | MongoDB 持久化 |

---

## 二、节点类型参考

### 2.1 触发节点

#### `manual-trigger`

从设计器工具栏、REST API 或 Chat 手动启动。

- 入口由 `graph.entryNodeId` 指定
- 执行输入通过 `POST /workflows/:id/execute` 的 `input` 字段传入

#### `webhook-trigger`

HTTP 外部触发，发布时自动生成 `webhookSecret`。

| 配置字段 | 说明 |
|----------|------|
| `webhookPath` | 路径后缀，如 `/document-summary` |
| `webhookMethod` | `GET` 或 `POST` |
| `webhookSecret` | 发布时注入，用于 HMAC-SHA256 验签 |

请求头 `X-Webhook-Signature` 携带签名。端点：`/api/ai/webhooks/*path`，返回 `202` + `executionId`。

### 2.2 AI 处理节点

#### `llm`

直接调用 LLM，支持模板变量。

| 配置字段 | 说明 |
|----------|------|
| `prompt` | 用户 Prompt（支持 `{{$...}}`） |
| `systemPrompt` | 系统 Prompt |
| `model` | 模型标识，`default` 使用平台默认 |
| `useConversationHistory` | 是否注入对话历史 |
| `maxHistoryTurns` | 历史轮次上限 |
| `appendAssistantReply` | 是否将回复追加到对话历史 |

#### `document-parse`

解析已上传文档，输出全文、分块与元数据。

| 配置字段 | 说明 |
|----------|------|
| `documentSource` | `documentId`（固定 ID）或 `inputField`（从 input 取字段） |
| `documentId` / `inputField` | 文档来源 |

输出示例：`{ text, chunks, filename, extractionMethod, ... }`

#### `vision-analyze`

对图片进行视觉描述（非逐字 OCR），结合 `document-parse` 的 OCR 分支使用。

| 配置字段 | 说明 |
|----------|------|
| `visionPrompt` | 视觉分析指令（支持 `{{$...}}` 模板变量） |
| `documentSource` / `documentId` / `inputField` | 同 document-parse |
| `visionImageWidth` | 发送前压缩宽度（px），不设置不压缩 |
| `visionImageQuality` | JPEG 质量 1-100，不设置不压缩 |

压缩预处理使用 sharp，可大幅减少视觉模型 token 消耗。典型用法：Phase1 小图 400px/50 快速提取，Phase2 大图 1024px/85 深度分析。

#### `conversation-memory`

读写执行记录上的 `conversationHistory`，支持多轮 Chat 工作流。

| 配置字段 | 说明 |
|----------|------|
| `memoryMode` | `read` / `append` / `reset` |
| `memoryRole` | `user` / `assistant`（append 时） |
| `messageField` | 从 input 取消息的字段名 |
| `contentSource` | `input` 或 `lastOutput` |
| `maxHistoryTurns` | 历史截断上限 |

### 2.3 专家节点

与 Chat 共用 Registry + `runRegisteredExpert`（Workflow 执行器）/ `pluginExpert`（Chat 图）。

| 节点类型 | 配置 | 职责 |
|----------|------|------|
| `agent-intent` | — | 意图识别 → 自动选择专家并执行 |
| `expert` | `expertId` | 插件中心注册专家（Palette 拖拽即带 id） |

内置四专家（`platform.editor` / `platform.flow` / `platform.page` / `platform.general`）通过插件 JSON 配置，不再使用 `agent-editor` 等独立节点类型。

### 2.4 工具节点

| 节点类型 | 配置 | 说明 |
|----------|------|------|
| `tool` | `toolName` | Registry 工具名（MCP `schema__search` 或 LangGraph 专有 `update_schema` 等） |

工具名权威定义见 `shared/platform-shared/ai/toolNames.ts`。Palette 工具列表来自插件 Registry。

### 2.5 对话智能节点（Phase J）

> 详细规格见 [langgraph-workflow-nodes-roadmap.md](./product/langgraph-workflow-nodes-roadmap.md)

将 Chat LangGraph 黑盒中的对话智能层映射为白盒 Workflow 节点，共享 `server/src/ai/runtime/*` 运行时。

| 节点类型 | Palette 分类 | 对标 LangGraph | 说明 |
|----------|-------------|----------------|------|
| `intent-router` | `logic` | `routerNode` + `resolveRoutedExpert` | 意图识别与专家路由，支持多意图链预建 |
| `requirement-analyzer` | `ai` | `requirementAnalyzer` | 需求分析（RAG + 工具），输出 completeness + confirmQuestions |
| `task-planner` | `ai` | `taskPlanner` | 任务拆解为多步链（`TaskPlanStep[]`） |
| `task-chain` | `logic` | `taskChainNode` | 节点内循环推进动态步骤，子步骤事件推送 |
| `collaboration-router` | `logic` | `afterToolsNode` + `afterToolsRoute` | 检测协作请求，决定继续/下一步/总结 |
| `summarizer` | `ai` | `summarizerNode` | 多步结果汇总，支持流式推送 |

`hitl` 节点同步增强：新增 `questionSource: upstream` 配置，自动从上游 `requirement-analyzer` 输出取 `confirmQuestions`。

### 2.6 逻辑控制节点

#### `if`

JavaScript 表达式分支。连线 `data.branch` 为 `'true'` 或 `'false'`。

表达式上下文：`lastOutput`（上游输出）、`input`（执行输入）、`nodeOutputs`（各节点输出）。

示例：`lastOutput && lastOutput.extractionMethod === 'ocr'`

#### `hitl`

人工确认暂停。执行状态变为 `waiting`，需调用 resume API 继续。

| 配置字段 | 说明 |
|----------|------|
| `confirmMessage` | 确认提示文案 |
| `confirmQuestions` | 结构化问题列表（与 Chat 需求确认卡片对齐） |
| `inheritUpstreamQuestions` | 是否继承上游 HITL 问题 |

#### `end`

终止节点。支持配置输出来源：

| 配置字段 | 说明 |
|----------|------|
| `outputSource` | `lastOutput`（默认，最后节点输出）/ `node`（指定节点）/ `custom`（自定义 JSON 模板） |
| `outputNodeId` | `outputSource=node` 时指定节点 ID |
| `outputTemplate` | `outputSource=custom` 时的 JSON 模板，支持 `{{$node.xxx}}` 变量 |

回调 URL 在工作流级别配置（`onCompleteWebhook`），不在 end 节点。

#### `image-generate`

AI 图片生成节点。

| 配置字段 | 说明 |
|----------|------|
| `imagePrompt` | 图片描述 Prompt |
| `imageModel` | `dall-e-3` / `dall-e-2` / `mimo-image` |
| `imageSize` | `1024x1024` / `1024x1792` / `1792x1024` |
| `imageStyle` | `natural` / `vivid` |
| `imageQuality` | `standard` / `hd` |

#### `ppt-generate`

AI PPT 生成节点。

| 配置字段 | 说明 |
|----------|------|
| `pptTemplate` | `business` / `tech` / `education` / `creative` |
| `pptMaxSlides` | 最大页数 |
| `pptStyle` | `professional` / `casual` / `academic` |
| `pptIncludeImages` | 是否包含配图 |

---

## 三、模板变量语法

执行时由 `agentWorkflowTemplateResolver` 解析：

| 语法 | 含义 |
|------|------|
| `{{$input.field}}` | 执行输入的字段 |
| `{{$node.<nodeId>.<field>}}` | 指定节点输出的字段 |
| `{{$json}}` | `lastOutput`（最近上游输出） |
| `{{$conversation}}` | 格式化的对话历史 |

示例（智能助手模板）：

```
当前问题：{{$input.message}}
知识库检索结果：{{$node.rag-1}}
对话历史：{{$conversation}}
```

---

## 四、内置模板

定义在 `shared/platform-shared/ai/agentWorkflow.ts`，通过 `createAgentWorkflowGraphByTemplate(id)` 创建。

| ID | 名称 | 触发 | 场景 |
|----|------|------|------|
| `blank` | 空白工作流 | 手动 | 手动 → LLM → 结束 |
| `document-summary` | 文档摘要 | Webhook | 接收 documentId → 解析 → LLM 摘要 |
| `doc-image-recognition` | 文档/图片识别 | 手动 | 解析 → if(OCR) → 视觉+结构化 \| 文档结构化 |
| `intelligent-assistant` | 智能助手问答 | 手动 | 记录问题 → RAG 检索 → LLM 回答 |
| `contract-extract` | 合同条款提取 | Webhook | 解析 → LLM 结构化提取 |
| `kb-faq` | 知识库 FAQ 生成 | Webhook | 解析 → LLM 生成 FAQ → RAG 入库 |
| `http-notify` | HTTP 回调通知 | Webhook | 内容处理 → HTTP 通知外部 |
| `rag-ingest-qa` | RAG 入库质检 | Webhook | 解析 → LLM 质检 → 合格入库/人工审核 |
| `multi-doc-batch` | 多文档批量处理 | Webhook | 解析 → LLM 摘要 → 记忆累积 → 汇总 |
| `smart-suggestions` | 智能建议 | 手动 | 上下文 → RAG → LLM → 条件 → HITL |
| `smart-action-proposals` | 智能拟办 | Webhook | 文档解析 → LLM 提取行动项 → HITL → 通知 |
| `image-text-generation` | 图文生成 | 手动 | LLM 大纲 → LLM 文案 |
| `ppt-generation` | PPT 生成 | 手动 | 记忆 → LLM 大纲 → LLM 详情 |
| `image-analysis` | 图片智能分析 | 手动 | Phase1 小图提取 → Phase2 大图情感文案 |
| `chat-parity-assistant` | 智能助手 v2 | 手动 | 意图路由 → 需求分析 → 人工确认 → 任务规划 → 多专家协作 → 摘要输出 |
| `requirement-gated-build` | 需求门控构建 | 手动 | 需求分析 → 人工确认 → 任务规划 → 编辑器专家 → 流程专家 → 摘要输出 |

元数据列表：`AGENT_WORKFLOW_TEMPLATES`（16 个）。

创建 API：`POST /api/ai/workflows` body `{ "templateId": "document-summary", "name": "..." }`

---

## 五、版本与发布

### 5.1 草稿版本

- 每次保存生成时间戳版本号 `yyyymmddhhmmss`
- 保存时向 `versions[]` 推入快照（最多保留 20 条）

### 5.2 发布

`POST /workflows/:id/publish`：

- 复制 `draftGraph` → `publishedGraph`
- 分配稳定 `publishId`（UUID，不变）
- 记录 `publishedVersion`
- 为 `webhook-trigger` 节点注入 `webhookSecret`

### 5.3 状态

| 状态 | 说明 |
|------|------|
| `draft` | 仅草稿，未发布 |
| `published` | 有 publishedGraph |
| `archived` | 已归档 |

---

## 六、执行引擎

`agentWorkflowExecutor.ts` 核心行为：

1. 从 `entryNodeId` 开始顺序遍历 DAG
2. 环检测：visited set 防止无限循环
3. 每个节点产生一条 `AgentNodeRecord`（pending → running → success/error/waiting/skipped）
4. 节点输出写入 `nodeOutputs[nodeId]`，作为下游 `{{$node.*}}` 的数据源
5. 专家节点：复用 Chat 同款 MCP 注册表，最多 3 轮 tool round
6. HITL：`hitl` 节点设置 `wait: true` → 执行 `waiting` → 等待 resume
7. `continue`：基于 `parentExecutionId` 新建执行，继承 `conversationHistory`

### 6.1 执行状态

| 状态 | 说明 |
|------|------|
| `running` | 执行中 |
| `success` | 完成 |
| `error` | 节点或引擎错误 |
| `waiting` | HITL 暂停 |
| `cancelled` | 已取消 |

### 6.2 节点记录状态

`pending` → `running` → `success` | `error` | `waiting` | `skipped`

### 6.3 触发来源

| trigger | 入口 |
|---------|------|
| `manual` | 设计器 / REST execute |
| `webhook` | Webhook 路由 |
| `chat` | AiChatPanel 选择已发布工作流 |

---

## 七、REST API

前缀：`/api/ai`

### 工作流 CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/workflows` | 列表（含 status、hasRunningExecution） |
| POST | `/workflows` | 创建，`{ name, description?, templateId? }` |
| GET | `/workflows/:id` | 详情 + `draftGraph` |
| PUT | `/workflows/:id` | 更新 name/description/draftGraph |
| DELETE | `/workflows/:id` | 删除（有 running 执行时拒绝） |
| POST | `/workflows/:id/publish` | 发布 |
| GET | `/workflows/:id/versions` | 版本列表 |
| GET | `/workflows/:id/versions/:version` | 版本快照图 |

### 执行

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/workflows/:id/execute` | `{ input: {...} }` 启动执行 |
| GET | `/workflow-executions` | 列表，`?workflowId=` 过滤 |
| GET | `/workflow-executions/:id` | 详情 + `nodeRecords` + `conversationHistory` |
| POST | `/workflow-executions/:id/resume` | HITL 恢复，`{ answers: {...} }` |
| POST | `/workflow-executions/:id/continue` | 多轮继续，`{ input: {...} }` |

### Webhook

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/... | `/webhooks/*path` | 匹配已发布工作流的 webhook-trigger |

---

## 八、前端设计器

### 8.1 路由

| 路由 | 组件 | 功能 |
|------|------|------|
| `/workflows` | `AgentWorkflowListView` | 列表、筛选、从模板创建 |
| `/workflows/:id` | `AgentWorkflowDesignerView` | 全屏设计器 |
| `/workflows/:id/executions` | `AgentExecutionListView` | 执行历史 |
| `/executions/:id` | `AgentExecutionDetailView` | 节点级监控 |

### 8.2 核心组件

| 组件 | 职责 |
|------|------|
| `AgentWorkflowPalette` | 左侧节点面板（拖拽） |
| `AgentWorkflowCanvas` | Vue Flow 画布 |
| `AgentWorkflowPropertyPanel` | 右侧属性配置 |
| `AgentWorkflowToolbar` | 保存/发布/执行/校验/版本 |
| `AgentFlowNode` / `AgentFlowEdge` | 节点/边渲染（含执行状态样式） |
| `AgentWorkflowTemplatePreviewDialog` | 模板预览 |

### 8.3 Store 与 Composable

| 模块 | 职责 |
|------|------|
| `agentWorkflowDesigner.ts` | 图状态、dirty、entryNodeId、执行高亮 |
| `useAgentNodePropertyPanel.ts` | 节点类型 → 属性面板组件映射 |
| `useWorkflowChatExecution.ts` | Chat 中 execute/continue/resume + WebSocket 进度 |
| `usePublishedAgentWorkflows.ts` | 加载已发布工作流供 Chat 选择 |
| `constants/agentNodes.ts` | 面板项、分类、默认 data |
| `constants/expertNodeTypes.ts` | 专家节点元数据 |
| `constants/toolNodeTypes.ts` | 工具节点元数据 |

### 8.4 图校验

前端保存前调用 `validateAgentWorkflowGraph(graph)`（ai-shared）：

- 必须有入口节点
- 至少一个触发节点
- 连线引用有效节点
- 节点 ID 不重复（error）
- `if` 节点必须有 true/false 两条分支（error）
- `webhook-trigger` 必须有 `webhookPath`（error）
- LLM/工具/专家节点的必填配置检查（warning）

---

## 九、Chat 集成

用户在 `AiChatSettings` 中选择已发布工作流后，对话走工作流引擎而非 LangGraph：

```
用户消息 → useWorkflowChatExecution
  → POST /workflows/:id/execute（trigger: chat）或 /continue / resume
  → workflow:subscribe → workflow:event 实时进度
  → workflowChatResponse 解析最终输出
```

HITL 场景：前端展示确认卡片，用户回答后 `POST .../resume`。

---

## 十、数据模型（概要）

### AgentWorkflow

```typescript
{
  name, description, status,
  draftGraph: AgentWorkflowGraph,
  publishedGraph?: AgentWorkflowGraph,
  publishId?: string,
  version: string,           // 当前草稿版本
  publishedVersion?: string,
  versions: [{ version, graph, createdAt, published, current }]
}
```

### AgentWorkflowExecution

```typescript
{
  workflowId, workflowName, version, versionId,
  status, trigger,           // manual | chat | webhook
  nodeRecords: AgentNodeRecord[],
  conversationHistory?: AgentConversationTurn[],
  parentExecutionId?: string,
  startedAt, finishedAt, durationMs, error?
}
```

完整类型定义见 [ai-shared.md](./ai-shared.md)。

---

## 十一、环境变量

| 变量 | 说明 |
|------|------|
| `AI_WEBHOOK_SKIP_HMAC` | 开发环境跳过 Webhook HMAC 验签 |

---

## 十二、扩展指南

### 新增节点类型

1. 在 `shared/platform-shared/ai/agentWorkflow.ts` 的 `AgentNodeType` 联合类型中添加
2. 在 `AgentWorkflowNodeData` 中添加配置字段
3. 前端：`constants/agentNodes.ts` 面板项 + 属性面板组件
4. 服务端：`agentWorkflowExecutor.ts` 添加 `case` 分支
5. 补充校验规则到 `validateAgentWorkflowGraph`

### 新增内置模板

1. 在 `agentWorkflow.ts` 添加 `createXxxWorkflowGraph()` 工厂函数
2. 注册到 `AGENT_WORKFLOW_TEMPLATES` 和 `createAgentWorkflowGraphByTemplate`
3. 前端列表自动读取 `AGENT_WORKFLOW_TEMPLATES`
