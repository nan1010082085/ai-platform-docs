---
title: Server 文档
---

# Server 文档

`@server` — Koa.js + MongoDB 后端服务

## 快速开始

```bash
# 启动本地开发（需要 Docker MongoDB）
pnpm db:up
pnpm dev

# 种子数据
pnpm db:seed

# 数据迁移（UUID → ObjectId）
pnpm db:migrate-id

# 构建
pnpm build
```

## 文档目录

- [更新日志](./changelog.md) — 迭代记录
- [能力总览](./capabilities.md) — 已实现功能矩阵、技术栈、架构特点
- [API 接口](./api.md) — REST API 端点概览
- [API 详细文档](./api-reference.md) — 全部 230+ 端点详细说明（含请求/响应示例）
- [数据模型](./models.md) — Mongoose 模型定义
- [数据库](./database.md) — MongoDB 连接与配置
- [RAG 架构](./rag-architecture.md) — 检索链路与向量依赖
- [插件中心](./plugin-center.md) — 插件配置与热重载
- [部署与运维](./deployment.md) — 打包、PM2、nginx、配置目录
