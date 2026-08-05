# F.2 调研表 — 剩余 16 项实现方案

> **调研日期**：2026-07-08
> **范围**：Phase F 能力层细化调研表中 16 个 ⬜ 未完成项
> **产出**：每项含现状分析、缺口、实现方案、工作量估算、依赖关系

---

## 一、P1 优先级（10 项）

### 1. Expert routing 路由调试 UI 或 CLI

**现状分析**：
- `server/src/ai/plugins/resolveRouterExpert.ts` 实现了路由匹配逻辑
- 匹配规则：`routing.keywords`（正则）+ `routing.contextSources` + `routing.priority`
- 前端 `usePluginRegistry.ts` 展示专家列表，但无路由测试功能
- 路由结果仅在 Chat 运行时可见（`session.currentExpertId`），无法离线验证

**缺口**：
- 无独立路由测试台（输入意图文本 → 看命中哪个 Expert）
- 误路由时只能看 server 日志，无法在 UI 回溯
- 无路由规则可视化（哪些 keywords 匹配了哪个专家）

**实现方案**：
1. **CLI 方案**（优先，成本低）：
   - 新增 `pnpm plugin:test-router --intent "帮我创建表单" --source editor`
   - 输出：命中 Expert id、匹配的 keywords、priority 排序
   - 位置：`server/src/ai/plugins/cli/testRouter.ts`

2. **UI 方案**（后续可选）：
   - Plugin Center 新增「路由测试」Tab
   - 输入框 + 模拟 contextSource 选择 → 实时显示匹配结果
   - 高亮匹配的 keywords 关键词

**工作量**：CLI 4h，UI 12h（建议先做 CLI）

**依赖**：无

---

### 2. Workflow expert 节点 vs Chat prompt 覆盖规则对齐

**现状分析**：
- Chat 路径：`pluginExpert` → `resolveExpertPrompt` → `buildExpertSystemPrompt`（dynamicPrompt > systemPrompt + skills）
- Workflow 路径：`expert` 节点 → `agentWorkflowExecutor` → `runRegisteredExpert` → 同上
- LLM 节点：直接用 `data.prompt` + `data.systemPrompt`，不经过 Expert 解析
- 关键差异：Workflow `expert` 节点可配置 `data.prompt`（覆盖），但文档未说明优先级

**缺口**：
- `expert` 节点的 `data.prompt` 与 Expert 注册的 `systemPrompt` 叠加规则未文档化
- LLM 节点的 `systemPrompt` 与 `prompt` 关系未明确（当前实现：systemPrompt 拼接到 messages[0]，prompt 作为 user message）
- 无单测覆盖 Expert 节点 prompt 覆盖场景

**实现方案**：
1. **代码走读确认优先级**（`agentWorkflowExecutor.ts` + `dispatchExpert.ts`）：
   - Expert 节点：`data.prompt` 追加到 Expert systemPrompt 末尾（覆盖 vs 追加需确认）
   - LLM 节点：`systemPrompt` → system message，`prompt` → user message
2. **补充单测**：`agentWorkflowExecutor.spec.ts` 增加 prompt 覆盖 case
3. **文档更新**：`agent-workflow.md` §二节点类型参考中补充覆盖规则表

**工作量**：6h（走读 2h + 单测 2h + 文档 2h）

**依赖**：无

---

### 3. Skill 作者手册

**现状分析**：
- Skill 配置：`server/config/plugins/skills/*.json`，支持 `content`（inline）或 `file`（相对路径 .md）
- Skill 拼装：`resolveExpertPrompt.ts` → `buildExpertSystemPrompt` 拼接到 Expert prompt 末尾
- Plugin Center 只读展示 Skill 列表
- `expert-extension-guide.md` 提及 Skill，但无独立编写指南
- 现有 4 个 Skill：`reply-zh`、`schema-quality`、`flow-design`、`page-layout`

