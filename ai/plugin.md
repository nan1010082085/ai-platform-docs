# 插件中心（Plugin Center）

> **独立文档**：Expert / Skill / Tool / MCP 四层能力目录的配置、运行时、UI 与演进路线。  
> Chat LangGraph 与 Agent Workflow **共用**同一 Registry。

**相关**：[Expert 扩展指南](./expert-extension-guide.md) · [五项迭代完成记录](./product/ai-five-phase-iteration.md) · [Workflow 开放 API](./design/workflow-open-api.md) · 服务端配置说明 `server/config/plugins/README.md`

---

## 一、架构

```text
server/config/plugins/
  mcp/      → MCP Server 声明（inmemory / stdio / sse）
  tools/    → 工具元数据（kind: mcp | graph | http）
  skills/   → 可复用 Markdown 指令（content 或 file）
  experts/  → 专家：prompt + tools + skills + routing

         loadPluginConfig
              ↓
       PluginRegistry（内存）
              ↓
    ┌─────────┼─────────┬──────────────┐
    ↓         ↓         ↓              ↓
 LangGraph  Workflow  GET /plugins   MCP bridge
 Chat       expert节点  设计器/UI
```

| 层 | 职责 | 消费者 |
|----|------|--------|
| **MCP** | 外部/内置 MCP Server 连接声明 | `mcp/bridge.ts` |
| **Tool** | 工具名、kind、argsHint、HTTP 模板 | LangGraph tools、Workflow tool 节点 |
| **Skill** | 拼入 Expert system prompt 的附加指令 | `resolveExpertSystemPrompt` |
| **Expert** | 专家身份、工具集、路由、模型参数 | Chat 路由、Workflow `expert` 节点 |

---

## 二、配置

### 目录结构

```
server/config/plugins/
├── mcp/              # 单文件 = 一个 MCP Server
├── tools/            # 按域分组 JSON
├── experts/          # 单文件 = 一个 Expert
├── skills/           # 单文件 = 一个 Skill
├── packs/            # 可分发插件包（manifest + layers）
├── local/            # 本机覆盖（gitignore）
├── tenants/{id}/     # 租户 overlay
└── local.example/    # 复制到 local/ 后启用
```

### 加载顺序（后者覆盖同 id / name）

```text
plugins/ → plugins/local/ → plugins/tenants/{AI_PLUGIN_TENANT_ID}/ → AI_PLUGIN_CONFIG_PATH
```

| 环境变量 | 说明 |
|----------|------|
| `AI_PLUGIN_CONFIG_DIR` | 配置根，默认 `server/config` |
| `AI_PLUGIN_CONFIG_PATH` | 额外 manifest 文件或目录 |
| `AI_PLUGIN_TENANT_ID` | 启用 `plugins/tenants/{id}/` overlay |
| `AI_PLUGIN_WATCH=1` | 开发态监听 `plugins/local/` 变更 |

### Expert 关键字段

| 字段 | 说明 |
|------|------|
| `id` | 全局唯一，如 `platform.editor` |
| `legacyAgentKey` | **task chain 调度键**（见下方说明），非图节点 ID |
| `dynamicPrompt` | `editor` / `flow` / `page` / `general` |
| `tools` / `skills` | 引用的工具名、Skill id 列表 |
| `routing` | Chat 意图匹配 keywords / contextSources |
| `runtime` | `langgraph` / `workflow` |

### `legacyAgentKey` 说明

`legacyAgentKey` 是 **task chain 调度键**，用于将旧版 `currentAgent` 字符串映射到插件中心的 Expert 声明。它**不是** LangGraph 图节点 ID，也不是 Expert ID。

**类型定义**（`server/src/ai/plugins/types.ts`）：

```typescript
type LegacyAgentKey = 'editor' | 'flow' | 'page' | 'general' | 'router'
```

**职责边界**：

| 是什么 | 不是什么 |
|--------|----------|
| task chain 中 `step.agent` 的值 | LangGraph 图节点名（如 `pluginExpert`） |
| 旧版 `session.currentAgent` 的合法值 | Expert 的唯一标识（`id` 才是） |
| `PluginRegistry.getExpertByLegacyKey()` 的查找键 | Workflow 节点 ID |

