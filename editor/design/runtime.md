# Editor 运行时架构

> WidgetRenderer、事件引擎、联动、校验 — 设计时 vs 运行时的执行路径

---

## 一、运行时总览

```mermaid
flowchart TB
  subgraph surfaces [运行表面]
    Pub["PublishView\n/view/:code"]
    Prev["PreviewRenderView\n/preview"]
    EdPrev["EditorView preview mode"]
  end

  subgraph renderer [WidgetRenderer]
    WR["index.vue"]
    Link["useLinkage"]
    Form["useFormData"]
    Life["useLifecycle"]
    Event["triggerWidgetEvent"]
  end

  subgraph engine [纯逻辑引擎]
    EE["engine/eventEngine.ts"]
    Expr["utils/expression"]
  end

  subgraph server [server API]
    Schema["Schema 已发布 JSON"]
    Sub["createSubmission"]
    Flow["startFlow / terminateFlow"]
    RuntimeURL["runtimeApi 外部 URL"]
  end

  Pub --> WR
  Prev --> WR
  EdPrev --> SchemaRender

  WR --> Link
  WR --> Form
  WR --> Event
  Event --> EE
  EE --> Sub
  EE --> Flow
  EE --> RuntimeURL

  Schema --> Pub
```

---

## 二、Surface 契约

| Surface | `WIDGET_SURFACE_KEY` | Mock 数据 | 用途 |
|---------|---------------------|-----------|------|
| 设计器画布 | `'editor'` | ✅ `mock.ts` | 拖拽编排 |
| 运行时 | `'runtime'` | ❌ | 真实用户填表 |

Widget 组件通过 `inject(widgetDataKey)` 获取数据，**禁止**直接读 Pinia Store。

---

## 三、Schema 加载运行时

```mermaid
sequenceDiagram
  participant View as PublishView
  participant API as schemaApi
  participant Parse as parseSchemaJson
  participant WR as WidgetRenderer

  View->>API: fetchPublishedByCode(code)
  API-->>View: { json, canvasConfig, variables }
  View->>Parse: 解析 widgets + board
  View->>WR: props: widgets, variables, canvas
  WR->>WR: provide 上下文 keys
  WR->>WR: 渲染 Widget 树
```

### Schema JSON 格式

```typescript
{
  widgets: Widget[],           // 部件树
  board: {
    canvas: { width, height, layoutMode, zoom, ... },
    variables: BoardVariable[],
    events: BoardEvent[],      // 页面级事件
  }
}
```

`parseSchemaJson` 兼容旧格式（纯 `Widget[]` 数组）。

---

## 四、WidgetRenderer 运行时

### 4.1 Provide / Inject 键

```mermaid
flowchart TB
  WR["WidgetRenderer"]
  WR --> Ctx["formGridContext / appStore"]
  WR --> LinkCtx["linkage context"]
  WR --> Dialog["DIALOG_REGISTRY_KEY"]
  WR --> EventCtx["EVENT_CONTEXT_KEY"]
  WR --> Surface["WIDGET_SURFACE_KEY=runtime"]

  Widget["FgXxx.vue"] --> Inject["inject widgetDataKey"]
  Widget --> Trigger["triggerWidgetEvent"]
```

### 4.2 暴露 API（供 PublishView / postMessage）

| 方法 | 说明 |
|------|------|
| `getData()` | 收集所有字段值 |
| `setData(data)` | 批量赋值 |
| `validate()` | 字段级校验 |
| `submit()` | 校验 + 提交 |
| `reset()` | 重置表单 |

---

## 五、联动运行时（useLinkage）

```mermaid
flowchart TD
  Change["字段值变化"] --> Watch["watchFields 依赖图"]
  Watch --> Eval["表达式求值\nvisible/disabled/required/options"]
  Eval --> Apply["更新目标 Widget props"]
  Watch --> Cycle{"环检测"}
  Cycle -->|有环| Error["控制台警告，跳过"]
```

联动配置来自 Widget `config.linkage` 或 LinkageSchemaDialog。

