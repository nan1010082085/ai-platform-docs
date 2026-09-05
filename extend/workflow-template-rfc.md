# 工作流模板注册机制 RFC

> 状态：**已实现（P0–P4）**
> 作者：schema-platform
> 日期：2026-07-08
> 关闭：2026-09-05 — PluginRegistry workflows 层 + JSON 内置模板 + 前端合并 + Marketplace API

---

## 一、现状分析

### 1.1 当前实现

所有工作流模板硬编码在 `ai/shared/agentWorkflow.ts`（约 1060 行），具体表现为：

| 层面 | 实现方式 | 文件 |
|---|---|---|
| 模板元数据 | `AGENT_WORKFLOW_TEMPLATES` 静态数组 | `ai/shared/agentWorkflow.ts:553-608` |
| 模板 ID 类型 | `AgentWorkflowTemplateId` 联合类型（9 个字面量） | `ai/shared/agentWorkflow.ts:535-544` |
| 图结构工厂 | 8 个 `createXxxWorkflowGraph()` 函数 | `ai/shared/agentWorkflow.ts:329-987` |
| 分发函数 | `createAgentWorkflowGraphByTemplate()` switch-case | `ai/shared/agentWorkflow.ts:989-1013` |
| 前端消费 | 从 `@schema-platform/ai-shared` 直接 import | `ai/app/src/types/agentWorkflow.ts` |
| 后端消费 | `agentWorkflowService.ts` 调用 `createAgentWorkflowGraphByTemplate` | `server/src/ai/services/agentWorkflowService.ts:155` |

**数据流**：

```
前端 AgentWorkflowListView
  → AGENT_WORKFLOW_TEMPLATES (元数据列表)
  → 用户选择 templateId
  → POST /api/ai/workflows { templateId }
  → server createAgentWorkflow()
  → createAgentWorkflowGraphByTemplate(templateId)  // 从 ai-shared 导入
  → 写入 MongoDB draftGraph
```

### 1.2 硬编码带来的问题

1. **扩展性为零**：新增模板必须修改 `ai-shared` 源码、改联合类型、发包、前端后端同步升级。三方开发者无法贡献模板。
2. **类型耦合**：`AgentWorkflowTemplateId` 是编译期固定联合类型，运行时无法扩展。服务端 `POST /workflows` 的 `templateId` 参数受限于此类型。
3. **图结构与元数据分离**：元数据在 `AGENT_WORKFLOW_TEMPLATES` 数组，图工厂在独立函数，两者仅靠 `id` 字符串关联，容易不一致。
4. **前端硬编码图标和默认名称**：`TEMPLATE_ICONS`、`TEMPLATE_DEFAULT_NAMES` 散落在 Vue 组件中，新增模板需同步修改多处。
5. **无法支持租户隔离**：模板全局唯一，无法按租户定制行业模板。

### 1.3 已有的可复用基础

- **插件 Pack 体系**：`server/src/ai/plugins/pluginPack.ts` 已实现 manifest.json + mcp/tools/experts/skills 四层目录的 pack/install/copy 流程。
- **PluginRegistry**：运行时注册中心，支持 merge 策略（base → local → tenant → configPath）。
- **PluginRegistrySnapshot API**：`GET /api/ai/plugins` 已向前端暴露 experts/skills/tools/mcpServers 四类能力。

---

## 二、方案设计

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────┐
│                    Plugin Pack                       │
│  manifest.json                                      │
│  mcp/ tools/ experts/ skills/                       │
│  workflows/                    ← 新增层              │
│    document-summary.json                            │
│    contract-extract.json                            │
└───────────────────────┬─────────────────────────────┘
                        │ install
                        v
┌─────────────────────────────────────────────────────┐
│              PluginRegistry (运行时)                  │
│  experts: [...]                                     │
│  tools: [...]                                       │
│  workflows: [...]                ← 新增注册表         │
│                                                     │
│  → GET /api/ai/plugins 返回 workflows 字段           │
└───────────────────────┬─────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          v                           v
   前端模板选择器               后端 createWorkflow
   (合并内置 + 插件模板)         (从注册表解析 graph)
