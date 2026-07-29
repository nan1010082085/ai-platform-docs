---
outline: deep
---

# Four Config Systems

All widgets declare config via `config.ts`; the editor provides unified dialog editing.

## Config System Overview

| System | Type | Entry | Description |
|------|------|------|------|
| Events | `events` | ActionListEditor | 20 action types, supports confirm + condition |
| Linkage | `linkages` | LinkageEditor | 6 linkage types |
| API | `api` | ApiConfig | Dynamic data source |
| Variables | `variables` | VariableEditor | Widget internal variables |

## Events

### Triggers

`click`, `change`, `focus`, `blur`, `submit`, `close`, `open`, `confirm`, `cancel`, `refresh`, `api-success`, `api-error`, `mounted`

### Action Types (20)

| Type | Description |
|------|------|
| `show` / `hide` | Show/hide target widget |
| `open-dialog` / `close-dialog` | Open/close dialog |
| `switch-tab` | Switch tab |
| `set-value` | Set component value |
| `submit` / `reset` | Submit/reset form |
| `emit` | Emit custom event |
| `set-variable` | Set variable value |
| `trigger-event` | Trigger target component event |
| `api` / `fetch-data` | Call API |
| `navigate` | Page navigation |
| `post-message` | Send postMessage |
| `copy` | Copy to clipboard |
| `refresh` | Refresh data |
| `close-tab` | Close browser tab |
| `startFlow` / `endFlow` | Start/end flow |
| `submitSubmission` | Submit form + start flow |
| `exportData` | File download |
| `chart-linkage` | Chart linkage |

### Condition Expressions

`visibleOn` / `disabledOn` / `requiredOn` - string expressions compiled to `(formData, ctx) => boolean`

```javascript
// examples
"visibleOn": "formData.amount > 1000"
"disabledOn": "formData.status === 'approved'"
```

Sandbox execution: blocks access to `constructor/__proto__/prototype`; LRU-caches compiled results.

## Linkage

### 6 Linkage Types

| Type | Effect |
|------|------|
| `visible` | Conditional show/hide |
| `disabled` | Conditional disable |
| `required` | Conditional required |
| `options` | Dynamic option switch |
| `set-value` | Conditional set value |
| `reset-fields` | Conditional reset fields |

### Dependency Graph

useLinkage builds a dependency graph by `watchFields` and uses DFS to detect circular dependencies (circular fields fall back to default state).

## API

### Request Config

| Field | Description |
|------|------|
| `url` | API URL |
| `method` | GET / POST |
| `params` | URL query params |
| `headers` | Custom request headers |
| `body` | POST body |
| `timeout` | Timeout (ms) |
| `dataPath` | Data path (e.g. `result.records`) |
| `ttl` | Cache TTL (ms) |
| `enableRetry` | Auto-retry |
| `retryCount` | Retry count |

### Test Connection

Right panel real-time request -> response preview -> parse preview -> suggest dataPath -> one-click schema generation.

## Variables

### Variable Types

`string`, `number`, `boolean`, `object`, `array`

### Scope

- **Widget level**: `widget.variables`, scoped to the component
- **Board level**: `board.variables`, page-level global variables

### Exposed Values

Runtime values are exposed via `useExposeWidget` (e.g. `form.formData`, `table.tableData`, `dialog.visible`).
