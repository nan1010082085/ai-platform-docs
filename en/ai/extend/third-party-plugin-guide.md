# Third-party Plugin Development Guide

> Expert / Skill / Tool / MCP extension entry. The accompanying scaffold is in the repo at `ai/docs/extend/plugin-scaffold/`.

## 1. Plugin Types

| Type | Use case | Config location |
|------|------|----------|
| Expert | Domain expert (system prompt, tool whitelist, dynamic prompt) | Plugin Center -> Experts |
| Skill | Reusable capability fragment, referenced by an Expert | Plugin Center -> Skills |
| Tool | Callable function (local or MCP) | Plugin Center -> Tools |
| MCP | External Model Context Protocol service | Plugin Center -> MCP |

## 2. Minimal Expert Example

```json
{
  "id": "my-expert",
  "name": "My Expert",
  "description": "Sample expert",
  "systemPrompt": "You are an assistant focused on XXX.",
  "tools": ["rag__search"],
  "enabled": true
}
```

Loaded via the Plugin Center "Import" or the hot-reload directory. Once enabled, it appears in the chat agent selector.

## 3. Tool Naming Convention

Tool names follow the MCP spec: `{domain}__{action}` (double underscore).

Authoritative definition and display names: `shared/platform-shared/ai/toolNames.ts` (`@schema-platform/platform-shared/ai/toolNames`).

When adding a tool:

1. Register the executor on the server
2. Add a constant and display label in `toolNames.ts`
3. Reference it in the Expert / Skill whitelist

## 4. Skill Assembly

A Skill can declare dependent Tools and prompt fragments, assembled by the Expert. See [skill-assembly-spec.md](../extend/skill-assembly-spec.md).

## 5. MCP Integration

1. Add an MCP server in the Plugin Center (URL / transport)
2. After the connectivity test passes, the tool list syncs automatically
3. The Expert selects the needed MCP tools

## 6. Security Requirements

- External plugin packages must declare permissions (tools / network / filesystem)
- Source verification: only trusted sources or an audit whitelist allowed (see the open-platform roadmap)
- Never hardcode tenant keys in plugins; use runtime-injected credentials

## 7. Local Verification Checklist

- [ ] `pnpm test` passes in `ai/app`
- [ ] Plugin can be enabled/disabled in the Plugin Center
- [ ] The new tool can be called in chat and the event stream is visible
- [ ] The workflow Tool node can select the new tool name

## 8. Scaffold

```bash
# Copy from the example
cp -R ai/docs/extend/plugin-scaffold my-plugin
cd my-plugin
# Fill in expert.json / tools per the README, then import into the Plugin Center
```
