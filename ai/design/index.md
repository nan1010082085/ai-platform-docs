# AI 产品设计文档

> 页面线框、交互流、**运行时架构** — 基于 `ai/app` + `server/src/ai` 当前实现

## 文档索引

| 文档 | 范围 |
|------|------|
| [信息架构与布局](./overview.md) | 导航、嵌入模式、路由、全局布局 |
| [AI 对话](./chat.md) | Chat 页面、侧边栏模式、LangGraph / Workflow 双后端 |
| [Agent 编排](./workflows.md) | 列表、设计器、执行监控、Webhook |
| [RAG 知识库](./rag.md) | 索引管理、检索测试、Chat 内联 RAG |
| [**运行时架构**](./runtime.md) | **服务端执行图、数据流、Checkpoint、WebSocket 进度** |

## 设计原则

1. **对话优先**：Chat 为默认首页，单栏全宽，减少视觉干扰
2. **编排可视化**：Workflow 设计器三栏布局（面板 / 画布 / 属性），对齐 n8n 心智模型
3. **双后端透明**：用户可在设置中选择 LangGraph 对话或已发布工作流，输入区 UI 保持一致
4. **嵌入友好**：qiankun 嵌入时隐藏子应用侧栏，通过 bridge 与 editor/flow 通信
5. **状态可见**：WebSocket 连接、流式生成、节点执行、索引覆盖率均有明确反馈

## 文档类型

| 类型 | 文档 | 内容 |
|------|------|------|
| UI 交互 | chat / workflows / rag | 线框图、用户操作序列、状态机 |
| 运行时 | [runtime.md](./runtime.md) | 服务端执行路径、LangGraph 图、Executor 循环、RAG 管道 |

## 页面地图

```
AiLayout (200px 侧栏，嵌入时隐藏)
├── /                    AiChatView          对话
├── /workflows           AgentWorkflowListView   编排列表
├── /workflows/:id       AgentWorkflowDesignerView  全屏设计器（无侧栏）
├── /workflows/:id/executions  AgentExecutionListView
├── /executions/:id      AgentExecutionDetailView   全屏执行详情
├── /rag                 RagKnowledgeBase    知识库
├── /monitor             AiMonitorView       性能监控
└── /sidebar             AiSidebarView       嵌入抽屉模式
```
