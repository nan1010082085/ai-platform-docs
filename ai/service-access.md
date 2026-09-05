# 服务双因子接入指南

面向外部服务、CI、网关调用 Schema Platform API。与管理员/用户登录（JWT / SSO）无关。

## 1. 创建服务主体

在 **UA → 服务主体** 创建一条记录。创建响应中会**一次性**返回：

| 字段 | 用途 |
|------|------|
| `clientId` | 公开标识，放入 `X-Service-Client-Id` |
| `clientSecret` | 因子 1，放入 `X-Service-Client-Secret` |
| `totpSecret` / `otpauthUri` | 因子 2（TOTP），用 Authenticator 扫码或本地生成 6 位码 |
| `signingKey`（可选） | 因子 2 备选：请求 HMAC 签名 |

默认权限含 `workflow:execute`（可调工作流 invoke）。

## 2. 调用方式

每次请求携带**双因子**：

### 方式 A：client_secret + TOTP

```http
POST /schema-platform/api/ai/workflows/invoke/{slug}
X-Service-Client-Id: svc_…
X-Service-Client-Secret: scs_…
X-Service-Totp: 123456
Content-Type: application/json

{"input":{"text":"hello"}}
```

### 方式 B：client_secret + 签名

创建时勾选「启用签名因子」。签名算法：

```text
hex( HMAC-SHA256( signingKey, timestamp + rawJsonBody ) )
```

`timestamp` 为 Unix 秒，与服务器偏差不超过 300 秒。

```http
POST /schema-platform/api/ai/workflows/invoke/{slug}
X-Service-Client-Id: svc_…
X-Service-Client-Secret: scs_…
X-Service-Timestamp: 1710000000
X-Service-Signature: <hex>
Content-Type: application/json

{"input":{"text":"hello"}}
```

签名时的 `rawJsonBody` 须与实际发送的 JSON 字符串一致（与服务端 `JSON.stringify` 解析后回写一致）。

## 3. 适用面

- **工作流 invoke**：`POST /api/ai/workflows/invoke/:slugOrId`（需 `workflow:execute`）
- **已挂 JWT/API Key 的 AI 路由**：生产环境下亦可改用服务双因子头（与 Bearer / `X-API-Key` 三选一）

## 4. 轮换与禁用

- **轮换**：UA 点「轮换」或 `POST /api/service-principals/:id/rotate`，旧密钥立即失效。
- **禁用**：UA「禁用」或 `DELETE /api/service-principals/:id`（软删为 `disabled`）。

## 5. 权限码（管理员 RBAC）

| 权限码 | 说明 |
|--------|------|
| `service_principal:view` | 列表 |
| `service_principal:create` | 创建 |
| `service_principal:edit` | 轮换 |
| `service_principal:delete` | 禁用 |

人机登录体系不变；本机制不替代用户密码 TOTP。
