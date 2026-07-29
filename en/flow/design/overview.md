# Flow Information Architecture & Layout

## 1. App Shell

### 1.1 Standalone Mode

```
┌──────────────────────────────────────────────────────────────────────────┐
│ AppLayout                                                                │
├────────────┬─────────────────────────────────────────────────────────────┤
│ Sidebar    │  Main content                                               │
│            │                                                             │
│ Flow list  │                                                             │
│ Instances  │                                                             │
│ My tasks   │                                                             │
│ Monitor    │                                                             │
│ Templates  │                                                             │
│ Stats      │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### 1.2 Full-screen & Embedded

| Route | Layout | Use case |
|------|------|------|
| `/designer?id=` | Full-screen | BPMN designer |
| `/embed/preview` | No sidebar | Editor embedded flow preview |
| `/embed/task/:id` | No sidebar | Task approval embedded |
| `/embed/approval-log` | No sidebar | Approval log embedded |

qiankun sub-app name: `flow`, dev port **5200**.

---

## 2. Route Map

```mermaid
flowchart TB
  subgraph shell [AppLayout]
    List["/list"]
    Inst["/instances"]
    Tasks["/tasks"]
    Mon["/monitor"]
    Tpl["/templates"]
    Stats["/stats"]
  end

  subgraph full [Full-screen]
    Designer["/designer?id="]
    InstDetail["/instance/:id"]
  end

  subgraph embed [Embedded meta.embedded]
    EPrev["/embed/preview"]
    ETask["/embed/task/:id"]
    ELog["/embed/approval-log"]
  end

  List --> Designer
  Inst --> InstDetail
```

Embedded routes skip standalone auth and rely on the host token.

---

## 3. Store Relationships

```mermaid
flowchart TB
  subgraph design [Design-time]
    Graph["flowGraphStore\nnodes/edges <-> FlowGraph"]
    Designer["flowDesignerStore\nselection/undo/dirty/simulation"]
    Def["flowDefinitionStore\ndefinition CRUD/publish"]
  end

  subgraph runtime_ui [Runtime UI]
    Instance["flowInstanceStore\ninstance/task/approval"]
    Monitor["flowMonitorStore\nmonitor metrics"]
  end

  subgraph shared [Shared]
    Template["flowTemplateStore"]
    Notify["notificationStore"]
  end

  FlowDesigner --> Graph
  FlowDesigner --> Designer
  FlowListView --> Def
  TaskInboxView --> Instance
  FlowMonitorDashboard --> Monitor
```

---

## 4. flow-shared Boundary

```mermaid
flowchart LR
  subgraph flow_ui [flow frontend]
    Designer["FlowDesigner"]
    API["flowApi.ts"]
  end

  subgraph shared [flow-shared]
    Types["types/*"]
    Validator["validateFlow"]
    Engine["FlowEngine"]
    BPMN["BpmnParser/Exporter"]
  end

  subgraph server [server]
    SrvEngine["FlowEngine instance"]
    Persist["FlowPersistence"]
  end

  Designer --> Validator
  Designer --> Types
  API --> server
  server --> Engine
  Engine --> Persist
```

**The frontend does not import FlowEngine**; only `validateFlow`, types, and BPMN import/export.

---

## 5. Editor / AI Integration

| Integration | Mechanism |
|--------|------|
| Editor | UserTask `formPublishId` -> iframe PublishView |
| Editor embed | `/embed/preview` polls `getExecutionState` |
| AI | iframe drawer + `onAiApply` writes to graph |
| Shell | qiankun + shared token |

See [designer.md](./designer.md), [runtime.md](./runtime.md).
