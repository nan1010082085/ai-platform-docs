---
title: Changelog
---

# Flow Designer · Changelog

> Records major iterations of the flow designer (BPMN orchestration + instance/task management).

## 2026-06-27 · v1.0.2

- Production base path fix: `micro/flow/` -> `child/flow/`
- Stores (flowDefinition / flowTemplate / flowMonitor) unified to the `useDataLoading` pattern
- `.env.production` path sync fix
- Test fixes: 383 tests passing (+131)

## Architecture Baseline

- **`@flow`**: Vue Flow BPMN designer + management UI
- **`@schema-platform/flow-shared`**: types, validation, FlowEngine execution layer
- **qiankun sub-app**: sub-app `flow`
- **Editor form embedding**: UserTask links a published form via `formPublishId`
- **AI flow generation**: WebSocket `onAiApply`

## Capabilities

- BPMN visual designer (canvas, node panel, flow simulation)
- Process instance + task inbox
- FlowEngine runtime + server-side execution
- Approval reuse / embedded page integration
