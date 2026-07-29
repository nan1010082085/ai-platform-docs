# Editor Runtime Architecture

> WidgetRenderer, event engine, linkage, validation - design-time vs runtime execution paths

---

## 1. Runtime Overview

```mermaid
flowchart TB
  subgraph surfaces [Runtime Surfaces]
    Pub["PublishView\n/view/:code"]
    Prev["PreviewRenderView\n/preview"]
    EdPrev["EditorView preview mode"]
  end

  subgraph renderer [WidgetRenderer]
    WR["index.vue"]
    Link["useLinkage"]
    Form["useFormData"]
    Life["useLifecycle"]
    Event["triggerWidgetEvent"]
  end

  subgraph engine [Pure-logic Engine]
    EE["engine/eventEngine.ts"]
    Expr["utils/expression"]
  end

  subgraph server [server API]
    Schema["Schema published JSON"]
    Sub["createSubmission"]
    Flow["startFlow / terminateFlow"]
    RuntimeURL["runtimeApi external URL"]
  end

  Pub --> WR
  Prev --> WR
  EdPrev --> SchemaRender

  WR --> Link
  WR --> Form
  WR --> Event
  Event --> EE
  EE --> Sub
  EE --> Flow
  EE --> RuntimeURL

  Schema --> Pub
```

---

## 2. Surface Contract

| Surface | `WIDGET_SURFACE_KEY` | Mock data | Use case |
|---------|---------------------|-----------|------|
| Designer canvas | `'editor'` | ✅ `mock.ts` | Drag orchestration |
| Runtime | `'runtime'` | ❌ | Real user form filling |

Widget components get data via `inject(widgetDataKey)`; **do not** read Pinia stores directly.

---

## 3. Schema Load Runtime

```mermaid
sequenceDiagram
  participant View as PublishView
  participant API as schemaApi
  participant Parse as parseSchemaJson
  participant WR as WidgetRenderer

  View->>API: fetchPublishedByCode(code)
  API-->>View: { json, canvasConfig, variables }
  View->>Parse: parse widgets + board
  View->>WR: props: widgets, variables, canvas
  WR->>WR: provide context keys
  WR->>WR: render widget tree
```

### Schema JSON Format

```typescript
{
  widgets: Widget[],           // widget tree
  board: {
    canvas: { width, height, layoutMode, zoom, ... },
    variables: BoardVariable[],
    events: BoardEvent[],      // page-level events
  }
}
```

`parseSchemaJson` is backward-compatible with the old format (plain `Widget[]` array).

---

## 4. WidgetRenderer Runtime

### 4.1 Provide / Inject Keys

```mermaid
flowchart TB
  WR["WidgetRenderer"]
  WR --> Ctx["formGridContext / appStore"]
  WR --> LinkCtx["linkage context"]
  WR --> Dialog["DIALOG_REGISTRY_KEY"]
  WR --> EventCtx["EVENT_CONTEXT_KEY"]
  WR --> Surface["WIDGET_SURFACE_KEY=runtime"]

  Widget["FgXxx.vue"] --> Inject["inject widgetDataKey"]
  Widget --> Trigger["triggerWidgetEvent"]
```

### 4.2 Exposed API (for PublishView / postMessage)

| Method | Description |
|------|------|
| `getData()` | Collect all field values |
| `setData(data)` | Batch assign |
| `validate()` | Field-level validation |
| `submit()` | Validate + submit |
| `reset()` | Reset form |

---

## 5. Linkage Runtime (useLinkage)

```mermaid
flowchart TD
  Change["Field value change"] --> Watch["watchFields dependency graph"]
  Watch --> Eval["Expression eval\nvisible/disabled/required/options"]
  Eval --> Apply["Update target widget props"]
  Watch --> Cycle{"Cycle detection"}
  Cycle -->|cycle| Error["Console warn, skip"]
```

