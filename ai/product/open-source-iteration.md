# 开源 AI 应用 — 回归报告与迭代计划

> 日期：2026-07-14  
> 范围：`ai/` 应用能力小平台 + 三能力 JWT 统一 + server `/api/ai`

---

## 一、本轮完成（JWT 三能力统一）

### 1.1 `platform-shared`

| 项 | 说明 |
|----|------|
| `initCapabilityPlatformAuth()` | editor / flow / ai 统一入口：`apiClient`、Socket、`resolveAuthToken`、可选 `registerTokenProvider` |
| `apiClient` 401 重试 | access 过期时先 `refreshAccessToken()` 再重试一次请求 |
| 测试 | `__tests__/authSession.spec.ts`（mock 验证接线） |

### 1.2 三子应用接入

| 应用 | 变更 |
|------|------|
| **ai** `main.ts` | `initCapabilityPlatformAuth` + `registerAiApiTokenProvider`（aiApi / agentWorkflowApi） |
| **ai** `main-sidebar.ts` | 补齐鉴权：`bootstrapAuthSession` 后再挂载，与 editor/flow 同源 JWT |
| **ai** `setupCapabilityAuth.ts` | 集中注入 fetch 客户端 token |
| **ai** `pluginApi.ts` | 使用 `resolveAuthToken()` |
| **editor** `main.ts` | `initCapabilityPlatformAuth` + `configureApiClient` 用 `resolveAuthToken` |
| **flow** `main.ts` | `initCapabilityPlatformAuth` + flowApi token；Pinia 后再 init |

### 1.3 文档

- [platform.md](../platform.md) — 补充 `initCapabilityPlatformAuth` 说明

---

## 二、基线 1.0 — 遗留路径删除（2026-07-07）

> 无历史生产数据约束，直接删兼容层，确立单一主路径。

### 2.1 工作流 DAG

| 删除 | 基线 |
|------|------|
| `agent` / `agent-editor` … 节点类型 | `expert` + `expertId`、`agent-intent` |
| `tool-mcp-*` 静态节点类型 | `tool` + `toolName`（Registry） |
| `/api/ai/open/*` | `POST /api/ai/workflows/invoke/{slug}` |
| `LEGACY_TOOL_ALIASES` | MCP 规范名 only |

### 2.2 Chat LangGraph

| 删除 | 基线 |
|------|------|
| 图节点 `editor` / `flow` / `page` / `general` | 唯一 `pluginExpert` |
| `editorAgent.ts` / `flowAgent.ts` / `pageAgent.ts` | `pluginExpertAgent.ts` + `expertUserContext.ts` |
| 硬编码 `generalAgentNode` | `platform.general` 插件专家 |

### 2.3 回归（基线后）

| 套件 | 结果 |
|------|------|
| `ai/app` vitest | **389 / 389** |
| `server/src/ai` vitest | **360 / 360** |

---

## 三、已知未自动化覆盖

- 三应用真实浏览器 SSO 登录 → refresh → 跨 tab 会话
- editor/flow iframe Sidebar 长时间停留后 token 自动刷新 + WS 重连
- qiankun 容器内 Shell `getToken` 注入与 refresh 协同

建议下轮补 **e2e**：登录一次 → 打开 editor AI 抽屉 → 发 Chat → 等待超过 access 有效期 → 确认仍成功。

---

## 四、开源小平台 — 当前能力矩阵

