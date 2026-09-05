# 服务双因子接入（Server Service 2FA）— 设计与实施计划

> **状态:** 已关闭 · T1–T6 已落地（2026-09-05）  
> **优先级:** P0（与登录体系并行，不替代人机 JWT/SSO）  
> **范围:** `server/` 为主；调用方文档在 `docs/`  
> **相关:** 现有 `ApiKey` / JWT / Webhook HMAC · [workflow-open-api.md](../design/workflow-open-api.md) · [service-access.md](../service-access.md)

---

## 一、问题

人机登录已有：JWT + SSO + 滑块。  
**机器/服务调 Server API** 目前主要是单因子 `sk-…` API Key 或 Webhook HMAC，缺少「可直接服务接入」的双因子身份。

目标：外部服务、CI、网关用一套 **双因子服务凭证** 调平台 API，与管理员/用户登录解耦。

---

## 二、概念

| 概念 | 说明 |
|------|------|
| **人机会话** | 现有登录（不变） |
| **服务身份（Service Principal）** | 机器账号：`clientId` + 密钥材料 |
| **因子 1** | `client_secret`（或 mTLS 客户端证书，二期） |
| **因子 2** | TOTP（推荐首期）或请求签名（HMAC-SHA256(timestamp+body, signingKey)） |

```http
POST /api/...
X-Service-Client-Id: svc_xxx
X-Service-Client-Secret: ...
X-Service-Totp: 123456
# 或
X-Service-Timestamp: 1710000000
X-Service-Signature: hex(hmac)
```

---

## 三、数据模型（建议）

```typescript
/** 服务主体 */
interface ServicePrincipal {
  id: string
  tenantId: string
  name: string
  clientId: string          // 公开
  clientSecretHash: string  // bcrypt
  totpSecretEnc: string     // 加密存储；创建时展示一次 otpauth URI
  signingKeyEnc?: string    // 可选：签名因子
  permissions: string[]     // 权限码子集
  status: 'active' | 'disabled'
  createdBy: string
  lastUsedAt?: Date
  /** 允许的来源 IP / CIDR，可选 */
  ipAllowlist?: string[]
}
```

中间件：`serviceDualAuth` → 校验两因子 → 注入 `ctx.state.service` + `tenantId` + permissions（复用 `requirePermission`）。

---

## 四、API（首期）

| 方法 | 路径 | 谁 | 说明 |
|------|------|-----|------|
| POST | `/api/service-principals` | 管理员 | 创建；返回 secret + TOTP 一次性 |
| GET | `/api/service-principals` | 管理员 | 列表（无明文密钥） |
| POST | `/api/service-principals/:id/rotate` | 管理员 | 轮换 secret / TOTP |
| DELETE | `/api/service-principals/:id` | 管理员 | 禁用/删除 |
| * | 业务 API | 服务 | Header 双因子；与 JWT 互斥或并行（`apiOrJwtOrService`） |

权限码：`service_principal:view|create|edit|delete`

---

## 五、实施 Task

- [x] T1 模型 + 加密字段（复用 `credentialService`）
- [x] T2 `serviceDualAuth` 中间件 + 单测（错 secret / 错 TOTP / 过期 timestamp）
- [x] T3 CRUD 路由 + seed 权限
- [x] T4 挂到高敏路由：workflow invoke、部分 admin AI 管理（白名单逐步扩）
- [x] T5 用户文档：`docs/ai/service-access.md`（如何接入，无内部实现细节）
- [x] T6 UA：服务主体管理页（可后置）

---

## 六、非目标

- 不替代人机登录  
- 首期不做 WebAuthn / 硬件 Key  
- 不把用户密码改成强制 TOTP（可另开「管理员登录 2FA」）

---

## 七、修订

| 日期 | 说明 |
|------|------|
| 2026-09-04 | 初稿 |
| 2026-09-05 | T1–T6 落地：模型 / 中间件 / CRUD / invoke+apiOrJwt / 文档 / UA 页 |
