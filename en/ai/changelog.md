---
title: Changelog
---

# AI Platform · Changelog

> Records major iterations of the AI platform (chat agent / Agent Workflow / RAG / plugin center).
> Internal planning docs are archived in `ai/product/` and not shown here.

## 2026-07-27 · Multi-agent & Long-term Memory

- **Memory node**: workflow long-term memory node, cross-session context persistence
- **Agent Handoff**: cross-expert task handoff, explicit handoff protocol
- **Parallel execution**: `parallel` node multi-branch + convergence
- **Agentic RAG**: retrieval-augmented from passive citation to active retrieval decisions

## 2026-07-24 · Full-chain Architecture & Prompt Optimization

- **Full-chain architecture**: Chat -> LangGraph -> LLM -> industry templates
- **LangGraph optimization**: 12 optimizations (state management, node reuse, error recovery)
- **Prompt optimization**: temperature strategy + prompt spec, output stability improved
- **Vertical domain analysis**: form/flow + AI differentiated scenarios

## 2026-07-22 · Agent Deepening & Workflow-as-Agent

- **Sub-workflow invocation**: workflow nodes can call published sub-workflows
- **Cost visibility & quota**: execution cost stats, tenant quota management
- **agent-loop node**: workflow autonomous loop decisions
- **Workflow as skill**: published workflows callable as agent skills
- **Complex file componentization**: large-file splitting, first-screen perf

## 2026-07-20 · Open-source Readiness

- **Five-capability maturity**: chat/workflow/plugins mature, RAG/integration pending
- **Open-source readiness diagnosis**: i18n, frontend telemetry, doc calibration identified
- **Industry templates**: 10 categories (HR/finance/ops/customer service/legal, etc.)

## Earlier · Capability Foundation

- **Dual-engine architecture**: Chat LangGraph StateGraph + Workflow DAG orchestration
- **Plugin center**: Expert / Skill / Tool / MCP config, hot-reload
- **BullMQ execution engine**: persistent queue + auto-retry + dead-letter queue
- **RAG knowledge base**: vector search + BGE-Reranker rerank + hybrid weighted fusion
- **External integration**: Workflow Open API (polling + callback modes)
