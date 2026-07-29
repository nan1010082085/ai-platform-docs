# Plugin Center

> **Standalone doc**: config, runtime, UI, and evolution of the Expert / Skill / Tool / MCP four-layer capability directory.
> Chat LangGraph and Agent Workflow **share** the same Registry.

**Related**: [Expert extension guide](./expert-extension-guide.md) · [Five-phase iteration record](./product/ai-five-phase-iteration.md) (internal) · [Workflow Open API](./design/workflow-open-api.md) · server config notes `server/config/plugins/README.md`

---

## 1. Architecture

```text
server/config/plugins/
  mcp/      -> MCP Server declarations (inmemory / stdio / sse)
  tools/    -> tool metadata (kind: mcp | graph | http)
  skills/   -> reusable Markdown instructions (content or file)
  experts/  -> expert: prompt + tools + skills + routing

         loadPluginConfig
              ↓
       PluginRegistry (in-memory)
              ↓
    ┌─────────┼─────────┬──────────────┐
    ↓         ↓         ↓              ↓
 LangGraph  Workflow  GET /plugins   MCP bridge
 Chat       expert node designer/UI
```

| Layer | Responsibility | Consumers |
|----|------|--------|
| **MCP** | External/built-in MCP Server connection declarations | `mcp/bridge.ts` |
| **Tool** | Tool name, kind, argsHint, HTTP template | LangGraph tools, Workflow tool node |
| **Skill** | Additional instructions assembled into the Expert system prompt | `resolveExpertSystemPrompt` |
| **Expert** | Expert identity, toolset, routing, model params | Chat routing, Workflow `expert` node |

---

## 2. Config

### Directory Structure

```
server/config/plugins/
├── mcp/              # one file = one MCP Server
├── tools/            # JSON grouped by domain
├── experts/          # one file = one Expert
├── skills/           # one file = one Skill
├── packs/            # distributable plugin packs (manifest + layers)
├── local/            # local overrides (gitignore)
├── tenants/{id}/     # tenant overlay
└── local.example/    # copy to local/ to enable
```

### Load Order (later overrides same id / name)

```text
plugins/ -> plugins/local/ -> plugins/tenants/{AI_PLUGIN_TENANT_ID}/ -> AI_PLUGIN_CONFIG_PATH
```

| Env var | Description |
|----------|------|
| `AI_PLUGIN_CONFIG_DIR` | Config root, default `server/config` |
| `AI_PLUGIN_CONFIG_PATH` | Extra manifest file or directory |
| `AI_PLUGIN_TENANT_ID` | Enable `plugins/tenants/{id}/` overlay |
| `AI_PLUGIN_WATCH=1` | Dev-mode watch on `plugins/local/` changes |

### Expert Key Fields

| Field | Description |
|------|------|
| `id` | Globally unique, e.g. `platform.editor` |
| `legacyAgentKey` | **task-chain scheduling key** (see below), not a graph node ID |
| `dynamicPrompt` | `editor` / `flow` / `page` / `general` |
| `tools` / `skills` | Referenced tool names, Skill id list |
| `routing` | Chat intent-matching keywords / contextSources |
| `runtime` | `langgraph` / `workflow` |

### `legacyAgentKey` Explanation

`legacyAgentKey` is a **task-chain scheduling key** that maps the legacy `currentAgent` string to a plugin-center Expert declaration. It is **not** a LangGraph graph node ID, nor the Expert ID.

**Type definition** (`server/src/ai/plugins/types.ts`):

```typescript
type LegacyAgentKey = 'editor' | 'flow' | 'page' | 'general' | 'router'
```

**Responsibility boundary**:

| What it is | What it is not |
|--------|----------|
| The value of `step.agent` in a task chain | A LangGraph graph node name (e.g. `pluginExpert`) |
| A valid value for legacy `session.currentAgent` | The Expert's unique identifier (`id` is) |
| The lookup key for `PluginRegistry.getExpertByLegacyKey()` | A Workflow node ID |

