# 能力平台与 AI 应用定位

> **三能力一体**：可视化编辑器（editor）、流程设计器（flow）、AI 应用（ai）共享同一套身份与会话，不是三个互不相关的工具。  
> **AI 应用小目标**：做成可独立部署、可开源的 **应用能力小平台**（Agent 编排、RAG、插件、对话、对外集成）。

---

## 一、三能力如何在一起

```text
                    ┌─────────────────────────────────────┐
                    │  platform-shared/authSession        │
                    │  JWT · refresh · SSO · 自动刷新      │
                    └─────────────────────────────────────┘
                           ▲           ▲           ▲
                           │           │           │
              ┌────────────┴───┐ ┌─────┴─────┐ ┌──┴────────────┐
              │  editor        │ │  flow     │ │  ai           │
              │  表单/页面设计   │ │  BPMN 流程 │ │  能力小平台    │
              └────────────┬───┘ └─────┬─────┘ └──┬────────────┘
                           │           │          │
                           └───── iframe Sidebar ──┘
                                 (AiSidebarView)
```

| 项目 | 角色 | 与 AI 的关系 |
|------|------|----------------|
| **editor** | Schema / 页面可视化设计 | 右侧嵌入 **AI Sidebar**，传当前 Schema/节点上下文 |
| **flow** | BPMN 流程设计 | 右侧嵌入 **AI Sidebar**，传当前 Flow/节点上下文 |
| **ai** | 能力平台本体 | 全功能应用 + Sidebar 供给 editor/flow；**不是**只给 sidebar 用的附属库 |

**共享 JWT**：三个子应用均通过 `@schema-platform/platform-shared` 的 `authSession` / `authStore`：

- 同一 `sfp_access_token` / `sfp_refresh_token`（localStorage）
- 登录、SSO 回调、`/auth/refresh` 自动续期
- 401 统一跳转登录（容器内由 Shell 或各应用 `/login` 承接）

人在 **editor / flow / ai 任意一端登录**，三端 API 请求均带同一 Bearer JWT，**无需各建一套账号体系**。

**统一初始化**（`createPinia()` 之后调用）：

```ts
import { initCapabilityPlatformAuth } from '@schema-platform/platform-shared/utils/authSession'

initCapabilityPlatformAuth({
  registerTokenProvider: (getToken) => { /* 注入子应用自有 fetch 客户端 */ },
})
```

一次完成：`apiClient` Bearer、`Socket.IO` 鉴权、`/auth/refresh` 调度、401 时 refresh 重试。  
Sidebar iframe（`main-sidebar.ts`）与完整 AI 应用均走同一套逻辑。

---

## 二、AI 应用：完整平台 vs Sidebar

| 形态 | 入口 | 面向谁 |
|------|------|--------|
| **完整 AI 应用** | `main.ts` → `AiLayout` | 独立访问或 Shell `/app/ai/*`：对话、Agent 编排、RAG、插件中心、监控 |
| **Sidebar** | `index-sidebar.html` → `AiSidebarView` | 仅嵌入 editor/flow 设计器内的 **400px 助手条** |

Sidebar 是 **集成形态**，不是 AI 应用的全部。开源小平台交付的是 **完整 ai 应用 + server AI 模块**，editor/flow 通过 Sidebar 可选接入。

Bridge 事件（`ai/app/src/utils/bridge.ts`）：

- 宿主 → AI：`ai:set-context`、`ai:current-schema`、`ai:current-flow`
- AI → 宿主：`ai:open-in-editor`、`ai:published`、`ai:preview-*`

---

## 三、凭证模型（重新整理）

三类凭证，职责清晰，**不互相替代**：

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. JWT（access + refresh）                                   │
│    谁：任意登录用户                                           │
│    用：editor / flow / ai 全部 UI 与 WebSocket               │
│    特点：短效、自动刷新、多账号 SSO                             │
├─────────────────────────────────────────────────────────────┤
│ 2. 用户平台 Key（sk-...）                                     │
│    谁：每个登录用户 **自己创建**（非管理员专属）                  │
│    用：脚本 / 外部系统 **代替在代码里塞 JWT**                   │
│    范围：该用户身份下，租户内 **所有其有权限的已发布工作流**       │
│    管理：AI 应用「我的集成密钥」（`ApiKeyManagerView`；后端 `/api/keys`）   │
├─────────────────────────────────────────────────────────────┤
│ 3. 工作流 Key（wf-...）                                       │
│    谁：**发布工作流时自动生成**（非手动创建）                    │
│    用：只把 **单条** 已发布流开放给外部，不想给个人平台 Key        │
│    管理：工作流设计器「统一调用入口」；可轮换                     │
└─────────────────────────────────────────────────────────────┘
```

### 统一调用入口（目标形态）

对外只宣传 **一个 HTTP 入口**，鉴权二选一：

```http
POST /api/ai/workflows/invoke/{slug}
X-Tenant-Id: 000000

