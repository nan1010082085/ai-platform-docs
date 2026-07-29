# 开源 AI 小平台 — 总路线图

> **定位**：`ai` 应用 + `server/api/ai` 作为可独立部署、可扩展的 **应用能力小平台**；与 editor / flow 共用 JWT，Sidebar 仅为集成形态。  
> **原则**：Expert / Skill / Tool / MCP 已拆分可扩展；工作流模板与凭证模型按平台化补齐；**能力层需专项细化调研**后再大规模扩模板与第三方插件。

**关联文档**：

| 文档 | 内容 |
|------|------|
| [platform.md](../platform.md) | 三能力一体、JWT、双 Key |
| [open-source-iteration.md](./open-source-iteration.md) | JWT 统一、基线 1.0、**Phase A～I 可执行拆解** |
| [langgraph-workflow-nodes-roadmap.md](./langgraph-workflow-nodes-roadmap.md) | **Phase J**：LangGraph 对话节点 → Workflow 白盒补齐 |
| [plugin.md](../plugin.md) | 插件中心架构与 CLI |
| 本文 | **模板策略 + 能力调研清单 + 阶段总表** |

---

## 一、阶段总览

| 阶段 | 主题 | 优先级 | 状态 |
|------|------|--------|------|
| **—** | JWT 三能力统一 | P0 | ✅ 已完成（见 open-source-iteration §一） |
| **基线** | 遗留路径删除（Open API / 节点 / pluginExpert） | P0 | ✅ 已完成（见 open-source-iteration §二） |
| **A** | 平台凭证（用户 Key + invoke） | P0 | ✅ 已完成 |
| **B** | 开源交付（README / 部署） | P0 | ✅ 已完成 |
| **C** | 质量（e2e、invoke 展示） | P1 | ✅ 已完成 |
| **D** | 运营扩展（租户、审计、配额） | P2 | 部分完成（D-1/D-2 ✅，D-3/D-4 ⬜） |
| **E** | **工作流模板与试用体验** | P1 | ✅ 已完成（本文第二节） |
| **F** | **能力层细化调研** | P0 | ✅ 已完成（本文第三节） |
| **G** | **模型扩展（BYOK + 自定义端点）** | P0 | ✅ 已完成（含 Provider/Model 两级结构） |
| **H** | **文档与基线收尾** | P1 | 部分完成（H-1/H-3 ✅，H-2/H-4 ⬜） |
| **I** | **可选技术债** | P2 | ✅ 已完成 |
| **J** | **LangGraph 对话节点白盒化** | P0 | ✅ 已完成（5 runtime + 6 节点 + 2 模板） |
| **K** | **Provider/Model 两级结构** | P0 | ✅ 已完成 |
| **L** | **消息组件化重构** | P1 | 🔄 进行中 |
| **M** | **Chat 预览增强** | P1 | ✅ 已完成 |

当前重点：**Phase L（消息组件化）**；待规划：Phase D-3/D-4、Phase H-2/H-4、Phase G-7。

---

## 二、Phase E — 工作流模板与试用（产品计划）

### E.1 结论（不做 / 要做）

| 决策 | 说明 |
|------|------|
| ❌ **不做** | 单独一级侧栏「预览模块」+ 二级每模板一项（与「Agent 编排 → 模板」Tab 重复，模板增多后菜单爆炸） |
| ❌ **不做** | 仅靠 Chat 验证所有模板（Webhook / 文件上传 / API 集成类模板不适合） |
| ✅ **保留** | 现有 **模板 Tab** + `AgentWorkflowTemplatePreviewDialog`（**只读 DAG 结构预览**） |
| ✅ **新增** | **「试用」路径** + 可选 **官方示例已发布流** + 扩充分类模板库 |

### E.2 现有能力（基线）

