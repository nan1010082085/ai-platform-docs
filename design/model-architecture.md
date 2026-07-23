# BYOK 归属模型设计文档

> Phase G 调研 G-1 产出，2026-07-08（修订版）

## 1. 现状分析

### 1.1 ModelConfig 数据模型

**文件**: `server/src/models/ModelConfig.ts`

```
IModelConfig {
  name: string
  provider: 'deepseek' | 'openai' | 'anthropic' | 'ollama'
  model: string
  apiKey: string        // 存储加密后的 key（AES-256-CBC via credentialService）
  baseUrl: string
  parameters: { temperature, maxTokens, topP }
  isDefault: boolean
  tenantId: string      // 通过 tenantPlugin 自动注入
  createdAt / updatedAt
}
```

- `tenantId` 通过 `tenantPlugin`（`server/src/middleware/tenantPlugin.ts`）自动注入，所有查询自动附加 `WHERE tenantId = ?`
- 无 `userId` / `ownerId` 字段 — 纯租户级
- 加密方案：`seedModelConfigs.ts` 调用 `credentialService.encrypt()`，读取时 apiKey 为密文

### 1.2 权限模型

**文件**: `server/src/utils/seedPermissions.ts`, `server/src/routes/modelConfig.ts`

| 权限码 | 用途 | 模块 |
|---|---|---|
| `model_config:view` | 查看模型配置 | system |
| `model_config:create` | 创建模型配置 | system |
| `model_config:edit` | 编辑模型配置 | system |
| `model_config:delete` | 删除模型配置 | system |

- CRUD 路由（`/api/model-configs`）全部 require `model_config:*` 权限
- 权限归属于 `system` 模块，设计上是管理员权限
- 无任何用户级权限区分

### 1.3 LLM 解析优先级链（实际实现）

**文件**: `server/src/ai/services/llmCache.ts` — `resolveConfig()`

**实测验证**：`server/src/ai/__tests__/llmCachePriority.spec.ts`

```
Tier 1: Tenant DB config（最高优先级）
  ├─ 先查 ModelConfigModel.findOne({ model: opts.model })
  ├─ 再查 ModelConfigModel.findOne({ isDefault: true })
  └─ tenantPlugin 自动加 tenantId 过滤
  └─ 如果 DB config 的 apiKey 为空，fallback 到 DEEPSEEK_API_KEY

Tier 2: Platform demo — LLMManager env-registered providers
  ├─ 来源: llmManager.registerFromEnv()（启动时从 env 读取）
  └─ 条件: PLATFORM_LLM_ENABLED !== 'false'

Tier 3: Env fallback — 直接读 DEEPSEEK_API_KEY
  └─ 条件: PLATFORM_LLM_ENABLED !== 'false'

Tier 4: 都没有 → 抛错，引导用户创建 ModelConfig
```

**关键发现**：代码已实现 DB 优先于 env 的正确优先级。测试文件 `llmCachePriority.spec.ts` 中的测试用例明确验证了：
- `DB config takes priority over env-registered LLMManager provider`
- `DB config takes priority over DEEPSEEK_API_KEY env fallback`

**问题 M1 的真实情况**：不存在 "env key 优先于 DB 配置" 的问题。当前 `llmCache.ts` 的优先级链是正确的。

### 1.4 agentBase.getClient() — 遗留路径

**文件**: `server/src/ai/graph/agentBase.ts` L25-37

```typescript
export function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is required.')
  }
  client = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey })
}
```

- 直接读 env，绕过 LLMManager 和 ModelConfig
- 目前仅被 `buildMessages` 等遗留函数使用
- LangGraph 路径已统一走 `getLLM()`（见下）

### 1.5 LangGraph 节点的 LLM 调用路径

**文件**: `server/src/ai/graph/graph.ts`, `requirementAnalyzer.ts`, `taskPlanner.ts`, `pluginExpertAgent.ts`

所有 LangGraph 节点统一使用：

```typescript
const model = await getLLM({
  model: resolveUserModel(state.interaction.preferences, getModelForTask('analyze')),
})
```

- `resolveUserModel()` 从用户偏好中读取 `llmModel`，仅限 `['deepseek-v4-flash', 'deepseek-v4-pro']`
- 只影响模型名选择，不影响 provider / apiKey / baseUrl
- `getLLM()` 走统一的 `resolveConfig()` 链（见 1.3）

### 1.6 用户偏好传递链