**使用场景**：

1. **taskPlanner** — 生成任务链时，每个 step 的 `agent` 字段使用 `legacyAgentKey`（如 `"agent": "editor"`）
2. **LangGraph 路由** — `resolveExpertForSession` 先按 `expertId` 查找，回退到 `legacyAgentKey` 匹配
3. **Workflow 执行器** — `dispatchAgent` 将非 dotted 的 agentType 作为 `legacyAgentKey` 传给 `runRegisteredExpert`
4. **用户上下文注入** — `buildExpertUserContent` 按 `legacyAgentKey` 分支注入 Schema/Flow 上下文

**注册机制**：`PluginRegistry` 在 `registerManifest` 时将 `legacyAgentKey` 索引到 `expertsByLegacy` Map，供 `getExpertByLegacyKey()` O(1) 查找。

**配置示例**（`experts/platform.editor.json`）：

```json
{
  "id": "platform.editor",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor",
  "tools": ["schema__search", "generate_schema", ...],
  "routing": {
    "keywords": ["表单", "schema", "form"],
    "contextSources": ["editor", "standalone"]
  }
}
```

**扩展自定义 Expert 时**：只有需要参与 task chain 调度（被 taskPlanner 或 router 引用）的 Expert 才需要设置 `legacyAgentKey`。纯 Workflow 专家或独立运行的专家可以省略此字段，直接使用 `id` 引用。

---

## 三、当前生产清单（2026-07-13）

`pnpm plugin:validate`：**experts 4 · skills 4 · tools 25 · mcpServers 5**

### Experts（`plugins/experts/`）

| id | 说明 | Skills |
|----|------|--------|
| `platform.editor` | 表单 Schema | `platform.schema-quality`, `platform.reply-zh` |
| `platform.general` | 通用助手 | `platform.reply-zh` |
| `platform.flow` | BPMN 流程 | `platform.flow-design`, `platform.reply-zh` |
| `platform.page` | 页面布局 | `platform.page-layout`, `platform.reply-zh` |

### Skills（`plugins/skills/`）

| id | 说明 |
|----|------|
| `platform.reply-zh` | 默认简体中文回复 |
| `platform.schema-quality` | Schema 字段命名与必填规范 |
| `platform.flow-design` | BPMN 流程设计规范 |
| `platform.page-layout` | 页面布局规范 |

### 前端 Plugin Center（`/plugins`）

只读浏览四层 Registry；专家「专家类型」pill 标签；工具列显示 **Registry label**（回退 `getToolDisplayLabel`）。

设计器：`usePluginRegistry` → Palette 专家区 + MCP 工具区；`expert` 节点属性面板选 `expertId`。

---

## 四、运行时接入

| 消费方 | 路径 | Registry 用法 |
|--------|------|-----------------|
| **Chat LangGraph** | `graph/` + `pluginExpertAgent` | 路由专家 + `runRegisteredExpert` |
| **Workflow** | `agentWorkflowExecutor` | `expert` 节点 + `expertId` |
| **设计器** | `GET /api/ai/plugins` | Palette / ToolNodePanel |
| **Plugin Center** | 同上 | 只读 UI |
| **外部 Open API** | 执行含 expert 节点的 workflow | 配置来自 Registry，见 [workflow-open-api.md](./design/workflow-open-api.md) |

### API

```http
GET /api/ai/plugins
Authorization: Bearer <jwt>
```

返回 `{ experts, skills, tools, mcpServers }` 摘要（见 `pluginRoutes.ts`）。

---

## 五、运维 CLI

在 `server/` 目录：

```bash
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")   # 热重载 Registry
```

部署：`deploy/pack.sh --target server` 携带整个 `server/config/`。

---

## 六、代码入口

