# Agent 详细说明

> Chat LangGraph 专家 Agent 的类型、职责、执行流程和配置

> **注意**：本文档描述 **Chat 对话引擎**（`server/src/ai/graph/graph.ts`）。专家统一经 **`pluginExpert`** + 插件 Registry 执行；工作流侧见 [agent-workflow.md](./agent-workflow.md) 的 `expert` / `agent-intent` 节点。

**文档版本**：v2 (2026-07-13) — 对齐基线 1.0：统一 pluginExpert、去除旧 Agent 类

---

## 一、Agent 架构

### 1.1 基线 1.0：统一专家路径

**已删除**：独立的 `EditorAgent`、`FlowAgent`、`PageAgent`、`GeneralAgent` 类及对应的图节点（`editor`、`flow`、`page`、`general`）。

**当前实现**：所有专家通过 **插件中心 Registry** 配置，统一由图中的 **`pluginExpert`** 节点执行。

```
用户消息
    │
    ▼
┌─────────────────────────────────────────────────┐
│              Router（router 节点）                │
├─────────────────────────────────────────────────┤
│ 1. 分析用户意图                                  │
│ 2. 检查 context.source（用户选择的模式）         │
│ 3. 写入 session.currentAgent（legacyAgentKey）   │
└─────────────────────────────────────────────────┘
    │
    ▼
requirementAnalyzer → taskPlanner → taskChain
    │
    ▼
┌─────────────────────────────────────────────────┐
│          pluginExpert（唯一专家执行节点）          │
├─────────────────────────────────────────────────┤
│ 1. resolveExpertForSession → Registry 专家       │
│ 2. buildExpertSystemPrompt + getExpertTools      │
│ 3. LLM stream → tool_calls 循环                  │
└─────────────────────────────────────────────────┘
```

### 1.2 路由逻辑

路由仍按 **`legacyAgentKey`** 分发（`editor` / `flow` / `page` / `general`），但最终都汇入同一个 `pluginExpert` 节点：

- 如果 `context.source === 'editor'`，直接设置 `session.currentAgent = 'editor'`
- 如果 `context.source === 'flow'`，直接设置 `session.currentAgent = 'flow'`
- 否则，根据用户消息内容智能匹配 Registry 中专家的 `routing.keywords` / `routing.contextSources`

### 1.3 四个内置专家（插件配置）

| Expert ID | legacyAgentKey | 职责 | Skills |
|-----------|---------------|------|--------|
| `platform.editor` | `editor` | 生成/编辑表单 Schema | `platform.schema-quality`, `platform.reply-zh` |
| `platform.flow` | `flow` | 生成/编辑 BPMN 流程 | `platform.flow-design`, `platform.reply-zh` |
| `platform.page` | `page` | 生成页面布局 | `platform.page-layout`, `platform.reply-zh` |
| `platform.general` | `general` | 通用问答 | `platform.reply-zh` |

配置路径：`server/config/plugins/experts/*.json`

---

## 二、图节点执行流程

### 2.1 v2 完整流程

```typescript
// server/src/ai/graph/graph.ts
const graph = new StateGraph(AgentStateAnnotation)
  .addNode('router', routerNode)
  .addNode('requirementAnalyzer', requirementAnalyzerNode)
  .addNode('requirementConfirm', requirementConfirmNode)
  .addNode('taskPlanner', taskPlannerNode)
  .addNode('taskChain', taskChainNode)
  .addNode('pluginExpert', pluginExpertAgentNode)  // 唯一专家节点
  .addNode('allTools', allToolNodeWithErrorHandling)
  .addNode('afterTools', afterToolsNode)
  .addNode('summarizer', summarizerNode)
  .compile({ checkpointer })
```

**流程图**：

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

### 2.2 条件边

| 函数 | 文件 | 行为 |
|------|------|------|
| `routeAfterRequirementAnalyzer` | `requirementAnalyzer.ts` | 需确认 → `requirementConfirm`；否则 → `taskPlanner` |
| `routeAfterTaskPlanner` | `taskPlanner.ts` | → `taskChain` |
| `routeAfterTaskChain` | `graph.ts` | `summarize` → `summarizer`；否则 → `pluginExpert` |
| `afterAgent` | `graph.ts` | 有 `tool_calls` → `allTools`；任务链未完 → `taskChain`；否则 `END` / `summarizer` |
| `afterToolsRoute` | `graph.ts` | 协作 / 任务链 → `taskChain`；否则 → `pluginExpert` |

### 2.3 专家执行（`pluginExpertAgent.ts`）

```typescript
// 1. resolveExpertForSession(state.session) → Registry 专家
// 2. buildExpertSystemPrompt(expert) + getExpertTools(expert)
// 3. buildExpertUserContent(state, expert)  // Schema/Flow/协作上下文
// 4. LLM stream → 若有 tool_calls → allTools 循环
```

实现文件：`graph/pluginExpertAgent.ts`、`graph/resolveGraphExpert.ts`、`graph/expertUserContext.ts`。

---

## 三、Agent 配置

### 3.1 专家配置（插件 JSON）

专家配置通过插件中心管理，不再使用代码中的 AgentConfig：

```json
// server/config/plugins/experts/platform.editor.json
{
  "id": "platform.editor",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor",
  "tools": ["schema__search", "generate_schema", "update_schema", "save_and_bind_schema"],
  "skills": ["platform.schema-quality", "platform.reply-zh"],
  "routing": {
    "keywords": ["表单", "schema", "form"],
    "contextSources": ["editor", "standalone"]
  }
}
```

