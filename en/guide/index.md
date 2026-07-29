---
title: Introduction
---

# Introduction

Schema Platform is an **AI application platform for form/workflow vertical scenarios**.

## Core Capabilities

- 🤖 **AI Chat Agent** - LangGraph multi-expert conversation, requirement analysis, task planning, tool invocation
- 🔧 **Agent Workflow** - Visual DAG workflow orchestration, 32 node types
- 📚 **RAG Knowledge Base** - Vector search + Rerank + hybrid retrieval
- 📊 **Evaluation System** - Offline evaluation, datasets + version comparison
- 🔌 **Plugin Center** - Expert/Skill/Tool/MCP configuration, hot-reload
- 🏭 **32 Industry Templates** - 10 categories, DB-stored + UI-managed

## Quick Start

```bash
# Install
cd shared/platform-shared && pnpm install && pnpm build && cd ../..
cd server && pnpm install && cd ..
cd ai/app && pnpm install && cd ../..

# Configure
cp server/.env.example server/.env
# Edit .env to set MONGODB_URI / JWT_SECRET / DEEPSEEK_API_KEY

# Run
cd server && pnpm dev    # port 3001
cd ai/app && pnpm dev    # port 5300
```

## Architecture

```
Browser (5300)
  └─ ai/app (Vue 3)
       ├─ REST API -> server (Koa, 3001)
       └─ WebSocket -> server (Socket.IO)
                       ├─ MongoDB
                       ├─ BullMQ + Redis (queue)
                       ├─ LLM (DeepSeek/OpenAI/Anthropic)
                       └─ RAG (BGE-M3 + rerank)
```

## Documentation

- [AI Platform](/ai/) - Chat Agent, Workflow, RAG, Plugins
- [Editor](/editor/) - Form designer, Widget system
- [Flow Designer](/flow/) - BPMN process engine
- [Backend](/server/) - API, database, models
- [Extension Development](/extend/) - Custom models, Skills, templates
