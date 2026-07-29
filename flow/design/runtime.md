# Flow 运行时架构

> FlowEngine Token 模型、服务端执行、前端可视化 — 设计时 vs 运行时的边界

---

## 一、运行时总览

```mermaid
flowchart TB
  subgraph design [设计时 — flow 前端]
    Designer["FlowDesigner"]
    Graph["flowGraphStore"]
    Val["validateFlow"]
    Sim["useSimulation"]
  end

  subgraph api [API 层]
    FlowAPI["flowApi.ts"]
  end

  subgraph server [server]
    Routes["flow routes"]
    Engine["FlowEngine"]
    Persist["FlowPersistence"]
  end

  subgraph shared [flow-shared]
    Parser["BpmnParser → ExecutableModel"]
    Executors["NodeExecutors"]
    Expr["ExpressionEvaluator"]
    Cross["CrossNodeResolver"]
  end

  subgraph runtime_ui [运行时 UI — flow 前端]
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

  Sim -.->|不调用| Engine
```

**核心原则**：`FlowEngine` 仅在 **server** 运行；前端通过 REST 驱动并可视化状态。

---

## 二、设计时 vs 运行时

| 维度 | 设计时 | 运行时 |
|------|--------|--------|
| 引擎 | `validateFlow`（客户端） | `FlowEngine`（服务端） |
| 状态 | `flowGraph` nodes/edges | `FlowInstanceData` + tokens |
| 持久化 | `FlowVersion.graph` | `FlowInstance` + `TaskInstance` |
| 模拟 | `useSimulation`（简化逻辑） | 无（用真实 API） |
| 表单 | MicroFormEmbed 预览 | 任务办理 iframe |

---

## 三、FlowEngine 执行模型

### 3.1 Token 状态机

```mermaid
stateDiagram-v2
  [*] --> active: StartEvent 产生 token
  active --> waiting: UserTask 创建待办
  waiting --> active: completeTask 审批完成
  active --> completed: 节点执行完毕
  active --> failed: 执行错误
  completed --> [*]: EndEvent 无后继
```

```typescript
interface FlowToken {
  id: string
  nodeId: string
  status: 'active' | 'waiting' | 'completed' | 'failed'
}
```

### 3.2 启动实例

```mermaid
sequenceDiagram
  participant UI as flow 前端
  participant API as server routes
  participant FE as FlowEngine
  participant DB as MongoDB

  UI->>API: POST startInstance { definitionId, variables }
  API->>DB: 加载 FlowGraph (最新已发布版本)
  API->>FE: startInstance(graph, variables, operator)
  FE->>FE: parseBpmnGraph()
  FE->>FE: validateFlow()
  FE->>DB: 创建 FlowInstanceData + tokens
  FE->>FE: executeNode(startEvent)
  loop 直到 wait/complete/error
    FE->>FE: 节点执行器
    FE->>DB: 更新 tokens / 创建 Task
  end
  API-->>UI: { instanceId, status }
```

### 3.3 节点执行器

| BPMN 类型 | 执行器 | 结果 |
|-----------|--------|------|
| StartEvent | StartEventExecutor | `continue` |
| EndEvent | EndEventExecutor | `complete` |
| UserTask | UserTaskExecutor | `wait` + Task |
| ExclusiveGateway | ExclusiveGatewayExecutor | 条件选边 |
| ParallelGateway | ParallelGatewayExecutor | 多 token |
| ServiceTask | ServiceTaskExecutor | HTTP 调用 |
| ScriptTask | ScriptTaskExecutor | 表达式执行 |
| TimerEvent | TimerEventExecutor | 定时/延迟 |
| SubProcess | SubProcessExecutor | 子流程 |
| CallActivity | CallActivityExecutor | 调用外部定义 |

```mermaid
flowchart TD
  Exec["executeNode(nodeId)"] --> Find["ExecutableModel.getNode"]
  Find --> Run["executor.execute()"]
  Run --> Result{action}
  Result -->|continue| Next["推进 token 到 nextNodeIds"]
  Result -->|wait| Task["创建 TaskInstance\nstatus=waiting"]
  Result -->|complete| End["流程结束"]
  Result -->|error| Fail["实例 failed"]
  Next --> Exec
```

### 3.4 ExecutionContext

```typescript
interface ExecutionContext {
  instanceId: string
  variables: Record<string, unknown>      // 流程变量
  nodeFormData: Record<string, Record>      // nodeId → 表单数据
  operator?: string
  initiator?: string
}
```

生产环境使用 `variables` 对象；`VariableBus` 仅存在于测试辅助。

---

