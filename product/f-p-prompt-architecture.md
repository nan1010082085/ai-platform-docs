# Phase F — Prompt 层专项调研 (F-P1 ~ F-P4)

> 调研日期：2026-07-08
> 调研范围：ai/shared/promptBuilder.ts、server/src/ai/plugins/、server/config/plugins/、ai/app/src/components/AiChatPanel.vue

---

## 一、当前 Prompt 五层架构总览

| 层 | 位置 | 职责 | 依赖 |
|---|---|---|---|
| L1 Domain promptBuilder | `ai/shared/promptBuilder.ts` | 从 metadata.json 生成 Editor/Flow/Page system prompt | WidgetAIMetadata、FlowNodeAIMetadata、systemKnowledge、toolNames |
| L2 Expert dynamicPrompt | `server/config/plugins/experts/*.json` | 声明 `dynamicPrompt: 'editor' | 'flow' | 'page'` 触发 L1 | L1 promptBuilder |
| L3 Expert systemPrompt + Skill | `server/config/plugins/experts/*.json` + `skills/*.json` | 静态 systemPrompt 内联 + Skill 拼装 | Skill content (Markdown)、Skill tools |
| L4 Workflow 节点级 prompt | `AgentWorkflowNodeData.prompt` / `.systemPrompt` | LLM 节点自定义 prompt；Expert 节点走 L2/L3 | L2/L3 (expert) 或自定义 (llm) |
| L5 Chat starter | `ai/app/src/components/AiChatPanel.vue` L205 | 硬编码 4 条引导语 | 无 |

解析链路（运行时）：

```
Expert JSON declaration
  ├─ dynamicPrompt → L1 promptBuilder(metadata) → base
  ├─ systemPrompt  → base (无 dynamicPrompt 时)
  └─ skills[]      → Skill content 拼接 → appended

最终 systemPrompt = base + skillBlocks.join('\n\n')
```

代码入口：`server/src/ai/plugins/resolveExpertPrompt.ts` → `resolveExpertSystemPrompt()`

---

## 二、F-P1：开源版是否剥离 promptBuilder 对 editor/flow 的强依赖？

### 现状分析

promptBuilder.ts 与平台元数据强耦合：

1. **输入依赖**：`buildEditorSystemPrompt(metadata)` / `buildFlowSystemPrompt(metadata)` 需要完整的 `Metadata` 对象，其中 `widgets[]` 来自 editor 的 Widget config 提取脚本，`flowNodes[]` 来自 flow-shared 的节点定义
2. **内容耦合**：prompt 中嵌入了 49 种 Widget 的 type/name/keyProps 表格、事件系统、联动系统、变量系统、API 配置等平台专有知识
3. **工具耦合**：prompt 中硬编码了 MCP 工具名（schema__search、flow__validate 等）
4. **输出格式耦合**：XML 标签协议（`<think>`、`<answer>`、`<schema>`）是平台自定义格式

**强依赖项清单**：

| 依赖项 | 来源 | 开源剥离难度 |
|---|---|---|
| `WidgetAIMetadata[]` | editor widget configs 提取 | 高 — 需要替代数据源或声明接口 |
| `FlowNodeAIMetadata[]` | flow-shared 节点定义 | 高 — 同上 |
| `systemKnowledge.ts` | 事件/联动/变量/数据源常量 | 中 — 可提取为独立配置 |
| `toolNames.ts` | MCP 工具名常量 | 低 — 可参数化 |
| XML 输出格式协议 | prompt 内硬编码 | 低 — 可模板化 |

### 结论

**当前不可直接剥离**。promptBuilder 是平台元数据的"消费者"，其价值恰恰在于把 editor/flow 的组件体系知识注入 AI。开源版要做的是：

1. **声明接口隔离**：定义 `PromptMetadataProvider` 接口，让 promptBuilder 依赖接口而非具体 metadata 实现
2. **模板化**：将 Widget 表格、节点表格等动态部分提取为模板变量，静态部分（规则、示例）保留
3. **提供默认空实现**：开源版可附带一个精简的 metadata 示例，不依赖 editor/flow 构建链

**建议**：不做"剥离"，做"接口化"。promptBuilder 保留为 ai-shared 的核心能力，但通过接口解耦数据源。开源用户替换 metadata provider 即可接入自己的组件体系。

---

## 三、F-P2：server 的 prompts DB 模块与 Plugin Skill 合并还是并存？

### 现状分析

**prompts DB 模块**（`server/src/ai/config/promptTemplates.ts`）：

- 5 个内置模板：Schema 生成、Schema 修改、流程生成、代码解释、Schema 优化建议
- `renderTemplate()` 支持 `{{variable}}` 和 `{{#conditional}}` 语法
- 设计上是"可复用的 prompt 片段模板"，用户可选模板填充变量后发送

**Plugin Skill 系统**（`server/config/plugins/skills/`）：

- 4 个内置 Skill：schema-quality、page-layout、flow-design、reply-zh
- Skill 是"注入 Expert system prompt 的附加知识块"
- 内联 Markdown content，可附带 tools 引用
- 运行时自动拼接到 Expert 的 system prompt

**两者关系对比**：

| 维度 | prompts DB | Plugin Skill |
|---|---|---|
| 定位 | 用户侧 prompt 模板 | 系统侧 prompt 注入 |
| 消费者 | 用户选择模板 → 填变量 → 发送消息 | Expert 运行时自动注入 systemPrompt |
| 存储 | DB 模型（可 CRUD） | 配置文件 JSON（热重载） |
| 渲染时机 | 用户发送前 | Expert 执行前 |
| 可变性 | 用户可自定义 | 平台/插件预设 |

