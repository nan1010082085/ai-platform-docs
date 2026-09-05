# Editor Product Capabilities

> Available capabilities of the visual editor for users and integrators.

---

## 1. Product Positioning

Build by drag-and-drop:

1. **Approval / business forms** (Grid)
2. **Operation dashboards / free pages** (Free)
3. **Publishable, embeddable** runtime pages (`/view/:code`)

Technical core: Schema JSON + Widget registry + four config systems (events / linkage / API / variables).

---

## 2. Capability List

| Domain | Capability | Description |
|--------|--------|------|
| Build | Free absolute-positioning canvas | `layoutMode: 'free'` |
| Build | Grid layout | Multi-column adaptive layout with span |
| Build | Rich widget library | Forms, charts, containers, and more |
| Build | Dashboard demo | One-click operation dashboard sample |
| Build | Dark dashboard theme | Theme presets |
| Interaction | Drag / resize / guides | Free and Grid editing gestures |
| Interaction | Undo / redo | Designer history |
| Interaction | Align / distribute / lock / hide | Shortcuts and toolbar |
| Config | Events / linkage / API / variables | Property panel |
| Publish | Save / version / publish | Toolbar and API |
| Publish | Interaction modes | edit / preview / publish; URL `?interaction=` |
| Integration | qiankun sub-app | Embeddable in a host shell |
| Integration | postMessage host protocol | Publish page ↔ host |
| Extension | SchemaType registry | Custom page types |
| Extension | createWidgetPlugin | Third-party widgets |

---

## 3. Recommended Paths

### 3.1 Dashboard

1. Editor → **Instances** → New  
2. Layout **Free**, pick the operation dashboard demo  
3. Confirm dark theme, charts, and region filter linkage  
4. Save → publish → open `/view/{code}?interaction=interactive`

### 3.2 Form Grid

1. New → **Grid** → form / list / detail template  
2. Drop widgets, configure events and linkage  
3. Preview → save → publish

### 3.3 Publish modes

| URL | Expected |
|-----|------|
| `/view/{code}?interaction=interactive` | Interactive |
| `/view/{code}?interaction=readonly` | Read-only |
| Add `&showModeToggle=1` | Toggle control in the corner |

---

## 4. Related Docs

- [Architecture](./architecture.md)
- [Widgets](./widgets.md)
- [Third-party widget guide](./third-party-widget-guide.md)
- [Changelog](./changelog.md)
