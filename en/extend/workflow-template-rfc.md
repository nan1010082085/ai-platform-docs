---
title: Workflow Template RFC
---

# Workflow Template RFC

## Overview

Workflow templates allow users to quickly create pre-configured workflows for common scenarios. This RFC defines the template registration mechanism.

## Template Structure

A workflow template consists of:

- **Metadata**: ID, name, description, category, icon, tags
- **Graph**: Complete workflow graph (nodes, edges, entry node)
- **Default Data**: Default configuration for each node

## Registration

Templates are registered via the `AGENT_WORKFLOW_TEMPLATES` array in `shared/platform-shared/ai/agentWorkflow/templates.ts`. Each template has a factory function that generates the graph.

## Categories

| Category | Description |
|----------|-------------|
| general | General-purpose workflows |
| document | Document processing |
| assistant | AI assistant |
| integration | External integrations |
| batch | Batch processing |
| customer-service | Customer service |
| audit | Compliance & audit |
| hr | Human resources |
| finance | Finance |
| operations | Operations |

## Adding a New Template

1. Add template ID to `AgentWorkflowTemplateId` type
2. Add metadata to `AGENT_WORKFLOW_TEMPLATES` array
3. Create factory function `createXxxWorkflowGraph()`
4. Register in `createAgentWorkflowGraphByTemplate()` switch

## DB Storage

Templates are also stored in MongoDB via `WorkflowTemplateModel`. Built-in templates are seeded on server startup. Users can create custom templates via the Template Manager UI.