Linkage config comes from the widget `config.linkage` or LinkageSchemaDialog.

---

## 6. Event Engine Runtime

`engine/eventEngine.ts` - **pure functions**, no Vue dependency.

```mermaid
flowchart LR
  Trigger["User interaction / lifecycle"] --> TE["triggerWidgetEvent"]
  TE --> Chain["Event action chain"]
  Chain --> A1["set-value"]
  Chain --> A2["show-message"]
  Chain --> A3["navigate"]
  Chain --> A4["request"]
  Chain --> A5["open-dialog / close-dialog"]
  Chain --> A6["set-visible / set-disabled"]
  Chain --> A7["validate / reset"]
  Chain --> A8["refresh"]
  Chain --> A9["startFlow / terminateFlow"]
  Chain --> A10["linkage / emit / custom"]
```

### EventExecutionContext Injection

```typescript
{
  getFormData, setFormData,
  getVariable, setVariable,
  apiClient, navigate,
  openDialog, closeDialog,
  showMessage, ...
}
```

---

## 7. Validation Runtime (two layers)

```mermaid
flowchart TB
  subgraph design [Design-time - non-blocking]
    SV["schemaValidate.ts"]
    SV --> L1["Layer1 static structure"]
    SV --> L2["Layer2 reference integrity"]
  end

  subgraph runtime [Runtime - submit blocking]
    SF["schemaFormData.ts"]
    SF --> Req["Required validation"]
    SF --> Rules["Widget rules config"]
  end

  Toolbar["Designer validate button"] --> SV
  Submit["PublishView submit"] --> SF
```

---

## 8. Submit Flow Runtime

```mermaid
sequenceDiagram
  participant User as User
  participant WR as WidgetRenderer
  participant EE as eventEngine
  participant API as dataApi

  User->>WR: Click submit
  WR->>WR: validate()
  alt fail
    WR-->>User: field errors
  else success
    WR->>API: createSubmission(schemaId, data)
    opt submit event configured
      WR->>EE: startFlow(flowId, variables)
    end
    WR-->>User: success
  end
```

---

## 9. Save Runtime (designer)

```mermaid
flowchart TD
  Save["saveSchema"] --> Payload["Assemble JSON"]
  Payload --> API["PUT /api/schemas/:id"]
  API --> DB["MongoDB FormSchema"]
  Payload --> Thumb["Thumbnail base64"]
```

Auto-save: `useAutoSave` watches `editorStore.isDirty`, 60s debounce.

---

## 10. API Runtime Path

```
Widget/Store/Composable
        ↓
src/api/*.ts
        ↓
utils/apiClient.ts (Bearer token, retry, mock)
        ↓
server /api/*
```

| Runtime scenario | API module |
|------------|----------|
| Form submit | `dataApi.createSubmission` |
| Dict/options | `widgetApi` |
| External URL | `runtimeApi.fetchRuntimeUrl` |
| Flow trigger | `dataApi.startFlow` |
| Approval log | `flowApi` |

---

## 11. Pinia Store Runtime Participation

| Store | Design-time | Runtime (PublishView) |
|-------|--------|---------------------|
| widgetStore | ✅ | ❌ (passed as props) |
| boardStore | ✅ | ❌ |
| editorStore | ✅ | ❌ |
| appStore | Partial | ✅ formGridContext |
| apiStore | ✅ persistence | ✅ load published |

---

## 12. Constraint Quick Reference

| Constraint | Description |
|------|------|
| Widgets don't read Store | Runtime via inject |
| Published read-only API | PublishView doesn't use draft API |
| Event engine pure function | Unit-testable, context injection |
| apiClient unified exit | Components must not fetch directly |

---

## Related Docs

- [designer.md](./designer.md) - designer UI interaction
- [instances-publish.md](./instances-publish.md) - publish & embedding
- [../architecture.md](../architecture.md) - component architecture
- [../widget-development.md](../widget-development.md) - widget development