# 方式 A：用户平台 Key（覆盖该用户可执行的各工作流）
X-API-Key: sk_...

# 方式 B：单工作流 Key（仅该 slug）
X-Workflow-Key: wf_...
```

平台内（人机交互）仍用 **JWT**：

```http
Authorization: Bearer <accessToken>
POST /api/ai/workflows/:id/execute   # 含草稿测试（所有者）
WebSocket chat:* / workflow:*
```

### 与「开源小平台」的关系

- **JWT**：自托管部署时，自建用户体系 + SSO，三能力子应用共用。
- **用户平台 Key**：开源集成方用 **长期密钥** 调工作流，无需把 refresh token 塞进 cron。
- **工作流 Key**：细粒度分享单流，适合 SaaS 多租户下的「最小授权」。

---

## 四、多账号与权限（产品约定）

| 约定 | 说明 |
|------|------|
| 多账号 | 整体按多用户设计；`createdBy`、租户 `tenantId` 贯穿工作流与 Key |
| 平台 Key 归属 | **谁创建归谁**；列表/删改默认仅本人（后端待收紧） |
| 平台 Key 权限 | 创建时勾选能力（如 `workflow:execute`）；执行时代表 **创建者用户身份** |
| 角色权限 | `apikey:*` 不应仅绑在「管理员」；普通登录用户应能管理 **自己的** Key |

当前实现差距见 [backlog](./product/backlog.md)（invoke 认 `X-API-Key`、按 `createdBy` 过滤列表）。集成密钥 UI 与工作流 Key 轮换已落地（`ApiKeyManagerView`、`WorkflowInvokeInfo`）。

---

## 五、AI 开源应用小平台 — 能力边界

**包含（ai 仓库 + server `/api/ai`）**：

| 能力 | 说明 |
|------|------|
| AI 对话 | LangGraph 多专家 + WebSocket |
| Agent 工作流 | 可视化编排、发布、执行、监控 |
| 插件中心 | Expert / Skill / Tool / MCP 配置 |
| RAG | 知识库索引与检索 |
| 对外集成 | invoke + 用户平台 Key / 工作流 Key（直接调用 REST API） |

**不包含**：

- 表单/页面设计器（editor 项目）
- BPMN 审批流引擎 UI（flow 项目）
- Shell 宿主与业务菜单（可选组合，非 ai 小平台核心）

**可选组合部署**：

```text
最小：server + ai（独立对话与编排平台）
完整：server + shell + editor + flow + ai（三能力 + 宿主）
嵌入：editor/flow + ai Sidebar（仅助手条）
```

---

## 六、文档索引（按角色）

| 读者 | 文档 |
|------|------|
| 架构总览 | [architecture.md](./architecture.md) |
| 凭证与 SDK | [sdk.md](./sdk.md) |
| 工作流术语 | [product/workflow-terminology.md](./product/workflow-terminology.md) |
| 插件中心 | [plugin.md](./plugin.md) |
| UI / 嵌入 | [design/overview.md](./design/overview.md) |

---

## 七、演进清单（与对话结论对齐）

1. **文档**：以本文为准，统一 JWT / 双 Key 叙事（取代「非开放平台、仅 Workflow Key」等过时表述）。
2. **invoke 路由**：同时接受 `X-API-Key`（用户平台 Key）与 `X-Workflow-Key`。
3. **AI 应用 UI**：「我的集成密钥」— 已落地（`ApiKeyManagerView` CRUD `sk-...`；`WorkflowInvokeInfo` 管理 `wf-...`）。
4. **后端**：`GET/DELETE/PATCH /api/keys` 默认按 `createdBy` 过滤；普通角色具备 `apikey:*`（仅自己的）。
