# Skill Assembly Order & Conflict Spec

> This doc defines the complete rules for how Skills are assembled into the Expert system prompt, including assembly order, separators, conflict handling, version control, and best practices.
> Implementation: `server/src/ai/plugins/resolveExpertPrompt.ts`, `server/src/ai/plugins/registry.ts`, `server/src/ai/plugins/loadPluginConfig.ts`

---

## 1. Assembly Order

`resolveExpertSystemPrompt` assembles in two steps: first determine the base prompt, then concatenate Skill blocks in order.

### 1.1 Base Prompt Resolution (one of two, mutually exclusive)

```
if expert.dynamicPrompt exists
    -> dynamically generated from promptBuilder (editor / flow / page / general)
else if expert.systemPrompt non-empty
    -> use the inline string directly
else
    -> base = '' (empty string)
```

| Priority | Source | Description |
|--------|------|------|
| 1 | `dynamicPrompt` | generated at runtime from metadata; content changes with Widget/FlowNode metadata |
| 2 | `systemPrompt` | static inline string, for simple cases |
| 3 | empty | no base, only Skills |

### 1.2 Skill Concatenation

```typescript
const skillBlocks = (expert.skills ?? [])          // 1. take the Expert's skills array
  .map((id) => registry.getSkill(id)?.content?.trim())  // 2. look up content by id from the Registry
  .filter((block): block is string => Boolean(block))   // 3. filter empty / not-found Skills
```

**Key points**:
- `expert.skills` is an **ordered array**; assembly order strictly follows array indices
- When `registry.getSkill(id)` returns `undefined`, it is silently skipped (no error)
- Skills with empty `content` or `enabled: false` do not participate

### 1.3 Final Concatenation

```typescript
if (!skillBlocks.length) return base                    // no Skill -> base only
if (!base) return skillBlocks.join('\n\n')              // no base -> Skills only
return `${base}\n\n${skillBlocks.join('\n\n')}`         // base + Skills
```

### 1.4 Full Assembly Diagram

Taking `platform.editor` as an example:

```
┌─────────────────────────────────────────────┐
│  base prompt (dynamicPrompt: "editor")       │
│  = buildEditorSystemPrompt(metadata)         │
│    - Widget type system                      │
│    - Schema structure                        │
│    - events/linkage/variables/data sources   │
│    - core rules                              │
│    - typical examples                        │
│    - tool-call spec                          │
│    - output format                           │
├─────────────────────────────────────────────┤
│  \n\n                                        │
├─────────────────────────────────────────────┤
│  Skill[0]: platform.schema-quality           │
│  "When generating form Schema: use camelCase │
│   for field names; every input must have a   │
│   label; set required on mandatory fields;   │
│   avoid duplicate field ids."                │
├─────────────────────────────────────────────┤
│  \n\n                                        │
├─────────────────────────────────────────────┤
│  Skill[1]: platform.reply-zh                 │
│  "Reply in Simplified Chinese by default;    │
│   technical terms may stay in English."      │
└─────────────────────────────────────────────┘
```

---

## 2. Separators

| Position | Separator | Description |
|------|--------|------|
| base <-> Skill[0] | `\n\n` | double newline, Markdown paragraph break |
| Skill[n] <-> Skill[n+1] | `\n\n` | same |

- The separator is fixed to `\n\n`, **not customizable**
- Each Skill block may freely use Markdown internally (headings, lists, tables, etc.)
- The LLM treats `\n\n` as a paragraph boundary and won't conflate instructions from different Skills

---

## 3. Conflict Handling

### 3.1 Same-name Skill Override Rule

Skills are stored in a `Map<string, SkillDeclaration>` keyed by `id`. **Later registration overwrites earlier.**

#### Config Load Order (`loadPluginConfig.ts`)

```
① config/plugins/           <- base layer
② config/plugins/local/     <- local override (gitignore)
③ config/plugins/tenants/{AI_PLUGIN_TENANT_ID}/  <- tenant override (optional)
④ AI_PLUGIN_CONFIG_PATH     <- external config (env var)
```

Each layer calls `mergeManifests`, merging the `skills` array by `id`:

```typescript
// inside mergeManifests
const mergeById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
  const map = new Map<string, T>()
  for (const item of a) map.set(item.id, item)
  for (const item of b) map.set(item.id, { ...map.get(item.id), ...item })
  return [...map.values()]
}
```

**Result**: for the same `id`, the later layer's fields **shallow-merge over** the earlier.

#### Example

```
# ① config/plugins/skills/platform.reply-zh.json
{ "id": "platform.reply-zh", "content": "Reply in Simplified Chinese by default; technical terms may stay in English." }

# ② config/plugins/local/skills/platform.reply-zh.json
{ "id": "platform.reply-zh", "content": "請用繁體中文回覆。" }

# Final Registry content = "請用繁體中文回覆。"
```

### 3.2 Duplicate Skill Reference in One Expert

If `expert.skills` contains duplicate ids:

```json
{ "skills": ["platform.reply-zh", "platform.reply-zh"] }
```

**Behavior**: `registry.getSkill(id)` returns the same object; content is concatenated twice. This is a config error; avoid it.

### 3.3 Skill Instruction Conflict (semantic)

When multiple Skills' content is semantically contradictory (e.g. one says "use Chinese", another "use English"), **the LLM follows the later instruction** (recency bias).

**Assembly order determines priority**: Skills later in the `expert.skills` array have higher priority.

```
skills: ["platform.reply-zh", "custom.reply-en"]
-> assemble Chinese first, then English
-> LLM tends to follow English (later)
```

