# Expert Extension Guide

> This doc explains how to add a custom Expert in the plugin center, and the role of `legacyAgentKey` in task-chain scheduling.

**Related**: [plugin.md](./plugin.md) · [architecture.md](./architecture.md) · [plugin-registry.md](./plugin-registry.md)

---

## 1. Core Concepts

### 1.1 Expert vs Graph Node

The LangGraph Chat graph has **only one** expert execution node: `pluginExpert`. All Experts (including the four built-in and third-party custom) execute through the `pluginExpert` node; `session.currentExpertId` decides which Expert runs.

```text
Router -> pluginExpert (only node) -> LLM + Tools -> response
              ↑
        resolveExpertForSession(expertId or legacyAgentKey)
```

An Expert is **not** a graph node. Adding an Expert only requires a config JSON; no graph change.

### 1.2 Two Keys Compared

| Key | Use | Who decides | Example |
|-----|------|--------|------|
| `id` | Expert unique identifier, Registry global index | Configurer (must be unique) | `platform.editor`, `acme.approval-expert` |
| `legacyAgentKey` | task-chain scheduling key, aligned with the old `currentAgent` | Configurer (optional, enum value) | `editor`, `flow`, `page`, `general` |

**Key difference**: `id` is the Expert's identity, used for `session.currentExpertId` and the Workflow `expert` node's `expertId` field. `legacyAgentKey` is a scheduling shortcut, only for the `step.agent` value in task chains and legacy routing compatibility.

---

## 2. `legacyAgentKey` In Detail

### 2.1 Type Definition

```typescript
// server/src/ai/plugins/types.ts
type LegacyAgentKey = 'editor' | 'flow' | 'page' | 'general' | 'router'
```

Fixed enum, not extensible. A custom Expert that wants to participate in task-chain scheduling can only map to one of these five values.

### 2.2 What It Is

- **task-chain scheduling key** - when taskPlanner generates a task chain, each `step.agent` field uses a `legacyAgentKey` value
- **legacy compatibility bridge** - the old `session.currentAgent` stored `'editor'`/`'flow'`/`'page'`/`'general'` strings; `legacyAgentKey` lets the Registry find the corresponding Expert declaration by this string
- **user context dispatch key** - `buildExpertUserContent` branches by `legacyAgentKey` to decide whether to inject Schema context or Flow context

### 2.3 What It Is Not

- **Not a graph node name** - the graph node is fixed to `pluginExpert`; it does not change when an Expert is added
- **Not the Expert ID** - the Expert's unique identifier is the `id` field; `legacyAgentKey` is just an auxiliary lookup key
- **Not a Workflow node ID** - the Workflow `expert` node references via `expertId` (i.e. `id`), unrelated to `legacyAgentKey`

### 2.4 Usage Scenarios

| Scenario | Entry | Lookup logic |
|------|------|----------|
| taskPlanner generates task chain | `taskPlannerNode` | LLM outputs `step.agent = "editor"`; taskChain schedules by this |
| LangGraph Chat routing | `resolveExpertForSession` | first by `expertId`, fallback to `legacyAgentKey` |
| Workflow executor | `agentWorkflowExecutor` | a non-dotted agentType is passed as `legacyAgentKey` to `runRegisteredExpert` |
| User context injection | `buildExpertUserContent` | branch by `legacyAgentKey`: `flow` -> Flow context, `editor`/`page` -> Schema context |
| Frontend expert pill label | `usePluginRegistry` | `legacyAgentKey` maps to a label (Editor/Flow/Page/General) |
| Router excludes general expert | `matchExpertsByRouting` | experts with `legacyAgentKey === 'general'` skip keyword matching |

### 2.5 Registration Mechanism

`PluginRegistry.registerManifest` indexes Experts with a `legacyAgentKey` into the `expertsByLegacy` Map when loading config:

```typescript
// registry.ts
if (item.legacyAgentKey) {
  this.expertsByLegacy.set(item.legacyAgentKey, item)
}
```

Then `getExpertByLegacyKey(key)` does an O(1) lookup. If two Experts declare the same `legacyAgentKey`, the later one overwrites the earlier (by load order).

---

## 3. Adding an Expert

### 3.1 Basic Config

Create a JSON file under `server/config/plugins/experts/`:

