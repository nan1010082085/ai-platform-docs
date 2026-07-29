# Flow Runtime Architecture

> FlowEngine token model, server-side execution, frontend visualization - the design-time vs runtime boundary

---

## 1. Runtime Overview

```mermaid
flowchart TB
  subgraph design [Design-time - flow frontend]
    Designer["FlowDesigner"]
    Graph["flowGraphStore"]
    Val["validateFlow"]
    Sim["useSimulation"]
  end

  subgraph api [API Layer]
    FlowAPI["flowApi.ts"]
  end

  subgraph server [server]
    Routes["flow routes"]
    Engine["FlowEngine"]
    Persist["FlowPersistence"]
  end

  subgraph shared [flow-shared]
    Parser["BpmnParser -> ExecutableModel"]
    Executors["NodeExecutors"]
    Expr["ExpressionEvaluator"]
    Cross["CrossNodeResolver"]
  end

  subgraph runtime_ui [Runtime UI - flow frontend]
    Detail["FlowInstanceDetailView"]
    Inbox["TaskInboxView"]
    Embed["embed/preview"]
  end

  Designer --> Graph
  Graph --> Val
  Designer --> FlowAPI
  FlowAPI --> Routes
  Routes --> Engine
  Engine --> Parser
  Engine --> Executors
  Engine --> Persist
  Executors --> Expr

  Detail --> FlowAPI
  Inbox --> FlowAPI
  Embed --> FlowAPI

  Sim -.->|does not call| Engine
```

**Core principle**: `FlowEngine` runs only on the **server**; the frontend drives it via REST and visualizes state.

---

## 2. Design-time vs Runtime

| Dimension | Design-time | Runtime |
|------|--------|--------|
| Engine | `validateFlow` (client) | `FlowEngine` (server) |
| State | `flowGraph` nodes/edges | `FlowInstanceData` + tokens |
| Persistence | `FlowVersion.graph` | `FlowInstance` + `TaskInstance` |
| Simulation | `useSimulation` (simplified) | none (use real API) |
| Form | MicroFormEmbed preview | task form iframe |

---

## 3. FlowEngine Execution Model

### 3.1 Token State Machine

```mermaid
stateDiagram-v2
  [*] --> active: StartEvent creates token
  active --> waiting: UserTask creates pending task
  waiting --> active: completeTask approval done
  active --> completed: node execution finished
  active --> failed: execution error
  completed --> [*]: EndEvent no successor
```

```typescript
interface FlowToken {
  id: string
  nodeId: string
  status: 'active' | 'waiting' | 'completed' | 'failed'
}
```

### 3.2 Start Instance

```mermaid
sequenceDiagram
  participant UI as flow frontend
  participant API as server routes
  participant FE as FlowEngine
  participant DB as MongoDB

  UI->>API: POST startInstance { definitionId, variables }
  API->>DB: load FlowGraph (latest published version)
  API->>FE: startInstance(graph, variables, operator)
  FE->>FE: parseBpmnGraph()
  FE->>FE: validateFlow()
  FE->>DB: create FlowInstanceData + tokens
  FE->>FE: executeNode(startEvent)
  loop until wait/complete/error
    FE->>FE: node executor
    FE->>DB: update tokens / create Task
  end
  API-->>UI: { instanceId, status }
```

### 3.3 Node Executors

| BPMN type | Executor | Result |
|-----------|--------|------|
| StartEvent | StartEventExecutor | `continue` |
| EndEvent | EndEventExecutor | `complete` |
| UserTask | UserTaskExecutor | `wait` + Task |
| ExclusiveGateway | ExclusiveGatewayExecutor | conditional edge selection |
| ParallelGateway | ParallelGatewayExecutor | multiple tokens |
| ServiceTask | ServiceTaskExecutor | HTTP call |
| ScriptTask | ScriptTaskExecutor | expression execution |
| TimerEvent | TimerEventExecutor | timer/delay |
| SubProcess | SubProcessExecutor | sub-process |
| CallActivity | CallActivityExecutor | call external definition |

```mermaid
flowchart TD
  Exec["executeNode(nodeId)"] --> Find["ExecutableModel.getNode"]
  Find --> Run["executor.execute()"]
  Run --> Result{action}
  Result -->|continue| Next["advance token to nextNodeIds"]
  Result -->|wait| Task["create TaskInstance\nstatus=waiting"]
  Result -->|complete| End["flow ended"]
  Result -->|error| Fail["instance failed"]
  Next --> Exec
```

### 3.4 ExecutionContext

```typescript
interface ExecutionContext {
  instanceId: string
  variables: Record<string, unknown>      // process variables
  nodeFormData: Record<string, Record>      // nodeId -> form data
  operator?: string
  initiator?: string
}
```

Production uses the `variables` object; `VariableBus` exists only in test helpers.

---

## 4. UserTask Runtime