**缺口**：
- 无 Skill 编写规范（格式、长度、语言风格建议）
- 无 Skill 测试方法（如何验证 Skill 生效）
- 无 Skill 与 Expert 关联的最佳实践
- pack 分发时 Skill file 路径解析规则未文档化

**实现方案**：
1. 新增 `ai/docs/skill-author-guide.md`，内容：
   - Skill JSON Schema 字段说明（id、label、content、file、enabled）
   - inline vs file 两种写法对比与推荐
   - Skill 编写风格指南（指令式、简洁、避免与 Expert prompt 重复）
   - Skill 测试方法：`pnpm plugin:validate` + Chat 验证
   - pack 分发：file 路径相对于 pack 目录
   - 完整示例：从零创建一个自定义 Skill
2. 更新 `plugin.md` §九新增插件快速步骤，增加 Skill 小节

**工作量**：8h（编写 6h + 示例验证 2h）

**依赖**：无

---

### 4. Tool label/category CI 校验必填

**现状分析**：
- Tool 配置：`server/config/plugins/tools/*.json`，每个工具有 `name`、`label`、`category` 字段
- 前端 `agentTools.ts` 有回退 label 表（`getToolDisplayLabel`），与 Registry 可能漂移
- CI：`plugin-validate.yml` 运行 `pnpm plugin:validate`，但当前校验规则不检查 label/category 必填
- `registry.ts` 的 `registerManifest` 未强制 label

**缺口**：
- `plugin:validate` 不检查 label/category 是否为空
- 新增工具时可能漏填 label，导致前端显示原始工具名（如 `schema__search`）
- 回退表与 Registry 不同步风险

**实现方案**：
1. **扩展 `plugin:validate` 校验规则**：
   - Tool 必须有 `label`（非空字符串）
   - Tool 必须有 `category`（枚举：`schema`、`flow`、`widget`、`rag`、`industry`、`http`、`collaboration`）
   - 校验失败时输出 warning（不阻断，给过渡期）或 error（严格模式）
2. **CI 门禁**：`plugin-validate.yml` 中 `pnpm plugin:validate` 已有，扩展规则即可
3. **清理回退表**：label/category 校验通过后，逐步移除 `agentTools.ts` 回退

**工作量**：4h（校验逻辑 2h + 测试 1h + 清理回退 1h）

**依赖**：无

---

### 5. MCP factoryModule example pack 扩充

**现状分析**：
- MCP 配置：`server/config/plugins/mcp/*.json`，支持 `transport: inmemory | stdio | sse`
- `inmemory` 类型支持 `factoryModule`（自定义 MCP Server 工厂模块路径）
- 现有 example pack：`server/config/plugins/packs/example.support/`，含 Expert + Skill + Tool 示例
- MCP factory 示例：仅 `local.example/` 中有一个 disabled 的 stdio 示例

**缺口**：
- 无完整的 `factoryModule` 示例（如何写自定义 MCP Server 并注册为 inmemory）
- pack 中无 MCP Server 示例
- `factoryModule` 的类型导出（`McpServerFactory` 接口）未文档化

**实现方案**：
1. **新增 example pack**：`server/config/plugins/packs/example.mcp-factory/`
   - `manifest.json`：声明 mcp layer
   - `mcp/custom-server.json`：配置 `transport: inmemory` + `factoryModule: ./factory.js`
   - `factory.js`：示例 MCP Server 工厂（创建一个 `custom__hello` 工具）
2. **文档**：`mcp.md` 新增 §八「自定义 MCP Server 工厂」章节
3. **类型导出**：确保 `McpServerFactory` 从 ai-shared 导出

**工作量**：8h（示例开发 4h + 文档 3h + 类型导出 1h）

**依赖**：无

---

### 6. Prompt: Workflow LLM 节点变量文档