```
WebSocket chat:send
  → chatStreamHandler (从 ctx.state.user 提取 userId)
  → executeChatStream(request, send, onDone, onError, userId)
  → runChatStream(...)
  → graph.invoke({ interaction: { preferences } })
  → 各节点读取 state.interaction.preferences.llmModel
```

- `userId` 已传入 `executeChatStream`，但仅用于文档加载（`loadDocumentsForChat`），未传入 `getLLM`
- `preferences` 仅用于模型名选择，不包含 API key 信息

### 1.7 LLM Provider 路由 — 无权限控制

**文件**: `server/src/ai/routes/llmProviderRoutes.ts`

- `GET /api/ai/llm-providers` — 列出 providers
- `POST /api/ai/llm-provider` — 设置默认 provider
- 只需登录，无权限检查
- 操作 `llmManager` 单例（内存态，重启丢失）

### 1.8 已有加密基础设施

**文件**: `server/src/services/credentialService.ts`

- AES-256-CBC 加密，master key 来自 `CREDENTIAL_SECRET` 环境变量
- `encrypt(data: Record<string, string>): string` — 输出 base64
- `decrypt(encryptedBase64: string): Record<string, string>`
- 已被 `ModelConfig.apiKey` 和 `Credential.data` 使用

---

## 2. 问题清单

| ID | 问题 | 严重度 | 影响 |
|---|---|---|---|
| **M1** | ~~env key 优先于 DB 配置~~ | **已修复** | llmCache.ts 已实现正确的 DB > env 优先级 |
| **M1a** | `agentBase.getClient()` 硬编码 | 中 | 遗留路径绕过 ModelConfig 和 LLMManager，但 LangGraph 路径已不使用 |
| **M1b** | LLMManager 单例无租户感知 | 低 | 运行时切换 provider 影响所有租户，但 DB config 优先级更高，实际影响有限 |
| **M1c** | `llmProviderRoutes` 无权限控制 | 中 | 任何登录用户都能切换全局 provider |
| **M1d** | 无用户级 BYOK | 高 | 用户无法使用自己的 API key，无法独立控制成本 |
| **M1e** | ModelConfig 无 `ownerId` | 高 | 无法区分租户级 vs 用户级配置 |
| **M1f** | `resolveConfig` 无 userId 上下文 | 高 | 即使新增 UserApiKey，当前调用链无法感知用户身份 |

---

## 3. 归属模型分析

### 3.1 三个层次的 BYOK

| 层次 | 场景 | 当前状态 |
|---|---|---|
| **平台级** (env) | 运维部署时配置，所有租户共享 | 已实现（LLMManager + env fallback） |
| **租户级** (tenantId) | 租户管理员配置，该租户下所有用户共享 | 已实现（ModelConfig + tenantPlugin） |
| **用户级** (userId) | 个人用户自带 key，仅自己使用 | **未实现** |

### 3.2 优先级结论

**推荐优先级：用户级 > 租户级 > 平台级**

理由：
1. **BYOK 核心需求**：用户自带 key 时应优先使用自己的额度，避免消耗平台/租户额度
2. **成本归属清晰**：谁的 key 谁付费，用户用自己的 key 时账单归用户
3. **灵活性**：普通用户无需配置即可使用平台/租户默认 key；高级用户可覆盖
4. **安全隔离**：用户级 key 只在用户自己的请求中生效，不影响他人
5. **降级行为**：用户 key 无效时应快速报错，而非静默降级到租户 key（避免误消耗租户额度）

### 3.3 目标架构：四层解析链

```
┌─────────────────────────────────────────────────┐
│           resolveConfig(opts, context)            │
│                                                  │
│  1. 用户级: UserApiKey({ userId, provider })      │
│     └─ 有且 active → 使用用户 key                 │
│     └─ 有但 key 无效 → 报错（不降级）              │
│                                                  │
│  2. 租户级: ModelConfig({ tenantId, isDefault })   │
│     └─ 有 → 使用租户默认配置                      │
│                                                  │
│  3. 平台级: LLMManager (from env)                 │
│     └─ 有 → 使用平台 provider                    │
│     └─ 条件: PLATFORM_LLM_ENABLED !== 'false'     │
│                                                  │
│  4. 环境 fallback: DEEPSEEK_API_KEY               │
│     └─ 有 → 使用 env key                         │
│     └─ 条件: PLATFORM_LLM_ENABLED !== 'false'     │
│                                                  │
│  5. 都没有 → 报错，引导配置                       │
└─────────────────────────────────────────────────┘
```

---

## 4. 数据模型建议