```
Agent 编排 /workflows
  └── Tab「模板」
        ├── 卡片（分类、搜索）
        ├── [预览] → PreviewDialog（只读画布 + 节点清单）
        └── [使用] → createWorkflow(templateId) → 设计器草稿
```

- 模板定义：`shared/platform-shared/ai/agentWorkflow.ts` → `AGENT_WORKFLOW_TEMPLATES` + `createAgentWorkflowGraphByTemplate`
- 当前内置：**4**（blank + document-summary + doc-image-recognition + intelligent-assistant）

### E.3 目标体验

```text
模板 Tab
  ├── [预览结构]  → 已有 PreviewDialog
  ├── [从模板创建] → 已有（fork 成用户工作流）
  ├── [试用]       → 新增（按类型分流，见 E.4）
  └── [在对话中体验] → 仅 assistant 类模板（可选）
```

**角色划分**：

| 动作 | 目的 |
|------|------|
| 预览 | 看 DAG 结构、节点类型，**不跑 LLM** |
| 试用 | **跑一遍**官方示例或带 sample input 的试跑 |
| 创建 | 复制成自己的草稿，可改、发布、集成 |
| Chat | 已发布工作流的 **对话类消费通道**，非唯一试用入口 |

### E.4 「试用」分流规则

| 模板分类 | 试用方式 | 依赖 |
|----------|----------|------|
| `assistant` | 「在对话中体验」→ Chat + 绑定 `agentWorkflowId` | **官方示例流**已发布 |
| `document` | 「试跑」→ 设计器打开 + 预填 sample input / 引导上传 | 草稿 JWT execute |
| `integration` | 展示 invoke URL + 示例 curl；可选一键执行 | 官方示例流 + Key |
| `general` | 设计器「测试执行」 | 现有 execute API |

### E.5 官方示例工作流（推荐）

为开源演示与各模板对齐，**server seed 或安装脚本** 创建：

| slug 示例 | 对应模板 | 说明 |
|-----------|----------|------|
| `demo-intelligent-assistant` | intelligent-assistant | Chat 试用入口 |
| `demo-document-summary` | document-summary | invoke + 文档 id 样例 |
| `demo-doc-image` | doc-image-recognition | 设计器试跑 + 样例文件说明 |

- 归属：平台租户 / 系统用户；只读或明确标为「演示」
- 模板卡片：**「运行官方示例」** 不调创建接口，直接 `execute` / 跳 Chat

### E.6 模板扩展清单（待实现）

| ID | 模板 id | 分类 | 说明 |
|----|---------|------|------|
| E-T1 | `contract-extract` | document | 合同要点提取 |
| E-T2 | `kb-faq` | assistant | 知识库 FAQ |
| E-T3 | `http-notify` | integration | HTTP 调用 + 完成回调 |
| E-T4 | `rag-ingest-qa` | assistant | 索引 + 问答（链 RAG） |
| E-T5 | `multi-doc-batch` | document | 批处理占位（可先简化） |

实现仍走：`AGENT_WORKFLOW_TEMPLATES` + `createXxxWorkflowGraph()` + 单测 `agentWorkflowTemplates.spec.ts`。

### E.7 工程任务拆解

| ID | 任务 | 说明 |
|----|------|------|
| E-1 | 模板 Tab UI：「试用」「在对话中体验」按钮 | 按 `category` 显隐 |
| E-2 | seed `demo-*` 已发布工作流 | 安装/seed 脚本 |
| E-3 | `试用` → 设计器带 `?try=1&sample=...` 或执行抽屉 | 预填 input |
| E-4 | Chat 深链：`/?workflowId=demo-*` | AiChatSettings 预选工作流 |
| E-5 | 扩 3～5 个模板图工厂 | ai-shared |
| E-6 | 文档：模板 vs 示例流 vs Chat | 写入 agent-workflow.md |

### E.8 验收标准

- 新用户 **不创建草稿** 即可跑通至少 1 个官方示例（assistant + document 各一）
- 模板 Tab 可预览结构、可 fork、可试用，**无新增顶级菜单**
- 开源 README 中「5 分钟体验」路径指向模板/示例

