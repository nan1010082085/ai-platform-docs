# Editor Product Design Docs

> Page wireframes, interaction flows, runtime architecture - based on the current `editor/src` implementation (2026-07-20)

For the capability matrix see [../capabilities.md](../capabilities.md); for architecture see [../architecture.md](../architecture.md).

## Doc Index

| Doc | Scope |
|------|------|
| [Information architecture & layout](./overview.md) | routes, AppLayout, qiankun embedding |
| [Designer](./designer.md) | three-pane layout, canvas, property panel, widget library |
| [Instances & publish](./instances-publish.md) | list, save, publish, preview, embedding |
| [Runtime architecture](./runtime.md) | WidgetRenderer, event engine, linkage, validation |

## Design Principles

1. **Widget as atomic unit**: 86 directories / 97 registrations; registry + schema factory + runtime component; `SchemaType = string`
2. **Design/runtime separation**: `WIDGET_SURFACE_KEY` distinguishes editor (with mock) from runtime
3. **Store responsibility split**: `widgetStore` data source of truth, `editorStore` interaction + immer history, `boardStore` canvas, `apiStore` persistence (12 stores total)
4. **Unified schema JSON format**: `{ widgets, board: { canvas, variables, events } }`
5. **Dual layout**: `free` absolute positioning (dashboards) / `flex` flow (form pages)
6. **Embedding-friendly**: PublishView postMessage + `?interaction=` read-only/interactive

## Page Map

```
AppLayout (sidebar, hidden when embedded)
├── /instances          InstancesView      instance list (includes dashboard demo preset)
├── /templates          WidgetTemplateView widget template library
├── /credentials        CredentialListView API credentials
├── /tenants            TenantListView     tenant management
├── /key-usage          KeyUsageAuditView  key usage
├── /submissions        SubmissionListView submission records
├── /widget-docs        WidgetDocsView     widget docs
│
├── /editor?id=         EditorView         full-screen designer (viewport culling / 4 modes)
├── /preview?id=        PreviewRenderView  draft preview
└── /view/:code         PublishView        published runtime
```
