# Editor Product Capabilities

> Updated: 2026-07-20 · aligned with this round's product closure conclusions
> For detailed evolution see [iteration-evolution.md](./iteration-evolution.md) (internal)

---

## 1. Product Positioning

Lets non-developers build by drag-and-drop:

1. **Approval / business forms** (Flex)
2. **Operation dashboards / free pages** (Free)
3. **Publishable, embeddable** runtime pages (`/view/:code`)

Technical core: Schema JSON + Widget registry + four config systems (events/linkage/API/variables).

---

## 2. Capability Matrix

| Domain | Capability | Status | Entry / Evidence |
|--------|--------|------|-------------|
| Build | Free absolute-positioning canvas | ✅ | `layoutMode: 'free'` |
| Build | Flex flow page | 🟡 | Render + drop usable; container nesting still single-layer flatten, see [container-nesting-decision.md](./container-nesting-decision.md) (internal) |
| Build | 86+ Widgets | ✅ | `widgets/` + registry |
| Build | Dashboard demo one-click creation | ✅ | Instance new -> "Operation Dashboard Demo" |
| Build | Dark dashboard theme | ✅ | `boardThemes` / canvas.themePreset |
| Interaction | Drag / resize / guides | ✅ | **Free**: EditorOverlay + useDrag; Flex has no resize/guides |
| Interaction | Flex widget drop-in | 🟡 | useFlexCanvasDrop / FlexColDropZone; lacks insertion indicator, 2-level nesting not landed |
| Interaction | Undo/redo (immer) | ✅ | editorStore |
| Interaction | Align / distribute / lock / hide | ✅ | useWidgetAlignment + shortcuts |
| Performance | Viewport culling | ✅ | useViewportCulling (design-time) |
| Config | Events / linkage / API / variables | ✅ | PropertyPanel config entry |
| Publish | Save / version / publish | ✅ | apiStore + toolbar |
| Publish | 4 interaction modes | ✅ | edit / preview / publish-* |
| Publish | URL read-only/interactive toggle | ✅ | `?interaction=` |
| Integration | qiankun sub-app | ✅ | microapp + platform-shared |
| Integration | postMessage host protocol | ✅ | PublishView |
| Extension | SchemaType registry-based | ✅ | `type SchemaType = string` |
| Extension | createWidgetPlugin | ✅ | registry.ts |
| Observability | Frontend telemetry | 🟡 | telemetry; lacks server/dashboard |
| i18n | vue-i18n | 🟡 | Framework ready; UI coverage insufficient |
| Open | Widget marketplace / scaffold | ❌ | See Backlog |

---

## 3. Recommended Acceptance Path

### 3.1 Dashboard Foundation (E1)

1. Open Editor -> **Instances** -> New
2. Layout select **Free**, preset select **Operation Dashboard Demo (E1 acceptance)**
3. Verify: dark background, 10+ charts, region filter, real-time clock, auto-refresh
4. Switch region to "hidden chart" -> chart hidden via linkage
5. Save -> Publish -> open `/view/{code}?interaction=interactive`

### 3.2 Form Flex

1. New -> **Flex** -> form / list / detail template
2. Drag in controls, configure events and linkage
3. Preview -> Save & publish

### 3.3 Publish-mode Modes

| URL | Expected |
|-----|------|
| `/view/{code}?interaction=interactive` | Editable interactive |
| `/view/{code}?interaction=readonly` | Global read-only |
| Add `&showModeToggle=1` | Top-right toggle |

---

## 4. Architecture Overview (product perspective)

```
Designer EditorView
  ├── Left: widget library / tree / templates
  ├── Center: EditorCanvas
  │     ├── Free -> SchemaRender (viewport culling) + EditorOverlay (hit on full data)
  │     └── Flex -> WidgetRenderer
  └── Right: PropertyPanel (basic / style / props + four configs)

Runtime PublishView / Preview
  └── WidgetRenderer + eventEngine + linkage
```

Key point: **virtualization only affects the DOM, not drag hit-testing** (hit-testing still uses full widget data).

---

## 5. Known Gaps (product priority)

| Priority | Gap | Impact |
|--------|------|------|
| P0 | server `/telemetry` + dashboard | Cannot measure churn and lag |
| P1 | Real 100+ widget FPS experiential acceptance | Dashboard ceiling still "theoretical" |
| P1 | i18n coverage >= 80% | Overseas/open-source blocked |
| P1 | Flex insertion indicator / span / mode switch | Flex editing chrome weaker than free |
| P2 | Further PropertyPanel splitting; clean up WidgetRule | Maintenance cost |
| P2 | 2-level nesting decision landed in code | Decision and implementation inconsistent (still flatten) |
| P3 | Flex-specific interaction design draft | designer.md drag flow is almost free-only |
| P3 | SDK scaffold + Widget marketplace | Ecosystem not open |

---

## 6. Related Docs

- Root README: [../README.md](../README.md)
- Architecture: [architecture.md](./architecture.md)
- This round's closure: [iteration-evolution.md](./iteration-evolution.md) (internal)
- Contributing: [../CONTRIBUTING.md](../CONTRIBUTING.md)