| 模块 | 状态 | 说明 |
|------|------|------|
| AI 对话 + LangGraph | ✅ | WebSocket；Chat 专家统一 `pluginExpert` 节点 |
| Agent 工作流编排 | ✅ | 设计器、发布、执行、监控 |
| 统一 invoke + Workflow Key | ✅ 部分 | 入口与 wf key；**用户平台 Key 未并入 invoke** |
| 用户平台 Key（sk-） | ⚠️ 后端 only | `/api/keys`；权限仍偏管理员；无 AI UI |
| 插件中心 | ✅ | 配置、校验、本地写入 |
| RAG | ✅ | 知识库 UI + API |
| 监控 | ✅ | `AiMonitorView` |
| JWT 三能力统一 | ✅ 本轮 | `initCapabilityPlatformAuth` |
| 开源文档 | ✅ 部分 | platform.md、sdk.md、plugin.md；内部研发文档 H-2 待清扫 |
| 模型 BYOK / 自定义端点 | ✅ | ModelSettingsView + useModelPresets + llmCache 优先级 |
| Docker / 一键部署 | ✅ | `docker-compose.ai.yml` |
| 集成密钥 UI | ✅ | ApiKeyManagerView（创建/列表/禁用/删除） |

---

## 五、后续迭代计划

> **全量任务 ID 一览**见 [open-platform-roadmap.md § 七](./open-platform-roadmap.md#七全量任务索引)。下文为各 Phase 可执行拆解。

### Phase A — 平台凭证（P0，1–2 周）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| A-1 | invoke 支持 `X-API-Key` | 用户平台 Key 与 Workflow Key 二选一，统一 `POST /workflows/invoke/:slug` | ✅ |
| A-2 | `/api/keys` 按用户隔离 | 列表/删改默认 `createdBy === 当前用户`；普通角色可管理自己的 Key | ✅ |
| A-3 | AI 应用「我的集成密钥」 | 路由如 `/settings/keys`：创建、脱敏列表、禁用、删除；创建后一次性展示 `sk-...` | ✅ |
| A-4 | 外部集成支持 `X-API-Key` | 与 `X-Workflow-Key` 二选一 | ✅ |
| A-5 | seed 角色 | `普通用户` 增加 `apikey:*`（或专用 `apikey:manage-self`） | ✅ |

### Phase B — 开源交付（P0，1 周）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| B-1 | `ai/README.md` 开源快速开始 | 最小部署：server + ai standalone | ✅ |
| B-2 | 环境变量清单 | JWT、LLM、MongoDB、embedding | ✅ |
| B-3 | `docker-compose.ai.yml`（可选） | 仅 ai 小平台演示栈 | ✅ |
| B-4 | LICENSE + CONTRIBUTING | 若对外开源 | ✅ |

### Phase C — 质量与体验（P1，1–2 周）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| C-1 | Auth e2e | SSO + refresh + Sidebar 长会话（见 §三） | ✅ |
| C-2 | Open API 删除 | `/api/ai/open/*` 已删，文档指向 invoke | ✅ |
| C-3 | 工作流列表展示 invoke 信息 | 已发布流的 URL + 脱敏 Key 汇总 | ✅ |
| C-4 | fetch 客户端 401 refresh | aiApi / agentWorkflowApi 对齐 axios 的 refresh 重试（可选） | ✅ |

### Phase D — 平台能力扩展（P2，按需）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| D-1 | 多租户切换与 Key 隔离 | UI 展示当前租户 | ✅ |
| D-2 | Key 使用审计 | lastUsedAt 列表、按工作流统计 | ✅ |
| D-3 | 配额 / 限流 | 按用户 Key 或租户 | ⬜（仅全局 IP 限流） |
| D-4 | 公开插件市场模板 | 与 plugin pack 结合 | ⬜（仅 schema 定义） |

### Phase E — 工作流模板与试用（P1）

> 产品方案见 [open-platform-roadmap.md § 二](./open-platform-roadmap.md#二phase-e--工作流模板与试用产品计划)。

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| E-1 | 模板 Tab：「试用」「在对话中体验」 | 按 `category` 显隐 | ✅ |
| E-2 | seed `demo-*` 已发布工作流 | `demo-intelligent-assistant` 等（见 roadmap E.5） | ✅ |
| E-3 | 试用 → 设计器 `?try=1&sample=...` | 预填 sample input / 执行抽屉 | ✅ |
| E-4 | Chat 深链 `/?workflowId=demo-*` | AiChatSettings 预选工作流 | ✅ |
| E-5 | 扩 3～5 个模板图工厂 | ai-shared + `agentWorkflowTemplates.spec.ts` | ✅ |
| E-6 | 文档：模板 vs 示例流 vs Chat | 写入 agent-workflow.md | ✅ |
| E-T1 | 模板 `contract-extract` | document 类 | ✅ |
| E-T2 | 模板 `kb-faq` | assistant 类 | ✅ |
| E-T3 | 模板 `http-notify` | integration 类 | ✅ |
| E-T4 | 模板 `rag-ingest-qa` | assistant 类 | ✅ |
| E-T5 | 模板 `multi-doc-batch` | document 类（可先简化） | ✅ |

### Phase F — 能力层细化调研（P0）

> 调研总表见 [open-platform-roadmap.md § 三 F.2](./open-platform-roadmap.md#f2-调研总表需逐项填结论)。

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| F-1 | 走读 Registry → Chat/Workflow 消费链 | 填 F.2「现状」列 | ✅ |
| F-2 | 第三方插件最小示例 | 对照 `example.support` pack | ✅ |
| F-3 | 输出 `prompt-architecture.md` | 结论 F-P1～P4 | ✅ |
| F-4 | Expert/Tool/MCP 扩展指南 | 或合并 `docs/extend/` | ✅ |
| F-5 | 评审：开源核心 vs 可选 pack | 产品评审 | ✅ |
| F-P1 | promptBuilder 与 editor/flow 解耦？ | 保留 / 拆成 `platform.domain` pack | ✅ |
| F-P2 | `prompts` DB 与 Plugin Skill 合并？ | 合并 / 企业版 / 分工 | ✅ |
| F-P3 | Prompt 层 Plugin Center Tab？ | 文档 / 只读 / 完整编辑 | ✅ |
| F-P4 | 模板携带 `recommendedSkills[]`？ | 是 / 否 | ✅ |

F.2 表中 **P0 调研项**（dynamicPrompt、Tool kind、HTTP 安全、MCP transport、Prompt 四层、`promptsRoutes`）须逐项标 ✅ 后，再大规模扩模板（见 roadmap F.5 闸门）。

### Phase G — 模型扩展（BYOK + 自定义端点）（P0）

> 现状与缺口见 [open-platform-roadmap.md § 三 F.6](./open-platform-roadmap.md#f6-模型层llm与四层插件并列的第五扩展)。

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| G-1 | BYOK 归属结论 | 租户级 vs 用户级 vs 二者 → `model-architecture.md` | ✅ |
| G-2 | `llmCache` / `LLMManager` 优先级 | DB/用户配置优先于平台 env；可选 `PLATFORM_LLM_ENABLED=false` | ✅ |
| G-3 | ModelConfig apiKey 脱敏 | 创建/更新一次性回显；对齐 `/api/keys` | ✅ |
| G-4 | AI 应用「模型与连接」设置页 | CRUD + 测试连接 + 默认模型 | ✅ |
| G-5 | Chat / Workflow 动态模型列表 | 替换 `CHAT_MODEL_OPTIONS` 硬编码 | ✅ |
| G-6 | 文档：Ollama / vLLM / 私有网关 | env + UI 双路径示例 | ✅ |
| G-7 | 可选 `openai-compatible` Provider | 任意 `baseUrl` + `model` | ⬜（无独立 provider 类型） |

### Phase H — 文档与基线收尾（P1）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| H-1 | 产品/API 文档对齐基线 1.0 | api-reference invoke、sdk、architecture、agent-workflow 等 | ✅ |
| H-2 | 内部研发文档清扫 | `server/src/ai/ARCHITECTURE_PLAN.md`、`AUDIT_REPAIR_PLAN.md`、`PRODUCTION_FIX.md` 去除 editorAgent/open API 引用 | ⬜（仅加 disclaimer） |
| H-3 | `server/docs/rag-architecture.md` 等 server 文档 | pluginExpert / expertUserContext 叙事 | ✅ |
| H-4 | 变更时文档维护规程 | 新 Phase 完成 → 更新 roadmap §一状态列 + backlog | ⬜ |

### Phase I — 可选技术债（P2，按需）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| I-1 | 移除 v1 Chat 回退 | 删除 `AI_ENABLE_REQUIREMENT_ANALYSIS=false` 短路路径（仅保留 v2 管线） | ✅ |
| I-2 | `legacyAgentKey` 文档化 | plugin.md + 《Expert 扩展指南》：仅 task chain / `context.source` 调度键，非图节点 | ✅ |
| I-3 | 双 Key 示例 | curl + TS 示例（`sk-` vs `wf-`） | ✅ |

### Phase J — LangGraph 对话节点白盒化（P0，完成）

> 详细规格见 [langgraph-workflow-nodes-roadmap.md](./langgraph-workflow-nodes-roadmap.md) · 节点参考见 [agent-workflow.md §2.5](../agent-workflow.md#25-对话智能节点phase-j)

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| J-0 | 共享运行时抽取 | `server/src/ai/runtime/*` + Chat 回归 | ✅ |
| J-1 | 意图路由 + 总结节点 | `intent-router`、`summarizer` 全栈 | ✅ |
| J-2 | 需求分析链路 | `requirement-analyzer` + `hitl` 增强 | ✅ |
| J-3 | 任务链闭环 | `task-planner`、`task-chain`、`collaboration-router` | ✅ |
| J-4 | 模板与文档 | 官方模板 + 术语表更新 + seed | ✅ |

**产出**：5 runtime 模块、6 新节点类型、4 新事件、2 模板、1194 测试通过

### Phase K — Provider/Model 两级结构（P0，完成）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| K-1 | Provider Schema | `server/src/models/Provider.ts` | ✅ |
| K-2 | Model Schema | `server/src/models/Model.ts` | ✅ |
| K-3 | Seed 逻辑 | `seedProvidersAndModels()`（DeepSeek/Mimo/Ollama） | ✅ |
| K-4 | llmCache 两级查询 | Provider+Model → LLMConfig | ✅ |
| K-5 | Provider API | `providerRoutes.ts` CRUD + test | ✅ |
| K-6 | Model API | `aiModelRoutes.ts` CRUD + test | ✅ |
| K-7 | 前端 UI | ModelSettingsView.vue 左右分栏 | ✅ |

**产出**：供应商/模型两级管理、Ollama 接入、快速添加预设

### Phase L — 消息组件化重构（P1，进行中）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| L-1 | RendererRegistry | 渲染器注册表 | 🔄 |
| L-2 | 独立渲染器 | Text/Code/Thinking/ToolCall/Image/Requirement/Document | 🔄 |
| L-3 | AiMessageContent | 内容调度器 | 🔄 |
| L-4 | AiMessageActionBar | 操作栏 | 🔄 |
| L-5 | AiMessage 瘦身 | 主组件 ~100 行 | 🔄 |

**目标**：新增预览类型只需新建 Renderer + 注册

### Phase M — Chat 预览增强（P1，完成）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| M-1 | 用户图片内联 | DocumentAttachmentCard 缩略图 | ✅ |
| M-2 | PDF 渲染 | PdfPreviewCard.vue | ✅ |
| M-3 | Excel 预览 | ExcelPreviewCard.vue | ✅ |

---

## 六、优先级建议

```text
P0 已完成：Phase A/J/K（凭证 + 节点白盒 + Provider/Model）
P1 进行中：Phase L（消息组件化）+ Phase H（文档收尾）
P2 待规划：Phase D（配额/限流 + 插件市场）+ Phase G-7（openai-compatible）
P3 远期：音频/视频/3D 预览
详见 open-platform-roadmap.md § 五排期
```

---

## 七、相关文档

- **[open-platform-roadmap.md](./open-platform-roadmap.md)** — 总路线图
- [platform.md](../platform.md) — 三能力 + JWT + 凭证
- [product/backlog.md](./backlog.md) — **进度入口**（进行中 Phase 一览）
