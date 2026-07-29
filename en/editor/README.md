# Editor Documentation Index

`@editor` - Schema-driven visual form / page / dashboard editor (Vue 3 + Vite + Element Plus)

Local: `cd editor && pnpm dev` -> http://localhost:5100

---

## Quick Navigation

| I want to… | See |
|--------|--------|
| Know what the product can do | [Capabilities](./capabilities.md) |
| Understand architecture & layering | [Architecture](./architecture.md) |
| Build a new Widget | [Widget Development](./widget-development.md) · [Third-party Guide](./third-party-widget-guide.md) |
| Configure the property panel | [Property Panel](./property-panel.md) |
| Integrate qiankun / embed publish page | [qiankun](./qiankun-integration.md) · [Instances & Publish Design](./design/instances-publish.md) |

---

## Doc Directory

### Product & Architecture

| Doc | Description |
|------|------|
| [capabilities.md](./capabilities.md) | Product capability matrix, acceptance paths, known gaps |
| [architecture.md](./architecture.md) | Layering, stores, dual render paths, schema |

### Development

| Doc | Description |
|------|------|
| [widget-development.md](./widget-development.md) | Built-in widget development steps |
| [third-party-widget-guide.md](./third-party-widget-guide.md) | `createWidgetPlugin` extension |
| [property-panel.md](./property-panel.md) | propertyPanel declaration & editor |
| [widgets.md](./widgets.md) | Widget system overview |
| [canvas-system.md](./canvas-system.md) | Dual canvas system |
| [config-systems.md](./config-systems.md) | Four config systems |
| [store-design.md](./store-design.md) | Store design |

### Integration & Embedding

| Doc | Description |
|------|------|
| [qiankun-integration.md](./qiankun-integration.md) | Micro-frontend integration |
| [micro-app-container-design.md](./micro-app-container-design.md) | FgMicroAppContainer |

### Design & Runtime

| Doc | Description |
|------|------|
| [Design doc index](./design/) | Page wireframes, Mermaid interaction flows |
| [design/overview.md](./design/overview.md) | Information architecture, routes, stores |
| [design/designer.md](./design/designer.md) | Three-pane designer, drag, save & publish |
| [design/instances-publish.md](./design/instances-publish.md) | Instance list, PublishView, postMessage |
| [design/runtime.md](./design/runtime.md) | WidgetRenderer, events, linkage, validation |

---

## External Integration

- qiankun sub-app
- Schema CRUD / publish REST API
- PublishView `postMessage` protocol (`fg:set-mode`, etc.)
- WidgetRenderer standalone embedding
