# 内部开放工作清单（Open Work Inventory）

> **生成日期:** 2026-09-05  
> **复核:** 2026-09-05（Goal 关单完成：开放项归零；同日全量审查后补「残留债」节）  
> **用途:** 未实现节点汇总；权威细节以各计划原文为准。

---

## 1. 本轮已关闭

| 文档 | 现状态 |
|------|--------|
| tenant P1–P8 / P7 Ethereal | 已关闭 |
| ua-permissions X-Device-Id | 已关闭 |
| service-dual-factor T1–T6 | 已关闭 |
| workflow-fanin-palette-and-harness | **已关闭**（merge + palette + comic-storyboard） |
| kb-and-monitor-ux-plan | **已关闭**（知识库任务流 + 执行详情运行时条 + monitor 降权） |
| nav-and-kb-gaps | **已关闭**（主路由收敛 + 双语原则 + 验收齐） |
| workflow-template-rfc | **已关闭**（§5.1–5.25：Registry workflows + JSON + Marketplace API） |
| editor iteration-plan-v2 | **已关闭**（Phase R/M 功能 + `pnpm test` / `build:check` 绿） |

---

## 2. 仍开放

无。

**合计 0**

---

## 3. 审查残留（非计划开放项）

全量代码/服务审查发现的**技术债 / 增强**，不计入上表开放计数：

| 级别 | 项 | 处理 |
|------|-----|------|
| P0 | `POST /workflows/import` `createAgentWorkflow` 参数顺序错误 | **已修**（`agentWorkflowRoutes.ts`） |
| P1 | `apiOrJwtAuth` JWT 路径未走设备会话门 | **已修**（`enforceUserSessionSecurity`） |
| P1 | create/import 未传真实 `tenantId` → Registry 落到 `000000` | **已修**（`resolveTenantId`） |
| 已知 | 非 production 下 `apiOrJwtAuth` 可跳过认证（dev sentinel） | 保留本地便利；生产不受影响 |
| 增强 | fan-in 搜索命中拖拽预填 `toolName` | 明确不做进本轮计划 |
| P2 | `/monitor` 仍偏完整 dashboard；高流量图表 WidgetStateShell 覆盖未满；模板 id 类型仍有部分 union | 后续迭代，不挡关单 |

---

## 4. 维护约定

关闭时同步计划状态、勾选与本清单。索引 / backlog / 各子项目 docs 入口须与本清单一致。