---

## 三、Phase F — 能力层细化调研

> Agent、MCP、Skill、Tool 已 **配置化拆分**（`server/config/plugins/` + Registry），但开源小平台要对外承诺扩展契约，需逐项调研：**现状 → 开源目标 → 缺口 → 产出物**。

### F.1 能力分层总图

```text
                    ┌─────────────────────────────────────┐
                    │  Prompt 层（待统一叙事）              │
                    │  promptBuilder · Expert · Skill ·   │
                    │  Workflow 节点 prompt · Chat 引导   │
                    └─────────────────────────────────────┘
                                      ▲
┌──────────────┐  ┌──────────────┐  ┌──┴───────────┐  ┌──────────────┐
│ Expert       │  │ Skill        │  │ Tool         │  │ MCP Server   │
│ 专家身份路由   │  │ 可复用指令块  │  │ 工具元数据    │  │ 传输与连接    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │                 │
        └─────────────────┴──────── Registry ───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        Chat LangGraph          Agent Workflow            RAG / HTTP
        (pluginExpert)          (expert / tool 节点)      (跨层工具)
                                      │
                              ┌───────┴───────┐
                              │ Model（LLM）   │
                              │ env / DB BYOK  │
                              └───────────────┘
```

### F.2 调研总表（需逐项填结论）

状态列：`⬜ 未调研` `🔄 调研中` `✅ 已结论` `🔧 待开发`