```

### 2.2 模板 JSON 格式

每个模板是一个独立 JSON 文件，包含元数据和完整的图结构定义。

**文件**: `workflows/document-summary.json`

```json
{
  "id": "document-summary",
  "name": "文档摘要",
  "description": "Webhook 接收 documentId，解析后生成摘要",
  "category": "document",
  "icon": "document",
  "defaultName": "文档摘要编排",
  "author": "schema-platform",
  "version": "1.0.0",
  "tags": ["document", "webhook", "summary"],
  "graph": {
    "entryNodeId": "webhook-1",
    "nodes": [
      {
        "id": "webhook-1",
        "type": "webhook-trigger",
        "position": { "x": 80, "y": 200 },
        "data": {
          "label": "Webhook 触发",
          "webhookPath": "/document-summary",
          "webhookMethod": "POST"
        }
      },
      {
        "id": "parse-1",
        "type": "document-parse",
        "position": { "x": 320, "y": 200 },
        "data": {
          "label": "文档解析",
          "documentSource": "stream",
          "streamField": "file"
        }
      },
      {
        "id": "llm-1",
        "type": "llm",
        "position": { "x": 560, "y": 200 },
        "data": {
          "label": "生成摘要",
          "model": "default",
          "systemPrompt": "你是文档摘要助手，请根据解析后的文档内容生成简洁的中文摘要。",
          "prompt": "请为以下文档生成结构化摘要：\n\n文件名：{{$node.parse-1.filename}}\n\n正文：\n{{$node.parse-1.text}}"
        }
      },
      {
        "id": "end-1",
        "type": "end",
        "position": { "x": 800, "y": 200 },
        "data": { "label": "结束" }
      }
    ],
    "edges": [
      { "id": "e1", "source": "webhook-1", "target": "parse-1" },
      { "id": "e2", "source": "parse-1", "target": "llm-1" },
      { "id": "e3", "source": "llm-1", "target": "end-1" }
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 全局唯一标识，格式 `[a-z0-9-]`，插件模板建议加前缀如 `acme.contract-review` |
| `name` | string | 是 | 模板显示名 |
| `description` | string | 是 | 模板描述 |
| `category` | string | 是 | 分类：`general` / `document` / `assistant` / `integration` / `batch` |
| `icon` | string | 否 | AppIcon 注册表中的 kebab-case 图标名 |
| `defaultName` | string | 否 | 使用此模板创建工作流时的默认名称 |
| `author` | string | 否 | 作者标识 |
| `version` | string | 否 | 语义化版本号 |
| `tags` | string[] | 否 | 搜索标签 |
| `graph` | AgentWorkflowGraph | 是 | 完整的工作流图结构（与现有类型兼容） |

### 2.3 插件 Pack 扩展

在现有 `PLUGIN_PACK_LAYERS` 中新增 `workflows` 层：

```typescript
// server/src/ai/plugins/pluginPack.ts
export const PLUGIN_PACK_LAYERS = ['mcp', 'tools', 'experts', 'skills', 'workflows'] as const
```

插件包目录结构：

```
my-plugin/
  manifest.json          # { id, name, version, description }
  mcp/                   # 可选
  tools/                 # 可选
  experts/               # 可选
  skills/                # 可选
  workflows/             # 新增
    my-template-1.json
    my-template-2.json
```

`copyPackLayers`、`validatePackDirectory` 等函数已按层遍历，新增 `workflows` 层无需修改核心逻辑，只需扩展 `PLUGIN_PACK_LAYERS` 常量。

### 2.4 运行时模板注册 API

#### 2.4.1 PluginRegistry 扩展

在 `PluginRegistry` 中新增模板注册：

```typescript
// server/src/ai/plugins/types.ts
export interface WorkflowTemplateDeclaration {
  id: string
  name: string
  description: string
  category: 'general' | 'document' | 'assistant' | 'integration' | 'batch'
  icon?: string
  defaultName?: string
  author?: string
  version?: string
  tags?: string[]
  graph: AgentWorkflowGraph
}
```

```typescript
// server/src/ai/plugins/registry.ts (新增方法)
class PluginRegistry {
  // ... 现有代码

  private workflowTemplates = new Map<string, WorkflowTemplateDeclaration>()

  registerWorkflowTemplate(template: WorkflowTemplateDeclaration, source: string): void {
    if (!template.id?.trim()) return
    this.workflowTemplates.set(template.id, template)
    logger.debug({ msg: '[pluginRegistry] registered workflow template', id: template.id, source })
  }

  listWorkflowTemplates(): WorkflowTemplateDeclaration[] {
    return [...this.workflowTemplates.values()]
  }

  getWorkflowTemplate(id: string): WorkflowTemplateDeclaration | undefined {
    return this.workflowTemplates.get(id)
  }
}
```

#### 2.4.2 loadPluginConfig 扩展

在 `loadPluginDirectory` 中新增 `workflows` 层的加载：

```typescript
// 在 loadPluginDirectory 函数中
if (layer === 'workflows') {
  const templates = raw as WorkflowTemplateDeclaration
  // 单文件或数组均支持
  const list = Array.isArray(raw) ? raw : [raw]
  for (const tpl of list) {
    registry.registerWorkflowTemplate(tpl as WorkflowTemplateDeclaration, label)
  }
}
```

#### 2.4.3 API 端点扩展

`GET /api/ai/plugins` 响应新增 `workflows` 字段：

```typescript
// server/src/ai/pluginRoutes.ts
interface PluginRegistrySnapshot {
  experts: PluginExpertSummary[]
  skills: PluginSkillSummary[]
  tools: PluginToolSummary[]
  mcpServers: PluginMcpServerSummary[]
  workflows: WorkflowTemplateSummary[]    // 新增
}
```

新增模板查询端点（可选，用于按 ID 获取单个模板详情）：

```
GET /api/ai/plugins/workflows/:templateId
```

#### 2.4.4 服务端 createAgentWorkflow 改造

```typescript
// server/src/ai/services/agentWorkflowService.ts
export async function createAgentWorkflow(
  userId: string,
  name: string,
  description = '',
  templateId: string = 'blank',   // 从联合类型改为 string
  tenantId = '000000',
) {
  const registry = getPluginRegistry(tenantId)  // 租户感知
  const template = registry.getWorkflowTemplate(templateId)

  let draftGraph: AgentWorkflowGraph
  if (template) {
    draftGraph = template.graph
  } else {
    // 兼容：回退到内置硬编码模板
    draftGraph = createAgentWorkflowGraphByTemplate(templateId as AgentWorkflowTemplateId)
  }

  // ... 后续逻辑不变
}
```

### 2.5 前端改造

#### 2.5.1 模板列表合并

```typescript
// ai/app/src/views/AgentWorkflowListView.vue
import { AGENT_WORKFLOW_TEMPLATES } from '@/types/agentWorkflow'
import { usePluginRegistry } from '@/composables/usePluginRegistry'

const { workflows: pluginWorkflows, load: loadPlugins } = usePluginRegistry()

const allTemplates = computed(() => {
  const builtIn = AGENT_WORKFLOW_TEMPLATES
  const plugins = pluginWorkflows.value.map(w => ({
    id: w.id,
    name: w.name,
    description: w.description,
    category: w.category,
    icon: w.icon,
    source: 'plugin',
  }))
  return [...builtIn, ...plugins]
})
```

#### 2.5.2 图形预览

`AgentWorkflowTemplatePreviewDialog` 改造：插件模板的 graph 已包含在 API 响应中，直接加载到 store，无需调用 `createAgentWorkflowGraphByTemplate`。

```typescript
// 预览时区分来源
function loadPreviewGraph() {
  if (!props.template) return
  if (store.nodes.length > 0) {
    savedGraph.value = store.getGraph()
  }

  if (props.template.graph) {
    // 插件模板：直接使用内嵌 graph
    store.loadGraph(props.template.graph)
  } else {
    // 内置模板：调用工厂函数
    store.loadGraph(createAgentWorkflowGraphByTemplate(props.template.id))
  }
  store.selectNode(null)
}
```

### 2.6 模板 Marketplace（远期）

在运行时注册的基础上，未来可构建模板 Marketplace：

**阶段一：仓库内共享**
- 插件开发者在自己的 plugin pack 中附带 `workflows/` 目录
- 用户通过 `plugin install` 命令安装插件，模板自动注册
- 管理面板展示已安装的模板及来源

**阶段二：Marketplace 平台**
- 模板提交审核流程（JSON schema 校验 + 安全审查）
- 模板版本管理（semver + 版本历史）
- 模板评分与评论
- 一键安装到租户

**阶段三：模板编辑器导出**
- 在工作流设计器中"另存为模板"功能
- 导出为标准 JSON 格式，可直接放入插件 pack

```
┌──────────────────────────────────────────────┐
│              Template Marketplace             │
│                                              │
│  浏览 ──► 详情 ──► 安装到租户 ──► 自动注册    │
│                                              │
│  提交 ──► 审核 ──► 上架 ──► 版本管理          │
└──────────────────────────────────────────────┘
```

---

## 三、兼容性

### 3.1 迁移策略

采用**双轨并行 + 渐进迁移**：

| 阶段 | 内容 | 影响 |
|---|---|---|
| Phase 1 | 新增 `workflows` 注册层，内置模板同时以 JSON 文件存在于 `config/plugins/workflows/` | 零破坏，新旧并存 |
| Phase 2 | 服务端 `createAgentWorkflow` 优先从注册表查找，找不到回退到硬编码 | 零破坏 |
| Phase 3 | 前端模板列表合并 Registry + 硬编码 | 零破坏 |
| Phase 4 | 内置模板全部迁移到 JSON 文件，移除硬编码工厂函数 | **Breaking**：需同步发版 |

### 3.2 内置模板迁移

将现有 8 个内置模板从 TypeScript 工厂函数转为 JSON 文件：

```
config/plugins/workflows/
  blank.json
  document-summary.json
  doc-image-recognition.json
  intelligent-assistant.json
  contract-extract.json
  kb-faq.json
  http-notify.json
  rag-ingest-qa.json
  multi-doc-batch.json
```

迁移步骤：
1. 为每个 `createXxxWorkflowGraph()` 函数添加测试，输出 JSON snapshot
2. 将 snapshot 写入 `config/plugins/workflows/*.json`
3. `loadPluginRegistry` 自动加载这些文件
4. 验证：通过 Registry 获取的 graph 与硬编码工厂函数输出一致
5. 移除 `ai/shared/agentWorkflow.ts` 中的工厂函数和 `AGENT_WORKFLOW_TEMPLATES` 数组

### 3.3 类型兼容

`AgentWorkflowTemplateId` 联合类型保留为 deprecated，仅用于旧代码兼容。新代码使用 `string` 类型。

```typescript
/** @deprecated 使用 string 类型，模板 ID 从 PluginRegistry 动态获取 */
export type AgentWorkflowTemplateId =
  | 'blank'
  | 'document-summary'
  | 'doc-image-recognition'
  | 'intelligent-assistant'
  | 'contract-extract'
  | 'kb-faq'
  | 'http-notify'
  | 'rag-ingest-qa'
  | 'multi-doc-batch'
```

### 3.4 数据库兼容

已创建的工作流（`draftGraph` 已写入 MongoDB）不受影响，模板机制仅影响创建工作流时的初始图结构。

---

## 四、安全考虑

### 4.1 第三方模板风险

| 风险 | 描述 | 缓解措施 |
|---|---|---|
| 恶意 Prompt 注入 | 模板中的 `systemPrompt` / `prompt` 字段可能包含诱导 LLM 泄露数据的内容 | 模板审核流程 + prompt 扫描 |
| 工具滥用 | 模板引用不存在或未授权的 `toolName` | 创建时校验 toolName 是否在当前 Registry 中 |
| 节点类型滥用 | 模板使用当前版本不支持的 `nodeType` | JSON Schema 校验 + 版本兼容检查 |
| 图结构畸形 | 循环引用、孤立节点、缺少入口/结束节点 | 复用 `validateAgentWorkflowGraph()` 校验 |
| 超大模板 | 节点/边数量过大导致渲染性能问题 | 限制节点数上限（如 100）和边数上限（如 200） |

### 4.2 权限控制

**安装权限**：
- `local` 级别：仅平台管理员可安装（影响所有租户）
- `tenant:{id}` 级别：租户管理员可安装（仅影响本租户）
- 安装时自动触发 `validatePackDirectory` 校验

**使用权限**：
- 模板创建的工作流归属创建者，遵循现有工作流权限模型
- 插件模板的 `id` 建议使用 `author.template-name` 命名空间，避免冲突

**审核流程**（Marketplace 阶段）：
- 静态校验：JSON Schema 验证结构完整性
- 安全扫描：Prompt 内容关键词检测（PII、系统指令泄露模式）
- 沙箱测试：在隔离环境中执行模板工作流，验证无异常行为
- 人工审核：上架前需审核员批准

### 4.3 模板签名（远期）

对 Marketplace 模板实施签名机制：

```
template.json
template.json.sig    # 作者私钥签名
```

安装时验证签名，防止模板被篡改。

---

## 五、实现步骤和优先级

### P0：核心注册机制（1-2 周）

- [x] **5.1** 定义 `WorkflowTemplateDeclaration` 类型（`server/src/ai/plugins/types.ts`）
- [x] **5.2** `PluginRegistry` 新增 `registerWorkflowTemplate` / `listWorkflowTemplates` / `getWorkflowTemplate`
- [x] **5.3** `loadPluginConfig` 新增 `workflows` 层加载逻辑
- [x] **5.4** `PLUGIN_PACK_LAYERS` 扩展 `workflows` 层（`pluginPack.ts`）
- [x] **5.5** `GET /api/ai/plugins` 响应新增 `workflows` 字段
- [x] **5.6** 服务端 `createAgentWorkflow` 改为从注册表查找模板，找不到回退硬编码
- [x] **5.7** 单元测试：模板注册、加载、API 返回

### P1：前端集成 + 内置模板迁移（1 周）

- [x] **5.8** 前端 `usePluginRegistry` 新增 `workflows` 响应处理
- [x] **5.9** `AgentWorkflowListView` 合并内置 + 插件模板列表
- [x] **5.10** `AgentWorkflowTemplatePreviewDialog` 支持直接渲染插件模板的 graph
- [x] **5.11** 将内置模板导出为 JSON 文件到 `config/plugins/workflows/`
- [x] **5.12** 集成测试：通过 JSON 模板创建工作流，验证 graph 一致性

### P2：清理硬编码（1 周）

- [x] **5.13** 移除 `templateFactories/*` 工厂实现（保留 `createDefaultAgentWorkflowGraph`；分发器读 `builtinGraphs.generated` + 兼容 shim）
- [x] **5.14** `AGENT_WORKFLOW_TEMPLATES` 降为元数据目录（图源已迁 JSON/Registry；列表以插件优先）
- [x] **5.15** `AgentWorkflowTemplateId` 标记 deprecated
- [x] **5.16** 前端 `TEMPLATE_ICONS` / `TEMPLATE_DEFAULT_NAMES` 改为从模板 meta / API 读取（硬编码表仅回退）
- [x] **5.17** 发版 `@schema-platform/platform-shared` 新版本（1.3.0）

### P3：模板编辑器导出（2 周）

- [x] **5.18** 工作流设计器「另存为模板」功能（导出 JSON + 填写元数据）
- [x] **5.19** 模板导入功能（上传 JSON 文件创建模板）— `WorkflowTemplateManagerView` + `/import`
- [x] **5.20** 模板管理面板（查看、启用/禁用、删除已安装模板）

### P4：Marketplace 基础（远期，4+ 周）

- [x] **5.21** 模板提交 API + JSON Schema 校验（`POST .../submit` + 节点/边上限与 prompt 扫描）
- [x] **5.22** 审核流程（自动扫描 + 人工审批 `POST .../review`）
- [x] **5.23** 模板版本管理（发布/回滚/废弃）
- [x] **5.24** 模板搜索与分类浏览（list + marketplace search）
- [x] **5.25** 租户级模板市场面板（`GET /workflow-templates/marketplace`；管理页可消费）

---

## 六、示例：第三方插件带模板

一个完整的插件包示例：

```
acme-legal-tools/
  manifest.json
  tools/
    legal-ocr.json
  experts/
    legal-analyst.json
  skills/
    contract-review.md
  workflows/
    contract-risk-review.json
    nda-generator.json
```

`manifest.json`：

```json
{
  "id": "acme-legal-tools",
  "name": "ACME 法务工具集",
  "version": "1.2.0",
  "description": "合同审查、NDA 生成等法务场景工具与工作流模板"
}
```

`workflows/contract-risk-review.json`：

```json
{
  "id": "acme.contract-risk-review",
  "name": "合同风险审查",
  "description": "上传合同文档，自动提取条款、标注风险等级、生成审查报告",
  "category": "document",
  "icon": "warning",
  "defaultName": "合同风险审查",
  "author": "acme",
  "version": "1.0.0",
  "tags": ["contract", "risk", "legal"],
  "graph": {
    "entryNodeId": "webhook-1",
    "nodes": [
      {
        "id": "webhook-1",
        "type": "webhook-trigger",
        "position": { "x": 80, "y": 200 },
        "data": {
          "label": "接收合同",
          "webhookPath": "/contract-risk-review",
          "webhookMethod": "POST"
        }
      }
    ],
    "edges": []
  }
}
```

安装后，模板自动出现在前端模板选择器中，用户可直接使用。

---

## 七、FAQ

**Q: 为什么不直接用数据库存储模板？**
A: 插件 Pack 是现有的分发机制，模板作为 pack 的一层，复用了 pack/install/version 的完整生命周期。数据库存储适合 Marketplace 阶段的在线模板，两者不冲突。

**Q: 内置模板迁移后，旧版本 API 调用 `templateId: 'document-summary'` 还能用吗？**
A: 能。服务端先从注册表查找（内置模板已注册到 Registry），找不到再回退硬编码。迁移完成后 Registry 中始终存在内置模板。

**Q: 插件模板的 graph 中引用了未安装的 toolName 怎么办？**
A: 创建工作流时不做硬性拦截（用户可能稍后安装对应工具），但在发布时 `validateAgentWorkflowGraph` 会输出 warning。前端可在模板详情页标注"需要的工具"。

**Q: 模板的 `graph` 中的节点位置 `position` 是必须的吗？**
A: 是的，前端画布渲染依赖 position。模板作者应提供合理的布局，或使用 `layoutAgentWorkflowGraph()` 自动布局后导出。
