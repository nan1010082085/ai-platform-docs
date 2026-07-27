---
title: Prompt Architecture
---

# Prompt Architecture

## Four-Layer Prompt System

Schema Platform uses a four-layer prompt architecture:

| Layer | Source | Priority | Description |
|-------|--------|----------|-------------|
| 1 | Expert config | Highest | Expert's system prompt from plugin registry |
| 2 | Node config | | Node-level prompt override |
| 3 | Skill assembly | | Assembled skills (ordered by priority) |
| 4 | Default | Lowest | Built-in default prompt |

## Prompt Assembly

1. Start with expert's system prompt (Layer 1)
2. If node has `data.prompt`, it overrides (Layer 2)
3. Skills are assembled in priority order (Layer 3)
4. If no prompt at all, use default (Layer 4)

## Context Injection

The following context is injected into prompts:
- **User message**: The current user input
- **RAG context**: Retrieved knowledge base content
- **Conversation history**: Previous messages
- **Schema/Flow context**: Current form/flow being edited

## Variable Resolution

Prompts support template variables:
- `{{$input.message}}` - User input
- `{{$node.xxx}}` - Other node outputs
- `{{$conversation}}` - Conversation history

## Best Practices

- Keep system prompts focused on role and constraints
- Use structured output format (JSON) for programmatic consumption
- Include error handling instructions
- Set appropriate temperature per use case