### 3.2 LLM 配置

LLM 配置通过环境变量和模型管理模块统一管理：

| 变量 | 说明 |
|------|------|
| `AI_LLM_PROVIDER` | LLM 提供商（`deepseek` / `openai` / `custom`） |
| `AI_LLM_MODEL` | 模型名称 |
| `AI_LLM_API_KEY` | API Key |
| `AI_LLM_BASE_URL` | 自定义 Base URL |

### 3.3 运行时参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `maxToolRounds` | 3 | 每轮 Agent 最大工具迭代次数 |
| `maxNodeExecutions` | 50 | 全局防死循环上限 |

---

## 四、Agent 协作

### 4.1 协作机制

通过 `request_collaboration` 工具实现 Agent 间协作：

```typescript
// pluginExpert 请求协作
const result = await toolRegistry.execute('request_collaboration', {
  targetAgent: 'flow',
  description: '需要创建一个审批流程',
  context: { schemaId: 'xxx' },
})
```

### 4.2 协作流程

```
pluginExpert (currentAgent=editor)
    │
    ├── 用户说"创建一个审批流程"
    │
    ▼
request_collaboration(targetAgent: 'flow')
    │
    ▼
afterTools 提取 collaborationRequest
    │
    ▼
taskChain 插入协作步骤 (currentAgent=flow)
    │
    ▼
pluginExpert (currentAgent=flow) 处理任务
    │
    ▼
返回结果，继续任务链
```

### 4.3 agent_switch 事件

当 Agent 切换时，会发送 `agent_switch` 事件：

```typescript
{
  type: 'agent_switch',
  agent: 'flow',
  collaboration: true,
  description: '需要创建一个审批流程'
}
```

前端根据此事件更新 UI，显示实际执行的 Agent 标签。

---

## 五、Agent 状态

### 5.1 AgentStateAnnotation

```typescript
const AgentStateAnnotation = Annotation.Root({
  // 消息列表
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // 会话信息
  session: Annotation({
    id: string,
    conversationId: string,
    currentAgent: 'editor' | 'flow' | 'page' | 'general',  // legacyAgentKey
    currentExpertId: string,  // 运行时权威专家 id
  }),

  // 上下文信息
  context: Annotation({
    source: 'editor' | 'flow' | 'page' | 'standalone',
    schemaId?: string,
    flowId?: string,
    nodeId?: string,
    currentSchema?: Record<string, unknown>[],
    currentFlow?: { nodes, edges },
    turnCount: number,
  }),

  // 任务信息
  task: Annotation({
    chain: Array<{ agent, description, status }>,
    currentStepIndex: number,
    type: string,
  }),

  // 需求分析
  requirement: Annotation({
    analysis: RequirementAnalysis | null,
    needsConfirmation: boolean,
  }),
})
```

---

## 六、关键行为

- **显式模式**：`context.source === editor|flow|page` 时跳过关键词猜测，直接进入对应专家
- **多意图**：router 检测「页面 + 表单/流程」组合时预建 task chain
- **工具循环**：每轮 Agent 最多 3 次 tool iteration；全局 `session.maxNodeExecutions` 防死循环
- **协作**：`request_collaboration` 工具 → `afterTools` 提取 → `taskChain` 插入协作步骤
- **流式传输**：WebSocket / Socket.IO，事件类型见 [events.md](./events.md)

---

## 七、最佳实践

### 7.1 专家选择

- **表单相关**：Router 自动路由到 `platform.editor` 专家
- **流程相关**：Router 自动路由到 `platform.flow` 专家
- **页面布局**：Router 自动路由到 `platform.page` 专家
- **通用问答**：Router 自动路由到 `platform.general` 专家
- **不确定**：让 Router Agent 根据 keywords 自动匹配
- **自定义**：在插件中心注册新 Expert，无需修改图代码

### 7.2 System Prompt 设计

- 明确 Agent 的职责和能力边界
- 提供清晰的工具使用说明
- 注入必要的上下文信息（Widget 元数据、Schema 规范等）
- 限制输出格式（JSON、Markdown 等）
- 通过 Skills 拼接附加指令（如 `platform.schema-quality`）

### 7.3 工具调用

- 限制最大工具调用轮次（默认 3）
- 工具调用失败时提供清晰的错误信息
- 工具结果应该简洁明了，避免冗余信息

---

## 八、代码入口

| 路径 | 职责 |
|------|------|
| `server/src/ai/graph/graph.ts` | 图编译与条件边 |
| `server/src/ai/graph/pluginExpertAgent.ts` | pluginExpert 执行逻辑 |
| `server/src/ai/graph/resolveGraphExpert.ts` | 专家解析（Registry 查找） |
| `server/src/ai/graph/expertUserContext.ts` | 领域用户上下文注入 |
| `server/src/ai/graph/requirementAnalyzer.ts` | 需求分析节点 |
| `server/src/ai/graph/taskPlanner.ts` | 任务规划节点 |
| `server/src/ai/graph/taskChain.ts` | 任务链推进节点 |
| `server/src/ai/plugins/dispatchExpert.ts` | `runRegisteredExpert` |
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Skill 拼 prompt |
| `server/config/plugins/experts/` | 专家配置 |
