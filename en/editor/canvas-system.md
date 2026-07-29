---
outline: deep
---

# Dual Canvas System

The editor supports two canvas modes: Free (absolute positioning) and Flex (flow layout).

## Mode Comparison

| Dimension | Free mode | Flex mode |
|------|----------|----------|
| Layout | Absolute positioning (left/top/width/height) | Flow (CSS Flow) |
| Use case | Dashboards, free pages, instrument panels | Forms, lists, detail pages |
| Drag interaction | Free drag + guides + alignment | Drop-in + reorder + width resize |
| Widget positioning | position prop (px/%) | DOM order |
| Viewport culling | ✅ Supported | ❌ Not needed |
| Zoom | 50-200% supported | Adapts to container |

## Free Mode

### Render Path

```
EditorCanvas
  └─ SchemaRender :widgets (preview mode)
       └─ SchemaNode (position: absolute)
  └─ EditorOverlay (edit mode)
       ├─ selection box + resize handle
       ├─ drag alignment guides
       └─ SchemaNode
```

### Core Capabilities

- **Absolute positioning**: each widget is positioned independently
- **px/% units**: `xUnit/yUnit/wUnit/hUnit` supports pixels and percentages
- **Viewport culling**: `useViewportCulling` skips DOM rendering for invisible widgets
- **Grid snap**: `snapToGrid` + `gridColumns` + `gridRowHeight`
- **Align/distribute**: left/right/center align + horizontal/vertical equal distribution
- **Lock/hide**: lock widgets to prevent mis-operation; hidden widgets are not rendered

### Canvas Config

```typescript
interface CanvasConfig {
  width: number           // canvas width
  height: number          // canvas height
  widthUnit: 'px' | '%'   // width unit
  heightUnit: 'px' | '%'  // height unit
  backgroundColor: string // background color
  padding: string         // padding
  zoom: number            // zoom ratio (50-200)
  themePreset?: string    // dashboard theme
  layoutMode: 'free' | 'flex'
  // grid
  snapToGrid?: boolean
  gridColumns?: 12 | 24
  gridRowHeight?: number
}
```

## Flex Mode

### Render Path

```
EditorCanvas
  └─ WidgetRenderer (Flex mode)
       └─ el-form + SchemaRender :schema
            └─ WidgetNode (flow layout)
```

### Core Capabilities

- **Flow layout**: widgets arranged in DOM order, auto-wrap
- **Drop indicator**: blue insertion indicator when dropping a widget
- **Drag reorder**: drag sibling widgets to reorder
- **Width resize**: drag the right edge to adjust width
- **Container nesting**: up to 2 levels (form/card/tabs/dialog containing base components)
- **span grid**: 1-24 grid span controls cell width

## Multi-resolution Adaptation

The `useCanvasScale` composable supports 4 scaling modes:

| Mode | Description |
|------|------|
| `contain` | Proportional scale, fit container (default) |
| `fit-width` | Fit container width |
| `fit-height` | Fit container height |
| `stretch` | Stretch to fill |

Preset resolutions: 1080p / 2K / 4K / custom.

## Responsive Breakpoints

The `useResponsivePosition` composable supports per-breakpoint position overrides:

```typescript
interface ResponsivePosition {
  desktop?: Partial<WidgetPosition>
  tablet?: Partial<WidgetPosition>
  mobile?: Partial<WidgetPosition>
  hidden?: boolean  // hidden at a breakpoint
}
```

The editor toolbar provides desktop/tablet/mobile switch preview.

## Multi-canvas / Multi-page

The BoardPage type allows a schema to contain multiple pages:

```typescript
interface BoardPage {
  id: string
  name: string
  widgets: Widget[]
}
```

The PageTabBar component provides the page-switching UI.
