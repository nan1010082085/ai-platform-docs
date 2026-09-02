# Flow Designer Documentation

> Design business processes visually with approval, automation, and sub-processes

## Quick Start

### Start Development

```bash
cd flow
pnpm install
pnpm dev
```

Open `http://localhost:5200` to start using.

### Basic Usage

1. Click "New Process"
2. Drag nodes from the panel to the canvas
3. Connect nodes to define process flow
4. Click node to configure properties
5. Save and publish the process

## Core Features

### Visual Designer

- **Drag & Drop** — Drag from node panel to canvas
- **Auto Layout** — dagre algorithm auto-arranges nodes
- **Zoom/Minimap** — Easy editing for large processes
- **Copy/Paste** — Quick copy nodes and configurations
- **Export** — Export as image or JSON
- **Validation** — Auto-check process completeness

### 25 Node Types

**Task Nodes**
- User Task — Manual processing (approval, form filling)
- Service Task — Call external services
- Script Task — Execute script logic
- Send Task — Send messages/notifications
- Receive Task — Wait for messages

**Gateway Nodes**
- Exclusive Gateway — Single path (if-else)
- Parallel Gateway — Execute multiple paths simultaneously
- Inclusive Gateway — Execute all paths that meet conditions
- Event Gateway — Select path based on events

**Event Nodes**
- Start Event — Process start
- End Event — Process end
- Timer Event — Timed trigger
- Message Event — Message trigger
- Error Event — Error handling
- Signal Event — Signal trigger

**Sub-processes**
- Embedded Sub-process — Contained in main process
- Call Activity — Call external process definition

### Approval Features

**Basic Approval Operations**
- Approve — Approval passes, flow to next node
- Reject — Reject to specified node
- Delegate — Delegate to others
- Transfer — Transfer to others
- Remind — Urge approver to process
- Withdraw — Withdraw submitted process

**Advanced Approval Features**
- Add/Remove Signer — Dynamically adjust approvers
- Batch Approval — Batch approve/reject
- Approval Comments — Add approval opinions
- Approval Log — View complete approval history
- Timeout Handling — Auto approve/transfer/notify on timeout

### Sub-process Engine

**Embedded Sub-process**
- Split complex processes into sub-processes
- Support input/output variable mapping
- Continue main process after sub-process completes

**Call Activity**
- Call other published processes
- Paginated target process selection
- Parent-child process instance association

### Process Management

- **Process Definition** — Create, edit, delete, publish processes
- **Process Instance** — View running process instances
- **Process Monitoring** — Real-time process status monitoring
- **Process Statistics** — Process run data statistics
- **Process Templates** — Save common processes as templates

### Task Inbox

- **Pending Tasks** — Tasks that need my processing
- **Completed Tasks** — Tasks I have processed
- **Batch Operations** — Batch approve/reject
- **Real-time Notifications** — Instant new task reminders

## Documentation Directory

### Architecture

- [Architecture Overview](./architecture.md) — Layering, flow-shared boundary, stores

### Design & Runtime

- [Design Doc Index](./design/)
- [Information Architecture & Layout](./design/overview.md)
- [Process Designer](./design/designer.md) — Canvas, node panel, simulation
- [Instances & Tasks](./design/instances-tasks.md) — Approval, embedded pages
- [Runtime Architecture](./design/runtime.md) — FlowEngine, token model, server-side execution

## Use Cases

### Case 1: Leave Approval Process

```
Start → Employee fills leave form → Department manager approval → [Duration check]
  ├─ ≤3 days → End
  └─ >3 days → Director approval → End
```

### Case 2: Purchase Approval Process

```
Start → Submit purchase request → Department manager approval → Purchasing dept review → [Amount check]
  ├─ ≤5000 → Finance approval → End
  └─ >5000 → General manager approval → Finance approval → End
```

### Case 3: Order Processing

```
Start → Receive order → Inventory check → [Stock check]
  ├─ In stock → Ship → End
  └─ Out of stock → Purchase process (sub-process) → Ship → End
```

## Embedded Usage

Flow Designer can be embedded in other systems:

### Embedded Pages

- `/embed/preview` — Process preview
- `/embed/approval-log` — Approval log
- `/embed/task-list` — Task list

### Integration

```javascript
// Embed process preview in Editor
<iframe src="/flow/embed/preview?flowId=xxx" />
```

## External Integration

- qiankun micro-frontend (sub-app name `flow`)
- Editor form embedding (UserTask `formPublishId`)
- AI flow generation (WebSocket `onAiApply`)

## FAQ

**Q: How to set approvers?**
A: Click the user task node, configure approvers in the property panel: specify users, specify roles, or use expressions for dynamic calculation.

**Q: Can a process be rejected to any node?**
A: Yes, select the target node in the reject dialog.

**Q: What's the difference between sub-process and call activity?**
A: Embedded sub-process is contained in the main process, call activity calls external published process definitions.

**Q: How to handle timeouts?**
A: Configure timeout duration and timeout actions (notify, auto approve, auto transfer) in node properties.

**Q: Support parallel approval?**
A: Yes, use parallel gateway to execute multiple paths simultaneously.

## Related Links

- [Flow README](../../../flow/README.md) — User guide
- [Server API Docs](../server/README.md) — Backend API
- [Deployment Guide](../../deploy/README.md) — Production deployment