| 域 | 调研项 | 现状摘要 | 开源目标 | 初步缺口 | 优先级 | 产出物 | 状态 |
|----|--------|----------|----------|----------|--------|--------|------|
| **Expert** | Chat 专家单路径：`pluginExpert` + Registry | ✅ 已收敛（2026-07-07） | 单一扩展入口：仅 Registry + pack | `legacyAgentKey` 仅作 task chain 调度键 | P0 | 《Expert 扩展指南》 | ✅ |
| **Expert** | `dynamicPrompt` vs `systemPrompt` | 4 个平台专家全部用 `dynamicPrompt`（editor/flow/page/general），`example.support` 用 `systemPrompt`。`resolveExpertPrompt.ts` 优先级：dynamic > system。Skill 拼接到末尾。 | 第三方只用 `systemPrompt` + skills | `promptBuilder` 仍绑平台域 metadata.json，不宜开源耦合 editor/flow | P0 | 字段决策树 | ✅ |
| **Expert** | `routing` 意图匹配 | keywords + contextSources | 可配置、可调试 | 无路由测试台；误路由难排查 | P1 | 路由调试 UI 或 CLI | ⬜ |
| **Expert** | Workflow `expert` 节点 vs Chat | `expertId` 共用 Registry | 行为一致（工具集、prompt） | 节点级 `prompt` 覆盖规则未文档化 | P1 | 对齐单测 + 文档 | ⬜ |
| **Skill** | 定义方式：inline vs `file.md` | pack 支持相对路径 .md | 推荐 file + pack 分发 | Plugin Center **只读**，无 Skill 编辑器 | P1 | Skill 作者手册 | ✅ `docs/extend/skill-author-guide.md` |
| **Skill** | 拼装顺序与冲突 | `resolveExpertSystemPrompt`：base + skills | 明确优先级与分隔符 | 无版本号、无 A/B | P2 | 规范一节 | ⬜ |
| **Skill** | 多语言 | 仅 `platform.reply-zh` | i18n skill id 或 locale 字段 | 无 locale 模型 | P2 | 调研备忘 | ⬜ |
| **Tool** | kind：`mcp` / `graph` / `http` | 3 种 kind：`mcp`(17 个，MCP Server 发现) / `graph`(7 个，LangGraph 专有 HITL/LLM/复合写入) / `http`(1 个，通用 HTTP 执行器)。Registry 声明 + `tools/registry.ts` 执行器分流。 | 扩展方只增 JSON | `graph` 工具硬编码在 `langgraphTools.ts`，第三方无法新增 graph kind | P0 | Tool kind 完整清单 | ✅ |
| **Tool** | label / category | Registry 优先，agentTools 回退 | 扩展工具必带 label | 回退表与 Registry 漂移风险 | P1 | CI 校验必填 label | ⬜ |
| **Tool** | `http` 工具安全 | `httpToolExecutor.ts` 用原生 `fetch()`，**无任何安全限制**（无 SSRF 防护、无 allowlist、无超时、无响应大小限制） | SSRF 策略、allowlist | 当前为无限制通用 HTTP 执行器，开源前必须加安全基线 | P0 | 安全基线文档 | ✅ |
| **MCP** | transport 矩阵 | 3 种 transport：`inmemory`(5 个内置 Server，InMemoryTransport 内存直连) / `stdio`(类型已支持，未使用) / `sse`(示例包 disabled，+ 5 个内置 Server 通过 `routes/mcp.ts` SSE 暴露给外部客户端) | 文档说明生产推荐 | stdio 沙箱未实现、sse 鉴权未标准化、外部 SSE 无 auth middleware | P0 | 《MCP 接入指南》 | ✅ |
| **MCP** | `factoryModule` 自定义 inmemory | 已支持自定义 factory | 第三方可插业务 MCP | 示例少；类型导出 | P1 | example pack 扩充 | ⬜ |
| **MCP** | 租户隔离 | tenant overlay 目录 | 租户独立 MCP 配置 | UI 无租户插件管理 | P2 | 与 Phase D 合并 | ⬜ |
| **Prompt** | **四层 Prompt 关系** | 4 层并存：(1) Domain promptBuilder（ai-shared，绑 metadata.json）→ 4 个平台专家底座；(2) Expert `dynamicPrompt` 指向 promptBuilder 类型；(3) Expert `systemPrompt` + Skill 拼装 → 第三方主路径；(4) 节点级 prompt（Workflow LLM/Expert 节点 data 字段）→ 单次执行覆盖。另：Chat starter 硬编码在 `AiChatPanel.vue`。 | 统一术语与扩展边界 | 对外叙述分散在 agent.md / plugin.md | **P0** | **prompt-architecture.md** | ✅ |
| **Prompt** | Chat 空状态引导词 | 硬编码 `AiChatPanel` starterPrompts | 可配置（Registry 或 config） | 与 Expert 无关，难运营 | P2 | 配置化方案 | ⬜ |
| **Prompt** | Workflow LLM 节点 `prompt` | 节点 data 字段 | 变量引用文档 | `$input` 等与 Skill 关系不清 | P1 | workflow 变量文档 | ✅ `docs/extend/workflow-variables.md` |
| **Prompt** | `promptsRoutes` / DB 模型 | `/api/ai/prompts` + `PromptTemplateModel`（MongoDB）：完整 CRUD + 版本历史 + 反馈优化 + 测试 + 变量渲染。与 Plugin Skill **并存但不交叉**——DB 模板是运营级管理（A/B、优化），Skill 是配置级指令块。当前无代码将 DB Template 注入 Expert prompt。 | 与 Plugin Skill 是否合并？ | 双轨并存，分工明确：Skill=配置指令，DB=运营文案。合并需评估 | P0 | 合并或分工结论 | ✅ |
| **Workflow** | 模板注册机制 | 仅 ai-shared 硬编码 | 开源可 **插件 pack 带模板** 或 JSON | 无运行时模板注册 | P1 | 模板扩展 RFC | ✅ `docs/extend/workflow-template-rfc.md` |
| **Workflow** | 官方 demo 流 | 无 seed | Phase E 官方示例 | seed 脚本缺失 | P1 | E-2 | ⬜ |
| **RAG** | 与 Tool/MCP 边界 | `mcp-rag` + ragService | 知识库为平台一等能力 | 索引权限、多库选择 UX | P1 | RAG 扩展一节 | ⬜ |
| **插件** | Pack 格式与签名 | pack/install/validate | 可信第三方分发 | 无签名、无市场 | P2 | pack spec v1 | ⬜ |
| **插件** | UI 写本地配置 | `PUT /plugins/local/...` | 开发者模式可用 | 无非 JWT 流程；无回滚 | P1 | Plugin Center 写能力评估 | ⬜ |
| **可观测** | 执行与 Chat 追踪 | Monitor + execution 详情 | 开源默认可观测 | 插件级 metrics 缺失 | P2 | 调研备忘 | ⬜ |