## 四、UserTask 运行时

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
  UI->>Form: 加载 formPublishId
  Form->>Ed: iframe /view/:publishId
  Ed-->>Form: fg:get-data
  UI->>Engine: completeTask(taskId, action, formData)
  Engine->>Engine: 合并 nodeFormData + variables
  Engine->>Engine: 推进 token
```

### 审批动作运行时

| action | 引擎行为 |
|--------|----------|
| approve | 完成 token，流转下游 |
| reject | `rejectToNode` 回退到指定节点 |
| delegate | 变更 assignee，保持 waiting |
| transfer | 永久变更 assignee |

---

## 五、网关运行时

### ExclusiveGateway

```
evaluateExpression(condition, variables)
  → 选第一条满足条件的出边
  → 无匹配时用 isDefault 边
```

### ParallelGateway

```
fork: 为每条出边创建 token
join: 等待所有入边 token 到齐后合并
```

### InclusiveGateway

```
满足条件的出边均创建 token（OR 语义）
```

**设计器模拟**简化上述逻辑，不执行真实表达式。

---

## 六、表达式运行时

`ExpressionEvaluator.evaluateExpression()`：

```mermaid
flowchart LR
  Expr["${amount > 1000}"] --> Parse["解析 AST"]
  Parse --> Vars["注入 variables + nodeFormData"]
  Vars --> Result["boolean / string / number"]
```

用于：网关条件、审批人表达式、ScriptTask、ServiceTask 参数模板。

---

## 七、跨节点数据运行时

```mermaid
flowchart TD
  Ref["{{applyNode.amount}}"] --> Collect["collectReferencedNodeIds"]
  Collect --> Load["nodeFormData[nodeId]"]
  Load --> Resolve["resolveCrossNodeValues"]
  Resolve --> Target["预填目标表单 / API body"]
```

- **服务端**：`CrossNodeResolver`（flow-shared）
- **前端**：`useCrossNodeData` + `getUpstreamNodeData` API

---

## 八、前端可视化运行时

### 8.1 实例图状态 API

```mermaid
sequenceDiagram
  participant View as FlowInstanceDetailView
  participant API as flowApi

  loop 轮询（运行中实例）
    View->>API: getInstanceGraph(id)
    View->>API: getExecutionState(id)
    API-->>View: { activeNodeIds, completedNodeIds, tokens }
    View->>View: apply node/edge CSS classes
  end
```

### 8.2 edgeRuntimeState

```
源节点 completed + 目标 active → 边 animated
节点 error → 边 error 样式
```

---

## 九、ServiceTask 运行时

```mermaid
sequenceDiagram
  participant Engine as FlowEngine
  participant HTTP as 外部 API
  participant Vars as variables

  Engine->>Engine: 解析 apiConfig URL/body 模板
  Engine->>Vars: 替换 {{variable}}
  Engine->>HTTP: fetch(method, url, body)
  HTTP-->>Engine: response
  Engine->>Vars: 写入 responseMapping 字段
  Engine->>Engine: continue 下游
```

设计时：`flowRequestQueue` 预取 API 用于设计器预览（带 TTL 缓存）。

---

## 十、监控运行时

```mermaid
flowchart LR
  Engine["FlowEngine 执行"] -.->|写入指标| Metrics["AgentMetric / FlowStats"]
  MonUI["FlowMonitorDashboard"] --> API["getMonitorStats/Trend/..."]
  API --> Metrics
  MonUI -->|30s 刷新| API
```

监控数据与实例执行解耦，聚合统计用。

---

## 十一、AI 运行时集成

```mermaid
flowchart LR
  AI["AI Flow Agent"] -->|update_flow tool| Server["server 保存 graph"]
  Server --> Designer["FlowDesigner onAiApply"]
  RuntimeAI["RuntimeAgent (ai-shared)"] -.->|审批建议| Engine
```

`RuntimeAgent` 供引擎回调 `onAIAssist`（服务端配置时）。

---

## 十二、约束速查

| 约束 | 说明 |
|------|------|
| 前端不 import FlowEngine | 仅 server + flow-shared 测试 |
| 模拟 ≠ 执行 | useSimulation 不走 API |
| 已发布版本执行 | startInstance 用 latest published |
| validateFlow 双端 | 设计器保存前 + 引擎启动前 |
| 13/25 节点 | UI 13 种，引擎可扩展执行器 |

---

## 相关文档

- [designer.md](./designer.md) — 设计器交互与模拟
- [instances-tasks.md](./instances-tasks.md) — 任务办理 UI
- [../architecture.md](../architecture.md) — 项目架构
- [../../flow-shared/src/engine/FlowEngine.ts](../../flow-shared/src/engine/FlowEngine.ts) — 引擎源码
