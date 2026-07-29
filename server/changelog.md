---
title: 更新日志
---

# 后端服务 · 更新日志

> 记录后端服务（Koa + MongoDB）的主要迭代。

## 2026-06-27 · v1.0.2

- `.env.development` / `.env.production` 创建
- 本地 MongoDB + 端口 3001（开发环境）
- `.npmrc` 统一

## 架构基线

- **Koa + MongoDB**：REST API + WebSocket（Socket.IO）
- **230+ API 端点**：覆盖 40 个路由模块
- **BullMQ + Redis**：持久化队列、自动重试、死信队列
- **LLM 集成**：DeepSeek / OpenAI / Anthropic + 自定义 Provider（BYOK）
- **RAG**：BGE-M3 embedding + BGE-Reranker 重排

## 能力

- Schema CRUD + 发布 + 版本对比
- AI 对话 Agent + Agent Workflow 执行引擎
- RAG 知识库（文档向量化、检索、重排）
- 插件中心（Expert / Skill / Tool / MCP，热重载）
- Telemetry 埋点看板（`/api/telemetry`）
- Workflow Open API（触发 / 轮询 / 回调）
