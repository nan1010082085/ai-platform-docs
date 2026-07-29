# Flow Instances & Tasks - Design Draft & Interaction Flow

## 1. Flow List (FlowListView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Flow definitions                        [+ New] [From Template]          │
├──────────────────────────────────────────────────────────────────────────┤
│  Name          Status     Version   Actions                             │
│  Leave approval Published  v3       [Design] [Instances] [Publish] [Delete] │
│  Purchase req   Draft      v1       [Design] ...                        │
└──────────────────────────────────────────────────────────────────────────┘
```

```mermaid
flowchart LR
  Design["Design"] --> Designer["/designer?id="]
  Start["Start instance"] --> Dialog["Fill variables"]
  Dialog --> API["startInstance"]
  API --> Detail["/instance/:id"]
```

---

## 2. Instance Detail Wireframe (FlowInstanceDetailView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Back │ Leave approval #12345  ● Running  │ [Terminate] [Suspend] [Recall] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FlowGraphPreview (Vue Flow read-only)                                  │
│   Node colors: completed(green) / active(blue) / waiting(orange)         │
│   Edge animation: edgeRuntimeState                                       │
│                                                                          │
├──────────────────────────────┬───────────────────────────────────────────┤
│ Approval log Timeline        │ Process variables JSON                    │
│ Node duration                │ Refresh button                            │
└──────────────────────────────┴───────────────────────────────────────────┘
```

### Runtime Graph Polling

```mermaid
sequenceDiagram
  participant View as FlowInstanceDetailView
  participant API as flowApi

  loop every N seconds (while running)
    View->>API: getInstanceGraph(instanceId)
    View->>API: getExecutionState(instanceId)
    API-->>View: activeNodeIds, completedNodeIds
    View->>View: update node/edge CSS state
  end
```

**The frontend does not execute FlowEngine** - state comes entirely from server APIs.

---

## 3. Task Inbox (TaskInboxView)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ My tasks                   [Batch Approve] [Batch Reject]                │
├──────────────────────────────────────────────────────────────────────────┤
│  Tabs: [Pending] [Done] [Initiated by me]                                │
├──────────────────────────────────────────────────────────────────────────┤
│  ☐ Leave request - Manager approval  Initiator: Zhang   2h ago   [Handle]│
│  ☐ Purchase order - Finance review   Initiator: Li      yesterday [Handle]│
└──────────────────────────────────────────────────────────────────────────┘
```

### Task Processing Flow

```mermaid
sequenceDiagram
  actor User as Approver
  participant Inbox as TaskInboxView
  participant Form as FlowFormRenderer
  participant API as flowApi

  User->>Inbox: Click "Handle"
  Inbox->>Inbox: Open task drawer/page
  Inbox->>Form: MicroFormEmbed (formPublishId)
  Form->>Form: postMessage load form
  User->>Form: Fill approval comment
  User->>Inbox: Approve / Reject
  Inbox->>API: completeTask / rejectToNode
  API-->>Inbox: Refresh task list
```

### Approval Action Matrix

| Action | API | Scenario |
|------|-----|------|
| Approve | `completeTask` | Standard approval |
| Reject | `rejectToNode` | Select reject target node |
| Delegate | `delegateTask` | Assign to someone else temporarily |
| Transfer | `transferTask` | Permanent transfer |
| Add approver | `addApprover` | Add an approver |
| Remove approver | `removeApprover` | Remove an approver |
| Urge | `urgeTask` | Notify pending approver |
| Batch | `batchApprove` / `batchReject` | Multi-select operation |

---

## 4. Cross-node Data

UserTask forms can reference upstream node fields `{{nodeId.field}}`:

```mermaid
flowchart LR
  Task["Process task"] --> Cross["useCrossNodeData"]
  Cross --> API["getUpstreamNodeData"]
  API --> Resolve["resolveCrossNodeValues (flow-shared)"]
  Resolve --> Form["Prefill MicroFormEmbed"]
```

---

## 5. Embedded Pages (Editor / Shell)

| Route | Use case |
|------|------|
| `/embed/preview` | Flow instance graph embedded preview |
| `/embed/task/:taskId` | Single task approval embedded |
| `/embed/approval-log` | Approval log embedded |
| `/embed/task-list` | Task list embedded |

```mermaid
sequenceDiagram
  participant Editor as Editor host
  participant Embed as /embed/preview
  participant API as flowApi

  Editor->>Embed: iframe + instanceId
  loop poll
    Embed->>API: getExecutionState
  end
  Embed-->>Editor: node state visualization
```

---

## 6. Flow Templates

```mermaid
flowchart TD
  TplList["FlowTemplateView"] --> Apply["applyTemplate"]
  Apply --> NewDef["Create new flow definition + graph"]
  TplList --> SaveAs["saveAsTemplate"]
  SaveAs --> Store["flowTemplateStore"]
```

Built-in templates can be initialized via the `seedBuiltinTemplates` API.
