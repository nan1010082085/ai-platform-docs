# Introduction

Welcome to Schema Platform AI documentation!

Schema Platform is an **open-source AI application platform** that provides:

- 🤖 **AI Chat** - Conversational Agent with multi-expert support
- 🔄 **Agent Workflow** - Visual workflow orchestration (like n8n)
- 📚 **RAG Knowledge Base** - Document retrieval and augmentation
- 🔌 **Plugin Center** - Extensible AI capabilities
- 🔗 **External Integration** - REST API for workflow invocation

## Quick Overview

### AI Chat

The AI Chat system uses LangGraph to manage multi-expert conversations. Each expert can be configured with different tools, prompts, and capabilities.

**Key Features:**
- WebSocket streaming for real-time responses
- Multi-modal input (text, images, files)
- @mention system for expert selection
- RAG integration for knowledge-based answers

### Agent Workflow

Visual DAG (Directed Acyclic Graph) editor for creating AI workflows. Similar to n8n or Make.com.

**Node Types:**
- LLM nodes for AI processing
- Document parsing and OCR
- Conditional logic and branching
- Human-in-the-loop (HITL)
- Tool invocation
- MCP server integration

### RAG Knowledge Base

Upload documents and create a searchable knowledge base.

**Supported Formats:**
- PDF documents
- Word documents (.docx)
- Excel spreadsheets (.xlsx)
- Text files (.txt, .md)

### Plugin Center

Extend AI capabilities through plugins:

- **Experts** - Domain-specific AI assistants
- **Skills** - Reusable prompt templates
- **Tools** - Function calling capabilities
- **MCP Servers** - Model Context Protocol integrations

### External Integration

Publish workflows as REST APIs:

```bash
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-workflow \
  -H "X-Tenant-Id: your-tenant-id" \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "your data"}'
```

## Who Should Use This?

- **Developers** building AI-powered applications
- **Product Teams** creating conversational interfaces
- **Data Scientists** implementing RAG systems
- **Enterprises** needing customizable AI workflows
- **Open Source Contributors** interested in AI platforms

## Getting Started

Ready to start? Choose your path:

- **[Quick Start](/ai/quick-start)** - Get up and running in 5 minutes
- **[Architecture](/ai/architecture)** - Understand the system design
- **[AI Platform](/ai/)** - Explore AI-specific features
- **[Editor](/editor/)** - Learn about the form editor
- **[Flow Designer](/flow/)** - Discover workflow capabilities

## Community

- **GitHub**: [schema-platform](https://github.com/nan1010082085/ai-platform)
- **Discussions**: [GitHub Discussions](https://github.com/nan1010082085/ai-platform/discussions)
- **Issues**: [Report Bugs](https://github.com/nan1010082085/ai-platform/issues)

---

**Let's build something amazing together!** 🚀
