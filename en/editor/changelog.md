---
title: Changelog
---

# Visual Editor · Changelog

> Records major iterations of the editor (form / page / dashboard designer).
> Internal planning docs are archived in `editor/iteration-evolution.md` and not shown here.

## 2026-07-20 · E1-E3 Closure

### E1 Dashboard Foundation

- Doc stats alignment, viewport culling, immer undo, dashboard demo
- Theme/animation skeleton, deprecated alias cleanup

### E2 Experience Deepening

- Publish mode, shortcuts, telemetry client + dashboard
- PropertyPanel 29KB -> 10.1KB (split into 6 composables/utils)
- Nesting alignment, i18n coverage ~15%

### E3 Open Ecosystem

- SchemaType registry-based + createWidgetPlugin + third-party widget guide
- Scaffold/marketplace removed from backlog (no external consumers)

## Measurement Baseline

| Metric | Count |
|---|---|
| Widget directories | 86 |
| registerWidget | 97 |
| Pinia stores | 12 |
| Composables | 46 |
| Vitest tests | ~1941 |

## Earlier · Capability Foundation

- **Dual canvas system**: Free absolute positioning + Flex flow layout
- **Four config systems**: events / linkage / API / variables
- **Condition expressions**: visibleOn / disabledOn / requiredOn, sandbox execution
- **Event engine**: 18 action types
- **qiankun micro-frontend**: sub-app integration
