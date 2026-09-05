# AI 平台 — 任务进度与开放缺口

> 最后更新：**2026-09-05**  
> 插件化原则：仓库 `ai/docs/design/plugin-architecture-principles.md`  
> 能力文档：[plugin.md](../plugin.md) · [platform.md](../platform.md) · [workflow-terminology.md](./workflow-terminology.md)

---

## 进度总览

| 域 | 进度 |
|----|------|
| Phase A～Z（含五项迭代、体验打磨） | **已关闭**（历史迭代文档已清理） |
| Phase T / U / V | **已关闭**（U-4 断点单步明确不做；V-3/V-4 未再单独立项） |
| DSH harness 运行时 | **已清理**（客户端 Cordis 插件容器保留） |

---

## 现行原则

新增能力优先走 `ai/app/src/plugins/` 注册（工具 / 节点 / 渲染器 / skill / 测试探针等），避免在业务层继续堆砌代码。详见插件化原则文档。

---

## 开放缺口

| 主题 | 状态 | 说明 |
|------|------|------|
| 插件扩展点深化 | 持续 | 路由分支、测试探针等继续插件化接入 |
| P7 邮件邀请 | **已关（本地 Ethereal）** | 生产仍建议显式 SMTP_* |
| 管理员 `X-Device-Id` 注入 | **已关闭** | `apiClient` 统一注入 |
| 服务双因子 | **已关闭** | [计划](../design/service-dual-factor-access.md) · [接入指南](../service-access.md) |
| 知识库 UX · 监控并入运行时 | **已关闭** | [计划](./kb-and-monitor-ux-plan.md) |
| 合流与面板 UX | **已关闭** | [计划](../design/workflow-fanin-palette-and-harness.md) |
| Editor iteration-plan-v2 | **已关闭** | [计划](../../editor/iteration-plan-v2.md) |
| UA · BYOK · 设备封禁 | **已关** | [计划](../design/ua-permissions-byok-admin-device.md) |
| 导航与知识库原则 | **已关闭**（原则与验收清单齐） | [nav-and-kb-gaps](./nav-and-kb-gaps.md) |
| 工作流模板 RFC | **已关闭**（§5.1–5.25） | [RFC](../../extend/workflow-template-rfc.md) |
| **全量计数** | — | [open-work-inventory](../../design/open-work-inventory.md) = **0** |

---

## 明确不做

| 项 | 原因 |
|----|------|
| 独立 `ai/harness` / DSH 运行时 | 已清理，不再恢复为默认路径 |
| Chat HTTP SSE | 已删除，仅 WebSocket |
| U-4 断点单步调试 | 可选需求，不做 |
| 恢复 `/api/ai/open/*` | 基线已删，统一 invoke |

---

## 产品定位（鉴权）

- **主路径**：业务 API **JWT**（`authMiddleware`）
- **集成**：`POST /api/ai/workflows/invoke/{slug}` + **`X-Workflow-Key`** 或 **`X-API-Key`**