**Usage scenarios**:

1. **taskPlanner** - when generating a task chain, each step's `agent` field uses `legacyAgentKey` (e.g. `"agent": "editor"`)
2. **LangGraph routing** - `resolveExpertForSession` first looks up by `expertId`, falls back to `legacyAgentKey`
3. **Workflow executor** - `dispatchAgent` passes a non-dotted agentType as `legacyAgentKey` to `runRegisteredExpert`
4. **User context injection** - `buildExpertUserContent` branches by `legacyAgentKey` to inject Schema/Flow context

**Registration mechanism**: `PluginRegistry` indexes `legacyAgentKey` into the `expertsByLegacy` Map at `registerManifest` time, for O(1) lookup by `getExpertByLegacyKey()`.

**Config example** (`experts/platform.editor.json`):

```json
{
  "id": "platform.editor",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor",
  "tools": ["schema__search", "generate_schema", "..."],
  "routing": {
    "keywords": ["form", "schema"],
    "contextSources": ["editor", "standalone"]
  }
}
```

**When extending a custom Expert**: only Experts that participate in task-chain scheduling (referenced by taskPlanner or router) need `legacyAgentKey`. Pure Workflow experts or standalone experts can omit it and use `id` directly.

---

## 3. Current Production Checklist (2026-07-13)

`pnpm plugin:validate`: **experts 4 · skills 4 · tools 25 · mcpServers 5**

### Experts (`plugins/experts/`)

| id | Description | Skills |
|----|------|--------|
| `platform.editor` | Form Schema | `platform.schema-quality`, `platform.reply-zh` |
| `platform.general` | General assistant | `platform.reply-zh` |
| `platform.flow` | BPMN flow | `platform.flow-design`, `platform.reply-zh` |
| `platform.page` | Page layout | `platform.page-layout`, `platform.reply-zh` |

### Skills (`plugins/skills/`)

| id | Description |
|----|------|
| `platform.reply-zh` | Default Simplified Chinese reply |
| `platform.schema-quality` | Schema field naming and required rules |
| `platform.flow-design` | BPMN flow design rules |
| `platform.page-layout` | Page layout rules |

### Frontend Plugin Center (`/plugins`)

Read-only browse of the four-layer Registry; expert "type" pill labels; the tool column shows the **Registry label** (fallback `getToolDisplayLabel`).

Designer: `usePluginRegistry` -> Palette expert area + MCP tool area; the `expert` node property panel selects `expertId`.

---

## 4. Runtime Integration

| Consumer | Path | Registry usage |
|--------|------|-----------------|
| **Chat LangGraph** | `graph/` + `pluginExpertAgent` | routing expert + `runRegisteredExpert` |
| **Workflow** | `agentWorkflowExecutor` | `expert` node + `expertId` |
| **Designer** | `GET /api/ai/plugins` | Palette / ToolNodePanel |
| **Plugin Center** | same | read-only UI |
| **External Open API** | execute workflows with expert nodes | config from Registry; see [workflow-open-api.md](./design/workflow-open-api.md) |

### API

```http
GET /api/ai/plugins
Authorization: Bearer <jwt>
```

Returns a `{ experts, skills, tools, mcpServers }` summary (see `pluginRoutes.ts`).

---

## 5. Ops CLI

In the `server/` directory:

```bash
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")   # hot-reload the Registry
```

Deploy: `deploy/pack.sh --target server` carries the whole `server/config/`.

---

## 6. Code Entry Points

| Path | Responsibility |
|------|------|
| `server/config/plugins/` | per-file config |
| `server/src/ai/plugins/loadPluginConfig.ts` | directory merge, hot-reload |
| `server/src/ai/plugins/dispatchExpert.ts` | `runRegisteredExpert` |
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Skill prompt assembly |
| `server/src/ai/mcp/bridge.ts` | MCP connection (reads Registry) |
| `server/src/ai/pluginRoutes.ts` | `GET /api/ai/plugins` |
| `ai/app/src/composables/usePluginRegistry.ts` | frontend cache & Palette |
| `ai/app/src/views/PluginCenterView.vue` | plugin center UI |
| `ai/app/src/constants/agentTools.ts` | label/category **fallback** (authoritative list is the Registry) |

