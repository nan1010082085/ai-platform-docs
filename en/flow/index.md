# Flow

`@flow` - BPMN process designer, instance management, task inbox. Detail pages are currently in Chinese.

## Quick Start

```bash
pnpm dev:flow        # Start dev server (port 5200)
pnpm --filter @flow build
```

## Package Structure

| Package | Directory | Description |
|---|---|---|
| `@flow` | `flow/` | Vue Flow BPMN designer & management UI |
| `@schema-platform/flow-shared` | `flow-shared/` | Types, validation, FlowEngine execution |

## External Integration

- qiankun micro-frontend (sub-app `flow`)
- Editor form embedding (UserTask `formPublishId`)
- AI flow generation (WebSocket `onAiApply`)

## Documentation

### Architecture

- [Architecture Overview](/flow/architecture) - Layering, flow-shared boundary, Store

### Design & Runtime

- [Design Index](/flow/design/) - Wireframes & Mermaid diagrams
- [Information Architecture](/flow/design/overview) - Navigation, layout, Store
- [Process Designer](/flow/design/designer) - Canvas, node panel, simulation
- [Instances & Tasks](/flow/design/instances-tasks) - Approval, embedded pages
- [Runtime Architecture](/flow/design/runtime) - FlowEngine, token model, server execution