### 3.4 Skill vs Base Prompt Conflict

Skills are concatenated **after** the base prompt, so Skill instructions take priority over the base prompt.

```
base: "Reply in Chinese" (from dynamicPrompt-generated prompt)
Skill: "Please reply in English"
-> LLM tends to reply in English
```

**Design principle**: Skills should supplement, not override, the base prompt's core behavior. When overriding base behavior, confirm it's intentional.

---

## 4. Version Control

### 4.1 Hot-reload Mechanism

After a Skill config change, the Registry must be reloaded to take effect:

| Method | Trigger | Use case |
|------|------|----------|
| SIGHUP | `kill -HUP $(pgrep -f "dist/index.js")` | production |
| `AI_PLUGIN_WATCH=1` | auto-reload on file change | dev |
| restart | restart server | fallback |

### 4.2 Behavior After Skill Update

1. **Skill content change**: after reload, all Experts referencing it use the new content on next call
2. **Skill `enabled` -> `false`**: after reload, removed from the Registry; no longer assembled into any Expert
3. **New Skill**: after reload, can be referenced by an Expert's `skills` array
4. **Skill file deleted**: after reload, the Skill disappears; the corresponding slot in referencing Experts becomes empty (filtered out)

### 4.3 No Version Field Design

Currently Skills have no `version` field. Changes are **file-content-based**; reload takes effect. For canary/rollback, switch files via the `tenants/{id}/` or `local/` directory.

---

## 5. Best Practices

### 5.1 Skill Writing Principles

| Principle | Description | Example |
|------|------|------|
| **Single responsibility** | each Skill does one thing | `platform.reply-zh` only language, `platform.schema-quality` only Schema quality |
| **Supplement, don't override** | Skills should add constraints missing from the base prompt, not repeat or contradict | if base already has "use camelCase for field names", the Skill shouldn't repeat |
| **Concrete, not vague** | instructions should be明确 and actionable | "use camelCase for field names" not "mind naming conventions" |
| **Short, not verbose** | a Skill is an附加 instruction, not a full prompt | keep to 3-5 rules |

### 5.2 Naming Conventions

| Rule | Description | Example |
|------|------|------|
| Use `{scope}.{feature}` format | scope distinguishes source, feature describes purpose | `platform.reply-zh`, `acme.compliance` |
| Avoid duplicating base prompt instructions | wastes tokens and may confuse | - |
| Use kebab-case | consistent with other platform ids | `platform.schema-quality` not `platform.schemaQuality` |

### 5.3 Conflict-avoiding Writing

#### 5.3.1 Don't repeat base prompt content in Skills

```json
// BAD - base prompt (editor) already has full Widget Schema structure
{
  "id": "custom.schema-format",
  "content": "Every Widget must include id, name, type, field, label, props, position fields."
}

// GOOD - only add constraints the base prompt doesn't cover
{
  "id": "custom.schema-constraints",
  "content": "Email fields in forms must configure validateRule for email format validation."
}
```

#### 5.3.2 Don't give contradictory instructions across Skills

```json
// BAD - two Skills contradict on language
{ "id": "a.reply-zh", "content": "Reply in Simplified Chinese." }
{ "id": "b.reply-en", "content": "Reply in English." }

// GOOD - language managed by one Skill
{ "id": "platform.reply-zh", "content": "Reply in Simplified Chinese by default; technical terms may stay in English." }
```

#### 5.3.3 Control priority via `expert.skills` array order

```json
// when compliance should take priority over general quality
{
  "skills": ["platform.schema-quality", "acme.compliance"]
}
// acme.compliance assembled later, higher priority
```

#### 5.3.4 Use `local/` for temporary overrides without changing base config

```bash
# to temporarily change platform.reply-zh behavior
# create local/skills/platform.reply-zh.json to override
# base config stays unchanged, easy rollback
```

#### 5.3.5 Avoid absolute directives in Skills

```json
// BAD - may conflict with base prompt examples
{ "id": "custom.no-table", "content": "Absolutely never use the table widget." }

// GOOD - give a preference
{ "id": "custom.prefer-list", "content": "Prefer search-list over table, unless complex column sorting and pagination are needed." }
```

### 5.4 Skill content Format Suggestions

```markdown
## Short title (optional)

Rule 1: specific constraint description.
Rule 2: specific constraint description.
Rule 3: specific constraint description.
```

- Use Markdown; the LLM parses it well
- Primarily a rule list; avoid long paragraphs
- No need for "You are a XXX expert" role-setting (that's the base prompt's job)

---

## 6. Full Flow Diagram

```
Expert config
  ├── dynamicPrompt / systemPrompt  ->  base prompt
  └── skills: [id1, id2, ...]
        │
        ▼
PluginRegistry.getSkill(id)
  ├── found and enabled=true  ->  skill.content
  └── not found / disabled    ->  null (skip)
        │
        ▼
filter empty, keep valid content
        │
        ▼
assemble: base + "\n\n" + skill1.content + "\n\n" + skill2.content + ...
        │
        ▼
final system prompt -> sent to LLM
```

---

## 7. Related Code Index

| File | Responsibility |
|------|------|
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Skill assembly core logic |
| `server/src/ai/plugins/registry.ts` | Skill registry (Map storage, lookup by id) |
| `server/src/ai/plugins/loadPluginConfig.ts` | config loading, layered merge, hot-reload |
| `server/src/ai/plugins/types.ts` | `SkillDeclaration` type definition |
| `shared/platform-shared/ai/promptBuilder.ts` | base prompt dynamic generation (editor/flow/page) |
| `server/config/plugins/skills/` | production Skill config files |
