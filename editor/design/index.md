# Editor 产品设计文档

> 页面线框、交互流、运行时架构 — 基于 `editor/src` 当前实现

产品能力矩阵见 [../capabilities.md](../capabilities.md)；架构见 [../architecture.md](../architecture.md)。

## 文档索引

| 文档 | 范围 |
|------|------|
| [信息架构与布局](./overview.md) | 路由、AppLayout、qiankun 嵌入 |
| [设计器](./designer.md) | 三栏布局、画布、属性面板、部件库 |
| [实例与发布](./instances-publish.md) | 列表、保存、发布、预览、嵌入 |
| [运行时架构](./runtime.md) | WidgetRenderer、事件引擎、联动、校验 |

## 设计原则

1. **Widget 为原子单元**：85 目录 / 91 注册项；registry + Schema 工厂 + 运行时组件；`SchemaType = string`
2. **设计/运行分离**：`WIDGET_SURFACE_KEY` 区分 editor（含 mock）与 runtime
3. **Store 职责拆分**：`widgetStore` 数据真源，`editorStore` 交互 + immer 历史，`boardStore` 画布，`apiStore` 持久化（共 12 Store）
4. **Schema JSON 统一格式**：`{ widgets, board: { canvas, variables, events } }`
5. **双布局**：`free` 绝对定位（大屏）/ `flex` 流式（表单页）
6. **嵌入友好**：PublishView postMessage + `?interaction=` 只读/交互

## 核心系统

### Widget 体系

- **注册机制**：`registerWidget` / `createWidgetPlugin` 注册式扩展
- **Schema 工厂**：`create(id)` 生成初始 Schema
- **运行时组件**：`WidgetRenderer` 根据 Schema 渲染组件
- **属性面板**：根据 Widget 配置自动生成属性编辑 UI

### 画布系统

- **双布局模式**：`free`（绝对定位，大屏）/ `flex`（流式，表单页）
- **拖拽排序**：拖拽创建、移动、调整大小
- **对齐辅助**：智能对齐线、网格吸附
- **缩放平移**：画布缩放、平移、适配屏幕

### Store 设计

| Store | 职责 |
|-------|------|
| `widgetStore` | Widget 数据真源、Schema CRUD |
| `editorStore` | 交互状态、选择、immer 历史 |
| `boardStore` | 画布状态、缩放、平移 |
| `apiStore` | 持久化、保存、加载 |
| `eventStore` | 事件绑定、联动规则 |
| `variableStore` | 变量定义、表达式 |

### 事件引擎

- **事件类型**：click、change、submit、validate 等
- **联动规则**：Widget 间联动、条件显隐、数据传递
- **校验规则**：必填、格式、范围、自定义校验

## 页面地图

```
AppLayout (侧栏，嵌入时隐藏)
├── /instances          InstancesView      实例列表（含大屏 Demo 预设）
├── /templates          WidgetTemplateView 部件模板库
├── /credentials        CredentialListView API 凭证
├── /tenants            TenantListView     租户管理
├── /key-usage          KeyUsageAuditView  密钥用量
├── /submissions        SubmissionListView 提交记录
├── /widget-docs        WidgetDocsView     部件文档
│
├── /editor?id=         EditorView         全屏设计器（视口剔除 / 4 模式）
├── /preview?id=        PreviewRenderView  草稿预览
└── /view/:code         PublishView        已发布运行时
```

## 设计态 vs 运行态

| 维度 | 设计态（Editor） | 运行态（Runtime） |
|------|------------------|-------------------|
| 组件 | WidgetEditor | WidgetRenderer |
| 数据 | mock 数据 / 真实数据 | 真实数据 |
| 交互 | 拖拽、选择、配置 | 填写、提交 |
| 校验 | 实时校验（可关闭） | 提交时校验 |
| 事件 | 设计态事件（预览） | 运行态事件（执行） |

## 相关文档

| 文档 | 说明 |
|------|------|
| [Widget 体系](/editor/widgets) | Widget 架构、注册机制 |
| [Widget 开发指南](/editor/widget-development) | 内置 Widget 开发规范 |
| [第三方 Widget](/editor/third-party-widget-guide) | 外部 Widget 扩展 |
| [双画布系统](/editor/canvas-system) | 画布架构、布局模式 |
| [四大配置系统](/editor/config-systems) | 配置系统设计 |
| [属性面板](/editor/property-panel) | Widget 属性配置 UI |
| [Store 设计](/editor/store-design) | Widget 数据存储 |
