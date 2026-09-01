---
title: 架构设计
---

# 架构设计

Schema Platform 的核心架构设计文档，涵盖平台级跨项目的技术决策与规范。

## 文档索引

| 文档 | 说明 |
|------|------|
| [模型架构](./model-architecture) | Provider/Model 两级结构、BYOK 三层归属、模型能力声明 |

## 平台架构概览

Schema Platform 采用**多项目并列仓库**架构，各子项目独立部署、独立迭代：

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 / 微前端 Shell                  │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  Editor  │   Flow   │    AI    │    UA    │   Server     │
│  (5100)  │  (5200)  │  (5300)  │  (5400)  │   (3001)     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬───────┘
     │          │          │          │            │
     ▼          ▼          ▼          ▼            ▼
┌─────────────────────────────────────────────────────────┐
│              @schema-platform/platform-shared            │
│              @schema-platform/flow-shared                │
│              @schema-platform/ai-shared                  │
└─────────────────────────────────────────────────────────┘
```

## 公共包依赖方向

```
editor / flow / ai / ua ──→ shared/{platform-shared, flow-shared}
server 独立，通过 API 通信
docs 独立，汇聚全平台文档
```

**严格单向依赖**：shared 包不得反向依赖上层应用包。

## 核心设计决策

| 决策 | 说明 |
|------|------|
| BYOK 模型架构 | 用户级 / 租户级 / 平台级三层归属，支持自定义 Provider |
| Schema JSON 统一格式 | `{ widgets, board: { canvas, variables, events } }` |
| 双画布布局 | `free` 绝对定位（大屏）/ `flex` 流式（表单页） |
| 设计/运行分离 | editor 设计态 vs runtime 运行态，通过 `WIDGET_SURFACE_KEY` 区分 |
| qiankun 微前端 | 各子应用独立部署，Shell 统一入口 |
| 多租户隔离 | Mongoose `tenantPlugin` 自动注入 `tenantId` |
| RAG 检索链路 | BGE-M3 embedding + BGE-Reranker 重排 + 混合加权融合 |

## 相关文档

- [AI 平台架构](/ai/architecture) — 双引擎架构（对话 LangGraph + 智能体工作流 DAG）
- [Editor 架构](/editor/architecture) — 控件体系、状态库设计、画布系统
- [Flow 架构](/flow/architecture) — BPMN 设计器、FlowEngine、flow-shared 边界
- [Server 能力清单](/server/capabilities) — 后端技术栈与功能矩阵
