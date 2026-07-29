# Flow 产品设计文档

> 页面线框、交互流、运行时架构 — 基于 `flow/src` + `flow-shared` 当前实现

## 文档索引

| 文档 | 范围 |
|------|------|
| [信息架构与布局](./overview.md) | 路由、AppLayout、qiankun、嵌入页 |
| [流程设计器](./designer.md) | 三栏 BPMN 画布、节点面板、模拟执行 |
| [实例与任务](./instances-tasks.md) | 实例列表、审批收件箱、任务操作 |
| [**运行时架构**](./runtime.md) | FlowEngine、Token 模型、服务端执行 vs 前端可视化 |

## 设计原则

1. **设计/执行分离**：`flow/` 负责 BPMN 可视化编排；`flow-shared/FlowEngine` 在服务端执行
2. **flowGraph 为真源**：Vue Flow nodes/edges ↔ `FlowGraph` JSON 双向序列化
3. **模拟 ≠ 运行时**：`useSimulation` 仅设计器预览，不调用 FlowEngine
4. **表单绑定 Editor**：UserTask 通过 `formPublishId` + iframe 嵌入 PublishView
5. **AI 协同**：WebSocket `onAiApply` / `onAiPublished` 接收 AI 生成结果

## 页面地图

```
AppLayout (侧栏，嵌入时隐藏)
├── /list               FlowListView           流程定义列表
├── /instances          FlowInstanceListView   流程实例
├── /instance/:id       FlowInstanceDetailView 实例详情（运行时图）
├── /tasks              TaskInboxView          我的任务
├── /monitor            FlowMonitorDashboard   流程监控
├── /templates          FlowTemplateView       流程模板
├── /stats              FlowStatsView          统计报表
│
├── /designer?id=       FlowDesigner           全屏设计器
└── /embed/*            嵌入页（Editor/Shell）
```
