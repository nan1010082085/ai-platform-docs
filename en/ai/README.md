# AI Assistant Documentation

> Create forms, processes, and intelligent applications with natural language

## Quick Start

### Start Development

```bash
# Start AI frontend
cd ai/app && pnpm dev

# Start backend service (new terminal)
cd server && pnpm dev
```

Open `http://localhost:5300` to start using.

### Basic Usage

1. Click "New Conversation"
2. Select Agent type
3. Enter your requirements
4. View AI-generated results

## Core Features

### Multi-Agent Conversation

| Agent | Expertise |
|-------|-----------|
| Auto | Auto-detect intent, intelligent routing |
| Editor | Form design, generate Schema JSON |
| Flow | Process design, generate BPMN diagrams |

### Agent Workflow

Visual workflow orchestration with 32 node types:

- **Triggers** — Manual, Webhook, Scheduled
- **AI Nodes** — LLM, Agent Loop, Agent Team, Intent Router
- **Document Processing** — Document parsing, visual analysis, audio transcription
- **Logic Control** — Conditional branches, multi-path branches, variable assignment
- **Human-in-the-loop** — HITL approval (pause → confirm → continue)

### RAG Knowledge Base

- Vector retrieval + keyword fallback
- Rerank (BGE-Reranker)
- Hybrid retrieval (semantic + keyword weighted fusion)
- Retrieval debugging view (three-way comparison)

### Evaluation System

- Dataset management (CRUD + CSV import)
- Evaluation runs (select target workflow + dataset)
- Result comparison (pass rate/time/tokens/LLM scores)

### Plugin Center

JSON configuration for Experts, Skills, Tools, MCP servers. Hot reload, CLI packaging.

## Documentation Directory

### Architecture

- [Architecture Overview](./architecture.md) — Dual-engine architecture, system overview
- [Platform Positioning](./platform.md) — editor / flow / ai integration, JWT, dual keys

### Chat System

- [Agent System](./agent.md) — 5 expert agents, execution flow, collaboration
- [Event Protocol](./events.md) — v1/v2 event types, WebSocket transport, HITL

### Workflow

- [Workflow Orchestration](./agent-workflow.md) — Node reference, templates, execution engine, REST API

### Tools & Protocol

- [Tool System](./tool.md) — MCP & LangGraph tools, registry, extension
- [MCP Protocol](./mcp.md) — 5 MCP servers, bridge architecture

### Plugins

- [Plugin Center](./plugin.md) — Architecture, config, production checklist, CLI
- [Plugin Registry](./plugin-registry.md) — Plugin registry
- [Third-party Plugin Development](./extend/third-party-plugin-guide.md) — Expert/Skill/Tool/MCP

### Frontend Application

- [Application Overview](./app/) — `@ai-app` frontend: features, runtime & embed modes
- [Architecture & Layering](./app/architecture.md) — Directory structure, Store/Composable/API
- [Routing & Pages](./app/routing.md) — Route table & guards

### Shared Package

- [ai-shared API](./ai-shared.md) — Types, exports, tool names, prompt builder
- [Environment Variables](./environment-variables.md) — All env vars, minimal config

### Design Documents

- [Design Doc Index](./design/) — Page wireframes, Mermaid interaction flows
- [Information Architecture](./design/overview.md) — Navigation, embed modes, store relationships
- [AI Chat Design](./design/chat.md) — Chat / sidebar / LangGraph vs Workflow
- [Agent Orchestration Design](./design/workflows.md) — Designer, execution monitoring, webhook
- [RAG Knowledge Base Design](./design/rag.md) — Index management, retrieval testing, inline Chat RAG
- [Runtime Architecture](./design/runtime.md) — LangGraph / Workflow Executor / RAG execution graph

## External Integration

### REST API

```bash
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-slug \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "your data"}'
```

### WebSocket

Connect using Socket.IO for streaming output.

### MCP Protocol

Configure MCP Server through Plugin Center to extend AI capabilities.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret |
| DEEPSEEK_API_KEY | DeepSeek API key |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| OPENAI_API_KEY | — | OpenAI API key |
| ANTHROPIC_API_KEY | — | Anthropic API key |
| EMBEDDING_API_KEY | — | Embedding API key |
| REDIS_URL | redis://localhost:6379 | Redis (optional) |

## FAQ

**Q: AI-generated content is not accurate, what should I do?**
A: Upload relevant documents to the knowledge base, and AI will reference existing designs. You can also continue the conversation to have AI adjust.

**Q: How to extend AI capabilities?**
A: Use Plugin Center to configure Experts, Skills, Tools, or MCP Servers.

**Q: Workflow execution failed, what should I do?**
A: Check execution logs, review node configurations and API calls.

## Related Links

- [AI App README](../../../ai/app/README.md) — User guide
- [Server API Docs](../server/README.md) — Backend API
- [Deployment Guide](../../deploy/README.md) — Production deployment
