# Schema Platform 项目计划

> 更新日期：2026-07-16
> 状态：Phase 1-6 全部完成 ✅

---

## 一、现状评估

### 1.1 Server 通用性评估

当前 server **不是通用的**。存在严重的硬编码问题，导致多提供商架构部分失效。

#### 核心问题：4 条独立的 LLM 调用路径

```
路径 1: agentBase.getClient()        → 硬编码 DeepSeek，完全绕过 Provider 系统
路径 2: llmCache.getLLM()            → ✅ 唯一走 Provider+Model DB 的路径
路径 3: conversationService 内联创建  → 硬编码 DeepSeek，绕过 Provider 系统
路径 4: fileService raw fetch()      → 硬编码 DeepSeek，绕过 Provider 系统
```

**后果**：用户在设置页面配置 Mimo/OpenAI 后，表单生成、对话摘要、OCR 仍用 DeepSeek。

#### 硬编码统计

| 类别 | 数量 | 严重度 |
|---|---|---|
| 硬编码 URL | 6 处 | 🔴 高 — 破坏多提供商 |
| 硬编码模型名 | 11 处 | 🔴 高 — 模型变更即失效 |
| 硬编码 Provider 类型 | 5 处 | 🟡 中 — 阻止扩展 |
| 硬编码业务逻辑 | 7 处 | 🟡 中 — 阻止配置化 |
| 硬编码限制/阈值 | 13 处 | 🟢 低-中 — 运维调优 |
| 结构性重复 | 2 处 | 🔴 高 — 架构债 |

### 1.2 前端硬编码统计

| 严重度 | 数量 | 关键问题 |
|---|---|---|
| 🔴 关键 | 7 | Provider 预设含外部 URL、硬编码模型名（dall-e-3、BAAI/bge-m3） |
| 🟡 中等 | 14 | 6 个 API 模块重复基础设施、硬编码超时/分页/导航路径 |
| 🟢 轻微 | 7 | 测试消息、默认设置、localStorage key |

---

## 二、架构目标

### 设计原则

1. **单一 LLM 调用入口**：所有 LLM 调用必须经过 `getLLM()`，禁止绕过
2. **Provider 即插即用**：新增 Provider 只需 DB 记录 + env var，不改代码
3. **模型名来自 DB**：代码中不出现具体模型 ID，全部从 Provider/Model 表读取
4. **阈值可配置**：所有 magic number 走 env var 或 DB config
5. **业务逻辑可插拔**：Prompt、规则、关键词走 DB 或配置文件

### 目标架构

