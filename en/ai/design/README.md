# AI Product Design Docs

> Page wireframes, interaction flows, **runtime architecture** - based on the current `ai/app` + `server/src/ai` implementation

## Doc Index

| Doc | Scope |
|------|------|
| [Information architecture & layout](./overview.md) | navigation, embed modes, routes, global layout |
| [AI chat](./chat.md) | Chat page, sidebar mode, LangGraph / Workflow dual backend |
| [Agent orchestration](./workflows.md) | list, designer, execution monitoring, webhook |
| [RAG knowledge base](./rag.md) | index management, retrieval testing, inline Chat RAG |
| [**Runtime architecture**](./runtime.md) | **server execution graph, data flow, checkpoint, WebSocket progress** |

## Design Principles

1. **Chat first**: Chat is the default home, single-column full-width, minimal visual noise
2. **Visual orchestration**: Workflow designer three-pane layout (panel / canvas / properties), aligned with the n8n mental model
3. **Dual-backend transparency**: users can choose LangGraph chat or a published workflow in settings; the input area UI stays consistent
4. **Embedding-friendly**: qiankun embedding hides the sub-app sidebar; communicates with editor/flow via a bridge
5. **State visibility**: WebSocket connection, streaming generation, node execution, and index coverage all have clear feedback

## Doc Types

| Type | Doc | Content |
|------|------|------|
| UI interaction | chat / workflows / rag | wireframes, user action sequences, state machines |
| Runtime | [runtime.md](./runtime.md) | server execution paths, LangGraph graph, executor loop, RAG pipeline |

## Page Map

```
AiLayout (200px sidebar, hidden when embedded)
├── /                    AiChatView          chat
├── /workflows           AgentWorkflowListView   orchestration list
├── /workflows/:id       AgentWorkflowDesignerView  full-screen designer (no sidebar)
├── /workflows/:id/executions  AgentExecutionListView
├── /executions/:id      AgentExecutionDetailView   full-screen execution detail
├── /rag                 RagKnowledgeBase    knowledge base
├── /monitor             AiMonitorView       performance monitoring
└── /sidebar             AiSidebarView       embedded drawer mode
```
