---
title: Server 文档
---

# Server 文档

`@server` — Koa.js + MongoDB 后端服务，为 Editor / Flow / AI / UA 提供统一 API 层。

## 快速开始

```bash
# 启动本地开发（需要 Docker MongoDB）
pnpm db:up          # 启动 MongoDB 8 容器
pnpm db:seed        # 种子数据（用户/角色/权限/模板）
pnpm dev            # 端口 3001

# 数据迁移（UUID → ObjectId）
pnpm db:migrate-id

# 构建与部署
pnpm build
```

## 技术栈

| 层 | 技术 |
|---|---|
| HTTP 框架 | Koa 2 + koa-router |
| 数据库 | MongoDB 8 + Mongoose 8 ODM |
| 实时通信 | Socket.IO（WebSocket） |
| 队列 | BullMQ + Redis（持久化队列、自动重试、死信队列） |
| LLM 集成 | DeepSeek / OpenAI / Anthropic + 自定义 Provider（BYOK） |
| RAG | BGE-M3 embedding + BGE-Reranker 重排 |
| 认证 | JWT + SSO + API Key（三模式） |
| 多租户 | Mongoose tenantPlugin 自动注入 |

## 核心能力

- **Schema CRUD + 发布 + 版本对比** — 表单/表格全生命周期管理
- **AI 对话智能体 + 智能体工作流** — LangGraph 多专家对话 + DAG 工作流执行引擎
- **RAG 知识库** — 文档向量化、检索、重排、混合加权融合
- **插件中心** — Expert / Skill / Tool / MCP 配置化，热重载
- **Telemetry 埋点** — `/api/telemetry` 端点
- **工作流开放 API** — 触发 / 轮询 / 回调三种集成模式
- **RBAC 权限** — 50+ 权限码、角色继承、菜单权限
- **多租户隔离** — 自动 tenantId 注入，数据完全隔离

## 文档目录

| 文档 | 说明 |
|------|------|
| [更新日志](./changelog.md) | 迭代记录 |
| [能力总览](./capabilities.md) | 已实现功能矩阵、技术栈、架构特点 |
| [API 接口](./api.md) | REST API 端点概览 |
| [API 详细文档](./api-reference.md) | 全部 230+ 端点详细说明（含请求/响应示例） |
| [数据模型](./models.md) | Mongoose 模型定义 |
| [数据库](./database.md) | MongoDB 连接与配置 |
| [RAG 架构](./rag-architecture.md) | 检索链路与向量依赖 |
| [插件中心](./plugin-center.md) | 插件配置与热重载 |
| [部署与运维](./deployment.md) | 打包、PM2、nginx、配置目录 |

## 相关文档

- [AI 平台](/ai/) — 对话智能体、工作流、RAG、插件
- [编辑器](/editor/) — 表单设计器、控件体系
- [流程设计器](/flow/) — BPMN 流程引擎
- [扩展开发](/extend/) — 自定义模型、Skill、模板
