# Flow Process Designer - Design Draft & Interaction Flow

## 1. Wireframe (FlowDesigner)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FlowToolbar                                                              │
│ [Save] [Publish] [Undo/Redo] [Validate] [Auto Layout] [Sim▶] [Export]   Flow name [___] │
├──────────┬───────────────────────────────────────────────┬───────────────┤
│ Palette  │ FlowCanvas (Vue Flow)                         │ PropertyPanel │
│ 240px    │                                               │ 320px         │
│          │  Background + Controls + MiniMap              │ label         │
│ ▼ Events │  Custom node slot × 13                        │ documentation │
│  Start/End│  AnimatedEdge                                │ nodePanel(*)  │
│ ▼ Tasks  │  snap grid                                    │ out-edge      │
│  User/Service│                                            │ conditions    │
│ ▼ Gateways│                                               │               │
│          │                                               │               │
├──────────┴───────────────────────────────────────────────┴───────────────┤
│ Optional: AI drawer (400px) | Form preview MicroFormEmbed                │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Implemented Nodes (13)

```mermaid
mindmap
  root((BPMN Panel))
    Events
      start-event
      end-event
      timer-event
    Tasks
      user-task
      service-task
      script-task
      send-task
      receive-task
      sub-process
    Gateways
      exclusive-gateway
      parallel-gateway
      inclusive-gateway
```

The `BpmnElementType` enum has 25 types total; the rest are reserved for forward compatibility.

---

## 3. Core Interaction Flows

### 3.1 Open Designer

```mermaid
sequenceDiagram
  participant List as FlowListView
  participant D as FlowDesigner
  participant API as flowApi
  participant G as flowGraphStore

  List->>D: /designer?id=definitionId
  D->>API: getFlow + getLatestVersion
  API-->>G: FlowGraph JSON
  G->>G: toVueFlowNodes/Edges
```

### 3.2 Drag to Add Node

```mermaid
flowchart TD
  Palette["FlowPalette onDragStart"] --> VF["Vue Flow onDrop"]
  VF --> Add["flowGraph.addNode(type, position)"]
  Add --> Default["DEFAULT_NODE_CONFIGS defaults"]
  Add --> Dirty["flowDesigner.markDirty"]
  Add --> History["pushHistory snapshot"]
```

### 3.3 Connect

```
onConnect -> flowGraph.addEdge
  -> gateway out-edges can configure condition / isDefault
  -> AnimatedEdge rendering
```

### 3.4 Property Editing

| Node type | Panel component |
|----------|----------|
| `user-task` | UserTaskPanel (assignees, form binding, reject policy) |
| `service-task` | ServiceTaskPanel (HTTP/API) |
| `script-task` | ScriptTaskPanel |
| `*-gateway` | GatewayConditionPanel |
| `sub-process` | SubProcessPanel |

`useNodePropertyPanel` registers the type -> panel mapping.

### 3.5 Save & Publish

```mermaid
flowchart TD
  Save["Save"] --> Graph["flowGraph.toFlowGraph()"]
  Graph --> Thumb["useFlowThumbnail"]
  Graph --> Val["validateFlow (flow-shared)"]
  Val --> API["flowApi.saveVersion"]
  Pub["Publish"] --> Save
  Pub --> PubAPI["flowApi.publishFlow"]
```

Validation failures show the error node ID list in the toolbar.

### 3.6 Auto Layout

```
useAutoLayout (dagre)
  -> recompute node positions
  -> fitView
```

### 3.7 Design / Preview Mode Toggle

| Mode | Sidebar | Canvas |
|------|------|------|
| `design` | Visible | Editable |
| `preview` | Hidden | Read-only |

---

## 4. Simulation (Design-time)

```mermaid
stateDiagram-v2
  [*] --> Idle: Design mode
  Idle --> Running: Click "Simulate"
  Running --> Step: Step forward
  Running --> AutoPlay: Auto play
  AutoPlay --> Running: Timer tick
  Step --> Completed: Reach EndEvent
  Completed --> Idle: Reset
```

**Note**: simulation does not call the server-side FlowEngine; gateway conditions are simplified.

```mermaid
flowchart LR
  Sim["useSimulation"] --> Visual["useSimulationVisual"]
  Visual --> CSS["node-running / node-completed\nedge animation classes"]
```

---

## 5. Form Preview

When a UserTask binds `formPublishId`:

```
PropertyPanel -> "Preview form"
  -> MicroFormEmbed iframe
  -> Editor /view/:publishId
  -> postMessage fg:set-mode
```

---

## 6. AI Integration

```mermaid
sequenceDiagram
  participant FD as FlowDesigner
  participant AI as AI iframe
  participant Sock as socket

  FD->>AI: Open AI drawer (source=flow)
  AI-->>Sock: flow_complete / ai:published
  Sock-->>FD: onAiApply
  FD->>FD: flowGraph merge nodes/edges
```

---

## 7. BPMN Import / Export

```
Toolbar export -> exportToBpmnXml(graph)
Toolbar import -> importFromBpmnXml -> flowGraph.load
```

Provided by `flow-shared`; validated in the designer before writing to a version.