```mermaid
sequenceDiagram
  participant Engine as FlowEngine
  participant DB as MongoDB
  participant UI as TaskInboxView
  participant Form as MicroFormEmbed
  participant Ed as Editor PublishView

  Engine->>DB: createTask(userTask node)
  Note over DB: TaskInstance status=pending
  UI->>DB: getMyTasks()
  UI->>Form: load formPublishId
  Form->>Ed: iframe /view/:publishId
  Ed-->>Form: fg:get-data
  UI->>Engine: completeTask(taskId, action, formData)
  Engine->>Engine: merge nodeFormData + variables
  Engine->>Engine: advance token
```

### Approval Action Runtime

| action | Engine behavior |
|--------|----------|
| approve | complete token, flow downstream |
| reject | `rejectToNode` roll back to specified node |
| delegate | change assignee, keep waiting |
| transfer | permanently change assignee |

---

## 5. Gateway Runtime

### ExclusiveGateway

```
evaluateExpression(condition, variables)
  -> pick first outgoing edge that satisfies
  -> if no match, use isDefault edge
```

### ParallelGateway

```
fork: create a token for each outgoing edge
join: wait for all incoming tokens to arrive, then merge
```

### InclusiveGateway

```
all satisfying outgoing edges get tokens (OR semantics)
```

**Designer simulation** simplifies the above and does not evaluate real expressions.

---

## 6. Expression Runtime

`ExpressionEvaluator.evaluateExpression()`:

```mermaid
flowchart LR
  Expr["${amount > 1000}"] --> Parse["parse AST"]
  Parse --> Vars["inject variables + nodeFormData"]
  Vars --> Result["boolean / string / number"]
```

Used in: gateway conditions, assignee expressions, ScriptTask, ServiceTask param templates.

---

## 7. Cross-node Data Runtime

```mermaid
flowchart TD
  Ref["{{applyNode.amount}}"] --> Collect["collectReferencedNodeIds"]
  Collect --> Load["nodeFormData[nodeId]"]
  Load --> Resolve["resolveCrossNodeValues"]
  Resolve --> Target["prefill target form / API body"]
```

- **Server**: `CrossNodeResolver` (flow-shared)
- **Frontend**: `useCrossNodeData` + `getUpstreamNodeData` API

---

## 8. Frontend Visualization Runtime

### 8.1 Instance Graph State API

```mermaid
sequenceDiagram
  participant View as FlowInstanceDetailView
  participant API as flowApi

  loop poll (running instance)
    View->>API: getInstanceGraph(id)
    View->>API: getExecutionState(id)
    API-->>View: { activeNodeIds, completedNodeIds, tokens }
    View->>View: apply node/edge CSS classes
  end
```

### 8.2 edgeRuntimeState

```
source completed + target active -> edge animated
node error -> edge error style
```

---

## 9. ServiceTask Runtime

```mermaid
sequenceDiagram
  participant Engine as FlowEngine
  participant HTTP as external API
  participant Vars as variables

  Engine->>Engine: resolve apiConfig URL/body template
  Engine->>Vars: replace {{variable}}
  Engine->>HTTP: fetch(method, url, body)
  HTTP-->>Engine: response
  Engine->>Vars: write responseMapping fields
  Engine->>Engine: continue downstream
```

Design-time: `flowRequestQueue` prefetches API for designer preview (with TTL cache).

---

## 10. Monitor Runtime

```mermaid
flowchart LR
  Engine["FlowEngine execution"] -.->|writes metrics| Metrics["AgentMetric / FlowStats"]
  MonUI["FlowMonitorDashboard"] --> API["getMonitorStats/Trend/..."]
  API --> Metrics
  MonUI -->|30s refresh| API
```

Monitoring data is decoupled from instance execution; used for aggregate stats.

---

## 11. AI Runtime Integration

```mermaid
flowchart LR
  AI["AI Flow Agent"] -->|update_flow tool| Server["server saves graph"]
  Server --> Designer["FlowDesigner onAiApply"]
  RuntimeAI["RuntimeAgent (ai-shared)"] -.->|approval advice| Engine
```

`RuntimeAgent` is called back by the engine via `onAIAssist` (when configured server-side).

---

## 12. Constraint Quick Reference

| Constraint | Description |
|------|------|
| Frontend does not import FlowEngine | server + flow-shared tests only |
| Simulation != execution | useSimulation does not call API |
| Published version executes | startInstance uses latest published |
| validateFlow both ends | before designer save + before engine start |
| 13/25 nodes | 13 UI types, engine executors extensible |

---

## Related Docs

- [designer.md](./designer.md) - designer interaction & simulation
- [instances-tasks.md](./instances-tasks.md) - task processing UI
- [../architecture.md](../architecture.md) - project architecture
- [../../flow-shared/src/engine/FlowEngine.ts](../../flow-shared/src/engine/FlowEngine.ts) - engine source
