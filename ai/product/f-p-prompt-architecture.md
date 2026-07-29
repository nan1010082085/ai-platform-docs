# Phase F — Prompt 层专项调研（F-P1 ~ F-P4）

> **产出目标**：梳理五套 Prompt 来源的边界与扩展契约，回答 F-P1 ~ F-P4 四个待决问题，输出开源文档可引用的结论。

**关联文档**：[open-platform-roadmap.md §三 F.3](./open-platform-roadmap.md#三phase-f--能力层细化调研) · [plugin.md](../plugin.md)

---

## 一、现状：五套 Prompt 来源

| # | 来源 | 代码位置 | 运行时注入点 | 可扩展性 |
|---|------|----------|-------------|----------|
| 1 | **Domain promptBuilder** | `shared/platform-shared/ai/promptBuilder.ts` → `buildEditorSystemPrompt` / `buildFlowSystemPrompt` / `buildPageSystemPrompt` | `resolveExpertPrompt.ts`：当 Expert 声明 `dynamicPrompt: "editor"` 等时调用 | 改代码发版；不适合纯第三方 |
| 2 | **Expert `dynamicPrompt`** | `server/config/plugins/experts/*.json` 的 `dynamicPrompt` 字段 | 同上，switch 分发到 promptBuilder | 仅平台内置四类（editor/flow/page/general） |
| 3 | **Expert `systemPrompt` + Skill** | Expert JSON 的 `systemPrompt` 字段 + `skills[]` 引用 Skill JSON | `resolveExpertPrompt.ts`：`systemPrompt` 为底座，Skill 内容拼接末尾 | **第三方主路径**：pack / local / tenants |
| 4 | **节点级 prompt** | Workflow `llm` 节点 `data.prompt` / `data.systemPrompt`；`expert` 节点 `data.expertId` | `agentWorkflowExecutor`：LLM 节点直接用节点 prompt；Expert 节点走 Registry 解析 | 设计器可编辑；节点级覆盖 |
| 5 | **Chat starter** | `ai/app/src/components/AiChatPanel.vue` 第 205 行 `starterPrompts` | 渲染为空状态引导按钮 | 硬编码，不可配置 |

### 注入链路图

```text
Expert JSON
  ├── dynamicPrompt: "editor"
  │     └── resolveExpertPrompt → buildEditorSystemPrompt(metadata)
  │                                 └── Widget/FlowNode 元数据表 + 示例 + 规则
  ├── systemPrompt: "你是..."
  │     └── resolveExpertPrompt → 直接使用
  └── skills: ["platform.schema-quality", "platform.reply-zh"]
        └── resolveExpertPrompt → registry.getSkill(id).content → 拼接末尾

Workflow LLM 节点
  └── data.prompt / data.systemPrompt → 直接注入 messages

Workflow Expert 节点
  └── data.expertId → dispatchExpert → resolveExpertSystemPrompt → 同上

Chat Starter
  └── AiChatPanel.vue starterPrompts[] → 纯前端渲染，不注入 LLM
```

---

## 二、F-P1：开源版是否剥离 promptBuilder 对 editor/flow 的强依赖？

### 现状分析

`buildEditorSystemPrompt` / `buildFlowSystemPrompt` / `buildPageSystemPrompt` 依赖：

1. **`WidgetAIMetadata[]`**（49 种组件的 type/group/description/keyProps/defaultSize）— 来自 editor 元数据提取脚本
2. **`FlowNodeAIMetadata[]`**（BPMN 节点类型/配置字段）— 来自 flow 元数据提取脚本
3. **`systemKnowledge.ts`**（事件系统/联动系统/变量系统/数据源配置的常量）— 平台域知识
4. **`toolNames.ts`**（MCP 工具名常量）— 平台域工具

这些依赖使 promptBuilder 成为 **平台域专有模块**，不是通用 Prompt 工具。

### 结论：保留，但标记为平台专有

| 决策 | 说明 |
|------|------|
| **保留** promptBuilder 在 ai-shared 中 | 4 个平台 Expert（editor/flow/page/general）依赖它，拆 pack 增加部署复杂度 |
| **不作为开源扩展入口** | 第三方扩展走 `systemPrompt` + `skills`，不依赖 promptBuilder |
| **文档明确边界** | 开源 README 和扩展指南中说明：`dynamicPrompt` 是平台内置路径，第三方用 `systemPrompt` |

### 理由

- promptBuilder 生成的 prompt 是 **高质量平台域 prompt**（含 49 种组件表、BPMN 节点表、示例、校验规则），是平台核心竞争力
- 拆成可选 pack `platform.domain` 会导致：(1) pack 需要携带 metadata.json；(2) 版本耦合复杂；(3) 收益有限（第三方不需要这些 prompt）
- 保留代码但文档隔离，成本最低

### 开源文档建议

在扩展指南中添加决策树：

```text
你是谁？
├── 平台内置 Expert → 用 dynamicPrompt（editor/flow/page/general）
└── 第三方 Expert → 用 systemPrompt + skills
    ├── 简单指令 → skills JSON inline content
    └── 复杂指令 → skills JSON file 引用 .md 文件
```

---

## 三、F-P2：server 的 prompts DB 模块与 Plugin Skill 合并还是并存？

### 现状分析

**Prompts DB 模块**（`server/src/ai/`）：

| 组件 | 功能 |
|------|------|
| `PromptTemplateModel` | MongoDB 模板存储：name/category/template/variables/tags/usageCount/successRate/isBuiltin |
| `PromptVersionModel` | 版本历史：version/content/successRate/feedbackCount/optimizationReason |
| `promptOptimizer` | 质量分析（clarity/specificity/completeness/structure）、反馈优化、测试 |
| `routes/prompts.ts` | 完整 CRUD + analyze + optimize + test + versions + render + seed |
| `config/promptTemplates.ts` | 5 个内置模板（Schema 生成/修改、流程生成、代码解释、优化建议） |

**Plugin Skill 系统**（`server/config/plugins/skills/`）：

| 组件 | 功能 |
|------|------|
| `SkillDeclaration` | JSON 配置：id/label/content/file/tools/enabled |
| `PluginRegistry` | 内存注册表，按 id 查找 |
| `resolveExpertPrompt` | Skill 内容拼接到 Expert system prompt 末尾 |

**关键发现**：两套系统 **代码上完全不交叉**。DB Prompt 模板从未注入 Expert prompt；Skill 从未写入 DB。它们是独立运行的。

### 结论：并存，明确分工

| 维度 | Plugin Skill | Prompts DB |
|------|-------------|------------|
| **定位** | 配置级指令块（Expert prompt 的组成部分） | 运营级文案管理（独立模板，含 A/B 与优化） |
| **存储** | JSON 文件（config/plugins/skills/） | MongoDB |
| **生命周期** | 随插件 pack 分发，版本跟随 pack | 运营迭代，版本历史独立管理 |
| **消费者** | `resolveExpertPrompt` 拼入 Expert system prompt | `/api/ai/prompts` 独立 API（当前无自动注入） |
| **扩展性** | pack / local / tenants overlay | 租户隔离（tenantId） |
| **质量工具** | 无（静态配置） | analyze + optimize + test + version |

### 不合并的理由

1. **职责不同**：Skill 是"Expert 的一部分"，DB Prompt 是"独立可复用模板"
2. **存储层不同**：文件 vs DB，合并需要统一存储，增加复杂度
3. **当前无交叉**：没有代码将 DB Prompt 注入 Expert prompt，也没有代码将 Skill 写入 DB
4. **合并收益低**：Skill 通常很短（1-3 行指令），不需要版本管理/优化/测试；DB Prompt 是完整模板，不适合拼接到 Expert prompt

### 后续演进建议

如果未来需要打通，可以：

1. 新增 `PromptBridge`：将 DB Prompt 的 `render()` 结果作为 Skill content 的一种来源
2. 在 Expert 声明中新增 `dbPrompts: string[]` 字段，引用 DB Prompt ID
3. 但这是 Phase D+ 的事，当前保持并存

---

## 四、F-P3：是否新增 Prompt 层 Plugin Center Tab？

### 现状分析

Plugin Center 当前 4 个 Tab：

| Tab | 内容 |
|-----|------|
| **专家 Experts** | Expert 列表：id/label/description/legacyAgentKey/tools/skills/routing |
| **工具 Tools** | Tool 列表：name/kind/label/category/description（按 kind 子 Tab 过滤） |
| **MCP Server** | MCP Server 列表：id/transport/namespace |
| **技能 Skills** | Skill 列表：id/label/tools（**不含 content 预览**） |

### 缺口

1. **Skill content 不可见**：Plugin Center 的 Skills Tab 只显示 id/label/tools，不显示实际的 prompt 内容
2. **DB Prompt 模板不可见**：`/api/ai/prompts` API 存在但无前端入口
3. **Expert 的完整 prompt 不可见**：用户无法预览某个 Expert 最终拼装后的 system prompt

### 结论：不新增独立 Tab，增强现有 Tab

| 决策 | 说明 |
|------|------|
| **不新增** Prompt Tab | 五层 Prompt 是运行时概念，不是独立实体；新增 Tab 会让用户困惑"Prompt 和 Skill 有什么区别" |
| **增强** Skills Tab | 显示 `content` 预览（截断 + 展开）；显示 `file` 路径（如有） |
| **增强** Experts Tab | 新增"预览 Prompt"按钮，调用 `resolveExpertSystemPrompt` 展示最终拼装结果 |
| **DB Prompt 模板** | 作为"高级功能"保留在 API 层，暂不暴露到 Plugin Center UI；如需 UI，可后续在"运营"或"设置"模块中添加 |

### 实现建议

| 改动 | 位置 | 说明 |
|------|------|------|
| Skills Tab 显示 content | `PluginCenterView.vue` | Skill 卡片新增"查看内容"折叠区 |
| Experts Tab 预览 prompt | `PluginCenterView.vue` + 新增 API | Expert 卡片新增"预览 Prompt"按钮，后端新增 `GET /api/ai/plugins/experts/:id/prompt` |
| DB Prompt 不动 | — | API 已有，UI 按需后续 |

---

## 五、F-P4：Workflow 模板是否携带默认 Skill 引用？

### 现状分析

Workflow 模板定义在 `shared/platform-shared/ai/agentWorkflow.ts` 的 `AGENT_WORKFLOW_TEMPLATES`，当前 4 个：

| 模板 | 节点类型 | Expert 引用 |
|------|----------|------------|
| blank | 无 | 无 |
| document-summary | document-parse + llm + end | 无（LLM 节点用 `prompt` 字段） |
| doc-image-recognition | document-parse + vision-analyze + llm + end | 无 |
| intelligent-assistant | manual-trigger + agent-intent + end | `agent-intent` 节点自动路由到 Registry Expert |

模板结构只有 `nodes[]` + `edges[]` + `entryNodeId`，没有元数据字段（如 `recommendedSkills`、`description`、`category`）。

### 问题

- `expert` 节点通过 `expertId` 引用 Registry Expert，Expert 自带 `skills[]`，所以 **Expert 节点的 Skill 由 Registry 决定，不由模板决定**
- `llm` 节点只有 `prompt` / `systemPrompt` 字段，**无法引用 Skill**
- 模板没有元数据字段来声明"推荐搭配哪些 Skill"

### 结论：暂不携带，后续可选扩展

| 决策 | 说明 |
|------|------|
| **当前不改** | 模板的 `expert` 节点已通过 `expertId` 间接携带 Skill（Registry 解析）；`llm` 节点的 prompt 是自包含的 |
| **后续可选** | 如果模板需要声明"推荐搭配的 Skill"（用于模板卡片展示"建议启用 Skill"），可在模板元数据中新增 `recommendedSkills[]` |
| **不强制** | Skill 是 Expert 的组成部分，不应由模板强制覆盖 |

### 如果后续要做的方案

在 `AgentWorkflowTemplateMeta` 中新增：

```typescript
interface AgentWorkflowTemplateMeta {
  // ... 现有字段
  /** 推荐搭配的 Skill id（仅展示用，不强制注入） */
  recommendedSkills?: string[]
}
```

模板卡片 UI 可展示："推荐启用 Skill: platform.reply-zh, platform.schema-quality"

但这是 P2 优先级，当前模板的 Expert 节点已通过 Registry 自动携带 Skill。

---

## 六、总结与行动项

### 决策汇总

| ID | 问题 | 结论 | 优先级 |
|----|------|------|--------|
| F-P1 | 开源版是否剥离 promptBuilder？ | 保留但标记为平台专有；第三方走 systemPrompt + skills | P0 |
| F-P2 | prompts DB 与 Plugin Skill 合并？ | 并存，明确分工（Skill=配置指令，DB=运营文案） | P0 |
| F-P3 | 新增 Prompt 层 Plugin Center Tab？ | 不新增；增强 Skills Tab（显示 content）+ Experts Tab（预览 prompt） | P1 |
| F-P4 | Workflow 模板携带默认 Skill？ | 暂不携带；expert 节点已通过 Registry 间接携带；后续可选 `recommendedSkills[]` | P2 |

### 后续行动项

| ID | 任务 | 说明 |
|----|------|------|
| F-P1-doc | 开源扩展指南中添加 Prompt 决策树 | 明确 dynamicPrompt vs systemPrompt + skills 的使用场景 |
| F-P3-ui-1 | Skills Tab 显示 content 预览 | PluginCenterView.vue 增强 |
| F-P3-ui-2 | Experts Tab 新增"预览 Prompt"按钮 | 需后端新增 `GET /api/ai/plugins/experts/:id/prompt` |
| F-P3-api | 后端新增 Expert prompt 预览 API | 调用 `resolveExpertSystemPrompt` 返回拼装结果 |
| F-P4-meta | （可选）模板元数据新增 `recommendedSkills[]` | P2，按需 |

---

**最后更新**：2026-07-08
