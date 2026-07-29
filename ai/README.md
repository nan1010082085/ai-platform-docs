# AI 文档

`@ai-app` - **开源应用能力小平台**（Agent 编排、RAG、插件、对话、对外集成），与 editor / flow 共用 JWT，并通过 Sidebar 为设计器提供 AI 助手。

**必读**：[能力平台定位](./platform.md) - 三能力一体、JWT 通用、凭证模型、小平台边界。

## 快速开始

```bash
cd ai/app && pnpm dev                # 启动开发服务器（端口 5300）
cd ai/app && pnpm build              # 构建前端
cd shared/platform-shared && pnpm build  # 构建共享包（含 AI 类型/事件，跨仓消费时需要）
```

## 包结构

| 包 | 目录 | 说明 |
|---|---|---|
| `@ai-app` | `ai/app/` | Vue 3 微前端：Chat、RAG、监控、工作流设计器 |
| `@schema-platform/platform-shared` | `shared/platform-shared/` | 平台共享；AI 类型/事件/Prompt/工作流域模型在 `ai/` 子目录 |

**集成方式**：[sdk.md](./sdk.md) - invoke 入口 + Key 鉴权，外部系统直接调用 REST API

## 外部集成

- [集成与 SDK](./sdk.md) - invoke 入口、用户平台 Key、工作流 Key
- WebSocket 流式 API (Socket.IO)
- MCP 协议（插件中心配置）

## 文档目录

### 架构总览

- [架构总览](./architecture.md) - 双引擎 + 基线 1.0（pluginExpert、expert/tool 节点、invoke-only）
- [能力平台定位](./platform.md) - editor / flow / ai 一体、JWT、双 Key

### Chat LangGraph

- [Agent 系统](./agent.md) - 5 种专家 Agent、执行流程、协作机制
- [事件协议](./events.md) - v1/v2 事件类型、WebSocket 传输、HITL

### Agent Workflow

- [工作流编排](./agent-workflow.md) - 节点参考、模板、执行引擎、REST API、设计器 UI

### 工具与协议

- [工具系统](./tool.md) - MCP 与 LangGraph 工具、注册表、扩展
- [MCP 协议](./mcp.md) - 5 个 MCP Server、Bridge 架构

### 插件中心

- [插件中心](./plugin.md) - 架构、配置、生产清单、CLI
- [插件 Registry](./plugin-registry.md) - 插件注册表
- [第三方插件开发指南](./extend/third-party-plugin-guide.md) - Expert/Skill/Tool/MCP + 脚手架

### 共享包与运维

- [ai-shared API](./ai-shared.md) - 类型、导出、工具名、Prompt 构建器
- [环境变量清单](./environment-variables.md) - 全部环境变量说明、最小配置示例

### 产品设计（线框 & 交互流）

- [设计文档索引](./design/) - 页面线框、Mermaid 交互流
- [信息架构与布局](./design/overview.md) - 导航、嵌入模式、Store 关系
- [AI 对话设计](./design/chat.md) - Chat / 侧边栏 / LangGraph vs Workflow
- [Agent 编排设计](./design/workflows.md) - 设计器、执行监控、Webhook
- [Workflow 开放 API](./design/workflow-open-api.md) - 已收敛至 invoke
- [RAG 知识库设计](./design/rag.md) - 索引管理、检索测试、Chat 内联 RAG
- [运行时架构](./design/runtime.md) - LangGraph / Workflow Executor / RAG 执行图
