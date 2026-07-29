# Expert 扩展指南

> 本文档说明如何在插件中心新增自定义 Expert，以及 `legacyAgentKey` 在 task chain 调度中的角色。

**相关**：[plugin.md](./plugin.md) · [architecture.md](./architecture.md) · [plugin-registry.md](./plugin-registry.md)

---

## 一、核心概念

### 1.1 Expert 与图节点的关系

LangGraph Chat 图中**只有一个**专家执行节点：`pluginExpert`。所有 Expert（包括内置四专家和第三方自定义专家）都通过 `pluginExpert` 节点执行，由 `session.currentExpertId` 决定当前运行哪个 Expert。

```text
Router → pluginExpert（唯一节点）→ LLM + Tools → 响应
              ↑
        resolveExpertForSession(expertId 或 legacyAgentKey)
```

Expert **不是**图节点。新增 Expert 只需添加配置 JSON，无需修改图结构。

### 1.2 两个 Key 的区别

| Key | 用途 | 谁来定 | 示例 |
|-----|------|--------|------|
| `id` | Expert 唯一标识，Registry 全局索引 | 配置者（必须唯一） | `platform.editor`、`acme.approval-expert` |
| `legacyAgentKey` | task chain 调度键，与旧版 `currentAgent` 对齐 | 配置者（可选，枚举值） | `editor`、`flow`、`page`、`general` |

**关键区别**：`id` 是 Expert 的身份标识，用于 `session.currentExpertId` 和 Workflow `expert` 节点的 `expertId` 字段。`legacyAgentKey` 是调度快捷键，仅用于 task chain 中 `step.agent` 的值和旧版路由兼容。

---

## 二、`legacyAgentKey` 详解

### 2.1 类型定义

```typescript
// server/src/ai/plugins/types.ts
type LegacyAgentKey = 'editor' | 'flow' | 'page' | 'general' | 'router'
```

固定枚举，不可扩展。自定义 Expert 如需参与 task chain 调度，只能映射到这五个值之一。

### 2.2 它是什么

- **task chain 调度键** — taskPlanner 生成任务链时，每个 `step.agent` 字段使用 `legacyAgentKey` 值
- **旧版兼容桥梁** — 旧版 `session.currentAgent` 存储的是 `'editor'`/`'flow'`/`'page'`/`'general'` 字符串，`legacyAgentKey` 让 Registry 能通过这个字符串找到对应的 Expert 声明
- **用户上下文分发键** — `buildExpertUserContent` 按 `legacyAgentKey` 分支决定注入 Schema 上下文还是 Flow 上下文

### 2.3 它不是什么

- **不是图节点名** — 图节点固定为 `pluginExpert`，不会因新增 Expert 而变化
- **不是 Expert ID** — Expert 的唯一标识是 `id` 字段，`legacyAgentKey` 只是查找的辅助键
- **不是 Workflow 节点 ID** — Workflow 的 `expert` 节点通过 `expertId`（即 `id`）引用，与 `legacyAgentKey` 无关

### 2.4 使用场景全览

| 场景 | 入口 | 查找逻辑 |
|------|------|----------|
| taskPlanner 生成任务链 | `taskPlannerNode` | LLM 输出 `step.agent = "editor"`，taskChain 执行时按此调度 |
| LangGraph Chat 路由 | `resolveExpertForSession` | 先按 `expertId` 查找，回退到 `legacyAgentKey` 匹配 |
| Workflow 执行器 | `agentWorkflowExecutor` | 非 dotted agentType 作为 `legacyAgentKey` 传给 `runRegisteredExpert` |
| 用户上下文注入 | `buildExpertUserContent` | 按 `legacyAgentKey` 分支：`flow` → Flow 上下文，`editor`/`page` → Schema 上下文 |
| 前端专家 pill 标签 | `usePluginRegistry` | `legacyAgentKey` 映射中文标签（编辑器/流程/页面/通用） |
| Router 排除通用专家 | `matchExpertsByRouting` | `legacyAgentKey === 'general'` 的专家跳过关键词匹配 |

### 2.5 注册机制

`PluginRegistry.registerManifest` 在加载配置时，将设置了 `legacyAgentKey` 的 Expert 索引到 `expertsByLegacy` Map：

```typescript
// registry.ts
if (item.legacyAgentKey) {
  this.expertsByLegacy.set(item.legacyAgentKey, item)
}
```

后续 `getExpertByLegacyKey(key)` 做 O(1) 查找。如果两个 Expert 声明了同一个 `legacyAgentKey`，后者覆盖前者（按加载顺序）。

---

## 三、新增 Expert 步骤

### 3.1 基本配置