---

## 7. Completed Capabilities

| Category | Item | Status |
|------|-----|------|
| **Config** | per-directory `mcp/tools/experts/skills` | ✅ |
| | `local/`, `tenants/` overlay | ✅ |
| | hot-reload SIGHUP + `AI_PLUGIN_WATCH` | ✅ |
| | `plugin:validate` / `pack` / `install` | ✅ |
| **Runtime** | MCP bridge reads Registry (inmemory/stdio/sse) | ✅ |
| | `runRegisteredExpert` + Chat `pluginExpert` | ✅ |
| | Workflow `expert` node + `expertId` | ✅ |
| | unified http tool executor | ✅ |
| | Router / taskPlanner dynamic experts | ✅ |
| **Frontend** | designer Palette dynamic load | ✅ |
| | ToolNodePanel Registry-first | ✅ |
| | Plugin Center four-layer read-only UI + Chinese tool names | ✅ |
| | expert type pill labels (legacy Chinese) | ✅ |
| **Production Skills** | `platform.reply-zh` / `platform.schema-quality` | ✅ |
| | attached to general + editor experts | ✅ |
| **Quality** | stdio MCP integration tests | ✅ |
| | CI `ai-tests.yml` plugin:validate gate | ✅ |

---

## 8. Todo Items

| # | Item | Status |
|---|-----|------|
| - | Phase F capability-layer refinement research | see [open-platform-roadmap.md §3](./product/open-platform-roadmap.md#3-phase-f--capability-layer-refinement-research) (internal) |
| - | Prompt four-layer architecture doc `prompt-architecture.md` | research output, to be written |

Historical PLG items are all complete; see the "Completed Capabilities" table above.

Local override write: `PUT /api/ai/plugins/local/{mcp|tools|experts|skills}/{file}.json`

---

## 9. Quick Steps to Add a Plugin

1. Add a JSON file in the corresponding subdirectory (or copy `local.example/`)
2. `pnpm plugin:validate`
3. Dev: `AI_PLUGIN_WATCH=1` or SIGHUP; prod: restart or HUP
4. Open AI `/plugins` or the designer Palette to confirm
5. Test the expert or tool node in Chat / Workflow

```bash
# Example: enable the example.support pack locally
cp -R server/config/plugins/local.example server/config/plugins/local
# edit experts/*.json enabled: true
pnpm plugin:validate
```

### New Expert Guide

**Minimal config**:

```json
{
  "id": "my.custom-expert",
  "label": "Custom Expert",
  "description": "What the expert does",
  "tools": [],
  "skills": [],
  "runtime": ["langgraph", "workflow"]
}
```

**Does it need `legacyAgentKey`?**

| Scenario | Set it? |
|------|----------|
| Needs to be scheduled by taskPlanner as a task-chain step | Yes, and the value must be one of the `LegacyAgentKey` union |
| Needs to be routed by the LangGraph router via intent matching | Yes (the router writes `session.currentAgent` by `legacyAgentKey`) |
| Only used as an `expert` node in the Workflow designer | No, use `id` directly (e.g. `"expertId": "my.custom-expert"`) |
| Only called explicitly via API or `runRegisteredExpert` | No, pass `{ expertId: "my.custom-expert" }` |

**Note**: valid `legacyAgentKey` values are a fixed enum (`editor` | `flow` | `page` | `general` | `router`); you cannot define new values. If you need a brand-new scheduling dimension, use `expertId` as the scheduling key instead of extending `legacyAgentKey`.

For the full extension guide see [Expert extension guide](./expert-extension-guide.md).