**现状分析**：
- 变量语法：`{{$input.field}}`、`{{$node.<nodeId>.<field>}}`、`{{$json}}`、`{{$conversation}}`
- 解析器：`server/src/ai/services/agentWorkflowTemplateResolver.ts`
- `agent-workflow.md` §三有变量语法表，但缺少：
  - 变量嵌套规则
  - 变量类型（string/object/array）传递
  - 与 Expert prompt 的关系（LLM 节点 prompt 是独立的，不经过 Expert 解析）
  - 错误处理（变量引用不存在的节点时行为）

**缺口**：
- 变量解析的边界条件未文档化
- LLM 节点 prompt 与 Expert systemPrompt 的区别未说明
- 无变量使用最佳实践（何时用 `{{$input}}` vs `{{$node.xxx}}`）

**实现方案**：
1. 扩展 `agent-workflow.md` §三，新增：
   - 变量类型与嵌套规则
   - 错误处理策略（变量未定义时返回空字符串 or 抛错）
   - LLM 节点 vs Expert 节点 prompt 区别对照表
   - 变量使用示例（结合内置模板）
2. 补充 `agentWorkflowTemplateResolver.spec.ts` 边界 case

**工作量**：6h（代码走读 2h + 文档 3h + 单测 1h）

**依赖**：无

---

### 7. Workflow 模板注册 RFC（插件 pack 带模板）

**现状分析**：
- 模板定义：`shared/platform-shared/ai/agentWorkflow.ts` → `AGENT_WORKFLOW_TEMPLATES` + `createAgentWorkflowGraphByTemplate`
- 当前 4 个内置模板，全部硬编码在 ai-shared
- 模板创建：`POST /api/ai/workflows` body `{ "templateId": "..." }`
- pack 格式：支持 `experts`、`skills`、`tools`、`mcp` 四层，无 `templates` 层

**缺口**：
- 无运行时模板注册机制（第三方无法通过 pack 添加模板）
- pack manifest 无 `templates` 层定义
- 模板工厂函数无法动态加载

**实现方案**：
1. **pack manifest 扩展**：新增 `templates` 层
   ```json
   {
     "templates": [
       {
         "id": "custom.workflow-1",
         "name": "自定义工作流",
         "category": "general",
         "description": "...",
         "graph": { ... }
       }
     ]
   }
   ```
2. **Registry 扩展**：`PluginRegistry` 新增 `templates` Map，加载 pack 时注册模板
3. **API 扩展**：`GET /api/ai/plugins` 返回中增加 `templates` 字段
4. **前端适配**：模板 Tab 读取 Registry templates（合并内置 + pack）
5. **RFC 文档**：`ai/docs/design/workflow-template-rfc.md`

**工作量**：16h（Registry 6h + API 3h + 前端 4h + RFC 3h）

**依赖**：无

---

### 8. Workflow 官方 demo 流 seed

**现状分析**：
- Phase E 已规划 3 个 demo 流：`demo-intelligent-assistant`、`demo-document-summary`、`demo-doc-image`
- E-2 任务标记为已完成，但实际 seed 脚本位置需确认
- 模板工厂已就绪（`createAgentWorkflowGraphByTemplate`）

**缺口**：
- seed 脚本是否已实现需代码确认
- demo 流的 `status: published` + `publishId` 需自动生成
- demo 流归属（系统用户 vs 平台租户）需明确

**实现方案**：
1. **确认现有实现**：检查 `server/src/ai/services/` 或 `server/scripts/` 是否有 seed 脚本
2. **如未实现**，新增 `server/scripts/seed-demo-workflows.ts`：
   - 使用 `createAgentWorkflowGraphByTemplate` 创建 3 个 demo 流
   - 自动 publish（分配 `publishId`）
   - 标记为 `isDemo: true`（需新增字段或用 `description` 前缀标识）
3. **集成到启动流程**：`server/src/index.ts` 启动时检测并 seed（幂等）

**工作量**：8h（脚本 4h + 集成 2h + 测试 2h）

