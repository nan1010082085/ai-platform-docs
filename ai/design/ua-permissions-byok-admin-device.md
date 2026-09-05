# UA 权限 · 用户自有模型 · 管理员设备绑定 — 设计与实施计划

> **状态:** 已关闭（权限 / BYOK / 设备 API / 会话门 / 全端 `X-Device-Id`）  
> **日期:** 2026-09-05（复核关单：对照 `llmCache` / `PersonalLlmSection` / `userSecurityGate` / `user-security.md`；`apiClient` 注入 `X-Device-Id`）  
> **范围:** `ua/` + `server/` + AI 设置页消费；文档面向用户  
> **相关:** [service-dual-factor-access.md](./service-dual-factor-access.md) · [租户 · 注册 · 鉴权重设计](../../design/tenant-registration-auth-redesign.md) · 现有 RBAC / Provider / `getLLM({ userConfig })`

---

## 一、目标

1. **用好 UA**：角色权限真正约束 AI / 模型 / 工作流能力（不只 CRUD 用户）  
2. **非管理员**：必须配置**自己的**模型密钥；**不得**静默使用服务器 `.env` / 平台默认 Key  
3. **管理员**：继续可用平台 env / 租户平台 Key；若出现**异常访问** → **临时封禁**；管理员会话绑定**本机设备**（Mac）

---

## 二、权限模型扩展

### 2.1 新增权限码

| code | 名称 | 说明 |
|------|------|------|
| `ai:chat` | AI 对话 | 使用对话 |
| `ai:workflow` | 工作流 | 设计/执行工作流 |
| `ai:model:own` | 自有模型 | 管理本人 LLM 密钥 |
| `ai:model:tenant` | 租户模型 | 管理租户级 Provider（管理员） |
| `ai:rag` | 知识库 | 知识库运维 |
| `device:bind` | 绑定设备 | 绑定本人信任设备 |
| `admin:unban` | 解封 | 解除临时封禁（可仅系统管理员） |

### 2.2 角色默认

| 角色 | 权限 |
|------|------|
| 普通用户 | 现有基础 + `ai:chat` + `ai:workflow` + `ai:model:own` + `device:bind`（自绑） |
| 管理员 | 全部（含 `ai:model:tenant`）；**调用平台 Key 仅管理员** |

UA：`RoleListView` 已能编辑 `permissions[]`；seed 同步后管理员自动拿齐新码。

---

## 三、用户自有模型（BYOK）

### 3.1 规则

```text
if (isAdmin && !userHasOwnKey):
  可用平台 env / 租户 platform Provider
else:
  必须存在 UserLlmCredential（本人、active）
  getLLM 注入 userConfig；不计入平台日配额（已有 userConfig 不计费逻辑）
  无凭证 → 明确错误「请先在设置中添加自己的模型」，禁止回落 env
```

### 3.2 模型

```typescript
interface UserLlmCredential {
  userId: string
  tenantId: string
  name: string
  provider: string          // deepseek | openai | custom
  baseUrl?: string
  apiKeyEnc: string         // credentialService.encrypt
  model: string
  isDefault: boolean
  status: 'active' | 'disabled'
}
```

### 3.3 API / UI

| 路径 | 说明 |
|------|------|
| `CRUD /api/ai/user-llm-credentials` | 仅本人；管理员不可读他人明文 |
| AI 设置 → **模型中心**（个人 Key 区 / 租户 Provider） | 非管理员配置自有 Key；不另开「我的模型」页 |
| UA（可选） | 仅展示「用户是否已配置模型」状态，不展示密钥 |

### 3.4 实施 Task

- [x] 权限码写入 seed（`ai:model:own` 等）  
- [x] `UserLlmCredential` 模型 + 加密  
- [x] CRUD 路由 + `requirePermission('ai:model:own')`  
- [x] `getLLM` / chat 入口：非管理员禁止 env 回落（`llmCache` Tier 0）  
- [x] AI 模型中心接入个人 Key（`PersonalLlmSection`，同页不新路由）  
- [x] 用户文档：如何添加自己的 API Key（`docs/ai/user-security.md` §3）  

---

## 四、管理员本机绑定 + 异常临时封禁

### 4.1 设备指纹（Mac）

客户端（UA / AI Shell，仅管理员首次）：

1. 生成或读取本地 `deviceId`（存 Keychain / 安全本地存储；可用 `machine-id` 类哈希，**不上传原始 MAC 明文到日志**）  
2. `POST /api/devices/bind`：`deviceId` + `label`（如「办公室 MacBook」）+ `platform: darwin`  
3. 服务端存 `UserDeviceBinding { userId, deviceIdHash, label, platform, boundAt, status }`  
4. 管理员敏感操作 / 登录后刷新：Header `X-Device-Id` 必须匹配已绑定且 active  

> 「绑定本机 Mac」= 信任设备登记，不是把真实 MAC 广播到公网日志。

### 4.2 异常判定（首期规则，可调）

任一触发即视为异常（管理员）：

| 信号 | 条件 |
|------|------|
| 未知设备 | 无 `X-Device-Id` 或未绑定 |
| 新设备强登 | 已有绑定却用新 deviceId 登录 |
| （可选）异地 | IP 与最近 N 次登录国家/ASN 突变 |

### 4.3 临时封禁

```typescript
interface UserSecurityState {
  userId: string
  tempBannedUntil?: Date
  banReason?: string
  banSource?: 'anomaly_device' | 'manual'
}
```

- 触发后：`tempBannedUntil = now + TTL`（默认 24h，可配置）  
- 中间件：封禁期内拒绝 JWT（除「自助解封挑战」若有）  
- 审计：`LoginLog` / 新 `SecurityEvent`  
- 解封：另一信任设备 + 管理员操作，或本地应急脚本（文档说明）

### 4.4 实施 Task

- [x] `UserDeviceBinding` / 临时封禁字段骨架  
- [x] bind/list/revoke API  
- [x] UA：设备管理页（绑定本机）  
- [x] auth 中间件：管理员校验 device + temp ban（`enforceUserSessionSecurity`；生产默认开，`ADMIN_DEVICE_CHECK` 可关）  
- [x] 客户端统一写入 `X-Device-Id`（`platform-shared` `apiClient` + `getOrCreateLocalDeviceId`；与 UA 绑定共用 `sfp_device_id`）  
- [x] 异常检测触发 `tempBanUser`（未知设备 / 未匹配绑定）  
- [x] 用户文档完善：被封后怎么办（`user-security.md` §4）  

---

## 五、与服务双因子关系

| 通道 | 谁用 | 2FA |
|------|------|-----|
| 人机 JWT | 用户 / 管理员 | 管理员 + 设备绑定；异常封禁 |
| 用户 API Key | 脚本（用户身份） | 仍单 Key；高敏可要求叠加 |
| **服务双因子** | 机器 | 见独立计划 |

互不替代。

---

## 六、修订

| 日期 | 说明 |
|------|------|
| 2026-09-04 | 初稿；权限码与模型骨架开工 |
| 2026-09-05 | 复核：BYOK / 会话门 / 用户文档已落地；仅余全端 `X-Device-Id` 注入 |
