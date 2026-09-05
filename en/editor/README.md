# Form Designer Documentation

> Build forms, pages, and data dashboards with zero code

## Quick Start

### Start Development

```bash
cd editor
pnpm install
pnpm dev
```

Open `http://localhost:5100` to start using.

### Basic Usage

1. Click "New Instance"
2. Select layout mode (Flex/Free)
3. Drag components from the panel to the canvas
4. Configure component properties
5. Publish the page

## Core Features

### Dual Layout Modes

| Mode | Use Case | Features |
|------|----------|----------|
| Flex | Forms, lists, detail pages | Auto flow, responsive |
| Free | Dashboards, free design | Absolute positioning, pixel-perfect |

### 87+ Components

**Form Components (27 types)**
- Input, textarea, number input
- Dropdown, radio, checkbox
- Date picker, time picker
- File upload, image upload
- Cascader, tree select

**Chart Components (19 types)**
- Bar, line, pie charts
- Scatter, radar, gauge
- Heatmap, funnel, K-line

**Business Components (15 types)**
- CRUD list page
- User management
- Approval process

**Layout Components (11 types)**
- Card, tabs, dialog
- Grid columns, splits

### Four Configuration Systems

1. **Event Configuration** — Click, change, submit event handling
2. **Linkage Configuration** — Component data linkage, show/hide control
3. **API Configuration** — Data source binding, remote data loading
4. **Variable Configuration** — Global variables, computed properties

### Smart Assistance

- **Viewport Culling** — Only render visible area for large screens
- **Undo/Redo** — Multi-step undo support
- **Shortcuts** — Copy/paste, align/distribute, lock/hide
- **Guidelines** — Auto-align when dragging

## Documentation Directory

### Product & Architecture

| Doc | Description |
|------|------|
| [capabilities.md](./capabilities.md) | Product capability list and walkthroughs |
| [architecture.md](./architecture.md) | Layering, stores, dual render paths, schema |

### Development Guide

| Doc | Description |
|------|------|
| [widget-development.md](./widget-development.md) | Built-in widget development steps |
| [third-party-widget-guide.md](./third-party-widget-guide.md) | `createWidgetPlugin` extension |
| [property-panel.md](./property-panel.md) | propertyPanel declaration & editor |
| [widgets.md](./widgets.md) | Widget system overview |
| [canvas-system.md](./canvas-system.md) | Dual canvas system |
| [config-systems.md](./config-systems.md) | Four configuration systems |
| [store-design.md](./store-design.md) | Store design |

### Integration & Embedding

| Doc | Description |
|------|------|
| [qiankun-integration.md](./qiankun-integration.md) | Micro-frontend integration |
| [micro-app-container-design.md](./micro-app-container-design.md) | FgMicroAppContainer |

### Design Documents

| Doc | Description |
|------|------|
| [Design Doc Index](./design/) | Page wireframes, Mermaid interaction flows |
| [design/overview.md](./design/overview.md) | Information architecture, routes, stores |
| [design/designer.md](./design/designer.md) | Three-pane designer, drag, save & publish |
| [design/instances-publish.md](./design/instances-publish.md) | Instance list, PublishView, postMessage |
| [design/runtime.md](./design/runtime.md) | WidgetRenderer, events, linkage, validation |

## Use Cases

### Case 1: Create Approval Form

1. Select "Flex" layout mode
2. Drag form components: input, dropdown, date picker
3. Configure form validation rules
4. Configure submit event
5. Publish and get access link

### Case 2: Build Operations Dashboard

1. Select "Free" layout mode
2. Set canvas size (1920×1080)
3. Drag chart components
4. Bind data sources
5. Configure styles and animations
6. Publish as read-only mode

### Case 3: Create Data Entry Page

1. Use "CRUD List Page" component
2. Configure table columns and search conditions
3. Configure add/edit forms
4. Configure delete confirmation
5. Publish for team use

## Publishing & Access

### Publish Modes

| Mode | Description | URL Parameter |
|------|-------------|---------------|
| Interactive | Users can fill and submit | `?interaction=interactive` |
| Read-only | View only, no editing | `?interaction=readonly` |

### Access URL

```
https://pyflow.icu/schema-platform/editor/view/{schemaCode}
```

### Embed in Other Systems

```html
<iframe src="https://pyflow.icu/schema-platform/editor/view/{schemaCode}?interaction=interactive" />
```

## Quick Navigation

| I want to… | See |
|--------|--------|
| Know what the product can do | [Capabilities](./capabilities.md) |
| Understand architecture & layering | [Architecture](./architecture.md) |
| Build a new Widget | [Widget Development](./widget-development.md) · [Third-party Guide](./third-party-widget-guide.md) |
| Configure the property panel | [Property Panel](./property-panel.md) |
| Integrate qiankun / embed publish page | [qiankun](./qiankun-integration.md) · [Instances & Publish Design](./design/instances-publish.md) |

## External Integration

- qiankun sub-app
- Schema CRUD / publish REST API
- PublishView `postMessage` protocol
- WidgetRenderer standalone embedding

## FAQ

**Q: Not enough components?**
A: Support third-party Widget extension, see [Third-party Widget Guide](./third-party-widget-guide.md).

**Q: Large screen editing is laggy?**
A: Viewport culling optimization is enabled. If still laggy, try reducing component count or using simpler charts.

**Q: How to implement component linkage?**
A: Use "Linkage Configuration", set data source and conditional expressions.

**Q: Support internationalization?**
A: Yes, using vue-i18n, can configure multiple languages.

## Related Links

- [Editor README](../../../editor/README.md) — User guide
- [Server API Docs](../server/README.md) — Backend API
- [Deployment Guide](../../deploy/README.md) — Production deployment