**依赖**：模板工厂（已就绪）

---

### 9. RAG 与 Tool/MCP 边界扩展文档

**现状分析**：
- RAG 工具：`rag__search`（MCP）+ `rag_index`（LangGraph 专有）
- RAG Server：`server/src/ai/mcp/ragServer.ts`
- RAG 服务：`server/src/ai/services/ragService.ts`（embedding + 检索）
- embedding 方案：SiliconFlow BGE-M3（见 MEMORY.md）

**缺口**：
- RAG 作为 Tool vs MCP vs 平台能力的边界未文档化
- 多知识库选择 UX 未实现（当前单库）
- 索引权限（谁能索引、谁能检索）未定义
- RAG 扩展点（自定义 embedding、自定义 chunk 策略）未文档化

**实现方案**：
1. 新增 `ai/docs/rag-architecture.md`（或扩展 `mcp.md` RAG 章节）：
   - RAG 三层架构：embedding → 索引 → 检索
   - RAG 作为 Tool（`rag__search`）vs 平台能力（`rag_index`）的区别
   - 扩展点：自定义 embedding provider、自定义 chunk 策略
   - 多库支持规划（当前单库 → 未来多库）
   - 权限模型：索引（JWT + `rag:write`）、检索（JWT + `rag:read`）
2. 示例：如何用 MCP 接入外部知识库

**工作量**：8h（文档 6h + 示例 2h）

**依赖**：无

---

### 10. Plugin Center 写能力评估

**现状分析**：
- 写 API：`PUT /api/ai/plugins/local/:layer/:file`（已实现）
- 前端：Plugin Center 仅只读展示（experts/skills/tools/mcpServers 四层）
- `pluginLocalWrite.ts`：写入 `plugins/local/` 目录，需 JWT 鉴权
- 无回滚机制（覆盖即生效，需 SIGHUP 或重启）

**缺口**：
- 前端无编辑 UI（只能通过 API 或手动编辑 JSON）
- 写操作无审计日志
- 无回滚（写错后需手动恢复）
- 无表单校验（写入的 JSON 可能格式错误）

**实现方案**：
1. **评估结论**（建议分阶段）：
   - **Phase 1（短期）**：保持 API 写入 + `pnpm plugin:validate` 校验，不新增 UI
   - **Phase 2（中期）**：Plugin Center 新增「开发者模式」开关，启用后展示编辑按钮
   - **Phase 3（长期）**：完整 CRUD UI + 审计 + 回滚

2. **Phase 1 改进**（低成本高价值）：
   - `PUT /plugins/local/...` 增加写入前 `plugin:validate` 校验
   - 写入后自动 SIGHUP 热重载（可选）
   - 响应返回 diff（新增/修改了什么）

3. **文档**：`plugin.md` 补充「本地覆盖写入」章节详细用法

**工作量**：Phase 1: 6h，Phase 2: 24h，Phase 3: 40h+

**依赖**：无

---

## 二、P2 优先级（6 项）

### 11. Skill 拼装顺序与冲突规范

**现状分析**：
- `resolveExpertPrompt.ts` 拼装顺序：`base prompt`（dynamicPrompt 或 systemPrompt）+ skills（按数组顺序拼接）
- Skill 之间无优先级、无冲突检测
- 无版本号（Skill 修改后立即生效）

**缺口**：
- 多 Skill 内容冲突时无警告（如两个 Skill 都要求「用中文回复」但措辞不同）
- Skill 拼装顺序对 LLM 行为的影响未文档化
- 无 A/B 测试能力

**实现方案**：
1. **规范文档**（`skill-author-guide.md` 一节）：
   - 拼装顺序：base prompt → skills 按 `skills[]` 数组顺序
   - 冲突预防：每个 Skill 职责单一，避免跨 Skill 重复指令
   - 优先级建议：通用 Skill（如 `reply-zh`）放末尾，领域 Skill 放前面
