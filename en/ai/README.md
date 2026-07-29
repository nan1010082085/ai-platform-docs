# AI Documentation

`@ai-app` - an **open-source application-capability platform** (agent orchestration, RAG, plugins, chat, external integration); shares JWT with editor / flow and provides an AI assistant to designers via the sidebar.

**Must read**: [Platform positioning](./platform.md) - three capabilities in one, shared JWT, credential model, small-platform boundary.

## Quick Start

```bash
cd ai/app && pnpm dev                # Start dev server (port 5300)
cd ai/app && pnpm build              # Build frontend
cd shared/platform-shared && pnpm build  # Build shared package (includes AI types/events; needed for cross-repo consumption)
```

## Package Structure

| Package | Directory | Description |
|---|---|---|
| `@ai-app` | `ai/app/` | Vue 3 micro-frontend: Chat, RAG, monitoring, workflow designer |
| `@schema-platform/platform-shared` | `shared/platform-shared/` | Platform shared; AI types/events/prompt/workflow domain models in the `ai/` subdirectory |

**Integration**: [sdk.md](./sdk.md) - invoke entry + key auth; external systems call the REST API directly.

## External Integration

- [Integration & SDK](./sdk.md) - invoke entry, user-platform key, workflow key
- WebSocket streaming API (Socket.IO)
- MCP protocol (plugin center config)

## Doc Directory

### Architecture Overview

- [Architecture overview](./architecture.md) - dual-engine + baseline 1.0 (pluginExpert, expert/tool nodes, invoke-only)
- [Platform positioning](./platform.md) - editor / flow / ai unified, JWT, dual key

### Chat LangGraph

- [Agent system](./agent.md) - 5 expert agents, execution flow, collaboration
- [Event protocol](./events.md) - v1/v2 event types, WebSocket transport, HITL

### Agent Workflow

- [Workflow orchestration](./agent-workflow.md) - node reference, templates, execution engine, REST API, designer UI

### Tools & Protocol

- [Tool system](./tool.md) - MCP & LangGraph tools, registry, extension
- [MCP protocol](./mcp.md) - 5 MCP servers, bridge architecture

### Plugin Center

- [Plugin center](./plugin.md) - architecture, config, production checklist, CLI
- [Plugin registry](./plugin-registry.md) - plugin registry
- [Third-party plugin guide](./extend/third-party-plugin-guide.md) - Expert/Skill/Tool/MCP + scaffold

### Shared Package & Ops

- [ai-shared API](./ai-shared.md) - types, exports, tool names, prompt builder
- [Environment variables](./environment-variables.md) - all env vars, minimal config example

### Product Design (wireframes & interaction flows)

- [Design doc index](./design/) - page wireframes, Mermaid interaction flows
- [Information architecture & layout](./design/overview.md) - navigation, embed modes, store relationships
- [AI chat design](./design/chat.md) - Chat / sidebar / LangGraph vs Workflow
- [Agent orchestration design](./design/workflows.md) - designer, execution monitoring, webhook
- [Workflow Open API](./design/workflow-open-api.md) - converged to invoke
- [RAG knowledge base design](./design/rag.md) - index management, retrieval testing, inline Chat RAG
- [Runtime architecture](./design/runtime.md) - LangGraph / Workflow Executor / RAG execution graph
