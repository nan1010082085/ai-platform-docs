---
outline: deep
---

# Widget System

## Overview

The editor has **86 widget directories** with **97 registerWidget calls**, in 8 groups.

| Group | Count | Representatives |
|------|------|------|
| form | 27 | input, select, date, upload, cascader |
| chart | 19 | bar, line, pie, scatter, radar, gauge, map |
| business | 15 | crud-list-page, user-management, approval-* |
| layout | 11 | form, card, tabs, dialog, *-col |
| static | 8 | title, banner, statistic, descriptions |
| container | 5 | search-list, tab-container |
| table | 3 | table, advanced-table, tree-table |
| action | 3 | button, toolbar-buttons, filter-bar |

## Widget Registration

Adding a widget only requires `registerWidget` / `createWidgetPlugin`; no need to change the `SchemaType` union.

```typescript
// src/widgets/my-widget/config.ts
import type { WidgetConfig } from '../base/types'

const config: WidgetConfig = {
  type: 'my-widget',
  displayName: 'My Widget',
  group: 'form',
  icon: 'setting',
  defaultSize: { w: 280, h: 44 },
  propertyPanel: {
    basic: [...],
    style: [...],
    props: [...],
  },
  configPanels: ['events', 'linkages', 'api', 'variables'],
}

export default config
```

## Widget Directory Structure

```
src/widgets/my-widget/
├── FgMyWidget.vue          # runtime component
├── FgMyWidget.module.scss  # styles
├── config.ts               # metadata + property panel
├── schema.ts               # factory function
├── index.ts                # exports
└── __tests__/              # tests
```

## Multi-component Widget Pattern

Complex business widgets are composed of multiple sub-components:

### FgCrudListPage (CRUD ledger page)

```
FgCrudListPage
  ├─ FgAdvancedTable (sub-component)
  ├─ el-dialog (detail dialog)
  │    ├─ el-descriptions
  │    └─ el-timeline (approval timeline)
  └─ el-dialog (new/edit dialog)
       └─ el-form + CrudFormField
```

### FgAdvancedTable (advanced table)

```
FgAdvancedTable
  ├─ useAdvancedTableConfig (column/toolbar/pagination config)
  ├─ useAdvancedTableEvents (event dispatch)
  ├─ useListData (data layer)
  ├─ FgAdvancedTableVirtual (virtual scroll)
  └─ clickIntercept (event interception)
```

### FgFilterBar (filter bar)

```
FgFilterBar
  ├─ filter controls (text/select/date/date-range)
  ├─ search box
  └─ useFilterSync (sync params to DataSourceStore + URL)
```

## Communication Mechanisms

| Mechanism | Use case |
|------|------|
| `widgetDataKey` (provide/inject) | Parent overrides child's widgetData |
| `TABLE_CLICK_INTERCEPT_KEY` | CrudListPage intercepts table click events |
| `useExposeWidget` + `trigger-event` | Cross-widget event triggering |
| `useFilterSync` | Auto-sync filter params to global |
| `useChartLinkage` | chart drill/filter/highlight linkage |

## High-availability Architecture

| Capability | Description |
|------|------|
| WidgetStateShell | Unified loading/empty/error state shell |
| WidgetErrorBoundary | Crash isolation; a single widget won't crash the canvas |
| useWidgetData | Unified data composable (retry/SWR/dedup/optimistic update) |
| el-table-v2 virtualization | 10000 rows mount in 42ms |
