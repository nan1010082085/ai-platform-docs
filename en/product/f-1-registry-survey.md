---
title: Registry Survey
---

# Plugin Registry Survey

## Overview

Survey of the plugin registry consumption chain - how experts, skills, tools, and MCP servers are registered and consumed by the chat and workflow systems.

## Registry Architecture

The plugin registry is the central source of truth for:
- **Experts**: Domain-specific agents with prompts and tools
- **Skills**: Reusable prompt fragments
- **Tools**: LangGraph tools and MCP tools
- **MCP Servers**: Model Context Protocol server configurations

## Consumption Chain

```
Plugin Registry
  ├─ Chat Graph (router -> pluginExpert)
  ├─ Agent Workflow (tool nodes)
  └─ MCP Bridge (tool wrapper)
```

## Expert Resolution

1. Router matches user message to expert via routing keywords
2. pluginExpert node loads expert's prompt and tools
3. Expert executes with bound tools
4. Results flow back through the graph

## Tool Resolution

Tools are resolved by name from the registry. The registry supports:
- Built-in tools (LangGraph tools)
- MCP tools (via MCP bridge)
- Workflow tools (published workflows as tools)
