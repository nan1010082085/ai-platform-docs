---
title: Changelog
---

# Backend Service · Changelog

> Records major iterations of the backend service (Koa + MongoDB).

## 2026-06-27 · v1.0.2

- `.env.development` / `.env.production` created
- Local MongoDB + port 3001 (dev)
- `.npmrc` unified

## Architecture Baseline

- **Koa + MongoDB**: REST API + WebSocket (Socket.IO)
- **230+ API endpoints**: covering 40 route modules
- **BullMQ + Redis**: persistent queue, auto-retry, dead-letter queue
- **LLM integration**: DeepSeek / OpenAI / Anthropic + custom providers (BYOK)
- **RAG**: BGE-M3 embedding + BGE-Reranker

## Capabilities

- Schema CRUD + publish + version comparison
- AI chat Agent + Agent Workflow execution engine
- RAG knowledge base (document vectorization, retrieval, rerank)
- Plugin center (Expert / Skill / Tool / MCP, hot-reload)
- Telemetry dashboard (`/api/telemetry`)
- Workflow Open API (trigger / poll / callback)