| 路径 | 职责 |
|------|------|
| `server/config/plugins/` | 分文件配置 |
| `server/src/ai/plugins/loadPluginConfig.ts` | 目录合并、热重载 |
| `server/src/ai/plugins/dispatchExpert.ts` | `runRegisteredExpert` |
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Skill 拼 prompt |
| `server/src/ai/mcp/bridge.ts` | MCP 连接（读 Registry） |
| `server/src/ai/pluginRoutes.ts` | `GET /api/ai/plugins` |
| `ai/app/src/composables/usePluginRegistry.ts` | 前端缓存与 Palette |
| `ai/app/src/views/PluginCenterView.vue` | 插件中心 UI |
| `ai/app/src/constants/agentTools.ts` | label/category **回退**（权威清单在 Registry） |

---

## 七、已完成能力

| 类别 | 项 | 状态 |
|------|-----|------|
| **配置** | 分目录 `mcp/tools/experts/skills` | ✅ |
| | `local/`、`tenants/` overlay | ✅ |
| | 热重载 SIGHUP + `AI_PLUGIN_WATCH` | ✅ |
| | `plugin:validate` / `pack` / `install` | ✅ |
| **运行时** | MCP bridge 读 Registry（inmemory/stdio/sse） | ✅ |
| | `runRegisteredExpert` + Chat `pluginExpert` | ✅ |
| | Workflow `expert` 节点 + `expertId` | ✅ |
| | http 工具统一执行器 | ✅ |
| | Router / taskPlanner 动态专家 | ✅ |
| **前端** | 设计器 Palette 动态加载 | ✅ |
| | ToolNodePanel Registry 优先 | ✅ |
| | Plugin Center 四层只读 UI + 中文工具名 | ✅ |
| | 专家类型 pill 标签（legacy 中文） | ✅ |
| **生产 Skill** | `platform.reply-zh` / `platform.schema-quality` | ✅ |
| | 挂到 general + editor expert | ✅ |
| **质量** | stdio MCP 集成测试 | ✅ |
| | CI `ai-tests.yml` plugin:validate 门禁 | ✅ |

---

## 八、待办项

| # | 项 | 状态 |
|---|-----|------|
| — | Phase F 能力层细化调研 | 见 [open-platform-roadmap.md §三](./product/open-platform-roadmap.md#三phase-f--能力层细化调研) |
| — | Prompt 四层架构文档 `prompt-architecture.md` | 调研产出，待写 |

历史 PLG 项已全部完成，见上表「已完成能力」。

本地覆盖写入：`PUT /api/ai/plugins/local/{mcp|tools|experts|skills}/{file}.json`

---

## 九、新增插件快速步骤

1. 在对应子目录新增 JSON（或复制 `local.example/`）  
2. `pnpm plugin:validate`  
3. 开发：`AI_PLUGIN_WATCH=1` 或 SIGHUP；生产：重启或 HIGUP  
4. 打开 AI `/plugins` 或设计器 Palette 确认  
5. Chat / Workflow 实测 expert 或 tool 节点

```bash
# 示例：本机启用 example.support 包
cp -R server/config/plugins/local.example server/config/plugins/local
# 编辑 experts/*.json enabled: true
pnpm plugin:validate
```

### 新增 Expert 指南

**最小配置**：

```json
{
  "id": "my.custom-expert",
  "label": "自定义专家",
  "description": "专家用途说明",
  "tools": [],
  "skills": [],
  "runtime": ["langgraph", "workflow"]
}
```

**是否需要 `legacyAgentKey`？**

| 场景 | 是否设置 |
|------|----------|
| 需要被 taskPlanner 作为任务链步骤调度 | 是，且值必须是 `LegacyAgentKey` 联合类型中的一个 |
| 需要被 LangGraph router 通过意图匹配路由 | 是（router 按 `legacyAgentKey` 写入 `session.currentAgent`） |
| 仅在 Workflow 设计器中作为 `expert` 节点使用 | 否，直接用 `id`（如 `"expertId": "my.custom-expert"`） |
| 仅通过 API 或 `runRegisteredExpert` 显式调用 | 否，传 `{ expertId: "my.custom-expert" }` 即可 |

**注意**：`legacyAgentKey` 的合法值是固定枚举（`editor` | `flow` | `page` | `general` | `router`），不能自定义新值。如果需要全新的调度维度，应使用 `expertId` 作为调度键，而非扩展 `legacyAgentKey`。

完整扩展指南见 [Expert 扩展指南](./expert-extension-guide.md)。
