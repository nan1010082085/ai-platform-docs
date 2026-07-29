# Editor 产品设计文档

> 页面线框、交互流、运行时架构 — 基于 `editor/src` 当前实现（2026-07-20）

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
