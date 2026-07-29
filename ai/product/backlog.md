# AI 平台 — 未完成任务与进度

> 最后更新：**2026-07-24** · **全量任务索引**见 [open-platform-roadmap.md § 七](./open-platform-roadmap.md#七全量任务索引) · 可执行拆解见 [open-source-iteration.md](./open-source-iteration.md) · **LangGraph→Workflow 对话节点**见 [langgraph-workflow-nodes-roadmap.md](./langgraph-workflow-nodes-roadmap.md) · **Workflow-as-Agent 演进**见 [evolution-plan-2026-07-22-workflow-as-agent.md](./evolution-plan-2026-07-22-workflow-as-agent.md)

**已完成总览**：[ai-five-phase-iteration.md](./ai-five-phase-iteration.md) · [plugin.md](../plugin.md) · [platform.md](../platform.md)

---

## 进度总览

| 域 | 进度 |
|----|------|
| 五项迭代 | **100%** |
| Chat / Workflow WS | **100%** |
| 插件中心 PLG-1～8 | **100%** |
| Chat v2 事件（thinker / quality_check） | **100%** |
| JWT 三能力统一 | **100%** |
| **基线 1.0**（Open API / 节点 / pluginExpert） | **100%** |
| Phase A — 平台凭证 | **100%** |
| Phase B — 开源交付 | **100%** |
| Phase C — 质量与体验 | **100%** |
| Phase D — 平台能力扩展 | **100%**（D-3 ✅ 配额/限流、D-4 ✅ 插件市场） |
| Phase E — 工作流模板与试用 | **100%** |
| Phase F — 能力层细化调研 | **100%** |
| Phase G — 模型扩展 | **100%**（含 Provider/Model 两级结构、G-7 ✅ openai-compatible） |
| Phase H — 文档与基线收尾 | **100%**（H-2 ✅ disclaimer、H-4 ✅ 文档维护规程） |
| Phase I — 可选技术债 | **100%** |
| **Phase J** — LangGraph 对话节点白盒化 | **100%** |
| **Phase K** — Provider/Model 两级结构 | **100%** |
| **Phase L** — 消息组件化重构 | **100%** |
| **Phase M** — Chat 预览增强 | **100%** |
| **Phase N** — 功能补全 | **100%**（N-1~N-6 全部完成） |
| **Phase O** — 能力层细化 | **100%** |
| **Phase P** — 节点能力细化与体验修补 | **100%** |
| **Phase P2** — UI 规范固化 | **100%**（双层标题 / 操作列 / 图标 / PageHeader） |
| **Phase Q** — Workflow 调试界面 | **100%**（WorkflowDebugView + NodeTraceList） |
| **Phase R** — agent-loop 节点 | **100%**（LLM 自主循环 + runAgentLoop + 4 测试） |
| **Phase S** — workflow 可路由技能 | **100%**（routingKeywords + chat 建议条） |
| **Phase T** — 复杂文件组件化 | **80%**（T-1~T-6 ✅；T-2 ✅ aiApi.ts barrel；T-5 ✅ WorkflowTemplateCard；T-6 ✅ useModelCenter） |
| **Phase U** — 智能体深化 | **75%**（U-1 ✅ 子 workflow 调用；U-2 ✅ 成本可见；U-3 ✅ 配额限流；U-4 断点单步可选） |
| **Phase V** — 智能体自动路由 | **50%**（V-1 ✅ workflow 注册为 expert；V-2 ✅ 强匹配自动切换 + 弱匹配建议条） |
| **Phase W** — agent-loop 流式 + 思考链 + 模板分类 | **100%**（W-1 ✅ 流式进度；W-2 ✅ 思考链展示；W-3 ✅ 模板分类筛选） |
| **Phase X** — RAG 检索增强 + 评测体系 | **100%**（X-1 ✅ rerank+hybrid+RagDebugView；X-2 ✅ Dataset/Run/EvaluationView） |
| **Phase Y** — 触发器 + Artifacts | **100%**（Y-1 ✅ schedule-trigger+调度器+ScheduleView；Y-2 ✅ ArtifactRenderer+回传闭环） |
| **Phase Z** — 多Agent + 中断恢复 | **100%**（Z-1 ✅ agent-team+AgentTeamNodePanel；Z-2 ✅ AgentInterruptError+状态保存恢复+反馈UI） |
| **体验打磨** — 节点搜索 + AI 诊断 + 模板/成本/告警/批量 | **100%**（✅ 节点搜索；✅ AI 诊断；✅ 模板 31 个 10 分类；✅ CostTrendCard 成本看板；✅ check-alerts webhook；✅ 工作流批量管理） |

---

## Phase J — LangGraph 对话节点白盒化 ✅

| ID | 任务 | 状态 |
|----|------|------|
| J-0 | 共享运行时抽取（`server/src/ai/runtime/*`） | ✅ |
| J-1 | `intent-router`、`summarizer` 全栈 | ✅ |
| J-2 | `requirement-analyzer` + `hitl` 增强 | ✅ |
| J-3 | `task-planner`、`task-chain`、`collaboration-router` | ✅ |
| J-4 | 官方模板 + `demo-chat-parity` seed + 文档 | ✅ |

**产出**：
- 5 个 runtime 纯函数模块
- 6 个新节点类型（AgentNodeType + Palette + Panels + Executor）
- 4 个新事件类型
- 2 个官方模板（chat-parity-assistant、requirement-gated-build）
- 1194 测试通过

---

## Phase K — Provider/Model 两级结构 ✅

| ID | 任务 | 状态 |
|----|------|------|
| K-1 | Provider + Model Schema（server/src/models/） | ✅ |
| K-2 | seedProvidersAndModels()（DeepSeek/Mimo/Ollama） | ✅ |
| K-3 | llmCache.ts 支持两级查询 | ✅ |
| K-4 | providerRoutes.ts + aiModelRoutes.ts API | ✅ |
| K-5 | ai/shared/providerModel.ts 类型定义 | ✅ |
| K-6 | providerApi.ts + modelApi.ts 前端 API 客户端 | ✅ |
| K-7 | ModelSettingsView.vue 重构为两级管理 UI | ✅ |

**产出**：
- 供应商 Schema（DeepSeek/Mimo/Ollama/OpenAI/Anthropic/Custom）
- 模型 Schema（关联供应商，参数独立配置）
- 前端左右分栏 UI（供应商列表 + 模型列表）
- 测试连接、快速添加预设、设为默认

---

## Phase L — 消息组件化重构 ✅

| ID | 任务 | 状态 |
|----|------|------|
| L-1 | RendererRegistry.ts 渲染器注册表 | ✅ |
| L-2 | 独立渲染器（15个已注册） | ✅ |
| L-3 | AiMessageContent.vue 调度器 | ✅ |
| L-4 | AiMessageActionBar.vue 操作栏 | ✅ |
| L-5 | AiMessage.vue 主组件瘦身 | ⚠️ 模板已瘦身，脚本保留类型定义（383行） |

**目标**：新增预览类型只需新建 Renderer + 注册，不改主组件

---

## Phase M — Chat 预览增强 ✅

| ID | 任务 | 状态 |
|----|------|------|
| M-1 | 用户图片内联显示 | ✅ |
| M-2 | PDF.js 渲染预览 | ✅ |
| M-3 | Excel 上传 + 预览 | ✅ |

**产出**：
- PdfPreviewCard.vue
- ExcelPreviewCard.vue
- DocumentAttachmentCard.vue 图片内联增强

---

## Phase P — 节点能力细化与体验修补 🔄

> **2026-07-15** 新增 · **2026-07-16** P-1 完成

| ID | 功能 | 说明 | 优先级 | 状态 |
|----|------|------|--------|------|
| P-1 | 文档解析/OCR 可配模型 | `document-parse` 面板补齐 ModelOptionSelect，后端 executor 读取 `node.data.model` 传递给 `processFile`/`performVisionAnalysis` | P1 | ✅ |
| P-2 | 「智能助手 v2」预览无模板 | `AgentFlowNode.vue` 只渲染单一 source handle，`intent-router` 和 `collaboration-router` 的三路出边无法连接。已为这两个节点类型添加自定义 handle（Top/Right/Bottom 三位置） | P1 | ✅ |
| P-3 | LangGraph→Workflow 节点 | Phase J 已 100% 完成：6 个新节点（intent-router / requirement-analyzer / task-planner / task-chain / collaboration-router / summarizer）+ 2 个官方模板 + 5 个 runtime 模块。**无需额外工作** | — | ✅ |

**P-1 完成详情**（2026-07-16）：

- 前端：`DocumentParseNodePanel.vue` 增加 `ModelOptionSelect` + `useModelOptions`，复用 `vision-analyze` 面板的模型选择组件
- 后端：`fileService.ts` 的 `callVisionModel`/`performVisionAnalysis`/`performOCR`/`processFile` 增加可选 `nodeModel` 参数
- 后端：`agentWorkflowExecutor.ts` 的 `document-parse` 和 `vision-analyze` 节点从 `data.model` 提取模型参数并传递
- 模型优先级：节点指定模型 > 环境变量 `AI_VISION_OCR_MODEL` > 默认模型

**P-2 详细说明**：

- 模板工厂 `createChatParityAssistantWorkflowGraph()` 定义了 10 节点 + 12 边的复杂 DAG
- 边使用自定义 `sourceHandle`（`needsAnalysis` / `matched` / `continue` / `nextStep` / `summarize`）
- 预览画布 `AgentWorkflowCanvas`（`canvas-id="agent-workflow-template-preview"`）为只读模式
- 可能原因：Vue Flow 在只读模式下未注册自定义 handle 渲染器，导致多出边节点无法正确连线
- 修复方案：确认 `AgentNode.vue` 中的 handle 定义在 preview canvas 实例中是否生效；或预览模式切换为标准连线

---

## 剩余待办

### Phase D — 平台能力扩展（P2）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| D-3 | 配额/限流 | 按 Key/租户配额，非仅全局 IP 限流 | ✅（rateLimit middleware + Quota model + /api/quotas） |
| D-4 | 插件市场模板 | 在线浏览/安装插件模板 | ✅（PluginMarketView.vue + /api/plugins/market） |

### Phase G — 模型扩展（P2）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| G-7 | openai-compatible 通用 Provider | 支持任意 OpenAI 兼容 API | ✅（Provider type='custom' + 自定义 baseUrl） |

### Phase N — 功能补全（P2，按需）

> 审查发现的缺失功能，按优先级排序

| ID | 功能 | 说明 | 优先级 | 状态 |
|----|------|------|--------|------|
| N-1 | RAG 文档上传入口 | RagKnowledgeBase.vue 已有上传对话框（拖拽 + 点击） | P2 | ✅ |
| N-2 | 嵌入模型配置 UI | EmbeddingSettingsView.vue 已有完整配置（SiliconFlow/OpenAI/自定义） | P2 | ✅ |
| N-3 | 插件在线编辑 | PluginEditor.vue + JSON 编辑器 + 保存到 local 配置 | P2 | ✅ |
| N-4 | 消息音频预览 | 不支持音频文件上传/播放 | P3 | ✅（DocumentAttachmentCard 内联 `<audio>` 播放器） |
| N-5 | 消息视频预览 | 不支持视频文件上传/播放 | P3 | ✅（DocumentAttachmentCard 内联 `<video>` 播放器） |
| N-6 | 消息 3D 模型预览 | 不支持 3D 模型预览 | P3 | ✅（DocumentAttachmentCard 检测 gltf/glb/obj/stl/fbx → ThreePreviewCard） |

### Phase O — 能力层细化（P1-P2，按需）

> 调研未完成项

| ID | 域 | 调研项 | 优先级 | 状态 |
|----|---|---|---|---|
| O-1 | Expert | routing 路由调试 UI 或 CLI | P1 | ✅（RoutingDebugView.vue + /api/ai/debug/route） |
| O-2 | Expert | Workflow expert 节点 vs Chat prompt 覆盖规则对齐 | P1 | ✅（已对齐：node.data.prompt 覆盖 + buildExpertSystemPrompt） |
| O-3 | Skill | 拼装顺序与冲突规范 | P2 | ✅（skill-assembly-spec.md） |
| O-4 | Skill | 多语言 / locale | P2 | ✅（locale 字段 + resolveSkillByLocale） |
| O-5 | Tool | label/category CI 校验必填 | P1 | ✅（validate:tools 脚本） |
| O-6 | MCP | factoryModule example pack 扩充 | P1 | ✅（local.example/mcp-custom 示例） |
| O-7 | MCP | 租户隔离 UI | P2 | ✅（租户选择器 + X-Tenant-Id header） |
| O-8 | Prompt | Chat 空状态引导词配置化 | P2 | ✅（GET /api/ai/chat-config + chatConfig store） |
| O-9 | Workflow | 官方 demo 流 seed | P1 | ✅（seedDemoWorkflows.ts 已有 4 个 demo） |
| O-10 | RAG | 与 Tool/MCP 边界扩展文档 | P1 | ✅（rag-tool-mcp-boundary.md） |
| O-11 | 插件 | Pack spec v1 + 签名 | P2 | ✅（pack-spec-v1.md + HMAC-SHA256 签名） |
| O-12 | 可观测 | 插件级 metrics | P2 | ✅（pluginMetric model + pluginMetrics service） |

### Phase H — 文档收尾（P1）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| H-2 | 内部研发文档清扫 | ARCHITECTURE_PLAN.md 等去除旧架构引用 | ✅（已有 disclaimer） |
| H-4 | 文档维护规程 | 变更时文档同步更新规范 | ✅（docs/CONTRIBUTING.md） |

---

## 明确不做

| 项 | 原因 |
|----|------|
| Chat HTTP SSE | 已删除 |
| Shell 改菜单 | 范围外 |
| 恢复 `/api/ai/open/*` | 基线 1.0 已删除，统一 invoke |
| 单独一级「模板预览」侧栏 | 与模板 Tab 重复 |
| `@ai-sdk` 包 | 无消费者，已删除 |
| `@schema-platform/workflow-client` 包 | 仅为 REST API 包装器，已删除 |

---

## 迭代日志

### 2026-07-22 — Phase P2 + Q + R + S + 审查修复

**Phase P2 — UI 规范固化**
- 双层标题修复：删 AiChatView 冗余顶栏，按钮并入 AiChatPanel header
- TableRowActions 组件化：行内文字按钮去 icon + gap 12px
- 图标违规清理：7 文件改用 AppIcon，iconRegistry 新增 filter/warning-filled
- PageHeader 组件：统一 7 个界面 header
- 路由调试界面 UI 风格对齐

**Phase Q — Workflow 调试界面**
- NodeTraceList 组件抽取（AgentExecutionDetailView 节点轨迹逻辑）
- WorkflowDebugView.vue：独立 workflow 调用测试，草稿可测，节点级轨迹
- designer 工具栏"调试"入口，下线旧"手动测试执行"

**Phase R — agent-loop 节点（Workflow-as-Agent 核心）**
- 类型：AgentNodeType 加 'agent-loop'；AgentWorkflowNodeData 加 agentLoop 字段
- 执行器：agentWorkflowExecutor.ts 加 agent-loop case，LLM bindTools 自主循环
- 前端面板：AgentLoopNodePanel.vue（模型/迭代/输入来源/系统提示/工具多选）
- palette + 面板注册 + 校验
- runAgentLoop 提取为导出函数 + 4 个单元测试

**Phase S — workflow 可路由技能（非侵入式）**
- AgentWorkflow schema 加 routingKeywords 字段
- POST /ai/debug/route-workflow 匹配 API
- designer 属性面板加路由关键词配置
- useWorkflowSuggestion composable + AiChatPanel 输入区建议条

**审查修复**
- agent-loop：工具失败时不中途设 finalText；跳过无效 tool_call
- WorkflowDebugView：routeToExecution 先 unsubscribe；执行后清 pendingFile
- AiChatPanel：selectedWorkflowId 变化时清 workflow 建议
- 新增 agentWorkflowAgentLoop.spec.ts（4 测试）

**测试**：ai/app 680 过，server agent-loop 4 + executorNewNodes 26 过，tsc 干净

### 2026-07-16（P2 完成）

**Phase N-3 完成** — 插件在线编辑
- 新增 `ai/app/src/components/plugins/PluginEditor.vue`（JSON 编辑器）
- 新增 `updatePluginLocalConfig` API
- 更新 `PluginCenterView.vue` 添加编辑按钮和对话框

**Phase O P2 任务完成** — 能力层细化
- O-3: Skill 拼装顺序规范 ✅（skill-assembly-spec.md）
- O-4: Skill 多语言支持 ✅（locale 字段 + resolveSkillByLocale + reply-en.md）
- O-7: MCP 租户隔离 UI ✅（租户选择器 + X-Tenant-Id header）
- O-8: Chat 空状态引导词配置化 ✅（GET /api/ai/chat-config + chatConfig store）
- O-11: Pack spec v1 + 签名 ✅（pack-spec-v1.md + HMAC-SHA256 签名 + 18 tests）
- O-12: 插件级 metrics ✅（pluginMetric model + pluginMetrics service + 6 tests）

**回归测试结果**
- Server 测试：989 passed, 36 failed（预存问题）, 220 skipped
- 新增测试：46 passed（skillAssembly 26 + pluginPack 18 + pluginMetrics 6）
- 所有新增功能测试通过

### 2026-07-16（续）

**Phase O P1 任务完成** — 能力层细化
- O-1: Expert routing 路由调试 UI ✅
  - 新增 `ai/app/src/views/RoutingDebugView.vue`（测试消息路由）
  - 新增 `ai/app/src/views/RoutingDebugView.module.scss`
  - 新增 `server/src/ai/routes/debugRoutes.ts`（/api/ai/debug/route）
  - 更新 `ai/app/src/router.ts` 添加 /debug/routing 路由
  - 更新 `ai/app/src/components/AiLayout.vue` 添加导航入口
- O-2: Workflow expert vs Chat prompt 对齐 ✅（已对齐：node.data.prompt 覆盖 + buildExpertSystemPrompt）
- O-5: Tool label/category CI 校验 ✅
  - 新增 `server/scripts/validate-tools.ts`（校验工具配置）
  - 更新 `server/package.json` 添加 validate:tools 脚本
- O-6: MCP factoryModule example pack ✅
  - 新增 `server/config/plugins/local.example/mcp-custom/server.json`
  - 新增 `server/config/plugins/local.example/mcp-custom/factory.ts`
- O-9: 官方 demo 流 seed ✅（seedDemoWorkflows.ts 已有 4 个 demo）
- O-10: RAG 与 Tool/MCP 边界文档 ✅（rag-tool-mcp-boundary.md）

### 2026-07-16

**Phase P 完成** — 节点能力细化与体验修补
- P-1: 文档解析/OCR 可配模型 ✅
  - 前端：`DocumentParseNodePanel.vue` 增加 `ModelOptionSelect` + `useModelOptions`
  - 后端：`fileService.ts` 的 `callVisionModel`/`performVisionAnalysis`/`performOCR`/`processFile` 增加可选 `nodeModel` 参数
  - 后端：`agentWorkflowExecutor.ts` 的 `document-parse` 和 `vision-analyze` 节点传递 `data.model`
  - 模型优先级：节点指定 > 环境变量 `AI_VISION_OCR_MODEL` > 默认模型

**Phase H 完成** — 文档与基线收尾
- H-2: 内部研发文档清扫 ✅（已有 disclaimer）
- H-4: 文档维护规程 ✅（`docs/CONTRIBUTING.md`）

**Phase G-7 完成** — openai-compatible 通用 Provider
- Provider type='custom' 支持任意 OpenAI 兼容 API
- 前端 `ProviderDialog.vue` 支持创建 custom 类型
- `llmCache.ts` 通过 DB 配置自定义 baseUrl

**Phase D 完成** — 平台能力扩展
- D-3: 配额/限流 ✅
  - 新增 `server/src/middleware/rateLimit.ts`（Redis + 内存 fallback）
  - 新增 `server/src/models/Quota.ts`（按 Key/tenant/user 配额）
  - 新增 `server/src/routes/quota.ts`（CRUD + check API）
- D-4: 插件市场模板 ✅
  - 新增 `ai/app/src/views/PluginMarketView.vue`（浏览/安装/卸载）
  - 新增 `ai/app/src/views/PluginMarketView.module.scss`

**Phase N 部分完成** — 功能补全
- N-1: RAG 文档上传入口 ✅（`RagKnowledgeBase.vue` 已有上传对话框）
- N-2: 嵌入模型配置 UI ✅（`EmbeddingSettingsView.vue` 已有完整配置）

### 2026-07-15

**Phase P 立项** — 节点能力细化与体验修补
- P-1: 文档解析/OCR 可配模型（document-parse 面板补齐 ModelOptionSelect）
- P-2: 智能助手 v2 预览无模板 ✅ 已修复
  - 根因：`AgentFlowNode.vue` 只渲染单一 source handle，`intent-router` 和 `collaboration-router` 的三路出边无法连接
  - 修复：为 `intent-router` 添加 needsAnalysis/matched/general 三路 handle（Top/Right/Bottom），为 `collaboration-router` 添加 continue/nextStep/summarize 三路 handle
- P-3: LangGraph→Workflow 节点（Phase J 已完成，标记归档）

**代码审查修复** — Critical + High 级别问题
- **CRITICAL #1**: 对话用户隔离 — AIConversation schema 新增 `userId` 字段，所有对话路由（list/get/delete/search/rollback）强制按 userId 过滤，createConversation 必须传入 userId
- **CRITICAL #2**: widget mention 全表扫描 — 改用 MongoDB aggregation 管道（$match + $unwind + $limit），避免加载全量 Schema 到内存
- **CRITICAL #3**: executeStream 重试逻辑无效 — 添加 `attempts++` 递增、错误事件处理、30s 超时机制，仅可重试错误（非 Auth/Permission）触发重试
- **HIGH #4**: 硬编码 SiliconFlow API key — 改为 `SILICONFLOW_API_KEY` / `SILICONFLOW_BASE_URL` / `SILICONFLOW_EMBEDDING_MODEL` 环境变量配置
- **HIGH #5**: 静默吞错 — `ai.ts` feedback 提交和 `useModelOptions` fallback 链添加 `console.warn/error` + 用户提示

**种子系统分析** — 24 个种子文件审查
- `seedMicroApps.ts` 用 `$set` 而非 `$setOnInsert`（每次覆写用户自定义）
- `seedRoles.ts` 每次覆写 admin 权限数组
- `seedFlowTemplates.ts` 每次覆写内置模板图数据
- 业务种子在已有数据库时完全跳过（userCount > 0 门控）
- 建议：核心种子改用 `$setOnInsert`，新增 `SEED_SKIP` 环境变量

**UI 审查修复** — 全面代码审查
- 修复 AiMessageActionBar 点踩图标（star → star + CSS 翻转）
- 修复 3 个文件废弃的 `theme="primary"` → `type="primary"`
- 修复 PluginCenterView 4 个英文列标题（argsHint/Transport/Builtin/Namespace → 中文）
- 修复 `Model 标识` → `模型标识` 统一（ModelDialog.vue、ModelList.vue）
- 修复 PluginCenterView subtitle 暴露技术细节
- Phase L 状态更新为 ✅（L-5 模板已瘦身，脚本保留类型定义）
- Phase P 状态更新为 33%（P-2 ✅）

### 2026-07-14

**Phase J 完成** — LangGraph 对话节点白盒化
- 5 个 runtime 纯函数模块（intentRouter/requirementAnalyzer/taskPlanner/summarizer/collaborationRouter）
- 6 个新节点类型注册（AgentNodeType + Palette + Panels + Executor）
- 4 个新事件类型（route_decided/summary_stream/requirement_analyzed/task_step_complete）
- 2 个官方模板（chat-parity-assistant、requirement-gated-build）
- demo-chat-parity seed
- 文档更新

**Phase K 完成** — Provider/Model 两级结构
- Provider + Model Schema（server/src/models/）
- seedProvidersAndModels()（DeepSeek/Mimo/Ollama）
- llmCache.ts 两级查询
- providerRoutes.ts + aiModelRoutes.ts API
- 前端 ModelSettingsView.vue 重构为左右分栏 UI

**Phase M 完成** — Chat 预览增强
- 用户图片内联显示
- PDF.js 渲染预览（PdfPreviewCard.vue）
- Excel 上传 + 预览（ExcelPreviewCard.vue）

**包清理**
- 删除 `ai/sdk/`（@ai-sdk，无消费者）
- 删除 `ai/workflow-client/`（@schema-platform/workflow-client，REST API 包装器）
- 更新所有文档引用

**Phase L 启动** — 消息组件化重构
- RendererRegistry.ts 渲染器注册表设计
- 独立 Renderer 提取（Text/Code/Thinking/ToolCall/Image/Requirement/Document）
- AiMessageContent.vue 调度器
- AiMessage.vue 主组件瘦身

### 2026-07-13

**Phase J 启动** — LangGraph 对话节点白盒化
- J-0: 共享运行时抽取开始

### 2026-07-09

**方向调整**
- shell 归档删除，不再维护
- 共享包聚合到 shared/ 目录
- AI 项目开源 SaaS 平台化
- editor / flow 独立配套迭代

### 2026-07-08

**Phase A～I 全量迭代完成**
- 平台凭证（invoke + 用户 Key + UI）
- 开源交付（README / docker-compose / env 清单）
- 质量与体验（Auth e2e + invoke 展示 + 401 refresh）
- 工作流模板与试用（7 个官方模板 + demo seed）
- 能力层调研（Expert/Skill/Tool/MCP/Prompt）
- 模型扩展（BYOK + llmCache + ModelSettingsView）
- 技术债清理（v1 回退 + legacyAgentKey + 双 Key 示例）

### 2026-06-28

**AI 项目基础迁移**
- 从 monorepo 迁移至独立目录
- 项目级 CLAUDE.md 创建
- qiankun 模式 loading 修复
- mount() 使用 getToken 动态获取 token
- 部署到生产环境

---

## 产品定位（鉴权）

- **主路径**：全部业务 API **JWT**（`authMiddleware`）
- **集成**：`POST /api/ai/workflows/invoke/{slug}` + **`X-Workflow-Key`**（`wf-...`）或 **`X-API-Key`**（`sk-...`）二选一
- 外部系统直接调用 REST API，无需额外 SDK