2. **可选增强**：`plugin:validate` 检测 Skill 内容相似度（NLP 或简单字符串匹配）

**工作量**：4h（文档 3h + 可选校验 1h）

**依赖**：Skill 作者手册（#3）

---

### 12. Skill 多语言 / locale

**现状分析**：
- 仅 `platform.reply-zh` 一个语言相关 Skill
- Skill 无 locale 字段
- Expert 无 locale 配置

**缺口**：
- 无 locale 模型（如何为同一 Skill 提供多语言版本）
- 无运行时 locale 选择逻辑

**实现方案**：
1. **短期（仅文档）**：
   - Skill id 命名约定：`{id}.{locale}`（如 `platform.reply-zh`、`platform.reply-en`）
   - Expert 按用户 locale 选择对应 Skill
2. **中期（如需）**：
   - Skill JSON 新增 `locale` 字段
   - `resolveExpertPrompt` 按 `session.locale` 过滤 Skill
3. **当前建议**：维持 id 命名约定，不做代码改动

**工作量**：短期 2h（文档），中期 8h（代码）

**依赖**：无

---

### 13. MCP 租户隔离 UI

**现状分析**：
- 租户 overlay：`server/config/plugins/tenants/{id}/` 目录
- 环境变量：`AI_PLUGIN_TENANT_ID` 启用租户 overlay
- 前端：Plugin Center 无租户切换功能
- Phase D-1 多租户 UI 已完成（展示当前租户）

**缺口**：
- 无租户级插件管理 UI（查看/编辑租户 overlay 配置）
- 无租户插件 diff（与全局配置对比）

**实现方案**：
1. **与 Phase D 合并**：Plugin Center 新增「租户配置」视图
   - 展示当前租户的 overlay 文件列表
   - 只读展示（编辑走 API）
2. **API 扩展**：`GET /api/ai/plugins/tenant/:tenantId` 返回租户 overlay
3. **UI**：Plugin Center 新增 Tab 或侧栏「租户覆盖」

**工作量**：16h（API 4h + UI 10h + 测试 2h）

**依赖**：Phase D 多租户基础（已完成）

---

### 14. Chat 空状态引导词配置化

**现状分析**：
- 硬编码在 `AiChatPanel.vue` 的 `starterPrompts` 数组
- 引导词与 Expert 无关（全局统一）
- 无法按租户/用户自定义

**缺口**：
- 引导词不可配置（改引导词需改代码发版）
- 无按 Expert 差异化引导（如 editor 专家展示「帮我创建表单」）

**实现方案**：
1. **配置化**：
   - 新增 `server/config/plugins/chatStarters.json`：
     ```json
     {
       "default": [
         { "text": "帮我创建一个表单", "icon": "edit" },
         { "text": "设计一个审批流程", "icon": "flow" }
       ],
       "experts": {
         "platform.editor": [
           { "text": "帮我创建一个用户注册表单", "icon": "edit" }
         ]
       }
     }
     ```
   - `GET /api/ai/plugins` 返回中增加 `chatStarters` 字段
2. **前端适配**：`AiChatPanel` 从 API 读取引导词，替换硬编码

**工作量**：8h（配置 2h + API 2h + 前端 3h + 测试 1h）

**依赖**：无

---

### 15. Pack spec v1 + 签名

**现状分析**：
- pack 命令：`pnpm plugin:pack --dir ... --out ...`（打包 tgz）
- install 命令：`pnpm plugin:install --file ... [--tenant ...]`
- manifest 格式：`manifest.json` 声明 layers（experts/skills/tools/mcp）
- 无签名、无校验和、无版本管理

**缺口**：
- 无 pack 签名机制（无法验证 pack 来源可信）
- 无 pack 版本管理（manifest 无 version 字段）
- 无 pack 依赖声明（pack A 依赖 pack B 的 Skill）
- 无 pack 市场/仓库

