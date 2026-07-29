# Editor Instances & Publish - Design Draft & Interaction Flow

## 1. Instance List Wireframe (InstancesView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Form instances                        [+ New] [Import] [Export]           │
├──────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search...    Filter: [All▾] [Draft] [Published]                       │
├──────────────────────────────────────────────────────────────────────────┤
│  Name            Status    Updated        Actions                       │
│  User Register   Published 2h ago    [Design][Preview][Publish][Version][Delete]│
│  Leave Request   Draft     yesterday [Design][Preview][Publish] ...     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. List Action Flow

```mermaid
flowchart TD
  subgraph actions [Row actions]
    Design["Design -> /editor?id="]
    Preview["Preview -> /preview?id="]
    Publish["Publish -> publishSchema API"]
    Version["Version -> VersionHistoryDialog"]
    Delete["Delete -> confirmDanger"]
  end

  subgraph create [New]
    New["New dialog"] --> Template["Select board template"]
    Template --> Board["boardTemplates init canvas"]
    Board --> Editor["Jump to /editor without id"]
  end
```

### Publish (from list)

```mermaid
sequenceDiagram
  participant List as InstancesView
  participant API as schemaApi
  List->>API: publishSchema(schemaId)
  API-->>List: publishId, status=published
  List->>List: refresh list status
```

---

## 3. Publish Runtime Wireframe (PublishView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Optional top bar] Form title                           mode: edit/view  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                    WidgetRenderer (runtime surface)                      │
│                    Form field render + linkage + validation              │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ [Submit] [Reset]                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Access

| URL | Load API |
|-----|----------|
| `/view/:schemaCode` | `fetchPublishedByCode` |
| `/view?id=publishId` | `fetchPublishedByPublishId` |

---

## 4. postMessage Embedding Protocol

External hosts (Flow UserTask, micro-app container) embed PublishView via iframe:

```mermaid
sequenceDiagram
  participant Host as Host (Flow)
  participant Iframe as PublishView
  participant WR as WidgetRenderer

  Host->>Iframe: fg:set-mode { mode: edit|view }
  Host->>Iframe: fg:set-context { variables }
  Host->>Iframe: fg:set-data { field: value }
  Host->>Iframe: fg:set-schema (optional override)

  Host->>Iframe: fg:get-data
  Iframe->>WR: getData()
  Iframe-->>Host: { data }

  Host->>Iframe: fg:validate
  Iframe->>WR: validate()
  Iframe-->>Host: { valid, errors }

  Host->>Iframe: fg:submit
  Iframe->>WR: submit -> createSubmission API
  Iframe-->>Host: { success, submissionId }
```

| Message | Direction | Description |
|------|------|------|
| `fg:set-mode` | Host -> Editor | Edit/read-only/partial-edit |
| `fg:set-context` | Host -> Editor | Inject process variables |
| `fg:set-data` | Host -> Editor | Prefill form data |
| `fg:get-data` | Host -> Editor | Read current form values |
| `fg:validate` | Host -> Editor | Trigger field validation |
| `fg:submit` | Host -> Editor | Submit to server |
| `fg:reset` | Host -> Editor | Reset form |

Implementation: `editor/src/microapp/bridge.ts` + `PublishView.vue`.

---

## 5. Draft Preview (PreviewRenderView)

```mermaid
flowchart LR
  Open["/preview?id="] --> Fetch["fetchSchemaById"]
  Fetch --> Parse["parseSchemaJson"]
  Parse --> Render["WidgetRenderer layout=absolute"]
```

Difference from PublishView: loads the **draft** API; no submit/publish constraints.

---

## 6. Version Management

```mermaid
flowchart TD
  Open["VersionHistoryDialog"] --> List["listVersions(schemaId)"]
  List --> Actions{Action}
  Actions --> View["View snapshot (read-only)"]
  Actions --> Rollback["Roll back to version -> load into designer"]
  Actions --> PubVer["Publish specific version"]
  Actions --> Compare["VersionCompare diff"]
```

Query params `?editId=&version=` open a historical version directly for editing.

---

## 7. Submit Flow (runtime)

```mermaid
sequenceDiagram
  participant User as End user
  participant PV as PublishView
  participant WR as WidgetRenderer
  participant API as dataApi

  User->>PV: Fill and submit
  PV->>WR: validate()
  alt validation fails
    WR-->>User: field errors
  else pass
    PV->>WR: getData()
    PV->>API: createSubmission(schemaId, data)
    API-->>User: success message
  end
```

Optional: the event engine `submit` action triggers `startFlow` to start an associated flow.