### 结论

**并存，不合并**。两者职责不同：

1. **prompts DB** 是"用户 prompt 工具箱"——面向终端用户，让他们快速组装常见请求
2. **Plugin Skill** 是"系统知识注入"——面向平台开发者，让 Expert 获得额外领域知识

合并会导致：
- 用户不需要关心 Skill 注入逻辑
- Skill 不需要用户变量填充
- 两者的生命周期和管理方式完全不同

**建议**：
- prompts DB 保持独立，未来可扩展为"Prompt Library"Tab（见 F-P3）
- Skill 保持在 Plugin Center 的 skills 目录
- 两者可交叉引用：prompts DB 模板可推荐关联的 Expert（触发对应 Skill）

---

## 四、F-P3：是否新增 Prompt 层 Plugin Center Tab？

### 现状分析

Plugin Center 当前四层：Expert / Skill / Tool / MCP Server

```
server/config/plugins/
├── experts/     → Expert 声明（含 dynamicPrompt / systemPrompt / skills[]）
├── skills/      → Skill 声明（content + tools）
├── tools/       → Tool 声明
└── mcp/         → MCP Server 声明
```

Prompt 相关能力分散在：
- **Expert 的 systemPrompt 字段**：内联静态 prompt
- **Expert 的 dynamicPrompt 字段**：指向 promptBuilder 的运行时生成
- **Skill 的 content 字段**：注入 prompt 的知识块
- **prompts DB**：用户侧模板（独立于 Plugin Center）

### 结论

**不新增独立 Tab，但增强现有 Skill Tab 的 Prompt 管理能力**。

理由：
1. Skill 本质上就是"Prompt 片段"——当前 content 已经是 Markdown prompt
2. 新增 Tab 会增加概念复杂度，用户需要理解 Skill vs Prompt 的区别
3. Expert 的 systemPrompt 已经可以通过 Plugin Center 编辑

**建议增强**：
- Skill Tab 增加"类型"标签：`knowledge`（知识注入）vs `template`（prompt 模板）
- Skill 支持变量占位符 `{{var}}`，Expert 声明时可传入变量值
- prompts DB 模板可迁移为 Skill 类型为 `template` 的条目，统一管理
- Expert 编辑面板增加"Prompt 预览"功能，展示最终拼装结果

---

## 五、F-P4：Workflow 模板是否携带默认 Skill 引用？

### 现状分析

**Workflow 模板**（`ai/shared/agentWorkflow.ts`）：

```typescript
// AgentWorkflowNodeData 关键字段
{
  type: 'llm' | 'expert' | ...,
  data: {
    // LLM 节点
    prompt?: string,
    systemPrompt?: string,
    // Expert 节点
    expertId?: string,
  }
}
```

**Expert 节点执行链路**（`agentWorkflowExecutor.ts` L707）：

```
expertId → runRegisteredExpert(ref)
  → resolveExpertSystemPrompt(expert, registry)
    → dynamicPrompt? → promptBuilder(metadata) : systemPrompt
    → + skills[].content
```

Expert 节点通过 `expertId` 引用 Plugin Center 的 Expert 声明，而 Expert 声明已携带 `skills[]` 引用。因此 **Skill 引用已经隐式传递**。

**LLM 节点**只有内联 `prompt` 和 `systemPrompt`，无法引用 Skill。

**当前模板示例**（`seedBusinessAgentWorkflows.ts`）：

- 制度问答、审批摘要、会议纪要、公文拟稿、文档 OCR
- 全部使用 `createIntelligentAssistantWorkflowGraph` 或 `createDocumentSummaryWorkflowGraph`
- 模板中 LLM 节点使用内联 prompt，未引用 Skill

### 结论

**Expert 节点已隐式携带 Skill，LLM 节点需要显式支持**。

现状：
- Expert 节点 → expertId → Expert.skills[] → 已覆盖
- LLM 节点 → 内联 prompt/systemPrompt → 无法引用 Skill

**建议**：

1. **LLM 节点增加 `skillIds?: string[]` 字段**：允许 Workflow 设计器为 LLM 节点选择 Skill，执行时拼接到 systemPrompt
2. **Workflow 模板增加默认 Skill 元数据**：模板声明推荐的 Skill 列表，用户创建 Workflow 时自动关联
3. **设计器 Skill 选择器**：Workflow 编辑器的 LLM 节点面板增加"关联 Skill"下拉框，从 Plugin Center Skill 列表中选取

优先级：LLM 节点 skillIds 支持 > 模板默认 Skill 声明 > 设计器 UI

---

## 六、总结与行动建议

| 编号 | 结论 | 建议 | 优先级 |
|---|---|---|---|
| F-P1 | 不剥离，做接口化 | 定义 `PromptMetadataProvider` 接口，解耦数据源 | P1 — 开源前置条件 |
| F-P2 | 并存，不合并 | prompts DB（用户侧）与 Skill（系统侧）职责不同，保持独立 | 无需行动 |
| F-P3 | 不新增 Tab，增强 Skill Tab | Skill 增加类型标签、变量支持；prompts DB 迁移为 Skill template 类型 | P2 — 体验优化 |
| F-P4 | Expert 已覆盖，LLM 需增强 | LLM 节点增加 skillIds 字段；模板声明默认 Skill | P2 — Workflow 增强 |

### 依赖关系

```
F-P1 (接口化) ──阻塞──→ 开源版发布
F-P3 (Skill 增强) ──可选──→ F-P4 (LLM skillIds)
F-P2 无依赖，维持现状
```
