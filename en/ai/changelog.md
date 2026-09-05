---
title: Changelog
---

# AI Platform · Changelog

> Major updates for the AI platform (chat agent / workflows / knowledge base / plugin center).

## 2026-07-27 · Multi-agent & Long-term Memory

- **Memory node**: long-term memory across sessions
- **Agent Handoff**: explicit cross-expert handoff
- **Parallel execution**: `parallel` node multi-branch + join
- **Agentic RAG**: active retrieval decisions instead of passive citation

## 2026-07-24 · Full-chain & Prompt Optimization

- **Full-chain architecture**: Chat → LangGraph → LLM → industry templates
- **LangGraph improvements**: state management, node reuse, error recovery
- **Prompt optimization**: temperature strategy + prompt specs
- **Industry templates**: HR / finance / ops / customer service / legal, and more

## 2026-07-22 · Agent Deepening & Workflow-as-Agent

- **Sub-workflow invocation**: call published sub-workflows from nodes
- **Cost visibility & quota**: execution cost stats, tenant quotas
- **agent-loop node**: autonomous loop decisions in workflows
- **Workflow as skill**: published workflows callable as agent skills
- **Large-file componentization**: first-screen performance

## Earlier · Capability Foundation

| Capability | Description |
|------|------|
| Dual-engine architecture | Chat LangGraph + workflow DAG |
| Plugin center | Expert / Skill / Tool / MCP config, hot-reload |
| BullMQ execution engine | Persistent queue + retry + dead-letter |
| RAG knowledge base | Vector search + BGE-Reranker + hybrid fusion |
| MCP protocol | Model Context Protocol server access |
| External integration | Workflow Open API (invoke + Key; polling / callback) |
