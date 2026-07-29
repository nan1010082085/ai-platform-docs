# Widget Development Guide

## Directory Structure

Each widget lives in `widgets/{group}/{name}/`:

```
widgets/form/input/
├── index.ts          # exports
├── config.ts         # config (property panel, defaults)
├── mock.ts           # optional: default visualization data for complex widgets (see below)
├── schema.ts         # factory function
├── FgInput.vue       # component implementation
├── style.module.scss # styles (CSS Module)
└── __tests__/        # tests
```

## Mock Data (Complex Widgets)

**Complex widgets** that depend on API or static data (advanced tables, charts, description lists, statistic cards, etc.) should add a `mock.ts` in the widget directory, alongside `config.ts`:

```
widgets/table/advanced-table/
├── config.ts
├── mock.ts          # default data for designer preview
├── schema.ts
└── FgAdvancedTable.vue
```

### Conventions

| Item | Description |
|------|------|
| **Purpose** | The designer canvas shows realistic data when no API is configured, making it easier to lay out column tags/buttons/tooltips |
| **Runtime** | `PublishView` / `WidgetRenderer` inject `surface='runtime'`; no mock loaded when there is no API |
| **Defaults** | `config.ts`'s `defaultProps` imports from `mock.ts` (charts/descriptions/statistic cards) |
| **Tables** | The component checks via `shouldUseWidgetMock()` then calls `getTableRowsFromMock(type)` |
| **Registration** | New complex widgets register in `MOCK_REGISTRY` in `widgets/base/widgetMock.ts` |

### mock.ts example

```ts
// widgets/bar-chart/mock.ts
import type { ChartWidgetMock } from '../base/widgetMock'

export const barChartMock: ChartWidgetMock = {
  kind: 'chart',
  staticData: [
    { category: 'Jan', value: 42 },
    { category: 'Feb', value: 38 },
  ],
}
```

```ts
// config.ts
import { barChartMock } from './mock'

defaultProps: {
  staticData: barChartMock.staticData,
  // ...
}
```

### Table Component Integration

```ts
import { WIDGET_SURFACE_KEY, getTableRowsFromMock, shouldUseWidgetMock } from '../base/widgetMock'

const surface = inject(WIDGET_SURFACE_KEY, 'runtime')

function applyEditorMockIfNeeded() {
  const hasApi = !!listApiConfig.url
  if (!shouldUseWidgetMock(surface, hasApi)) return
  const mock = getTableRowsFromMock(widgetData.value.type)
  if (!mock) return
  tableData.value = mock.rows
  total.value = mock.total
}
```

### Render Surface Injection

- `EditorCanvas` -> `provide(WIDGET_SURFACE_KEY, 'editor')`
- `WidgetRenderer` -> `provide(WIDGET_SURFACE_KEY, 'runtime')`

Business-scenario mocks should align with platform docs (e.g. leave ledger, workspace KPIs) so Board deliverables can be directly reused.

## Development Steps

### 1. Create config `config.ts`

```ts
import type { WidgetConfig } from '../base/types'

export const inputConfig: WidgetConfig = {
  name: 'FgInput',           // component name
  displayName: 'Input',      // display name
  description: 'Text input component',
  author: 'your-name',
  defaultStyle: { width: '100%', height: '40px' },
  defaultProps: {
    placeholder: 'Enter...',
    clearable: true,
  },
  propertyPanel: {
    basic: ['label'],         // basic props
    style: [],                // style props
    props: [                  // component-specific props
      { key: 'placeholder', label: 'Placeholder', type: 'input' },
      { key: 'clearable', label: 'Clearable', type: 'switch' },
    ],
  },
  exposedValues: [
    { key: 'value', type: 'string', description: 'Input value' },
  ],
  configPanels: ['events', 'variables'],
  receivableEvents: [
    { name: 'set-value', description: 'Set value' },
    { name: 'focus', description: 'Focus' },
  ],
}
```

### 2. Create factory function `schema.ts`

```ts
import { publicSchema } from '../base/publicSchema'
import { inputConfig } from './config'
import type { Widget } from '../base/types'

export function createInputWidget(id: string): Widget {
  return {
    ...publicSchema(id, 'input'),
    name: inputConfig.name,
    label: inputConfig.displayName,
    props: { ...inputConfig.defaultProps },
  }
}
```

### 3. Implement component `FgInput.vue`

```vue
<script setup lang="ts">
import { inject, computed } from 'vue'
import { widgetDataKey, widgetStyleKey } from '../base/types'
import { useWidgetRenderState } from '@/composables/useWidgetRenderState'
import { useExposeWidget } from '@/composables/useExposeWidget'

const widgetData = inject(widgetDataKey)!
const widgetStyle = inject(widgetStyleKey)!
const { isDisabled } = useWidgetRenderState()

useExposeWidget((wd) => ({
  get value() { return wd.value.defaultValue },
}))
</script>

<template>
  <el-input
    v-model="widgetData.defaultValue as string"
    :placeholder="(widgetData.props?.placeholder as string) || 'Enter...'"
    :disabled="isDisabled"
  />
</template>
```

### 4. Register in registry

Register in `widgets/entries/{type}.ts`:

```ts
import { registerWidget } from '../registry'
import { inputConfig } from '../form/input/config'
import { createInputWidget } from '../form/input/schema'

registerWidget('input', inputConfig, createInputWidget)
```

## Key Rules

1. **Style isolation**: must use CSS Module (`style.module.scss`)
2. **No hardcoded styles**: all styles are driven by schema config
3. **No component nesting**: base/business components cannot nest each other
4. **Complete property panel**: every configurable behavior must have a corresponding panel config
5. **Inject, don't import**: get data via `inject(widgetDataKey)`, do not import stores directly