### F.3 Prompt 层专项（开源叙事关键）

当前 Prompt 来源 **四套并存**，开源文档必须讲清，避免扩展者困惑：

| 来源 | 位置 | 用于 | 可扩展性 |
|------|------|------|----------|
| **Domain promptBuilder** | `shared/platform-shared/ai/promptBuilder.ts` | Editor/Flow/Page 专家 **底座**（绑平台元数据） | 改代码发版；**不适合**纯第三方 |
| **Expert `dynamicPrompt`** | plugins/experts/*.json | 指向 promptBuilder 类型 | 仅平台内置四类 |
| **Expert `systemPrompt` + Skill** | plugins + resolveExpertPrompt | **第三方主路径** | ✅ pack / local |
| **节点级 prompt** | Workflow LLM/Expert 节点 data | 单次执行覆盖 | ✅ 设计器 |
| **Chat starter** | `AiChatPanel.vue` | 空状态引导 | ❌ 硬编码 |

**调研待决问题**（F-P 系列）：

| ID | 问题 | 选项 |
|----|------|------|
| F-P1 | 开源版是否默认 **剥离** promptBuilder 对 editor/flow 的强依赖？ | 保留 / 拆成可选 pack `platform.domain` |
| F-P2 | `server` 的 `prompts` DB 模块与 Plugin Skill **合并还是并存**？ | 合并为 Skill / 仅企业版 / 分工（Skill=指令，DB=运营文案） |
| F-P3 | 是否新增 **Prompt 层** Plugin Center Tab？ | 仅文档 / 只读浏览 Skill+Expert prompt / 完整编辑 |
| F-P4 | Workflow 模板是否携带 **默认 Skill 引用**？ | 模板元数据 `recommendedSkills[]` |

### F.6 模型层（LLM）— 与四层插件并列的「第五扩展」

> **插件（Expert/Skill/Tool/MCP）解决「能做什么」；模型层解决「用什么大脑、连哪里」。** 二者独立，但 Workflow `llm` 节点 / Chat 的 `model` 字段都依赖模型解析。

#### 现状（代码已有一部分）

| 能力 | 位置 | 说明 |
|------|------|------|
| 平台内置 DeepSeek | `DEEPSEEK_API_KEY` + `DEEPSEEK_BASE_URL` env | 启动时 `LLMManager.registerFromEnv()`，**不向前端暴露 key**（`/api/ai/health` 仅 `hasApiKey`）✅ |
| 多厂商 env | `OPENAI_*` / `CLAUDE_*` | 有 Provider 实现，配 env 即注册 |
| DB 模型配置 | `ModelConfig` + `/api/model-configs` | 支持 `apiKey`、`baseUrl`、`provider`（含 **ollama**）、`model`、`isDefault`、**test 连通性** |
| 运行时解析 | `llmCache.resolveConfig()` | 优先级：**LLMManager(env) → DB isDefault → env 兜底** ⚠️ |
| AI 应用 UI | `CHAT_MODEL_OPTIONS` 硬编码 | 仅 deepseek 两个型号；**无模型配置管理页** |
| API 客户端 | `aiApi.getModelConfigs()` | 已封装，**未被 UI 使用** |

#### 核心缺口

| # | 问题 | 影响 |
|---|------|------|
| M1 | **平台 env key 优先于用户 DB 配置** | 部署方配了 `DEEPSEEK_API_KEY` 后，租户/用户自配 ModelConfig **可能永远不生效** |
| M2 | ModelConfig 是 **租户管理员** 权限（`model_config:*`），非 **每用户 BYOK** | 与「每人自己的集成 Key」叙事不一致 |
| M3 | `GET /model-configs` **返回完整 apiKey** | 开源多用户场景需脱敏 + 创建时一次性展示 |
| M4 | DB 配置 **未注册进 LLMManager** | 改 DB 后仅 `clearLLMCache`，仍走 env Provider 或直连 ChatOpenAI 分支 |
| M5 | **自定义 baseUrl（私有部署 / vLLM / Ollama）** 在 schema 已有，AI 应用无引导 | 用户不知道能配 `baseUrl` |
| M6 | Chat / Workflow 选模型与 ModelConfig **未打通** | 设计器 `model: 'default'` 与 Chat 硬编码列表 |

#### 开源小平台目标模型（建议）

```text
┌─────────────────────────────────────────────────────────────┐
│ 平台级（部署者 .env）                                         │
│   可选：PLATFORM_LLM_* 仅作 Demo / 托管试用额度               │
│   绝不下发给浏览器；可不配置（纯 BYOK 模式）                    │
├─────────────────────────────────────────────────────────────┤
│ 租户/用户级（ModelConfig 或 UserLLMCredential）               │
│   每人可配：provider + baseUrl + apiKey + defaultModel        │
│   私有部署：ollama / 自建 OpenAI 兼容网关                       │
├─────────────────────────────────────────────────────────────┤
│ 解析优先级（建议）                                            │
│   请求用户自己的配置 → 租户默认 → 平台 demo（若有）→ 报错引导配置 │
└─────────────────────────────────────────────────────────────┘
```

**是否提供自定义地址 + Key？** — **应该提供**，且后端 **已具备字段**（`baseUrl` + `apiKey` + `ollama`），需补：**解析优先级、用户级归属、AI 应用 UI、Key 脱敏**。

#### Phase G 任务（模型扩展）

| ID | 任务 | 说明 |
|----|------|------|
| G-1 | 调研并确定 **BYOK 归属**：租户级 vs 用户级 vs 二者 | 写入 model-architecture.md |
| G-2 | 调整 `llmCache` / `LLMManager`：**DB 与用户配置优先于平台 env**（可 `PLATFORM_LLM_ENABLED=false` 关闭托管） | 开源默认 BYOK |
| G-3 | ModelConfig **apiKey 脱敏**；创建/更新一次性回显 | 对齐 `/api/keys` |
| G-4 | AI 应用 **「模型与连接」** 设置页 | CRUD + 测试连接 + 选默认模型 |
| G-5 | Chat / Workflow **动态模型列表**（来自已配置 Provider，非硬编码） | 替换 `CHAT_MODEL_OPTIONS` |
| G-6 | 文档：Ollama / vLLM / DeepSeek 私有网关配置示例 | env + UI 双路径 | ✅ |
| G-7 | 可选：`openai-compatible` 通用 Provider | `baseUrl` + `model` 任意组合 |

#### 与四层插件的关系

| 层 | 扩展内容 | 配置入口 |
|----|----------|----------|
| Expert / Skill / Tool / MCP | 能力、指令、工具、外部 MCP | `server/config/plugins/` |
| **Model** | 推理端点、密钥、默认模型 | env + `/api/model-configs`（→ AI UI） |

Expert 的 `tools` / `skills` 不替代 Model；Workflow `llm` 节点应引用 **已注册的 model config id** 或 `default`。

### F.4 调研执行方式

| 步骤 | 动作 | 负责人 | 截止建议 |
|------|------|--------|----------|
| 1 | 走读 `loadPluginConfig` → Registry → Chat/Workflow 消费链，填 F.2「现状」列 | 研发 | +3d |
| 2 | 对照 `example.support` pack，写《第三方插件最小示例》 | 研发 | +5d |
| 3 | 输出 **prompt-architecture.md**（F-P1～P4 结论） | 研发+产品 | +1w |
| 4 | Expert/Tool/MCP 各一篇扩展指南或合并为 `docs/extend/` | 研发 | +2w |
| 5 | 评审：哪些能力 **开源核心** vs **可选 pack** | 产品 | +2w |

### F.5 调研完成后的开发闸门

在 F.2 中 **P0 项全部 ✅** 之前，建议 **暂缓**：

- 大量新增 Workflow 模板（>E-T5）
- 对外承诺「任意 HTTP/MCP」无安全说明
- Plugin Center  Writable UI 大范围上线

可 **并行** 推进：Phase A 凭证、Phase E 官方 demo 流（不增加新 Expert 类型）。

---

## 四、Phase A～M 摘要

> **任务 ID 与状态列**见 [open-source-iteration.md §五](./open-source-iteration.md#五后续迭代计划) · **全量索引**见 [§ 七](#七全量任务索引)。

| 阶段 | 核心 | 状态 |
|------|------|------|
| **A** | invoke + 用户平台 Key（`sk-`）、我的集成密钥 UI | ✅ |
| **B** | ai README、env 清单、docker-compose、LICENSE | ✅ |
| **C** | Auth e2e、工作流 invoke 信息展示、fetch 401 refresh | ✅ |
| **D** | 多租户、Key 审计、配额、插件市场 | 50% |
| **E** | 模板 Tab「试用」、`demo-*` seed、扩模板库 E-T1～T5 | ✅ |
| **F** | Expert/Skill/Tool/MCP/Prompt 调研 + prompt-architecture | ✅ |
| **G** | BYOK、llmCache 优先级、模型设置 UI、动态模型列表 | ✅ |
| **H** | 产品/内部文档对齐基线 1.0、维护规程 | 50% |
| **I** | v1 管线回退删除、`legacyAgentKey` 文档、双 Key 示例 | ✅ |
| **J** | LangGraph 对话节点白盒化 | ✅ |
| **K** | Provider/Model 两级结构 | ✅ |
| **L** | 消息组件化重构 | 🔄 |
| **M** | Chat 预览增强 | ✅ |

---

## 五、推荐排期

```text
已完成：Phase A/B/C/E/F/G/I/J/K/M
进行中：Phase L（消息组件化）
待规划：Phase D（配额/限流 + 插件市场）+ Phase H（文档收尾）+ Phase G-7（openai-compatible）
远期：音频/视频/3D 预览
```

---

## 六、文档维护

| 变更 | 更新 |
|------|------|
| 完成调研项 | F.2 状态列 → ✅，结论链到具体 doc |
| 新增模板 | E.6 表 + agentWorkflow.ts |
| 阶段完成 | 本文 §一状态列 + open-source-iteration 对应任务 → ✅ |
| 新增任务 | §七全量索引 + backlog「进行中」表 |

---

## 七、全量任务索引

> **单一查阅入口**：避免任务只写在某一 Phase 章节而遗漏。状态以 [open-source-iteration.md §五](./open-source-iteration.md#五后续迭代计划) 为准。

### 已完成（全量）

| ID | 说明 | 所属 Phase |
|----|------|-----------|
| JWT | 三能力 `initCapabilityPlatformAuth` | — |
| BASE-1 | 删除 `/api/ai/open/*` | 基线 |
| BASE-2 | 工作流节点 `expert` / `agent-intent` / `tool` | 基线 |
| BASE-3 | Chat `pluginExpert` 单路径 | 基线 |
| BASE-4 | `LEGACY_TOOL_ALIASES`、deprecated 事件清理 | 基线 |
| C-2 | Open API 文档收敛至 invoke | C |
| H-1 | api-reference / sdk / architecture 等产品文档 | H |
| H-3 | rag-architecture 等 server 产品文档 | H |
| A-1 | invoke `X-API-Key`（`POST /workflows/invoke/:slug` 用户 Key 与 Workflow Key 二选一） | A |
| A-2 | `/api/keys` 用户隔离（列表/删改默认 `createdBy === 当前用户`） | A |
| A-3 | AI「我的集成密钥」UI（`ApiKeyManagerView.vue`） | A |
| A-4 | 外部集成支持 `X-API-Key`（与 `X-Workflow-Key` 二选一） | A |
| A-5 | seed 角色 `apikey:*` | A |
| B-1 | ai README 快速开始（`ai/README.md`） | B |
| B-2 | 环境变量清单 | B |
| B-3 | docker-compose.ai.yml | B |
| B-4 | LICENSE + CONTRIBUTING | B |
| C-1 | Auth e2e（SSO + refresh + Sidebar 长会话） | C |
| C-3 | 工作流 invoke 信息展示（已发布流 URL + 脱敏 Key 汇总） | C |
| C-4 | fetch 401 refresh（aiApi / agentWorkflowApi 对齐 axios refresh） | C |
| D-1 | 多租户 UI（UI 展示当前租户） | D |
| D-2 | Key 审计（lastUsedAt 列表、按工作流统计） | D |
| D-3 | 配额 / 限流 | D |
| D-4 | 插件市场模板 | D |
| E-1 | 模板 Tab「试用」「在对话中体验」按钮 | E |
| E-2 | seed `demo-*` 已发布工作流 | E |
| E-3 | 设计器 `?try=1&sample=...` 深链 | E |
| E-4 | Chat `/?workflowId=demo-*` 深链 | E |
| E-5 | 扩 3～5 个模板图工厂（`shared/platform-shared/ai/agentWorkflow.ts` 5 个新模板） | E |
| E-6 | agent-workflow 文档 | E |
| E-T1～E-T5 | 五类新模板（见 §二 E.6）：contract-extract / kb-faq / http-notify / rag-ingest-qa / multi-doc-batch | E |
| F-1～F-5 | 调研执行步骤（§三 F.4），产出 `f-1-registry-survey.md` | F |
| F-P1～F-P4 | Prompt 待决问题（§三 F.3），产出 `f-p-prompt-architecture.md` | F |
| F.2 表 | 逐项 P0 调研：dynamicPrompt、Tool kind、HTTP 安全、MCP transport、Prompt 四层、`promptsRoutes` 等 | F |
| G-1 | BYOK 归属 → `model-architecture.md` | G |
| G-2 | llmCache / LLMManager 优先级（DB/用户配置优先于平台 env） | G |
| G-3 | ModelConfig Key 脱敏（创建/更新一次性回显） | G |
| G-4 | 「模型与连接」设置页（`ModelSettingsView.vue`） | G |
| G-5 | 动态模型列表（替换 `CHAT_MODEL_OPTIONS` 硬编码） | G |
| G-6 | Ollama / vLLM 文档 | G |
| G-7 | openai-compatible Provider（可选） | G |
| H-2 | 内部研发文档清扫（去除 editorAgent/open API 引用） | H |
| H-4 | 文档维护规程 | H |
| ~~I-1~~ | ~~移除 `AI_ENABLE_REQUIREMENT_ANALYSIS=false` v1 回退~~ (已完成) | I |
| ~~I-2~~ | ~~`legacyAgentKey` 扩展指南文档化~~ (已完成: [expert-extension-guide.md](../expert-extension-guide.md)) | I |
| ~~I-3~~ | ~~双 Key 示例~~ (已完成: curl + TS 示例) | I |

**最后更新**：2026-07-14
