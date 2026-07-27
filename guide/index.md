---
title: 简介
---

# 简介

Schema Platform 是一个**表单/流程垂直场景的 AI 应用平台**。

## 核心能力

- 🤖 **AI 对话 Agent** - LangGraph 多专家对话，需求分析、任务规划、工具调用
- 🔧 **Agent Workflow** - 可视化 DAG 工作流编排，32 种节点类型
- 📚 **RAG 知识库** - 向量检索 + Rerank + 混合检索
- 📊 **评测体系** - 离线评测，数据集 + 版本对比
- 🔌 **插件中心** - Expert/Skill/Tool/MCP 配置，热重载
- 🏭 **31 个行业模板** - 10 个分类，DB 存储 + UI 管理

## 快速开始

```bash
# 安装
cd shared/platform-shared && pnpm install && pnpm build && cd ../..
cd server && pnpm install && cd ..
cd ai/app && pnpm install && cd ../..

# 配置
cp server/.env.example server/.env
# 编辑 .env 设置 MONGODB_URI / JWT_SECRET / DEEPSEEK_API_KEY

# 启动
cd server && pnpm dev    # 端口 3001
cd ai/app && pnpm dev    # 端口 5300
```

## 架构

```
浏览器 (5300)
  └─ ai/app (Vue 3)
       ├─ REST API -> server (Koa, 3001)
       └─ WebSocket -> server (Socket.IO)
                       ├─ MongoDB
                       ├─ BullMQ + Redis（队列）
                       ├─ LLM（DeepSeek/OpenAI/Anthropic）
                       └─ RAG（BGE-M3 + rerank）
```

## 文档导航

- [AI 平台](/ai/) - 对话 Agent、工作流、RAG、插件
- [编辑器](/editor/) - 表单设计器、Widget 体系
- [流程设计器](/flow/) - BPMN 流程引擎
- [后端服务](/server/) - API、数据库、模型
- [扩展开发](/extend/) - 自定义模型、Skill、模板