```
┌─────────────────────────────────────────────────┐
│                   所有消费者                       │
│  graph nodes / tools / services / optimizers     │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   getLLM(opts)  │  ← 唯一入口
              │   llmCache.ts   │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ DB Tier  │ │ Env Tier │ │ User Tier│
    │Provider+ │ │LLMManager│ │ userConfig│
    │  Model   │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

---

## 三、迭代计划

### Phase 1 — 消除硬编码，统一 LLM 调用（1-2 周） ✅

> 目标：所有 LLM 调用经过 `getLLM()`，消除 4 条独立路径

| # | 任务 | 文件 | 说明 |
|---|---|---|---|
| 1.1 | **删除 `getClient()`** | `agentBase.ts` | 移除硬编码 DeepSeek 的 OpenAI client 单例 |
| 1.2 | **schemaGenerator 改用 `getLLM()`** | `schemaGenerator.ts` | 从 `getClient()` + `openai.chat.completions.create()` 改为 `getLLM()` + `model.invoke()` |
| 1.3 | **streamSchemaGenerator 改用 `getLLM()`** | `streamSchemaGenerator.ts` | 同上，流式版本 |
| 1.4 | **conversationService 改用 `getLLM()`** | `conversationService.ts:407` | 移除内联 `new ChatOpenAI(deepseek-v4-flash)` |
| 1.5 | **fileService OCR 抽象化** | `fileService.ts:43` | 将 raw `fetch()` 改为 `getLLM()` 或 provider 抽象；若当前 provider 不支持 vision 则回退 |
| 1.6 | **promptOptimizer 改用 `getLLM()`** | `promptOptimizer.ts` | 从 `llmManager.getProvider()` 改为 `getLLM()` |

**验收标准**：`grep -r "api.deepseek.com\|DEEPSEEK_API_KEY" server/src/ai/` 只出现在 `modelProviderEnv.ts` 和 `llmCache.ts` Tier 4。

### Phase 2 — Provider 动态化（1 周） ✅

> 目标：新增 Provider 只需 DB + env var，不改代码

| # | 任务 | 文件 | 说明 |
|---|---|---|---|
| 2.1 | **Provider 注册表模式** | `modelProviderEnv.ts` | 将 `PlatformModelProvider` 联合类型改为 `Map<string, ProviderConfig>`，支持动态注册 |
| 2.2 | **llmManager 泛化** | `llmManager.ts` | 将硬编码的 `if (name === 'deepseek')` 改为基于 DB Provider 记录的动态注册 |
| 2.3 | **移除 `PROVIDER_DEFAULT_MODELS`** | `agentBase.ts:139` | 改为从 DB `ModelModel.find({ isActive: true })` 动态获取 |
| 2.4 | **移除 `providerDefaults` 硬编码映射** | `agentBase.ts:96-121` | 任务→模型映射改为从 DB Model 表的 task annotation 读取 |
| 2.5 | **前端 Provider 预设服务端化** | `providerPresets.ts` | 新增 `GET /api/providers/presets` 端点，前端从服务端获取预设 |
| 2.6 | **`getProviderDefaultBaseUrl` 兜底修正** | `modelProviderEnv.ts:51` | 未知 provider 返回空串而非 DeepSeek URL |

**验收标准**：新增一个 Provider（如 Qwen）只需在 DB 插入 Provider 记录 + 设置 env var，不改任何代码。

### Phase 3 — 阈值与配置集中化（1 周） ✅

> 目标：所有 magic number 走 env var 或 DB config

| # | 任务 | 当前硬编码 | 改为 |
|---|---|---|---|
| 3.1 | Token budget | `4000`, `60000` | 从 Model.contextWindow 动态计算 |
| 3.2 | 重试参数 | `MAX_RETRIES=3`, `BASE_DELAY_MS=1000` | env var `AI_MAX_RETRIES`, `AI_RETRY_DELAY_MS` |
| 3.3 | LLM 超时 | `timeout: 120_000` | env var `AI_LLM_TIMEOUT_MS` 或 per-provider config |
| 3.4 | 默认 temperature/maxTokens | `0.7`, `8192` 出现 8+ 次 | 集中常量 + DB Model.parameters 覆盖 |
| 3.5 | 对话摘要阈值 | `SUMMARY_THRESHOLD=20`, `KEEP_RECENT=6` | env var 或 DB config |
| 3.6 | 文件大小限制 | `MAX_FILE_SIZE=10MB` | env var `AI_MAX_FILE_SIZE_MB` |
| 3.7 | 工具迭代上限 | `MAX_TOOL_ITERATIONS=3` | DB workflow config |
| 3.8 | 分页默认值 | 各处 `pageSize=20/100/1000` | 统一常量 + API 参数 |

**验收标准**：所有阈值可通过 env var 或 DB config 调整，不改代码。

### Phase 4 — 业务逻辑可配置化（2 周） ✅

> 目标：Prompt、规则、关键词走 DB 或配置文件

| # | 任务 | 说明 |
|---|---|---|
| 4.1 | **Prompt 版本系统完善** | `SCHEMA_STEPS`、`SUMMARY_SYSTEM_PROMPT`、`AGENT_DESCRIPTIONS` 等迁入 promptVersion 表 |
| 4.2 | **任务分类规则可配置** | `complexIndicators`（中文关键词）迁入 DB config，支持多语言 |
| 4.3 | **质量分析规则引擎** | `promptOptimizer` 的评分权重、阈值、正则规则迁入配置 |
| 4.4 | **RAG 工具名动态解析** | `RAG_TOOL_NAME = 'rag__search'` 改为按 capability 查找 tool registry |
| 4.5 | **前端 step labels 服务端化** | `stepLabels` map 从服务端 schema 步骤定义获取 |
| 4.6 | **前端跳过命令正则可配置** | `/^(跳过|skip)$/i` 改为服务端提供的模式 |

**验收标准**：修改 Prompt/规则不需要改代码、不需要重新部署。

### Phase 5 — 前端统一 API 基础设施（1 周） ✅

> 目标：消除 6 个 API 模块的重复代码

| # | 任务 | 说明 |
|---|---|---|
| 5.1 | **统一 request 模块** | 6 个 API 文件全部迁移到 `src/api/shared/request.ts` |
| 5.2 | **统一常量导出** | `ACCESS_TOKEN_KEY`、`BASE_URL` 等从 `platform-shared` 导出 |
| 5.3 | **Provider 显示名动态化** | `useModelOptions.ts` 的 `HEALTH_PROVIDER_MAP` 改为从 API 获取 |
| 5.4 | **默认 Provider/Model 服务端驱动** | LLM store 默认值从 `/api/providers` 响应获取 |
| 5.5 | **导航路径统一** | `/flow/?id=`、`/editor/?id=` 改为命名路由常量 |

**验收标准**：前端只有一个 `request()` 实现，所有配置从服务端获取。

### Phase 6 — 废弃旧系统 + 清理（1 周） ✅

> 目标：移除遗留代码，减少维护负担

| # | 任务 | 说明 |
|---|---|---|
| 6.1 | **废弃 ModelConfig 表** | 标记 `/api/model-configs` 路由为 deprecated，添加迁移脚本 |
| 6.2 | **移除 seedModelConfigs 重复** | seed 中的 URL/model 引用 `modelProviderEnv.ts` 的常量 |
| 6.3 | **移除 `PROVIDER_DEFAULT_MODELS` 硬编码** | Phase 2 完成后可删除 |
| 6.4 | **清理 `agentBase.ts` 工具函数** | `getClient()`、`buildMessages()` 等迁移后删除 |

---

## 四、优先级排序

```
Phase 1 (消除硬编码)     ← 最高优先级，直接影响多提供商功能
  ↓
