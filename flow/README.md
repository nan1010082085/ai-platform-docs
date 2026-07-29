# Flow 文档

`@flow` — BPMN 流程设计器、实例管理、任务收件箱

## 快速开始

```bash
pnpm dev:flow        # 启动开发服务器（端口 5200）
pnpm --filter @flow build
```

## 包结构

| 包 | 目录 | 说明 |
|---|---|---|
| `@flow` | `flow/` | Vue Flow BPMN 设计器与管理 UI |
| `@schema-platform/flow-shared` | `flow-shared/` | 类型、校验、FlowEngine 执行引擎 |

## 外部集成

- qiankun 微前端（子应用名 `flow`）
- Editor 表单嵌入（UserTask `formPublishId`）
- AI 流程生成（WebSocket `onAiApply`）

## 文档目录

### 架构

- [架构总览](./architecture.md) — 分层、flow-shared 边界、Store

### 设计与运行时（线框 & Mermaid）

- [设计文档索引](./design/)
- [信息架构与布局](./design/overview.md)
- [流程设计器](./design/designer.md) — 画布、节点面板、模拟执行
- [实例与任务](./design/instances-tasks.md) — 审批、嵌入页
- [运行时架构](./design/runtime.md) — FlowEngine、Token 模型、服务端执行
