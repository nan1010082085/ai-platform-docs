# AI 平台 — 任务进度与开放缺口

> 最后更新：**2026-08-31**  
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

当前无绑定旧 Phase 编号的活跃任务。后续按需排期即可，不再维护过期演进计划副本。

| 主题 | 说明 |
|------|------|
| 插件扩展点深化 | 路由分支、测试探针等继续插件化接入，而非硬编码 |
| 产品能力 | 多智能体 / 记忆 / 配额等按产品优先级另开计划 |

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