Phase 2 (Provider 动态化) ← 解锁扩展能力
  ↓
Phase 3 (阈值集中化)     ← 运维必需
  ↓
Phase 5 (前端统一)       ← 开发效率
  ↓
Phase 4 (业务逻辑配置化) ← 产品灵活性
  ↓
Phase 6 (清理废弃)       ← 技术债
```

### 里程碑

| 里程碑 | 包含 Phase | 预计周期 | 交付物 | 状态 |
|---|---|---|---|---|
| **M1: 多提供商可用** | Phase 1 + 2 | 2-3 周 | 所有 LLM 功能支持任意 Provider | ✅ |
| **M2: 运维可配置** | Phase 3 + 5 | 2 周 | 所有阈值可调，前端代码统一 | ✅ |
| **M3: 产品可扩展** | Phase 4 + 6 | 3 周 | Prompt/规则可热更新，旧系统清理 | ✅ |

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| `getLLM()` 改造影响现有功能 | 高 | 逐文件改造，每个文件单独测试 |
| ModelConfig 迁移数据丢失 | 高 | 保留旧表 2 个版本周期，双写过渡 |
| Provider 预设服务端化影响前端构建 | 中 | 前端保留本地 fallback，服务端优先 |
| Token budget 动态化导致行为变化 | 中 | 保留硬编码值作为 fallback，逐步切换 |

---

## 六、技术债清单（本次不修复，记录备查）

| 项目 | 位置 | 说明 |
|---|---|---|
| llmCachePriority 测试 mock 问题 | `llmCache.spec.ts` | `resolveStoredProviderApiKey` 未在 mock 中导出 |
| Legacy ModelConfig 双写 | `seedModelConfigs.ts` | 新旧两套系统并行维护 |
| 前端 6 个 API 模块重复 | `ai/app/src/api/` | 共 ~800 行重复代码 |
| Embedding 配置独立于 Provider 系统 | `embeddingService.ts` | 使用独立的 `SILICONFLOW_API_KEY` env var |
