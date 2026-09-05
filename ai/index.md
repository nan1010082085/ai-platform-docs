---
title: AI 平台
---

# AI 平台

Schema Platform 的 AI 模块，提供**对话智能体**、**智能体工作流**、**RAG 知识库**、**插件中心**等核心能力。

## 快速开始

```bash
# 安装依赖
cd shared/platform-shared && pnpm install && pnpm build && cd ../..
cd ai/shared && pnpm install && pnpm build && cd ../..
cd ai/app && pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 设置 API Key 等

# 启动开发服务器
pnpm dev    # 端口 5300
```

## 核心能力

| 能力 | 说明 | 文档 |
|------|------|------|
| AI 对话智能体 | LangGraph 多专家对话、需求分析、任务规划、工具调用 | [agent](./agent) |
| 智能体工作流 | 可视化 DAG 工作流编排、32 种节点类型 | [agent-workflow](./agent-workflow) |
| RAG 知识库 | 向量检索 + Rerank + 混合检索 | [rag-tool-mcp-boundary](./rag-tool-mcp-boundary) |
| 插件中心 | 专家 / 技能 / 工具 / MCP 配置化，热重载 | [plugin](./plugin) |
| MCP 协议 | Model Context Protocol Server 接入 | [mcp](./mcp) |
| 工具系统 | 内置工具 + 自定义工具注册 | [tool](./tool) |
| 专家扩展 | 专家声明与扩展 | [expert-extension-guide](./expert-extension-guide) |
| SDK 集成 | REST API + WebSocket + SDK | [sdk](./sdk) |

## AI 应用前端

`ai/app` — Vue 3 前端应用，提供 AI 对话、工作流编排、知识库管理等 UI。

| 文档 | 说明 |
|------|------|
| [应用概览](./app/) | `@ai-app` 定位、功能、运行与嵌入模式 |
| [架构与分层](./app/architecture) | 目录结构、Store/Composable/API 清单、插件适配层 |
| [路由与页面](./app/routing) | 完整路由表与守卫 |

## 架构与设计

| 文档 | 说明 |
|------|------|
| [架构设计](./architecture) | 双引擎架构（对话 LangGraph + 智能体工作流 DAG）、系统概览 |
| [平台定位](./platform) | AI 平台在 Schema Platform 中的定位 |
| [ai-shared API](./ai-shared) | AI 共享层 API 参考 |
| [设计概览](./design/) | 产品设计文档索引 |
| [任务进度与开放缺口](./product/backlog) | 已关闭计划总览；开放计数见 inventory |
| [开放工作清单](../design/open-work-inventory) | 全平台未实现节点计数（**当前 0**） |
| [对话设计](./design/chat) | 对话页面、侧边栏模式、双后端 |
| [RAG 设计](./design/rag) | 知识库管理、检索测试 |
| [运行时设计](./design/runtime) | 服务端执行图、数据流、Checkpoint |
| [工作流术语](./workflow-terminology) | 入口节点与执行 trigger 对照 |

## 开发与部署

| 文档 | 说明 |
|------|------|
| [开发指南](./DEVELOPMENT) | 本地开发环境搭建 |
| [部署指南](./DEPLOYMENT) | 生产环境部署 |
| [环境变量](./environment-variables) | 配置参考 |
| [事件协议](./events) | WebSocket 事件类型 |
| [贡献指南](./CONTRIBUTING) | 代码规范、PR 流程 |
| [安全最佳实践](./SECURITY_BEST_PRACTICES) | API Key 管理、数据隔离 |

## 扩展开发

| 文档 | 说明 |
|------|------|
| [技能拼装规范](./extend/skill-assembly-spec) | 技能组装技术规范 |
| [打包规范 v1](./extend/pack-spec-v1) | 插件打包规范 |
| [第三方插件指南](./extend/third-party-plugin-guide) | 外部开发者接入 |
| [插件脚手架](./extend/plugin-scaffold/) | 最小专家插件模板 |

## 用户指南

- [扩展能力（插件）](./user-plugins) — 专家 / 工具怎么用
- [账号、权限与安全](./user-security) — 自有模型、设备绑定、服务接入简介
