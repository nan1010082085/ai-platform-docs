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

## 核心系统

### BPMN 设计器

- **三栏布局**：左侧节点面板、中间画布、右侧属性面板
- **节点类型**：StartEvent、EndEvent、UserTask、ServiceTask、ExclusiveGateway、ParallelGateway 等
- **拖拽创建**：从节点面板拖拽到画布创建节点
- **连线编辑**：点击节点端口拖拽创建连线
- **属性配置**：选中节点/连线后在右侧面板配置属性

### FlowEngine 运行时

- **Token 模型**：流程实例 Token 驱动执行
- **条件分支**：Exclusive Gateway 条件路由
- **并行分支**：Parallel Gateway 多分支并行
- **用户任务**：UserTask 人工审批节点
- **服务任务**：ServiceTask 自动执行节点
- **子流程**：SubProcess 嵌套子流程

### 实例与任务

- **流程实例**：流程定义的运行实例，包含当前状态、变量、历史
- **任务收件箱**：待办任务列表、批量操作、委托转办
- **审批历史**：完整审批轨迹、意见记录
- **超时处理**：节点超时自动通过/拒绝

### AI 协同

- **对话式流程生成**：自然语言描述自动生成 BPMN
- **WebSocket 事件**：`onAiApply` 接收 AI 生成结果
- **流程优化建议**：AI 分析流程瓶颈并提供优化建议

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

## 设计态 vs 运行态

| 维度 | 设计态（Designer） | 运行态（Runtime） |
|------|-------------------|-------------------|
| 组件 | FlowDesigner | FlowInstanceDetailView |
| 数据 | 流程定义（FlowGraph） | 流程实例（ProcessInstance） |
| 交互 | 拖拽、连线、配置 | 审批、填写、提交 |
| 执行 | 模拟执行（useSimulation） | 真实执行（FlowEngine） |
| 状态 | 草稿、已发布 | 运行中、已完成、已终止 |

## 节点类型

| 节点 | 图标 | 说明 |
|------|------|------|
| StartEvent | ⭕ | 流程开始 |
| EndEvent | ⏹️ | 流程结束 |
| UserTask | 👤 | 人工审批任务 |
| ServiceTask | ⚙️ | 自动服务任务 |
| ExclusiveGateway | ◇ | 排他网关（条件分支） |
| ParallelGateway | ◆ | 并行网关（多分支并行） |
| SubProcess | 📦 | 子流程 |

## 相关文档

| 文档 | 说明 |
|------|------|
| [架构设计](/flow/architecture) | 分层、flow-shared 边界、Store |
| [更新日志](/flow/changelog) | 迭代记录 |
| [能力清单](/editor/capabilities) | Editor 完整能力矩阵 |
| [AI 平台](/ai/) | AI 对话、工作流、RAG |
| [扩展开发](/extend/) | 自定义模型、Skill、模板 |
