# Flow Documentation

`@flow` - BPMN process designer, instance management, task inbox

## Quick Start

```bash
pnpm dev:flow        # Start dev server (port 5200)
pnpm --filter @flow build
```

## Package Structure

| Package | Directory | Description |
|---|---|---|
| `@flow` | `flow/` | Vue Flow BPMN designer and management UI |
| `@schema-platform/flow-shared` | `flow-shared/` | Types, validation, FlowEngine execution engine |

## External Integration

- qiankun micro-frontend (sub-app name `flow`)
- Editor form embedding (UserTask `formPublishId`)
- AI flow generation (WebSocket `onAiApply`)

## Doc Directory

### Architecture

- [Architecture overview](./architecture.md) - layering, flow-shared boundary, stores

### Design & Runtime (wireframes & Mermaid)

- [Design doc index](./design/)
- [Information architecture & layout](./design/overview.md)
- [Process designer](./design/designer.md) - canvas, node panel, simulation
- [Instances & tasks](./design/instances-tasks.md) - approval, embedded pages
- [Runtime architecture](./design/runtime.md) - FlowEngine, token model, server-side execution