在 `server/config/plugins/experts/` 下新建 JSON 文件：

```json
{
  "id": "acme.approval-expert",
  "label": "审批流程专家",
  "description": "专注于审批流程设计与优化",
  "tools": ["flow__search", "flow__get_detail", "generate_flow"],
  "skills": ["platform.flow-design", "platform.reply-zh"],
  "routing": {
    "keywords": ["审批", "approval", "流程优化"],
    "contextSources": ["standalone"],
    "priority": 5
  },
  "model": {
    "task": "generate_complex",
    "temperature": 0.5
  },
  "runtime": ["langgraph"],
  "enabled": true
}
```

### 3.2 是否需要 `legacyAgentKey`

**需要设置**的情况：

- 该 Expert 要参与 taskPlanner 生成的任务链（被 LLM 选为某个 step 的执行者）
- 该 Expert 要替换某个内置专家的职责（如用自定义 editor 专家替代内置 `platform.editor`）
- 该 Expert 需要被旧版 `context.source` 显式路由命中

**不需要设置**的情况：

- 该 Expert 仅通过 `expertId` 显式引用（如 Workflow `expert` 节点）
- 该 Expert 仅通过 `routing.keywords` 被 Chat 路由自动匹配
- 该 Expert 独立运行，不参与多步任务链

### 3.3 映射到已有 `legacyAgentKey`

如果自定义 Expert 要替代内置专家在 task chain 中的角色，设置对应的 `legacyAgentKey`：

```json
{
  "id": "acme.custom-editor",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor",
  "tools": ["schema__search", "generate_schema"],
  "routing": {
    "keywords": ["表单", "schema"],
    "contextSources": ["editor", "standalone"]
  }
}
```

此时 taskPlanner 输出 `"agent": "editor"` 时，会路由到 `acme.custom-editor` 而非内置 `platform.editor`（后注册覆盖先注册）。

### 3.4 验证

```bash
cd server/
pnpm plugin:validate
```

确认新 Expert 出现在校验输出中，无冲突警告。

---

## 四、完整示例：自定义行业专家

### 4.1 配置文件

`server/config/plugins/experts/acme.healthcare.json`：

```json
{
  "id": "acme.healthcare",
  "label": "医疗行业专家",
  "description": "生成符合医疗行业规范的表单和流程",
  "tools": ["schema__search", "schema__get_detail", "generate_schema", "flow__search", "generate_flow"],
  "skills": ["platform.schema-quality", "platform.reply-zh"],
  "routing": {
    "keywords": ["医疗", "病历", "处方", "hospital", "patient"],
    "contextSources": ["standalone"],
    "priority": 10
  },
  "model": {
    "task": "generate_complex",
    "temperature": 0.3
  },
  "runtime": ["langgraph"],
  "enabled": true
}
```

此专家没有设置 `legacyAgentKey`，因为它：
- 通过 `routing.keywords` 被 Chat 自动匹配
- 通过 `expertId` 被 Workflow 显式引用
- 不参与 taskPlanner 的多步任务链（用户说"创建病历表单"时，router 直接命中此专家，不走 task chain）

### 4.2 如果需要参与 task chain

若希望"创建医疗系统，包含病历表单和审批流程"这种多步需求也能调度到此专家：

```json
{
  "id": "acme.healthcare",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor"
}
```

映射到 `editor` 后，taskPlanner 输出 `"agent": "editor"` 时会路由到此专家。注意这会覆盖内置 `platform.editor`，确保这符合预期。

---

## 五、常见问题

### Q: 自定义 Expert 能否有自己的 `legacyAgentKey`？

不能。`LegacyAgentKey` 是固定枚举（`editor`/`flow`/`page`/`general`/`router`），不可扩展。自定义 Expert 只能映射到已有值，或不设置此字段。

### Q: 两个 Expert 设置同一个 `legacyAgentKey` 会怎样？

后加载的覆盖先加载的。加载顺序为 `plugins/` → `plugins/local/` → `plugins/tenants/{id}/` → `AI_PLUGIN_CONFIG_PATH`，同目录内按文件名字母序。可通过 `local/` 覆盖内置专家。

### Q: taskPlanner 输出的 `agent` 值不在 `legacyAgentKey` 枚举中怎么办？

taskPlanner 的 `agent` 字段会作为字符串传给 `dispatchAgent`。如果值包含 `.`（如 `acme.healthcare`），会被当作 `expertId` 直接查找；否则作为 `legacyAgentKey` 查找。两种路径都能正确路由到 Expert。

### Q: `router` 作为 `legacyAgentKey` 有什么用？

`router` 是为内置路由节点预留的值，当前生产 Expert 中没有使用。自定义 Expert 不应设置此值。