**实现方案**：
1. **Pack Spec v1**（`ai/docs/design/pack-spec-v1.md`）：
   - manifest 新增字段：`version`、`author`、`license`、`dependencies`
   - 文件校验：SHA-256 校验和
   - 签名：可选 GPG 或 HMAC 签名（`pack --sign --key ...`）
2. **验证增强**：`plugin:install` 增加签名校验步骤
3. **不做**：pack 市场/仓库（Phase D-4 范围）

**工作量**：16h（spec 4h + 签名实现 8h + 验证 4h）

**依赖**：无

---

### 16. 插件级 metrics 可观测

**现状分析**：
- 执行监控：`AgentWorkflowExecution` 记录节点级执行详情
- Chat 监控：WebSocket 事件流（`chat:event`）
- 无插件级 metrics（哪个 Expert 被调用多少次、哪个 Tool 执行耗时）

**缺口**：
- 无 Expert 调用次数/耗时统计
- 无 Tool 执行成功率/平均耗时
- 无 MCP Server 连接状态监控
- 无 Skill 生效率（被多少 Expert 引用）

**实现方案**：
1. **短期（仅文档 + 埋点规划）**：
   - 文档化 metrics 采集点（Expert 执行、Tool 调用、MCP 连接）
   - 定义 metrics schema（name、labels、type）
2. **中期（可选实现）**：
   - `dispatchExpert.ts` 增加计数器（expert_id、duration_ms、success/fail）
   - `bridge.ts` 增加 MCP 连接状态 gauge
   - 暴露 `/api/ai/metrics`（Prometheus 格式或 JSON）

**工作量**：短期 4h（文档），中期 16h（埋点 + API + UI）

**依赖**：无

---

## 三、依赖关系总览

```
#3 Skill 作者手册 ──→ #11 Skill 拼装顺序规范
#4 Tool label CI ──→ （无依赖）
#7 Workflow 模板 RFC ──→ #8 官方 demo 流 seed（模板工厂已就绪）
#10 Plugin Center 写能力 ──→ #13 MCP 租户隔离 UI（共享 Plugin Center 基础）
```

## 四、建议排期

| 阶段 | 项 | 工作量 | 说明 |
|------|-----|--------|------|
| **第一批（1-2 周）** | #1 CLI 路由调试、#4 Tool label CI、#6 LLM 变量文档、#8 demo 流 seed | 24h | 低成本高价值，互相独立 |
| **第二批（3-4 周）** | #3 Skill 作者手册、#11 Skill 拼装规范、#9 RAG 边界文档、#12 Skill 多语言文档 | 22h | 文档为主，Skill 体系完善 |
| **第三批（5-6 周）** | #2 Expert prompt 对齐、#5 MCP factory 示例、#10 Plugin Center 写能力 Phase 1、#14 Chat 引导词配置化 | 32h | 代码改动较多 |
| **第四批（7-8 周）** | #7 Workflow 模板 RFC、#13 租户隔离 UI、#15 Pack spec v1、#16 metrics | 52h | 架构扩展，可按需推迟 |

**总计**：约 130h（约 3.25 人周）

---

## 五、与已完成项的关系

| 已完成项 | 关联未完成项 | 说明 |
|----------|-------------|------|
| Expert 扩展指南（✅） | #1 路由调试、#2 prompt 对齐 | 扩展指南是基础，调试和对齐是补充 |
| Tool kind 清单（✅） | #4 label CI、#5 MCP factory | kind 清单是前提，CI 和示例是落地 |
| MCP 接入指南（✅） | #5 factory 示例、#13 租户 UI | 接入指南是框架，示例和 UI 是完善 |
| Prompt 四层架构（✅） | #6 变量文档、#14 引导词配置化 | 架构是顶层，变量和引导词是细节 |
| HTTP 安全基线（✅） | #9 RAG 边界 | 安全基线是通用，RAG 边界是专项 |
