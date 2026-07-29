---
title: 更新日志
---

# 流程设计器 · 更新日志

> 记录流程设计器（BPMN 编排 + 实例/任务管理）的主要迭代。

## 2026-06-27 · v1.0.2

- 生产环境 base 路径修正：`micro/flow/` -> `child/flow/`
- stores（flowDefinition / flowTemplate / flowMonitor）统一 useDataLoading 模式
- `.env.production` 路径同步修正
- 测试修复：383 tests 通过（+131）

## 架构基线

- **`@flow`**：Vue Flow BPMN 设计器 + 管理 UI
- **`@schema-platform/flow-shared`**：类型、校验、FlowEngine 执行层
- **qiankun 子应用**：sub-app `flow`
- **Editor 表单嵌入**：UserTask 通过 `formPublishId` 关联发布表单
- **AI 流程生成**：WebSocket `onAiApply`

## 能力

- BPMN 可视化设计器（画布、节点面板、流程仿真）
- 流程实例 + 任务收件箱
- FlowEngine 运行时 + 服务端执行
- 审批复用 / 嵌入页面集成
