# Flow 信息架构与布局

## 一、应用壳层

### 1.1 独立模式

```
┌──────────────────────────────────────────────────────────────────────────┐
│ AppLayout                                                                │
├────────────┬─────────────────────────────────────────────────────────────┤
│ 侧栏       │  主内容区                                                    │
│            │                                                             │
│ 流程列表   │                                                             │
│ 流程实例   │                                                             │
│ 我的任务   │                                                             │
│ 流程监控   │                                                             │
│ 流程模板   │                                                             │
│ 流程统计   │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### 1.2 全屏与嵌入

| 路由 | 布局 | 用途 |
|------|------|------|
| `/designer?id=` | 全屏 | BPMN 设计器 |
| `/embed/preview` | 无侧栏 | Editor 嵌入流程预览 |
| `/embed/task/:id` | 无侧栏 | 任务审批嵌入 |
| `/embed/approval-log` | 无侧栏 | 审批日志嵌入 |

qiankun 子应用名：`flow`，开发端口 **5200**。

---

## 二、路由图

```mermaid
flowchart TB
  subgraph shell [AppLayout]
    List["/list"]
    Inst["/instances"]
    Tasks["/tasks"]
    Mon["/monitor"]
    Tpl["/templates"]
    Stats["/stats"]
  end

  subgraph full [全屏]
    Designer["/designer?id="]
    InstDetail["/instance/:id"]
  end

  subgraph embed [嵌入 meta.embedded]
    EPrev["/embed/preview"]
    ETask["/embed/task/:id"]
    ELog["/embed/approval-log"]
  end

  List --> Designer
  Inst --> InstDetail
```

嵌入路由跳过独立鉴权，依赖宿主 token。

---

## 三、Store 关系

```mermaid
flowchart TB
  subgraph design [设计时]
    Graph["flowGraphStore\nnodes/edges ↔ FlowGraph"]
    Designer["flowDesignerStore\n选中/undo/dirty/模拟"]
    Def["flowDefinitionStore\n定义 CRUD/发布"]
  end

  subgraph runtime_ui [运行时 UI]
    Instance["flowInstanceStore\n实例/任务/审批"]
    Monitor["flowMonitorStore\n监控指标"]
  end

  subgraph shared [共享]
    Template["flowTemplateStore"]
    Notify["notificationStore"]
  end

  FlowDesigner --> Graph
  FlowDesigner --> Designer
  FlowListView --> Def
  TaskInboxView --> Instance
  FlowMonitorDashboard --> Monitor
```

---

## 四、flow-shared 边界

```mermaid
flowchart LR
  subgraph flow_ui [flow 前端]
    Designer["FlowDesigner"]
    API["flowApi.ts"]
  end

  subgraph shared [flow-shared]
    Types["types/*"]
    Validator["validateFlow"]
    Engine["FlowEngine"]
    BPMN["BpmnParser/Exporter"]
  end

  subgraph server [server]
    SrvEngine["FlowEngine 实例"]
    Persist["FlowPersistence"]
  end

  Designer --> Validator
  Designer --> Types
  API --> server
  server --> Engine
  Engine --> Persist
```

**前端不 import FlowEngine**；仅 `validateFlow`、类型、BPMN 导入导出。

---

## 五、与 Editor / AI 集成

| 集成方 | 机制 |
|--------|------|
| Editor | UserTask `formPublishId` → iframe PublishView |
| Editor 嵌入 | `/embed/preview` 轮询 `getExecutionState` |
| AI | iframe 抽屉 + `onAiApply` 写入 graph |
| Shell | qiankun + 共享 token |

详见 [designer.md](./designer.md)、[runtime.md](./runtime.md)。
