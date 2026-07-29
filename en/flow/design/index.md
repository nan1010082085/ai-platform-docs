# Flow Product Design Docs

> Page wireframes, interaction flows, runtime architecture - based on the current `flow/src` + `flow-shared` implementation

## Doc Index

| Doc | Scope |
|------|------|
| [Information architecture & layout](./overview.md) | routes, AppLayout, qiankun, embedded pages |
| [Process designer](./designer.md) | three-pane BPMN canvas, node panel, simulation |
| [Instances & tasks](./instances-tasks.md) | instance list, approval inbox, task actions |
| [**Runtime architecture**](./runtime.md) | FlowEngine, token model, server-side execution vs frontend visualization |

## Design Principles

1. **Design/execution separation**: `flow/` handles BPMN visual orchestration; `flow-shared/FlowEngine` executes on the server
2. **flowGraph as source of truth**: Vue Flow nodes/edges <-> `FlowGraph` JSON bidirectional serialization
3. **Simulation != runtime**: `useSimulation` is designer preview only, does not call FlowEngine
4. **Form binding to Editor**: UserTask embeds PublishView via `formPublishId` + iframe
5. **AI collaboration**: WebSocket `onAiApply` / `onAiPublished` receives AI-generated results

## Page Map

```
AppLayout (sidebar, hidden when embedded)
├── /list               FlowListView           flow definition list
├── /instances          FlowInstanceListView   flow instances
├── /instance/:id       FlowInstanceDetailView instance detail (runtime graph)
├── /tasks              TaskInboxView          my tasks
├── /monitor            FlowMonitorDashboard   flow monitor
├── /templates          FlowTemplateView       flow templates
├── /stats              FlowStatsView          statistics
│
├── /designer?id=       FlowDesigner           full-screen designer
└── /embed/*            embedded pages (Editor/Shell)
```