### 4.1 新增 UserApiKey 模型

```typescript
// server/src/models/UserApiKey.ts
interface IUserApiKey {
  userId: string           // 关联 User._id
  provider: ModelProvider  // 'deepseek' | 'openai' | 'anthropic' | 'ollama'
  apiKey: string           // credentialService.encrypt() 加密存储
  baseUrl?: string         // 可选自定义 endpoint
  label?: string           // 用户备注，如 "我的 DeepSeek key"
  isActive: boolean        // 用户可停用而不删除
  createdAt: Date
  updatedAt: Date
}

// 索引
schema.index({ userId: 1, provider: 1 }, { unique: true })
```

设计要点：
- **不加 `tenantPlugin`**：用户数据本身已通过 auth middleware 的 JWT 隔离，userId 从 token 中提取
- **每个用户每个 provider 最多一个 key**：唯一索引 `{ userId, provider }`
- **apiKey 使用 `credentialService.encrypt/decrypt`**：复用已有加密基础设施
- **`isActive` 字段**：用户可临时停用 key 而不删除，方便切换

### 4.2 ModelConfig 保持不变

- 继续作为租户级配置，`tenantId` 隔离
- 权限模型不变（管理员 CRUD）
- 不需要 `ownerId` 字段

### 4.3 LLMManager 改造

- 保持全局单例（provider 注册表不变）
- `resolveConfig()` 增加 `context: { userId?: string }` 参数
- 在 Tier 1 之前插入用户级查询

---

## 5. 修改范围预估

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `server/src/models/UserApiKey.ts` | **新增** | 用户 key 数据模型 |
| `server/src/ai/services/llmCache.ts` | **改造** | `resolveConfig()` 增加 userId 上下文，插入用户级查询 |
| `server/src/ai/graph/agentBase.ts` | **改造** | `getClient()` 走统一解析链，消除硬编码 |
| `server/src/ai/routes/userApiKey.ts` | **新增** | 用户 key CRUD API |
| `server/src/ai/chatStreamRunner.ts` | **小改** | 将 userId 传入 getLLM 调用链 |
| `server/src/ai/graph/graph.ts` | **小改** | getLLM 调用传入 userId 上下文 |
| `server/src/ai/graph/state.ts` | **小改** | state 中增加 userId 字段（可选） |
| `server/src/ai/routes/llmProviderRoutes.ts` | **小改** | 增加权限控制 |
| `server/src/routes/modelConfig.ts` | **不改** | 租户级 CRUD 逻辑不变 |

---

## 6. 关键设计决策

### 6.1 UserApiKey 不降级

当用户配置了 key 但 key 无效（401/403）时：
- **推荐**：快速报错，提示用户检查 key
- **不推荐**：静默降级到租户 key（用户可能不想消耗租户额度）

### 6.2 缓存策略

- 当前 `llmCache` 的 key 格式：`${provider}|${source}|${model}|${temperature}|${maxTokens}|${json}`
- 用户级配置需要在 key 中加入 `userId` 或 `userKeyHash`
- 用户修改 key 后调用 `clearLLMCache()` 清除所有缓存（简单有效）

### 6.3 加密方案

- 复用 `server/src/services/credentialService.ts` 的 `encrypt/decrypt`
- 不自建加密，不使用明文存储

### 6.4 权限模型

- 用户 key CRUD 不需要新增权限码（用户管理自己的 key 是基本权利）
- 通过 auth middleware 的 JWT 确保用户只能操作自己的 key
- 租户管理员无法查看/修改用户的个人 key

---

## 7. 风险与注意事项

1. **遗留路径统一**：`agentBase.getClient()` 必须改造到新解析链，不能留硬编码
2. **缓存失效**：用户修改 key 后需 `clearLLMCache()` 清除缓存
3. **并发安全**：多个请求同时 resolve 用户 key 时，数据库查询可能重复 — 可接受（MongoDB 读取很快）
4. **前端改动**：需要新增用户设置页的 API Key 管理 UI（不在本次 server 端范围）
5. **向下兼容**：未配置 UserApiKey 的用户行为与当前完全一致

---

## 8. 结论

- **归属模型**：三层（平台级 / 租户级 / 用户级），用户层为新增
- **优先级**：用户级 > 租户级 > 平台级
- **核心改动**：新增 `UserApiKey` 模型 + 改造 `resolveConfig()` 为上下文感知
- **M1 状态**：代码层面优先级已正确（DB > env），M1 已不存在；M1d（无用户级 BYOK）是当前真正的缺失