```json
{
  "id": "acme.approval-expert",
  "label": "Approval Process Expert",
  "description": "Focused on approval process design and optimization",
  "tools": ["flow__search", "flow__get_detail", "generate_flow"],
  "skills": ["platform.flow-design", "platform.reply-zh"],
  "routing": {
    "keywords": ["approval", "process optimization"],
    "contextSources": ["standalone"],
    "priority": 5
  },
  "model": {
    "task": "generate_complex",
    "temperature": 0.5
  },
  "runtime": ["langgraph"],
  "enabled": true
}
```

### 3.2 Whether `legacyAgentKey` Is Needed

**Set it** when:

- The Expert participates in taskPlanner-generated task chains (selected by the LLM as a step executor)
- The Expert replaces a built-in expert's role (e.g. a custom editor expert replacing the built-in `platform.editor`)
- The Expert needs to be hit by legacy `context.source` explicit routing

**Don't set it** when:

- The Expert is only referenced explicitly via `expertId` (e.g. Workflow `expert` node)
- The Expert is only auto-matched by Chat routing via `routing.keywords`
- The Expert runs standalone, not in multi-step task chains

### 3.3 Mapping to an Existing `legacyAgentKey`

If a custom Expert replaces a built-in expert's task-chain role, set the corresponding `legacyAgentKey`:

```json
{
  "id": "acme.custom-editor",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor",
  "tools": ["schema__search", "generate_schema"],
  "routing": {
    "keywords": ["form", "schema"],
    "contextSources": ["editor", "standalone"]
  }
}
```

Now when taskPlanner outputs `"agent": "editor"`, it routes to `acme.custom-editor` instead of the built-in `platform.editor` (later registration overwrites earlier).

### 3.4 Verify

```bash
cd server/
pnpm plugin:validate
```

Confirm the new Expert appears in the validation output with no conflict warnings.

---

## 4. Full Example: Custom Industry Expert

### 4.1 Config File

`server/config/plugins/experts/acme.healthcare.json`:

```json
{
  "id": "acme.healthcare",
  "label": "Healthcare Industry Expert",
  "description": "Generates forms and flows compliant with healthcare industry norms",
  "tools": ["schema__search", "schema__get_detail", "generate_schema", "flow__search", "generate_flow"],
  "skills": ["platform.schema-quality", "platform.reply-zh"],
  "routing": {
    "keywords": ["healthcare", "medical record", "prescription", "hospital", "patient"],
    "contextSources": ["standalone"],
    "priority": 10
  },
  "model": {
    "task": "generate_complex",
    "temperature": 0.3
  },
  "runtime": ["langgraph"],
  "enabled": true
}
```

This expert has no `legacyAgentKey` because it:
- Is auto-matched by Chat via `routing.keywords`
- Is explicitly referenced by Workflow via `expertId`
- Does not participate in taskPlanner multi-step chains (when the user says "create a medical record form", the router hits this expert directly, no task chain)

### 4.2 If It Needs to Join a Task Chain

If you want multi-step needs like "create a healthcare system with medical record form and approval flow" to also dispatch to this expert:

```json
{
  "id": "acme.healthcare",
  "legacyAgentKey": "editor",
  "dynamicPrompt": "editor"
}
```

After mapping to `editor`, taskPlanner's `"agent": "editor"` routes to this expert. Note this overwrites the built-in `platform.editor`; make sure that's intended.

---

## 5. FAQ

### Q: Can a custom Expert have its own `legacyAgentKey`?

No. `LegacyAgentKey` is a fixed enum (`editor`/`flow`/`page`/`general`/`router`), not extensible. A custom Expert can only map to an existing value or leave it unset.

### Q: What if two Experts set the same `legacyAgentKey`?

The later-loaded one overwrites the earlier. Load order is `plugins/` -> `plugins/local/` -> `plugins/tenants/{id}/` -> `AI_PLUGIN_CONFIG_PATH`; within a directory, alphabetical by filename. You can override built-in experts via `local/`.

### Q: What if taskPlanner's `agent` value is not in the `legacyAgentKey` enum?

taskPlanner's `agent` field is passed as a string to `dispatchAgent`. If the value contains `.` (e.g. `acme.healthcare`), it's looked up as `expertId` directly; otherwise as `legacyAgentKey`. Both paths route correctly to an Expert.

### Q: What is `router` as a `legacyAgentKey` for?

`router` is reserved for the built-in router node; no production Expert uses it currently. Custom Experts should not set this value.