---

## 六、事件引擎运行时

`engine/eventEngine.ts` — **纯函数**，无 Vue 依赖。

```mermaid
flowchart LR
  Trigger["用户交互 / 生命周期"] --> TE["triggerWidgetEvent"]
  TE --> Chain["事件动作链"]
  Chain --> A1["set-value"]
  Chain --> A2["show-message"]
  Chain --> A3["navigate"]
  Chain --> A4["request"]
  Chain --> A5["open-dialog / close-dialog"]
  Chain --> A6["set-visible / set-disabled"]
  Chain --> A7["validate / reset"]
  Chain --> A8["refresh"]
  Chain --> A9["startFlow / terminateFlow"]
  Chain --> A10["linkage / emit / custom"]
```

### EventExecutionContext 注入

```typescript
{
  getFormData, setFormData,
  getVariable, setVariable,
  apiClient, navigate,
  openDialog, closeDialog,
  showMessage, ...
}
```

---

## 七、校验运行时（两层）

```mermaid
flowchart TB
  subgraph design [设计时 — 非阻塞]
    SV["schemaValidate.ts"]
    SV --> L1["Layer1 静态结构"]
    SV --> L2["Layer2 引用完整性"]
  end

  subgraph runtime [运行时 — 提交阻塞]
    SF["schemaFormData.ts"]
    SF --> Req["必填校验"]
    SF --> Rules["Widget rules 配置"]
  end

  Toolbar["设计器校验按钮"] --> SV
  Submit["PublishView 提交"] --> SF
```

---

## 八、提交流运行时

```mermaid
sequenceDiagram
  participant User as 用户
  participant WR as WidgetRenderer
  participant EE as eventEngine
  participant API as dataApi

  User->>WR: 点击提交
  WR->>WR: validate()
  alt 失败
    WR-->>User: 字段错误
  else 成功
    WR->>API: createSubmission(schemaId, data)
    opt 配置了 submit 事件
      WR->>EE: startFlow(flowId, variables)
    end
    WR-->>User: 成功
  end
```

---

## 九、保存运行时（设计器）

```mermaid
flowchart TD
  Save["saveSchema"] --> Payload["组装 JSON"]
  Payload --> API["PUT /api/schemas/:id"]
  API --> DB["MongoDB FormSchema"]
  Payload --> Thumb["缩略图 base64"]
```

自动保存：`useAutoSave` 监听 `editorStore.isDirty`，60s debounce。

---

## 十、API 运行时路径

```
Widget/Store/Composable
        ↓
src/api/*.ts
        ↓
utils/apiClient.ts (Bearer token, retry, mock)
        ↓
server /api/*
```

| 运行时场景 | API 模块 |
|------------|----------|
| 表单提交 | `dataApi.createSubmission` |
| 字典/选项 | `widgetApi` |
| 外部 URL | `runtimeApi.fetchRuntimeUrl` |
| 流程触发 | `dataApi.startFlow` |
| 审批日志 | `flowApi` |

---

## 十一、Pinia Store 运行时参与

| Store | 设计时 | 运行时 (PublishView) |
|-------|--------|---------------------|
| widgetStore | ✅ | ❌（props 传入） |
| boardStore | ✅ | ❌ |
| editorStore | ✅ | ❌ |
| appStore | 部分 | ✅ formGridContext |
| apiStore | ✅ 持久化 | ✅ 加载已发布 |

---

## 十二、约束速查

| 约束 | 说明 |
|------|------|
| Widget 不读 Store | 运行时通过 inject |
| 已发布只读 API | PublishView 不用草稿 API |
| 事件引擎纯函数 | 可单测，context 注入 |
| apiClient 统一出口 | 禁止组件直接 fetch |

---

## 相关文档

- [designer.md](./designer.md) — 设计器 UI 交互
- [instances-publish.md](./instances-publish.md) — 发布与嵌入
- [../architecture.md](../architecture.md) — 组件架构
- [../widget-development.md](../widget-development.md) — Widget 开发
