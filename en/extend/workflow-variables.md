---
title: Workflow Variables
---

# Workflow Variables

Workflow nodes can reference data from other nodes and inputs using template variables.

## Variable Syntax

All variables use double curly braces with a `$` prefix:

| Variable | Description |
|----------|-------------|
| `{{$input.path}}` | Workflow input object |
| `{{$node.nodeId}}` | Full output of a specific node |
| `{{$node.nodeId.field}}` | Specific field from a node's output |
| `{{$json}}` | Direct upstream output (lastOutput) |
| `{{$conversation}}` | Current execution's conversation history |

## Resolution Rules

1. Variables are resolved at node execution time
2. Paths support dot notation for nested objects
3. `null` / `undefined` values become empty strings
4. Objects are JSON-stringified

## Examples

```json
{
  "message": "{{$input.message}}",
  "context": "{{$node.parse-1.text}}"
}
```

## Usage in Nodes

Variables can be used in:
- LLM node prompts
- HTTP request bodies
- Condition expressions
- Output templates
