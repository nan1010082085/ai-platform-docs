# Widget 开发指南

## 目录结构

每个 Widget 位于 `widgets/{group}/{name}/` 目录：

```
widgets/form/input/
├── index.ts          # 导出
├── config.ts         # 配置（属性面板、默认值）
├── mock.ts           # 可选：复杂部件的默认可视化数据（见下文）
├── schema.ts         # 工厂函数
├── FgInput.vue       # 组件实现
├── style.module.scss # 样式（CSS Module）
└── __tests__/        # 测试
```

## Mock 数据（复杂部件）

依赖 API 或静态数据的**复杂部件**（高级表格、图表、描述列表、统计卡片等）应在部件目录下增加 `mock.ts`，与 `config.ts` 同级：

```
widgets/table/advanced-table/
├── config.ts
├── mock.ts          # 设计器预览用默认数据
├── schema.ts
└── FgAdvancedTable.vue
```

### 约定

| 项目 | 说明 |
|------|------|
| **用途** | 设计器画布在未配置 API 时展示真实感数据，便于排布列 tag/按钮/tooltip |
| **运行时** | `PublishView` / `WidgetRenderer` 注入 `surface='runtime'`，无 API 时不加载 mock |
| **默认值** | `config.ts` 的 `defaultProps` 从 `mock.ts` 导入（图表/描述列表/统计卡片） |
| **表格** | 组件内通过 `shouldUseWidgetMock()` 判断后调用 `getTableRowsFromMock(type)` |
| **登记** | 新复杂部件在 `widgets/base/widgetMock.ts` 的 `MOCK_REGISTRY` 注册 |

### mock.ts 示例

```ts
// widgets/bar-chart/mock.ts
import type { ChartWidgetMock } from '../base/widgetMock'

export const barChartMock: ChartWidgetMock = {
  kind: 'chart',
  staticData: [
    { category: '1月', value: 42 },
    { category: '2月', value: 38 },
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

### 表格类组件接入

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

### 渲染表面注入

- `EditorCanvas` → `provide(WIDGET_SURFACE_KEY, 'editor')`
- `WidgetRenderer` → `provide(WIDGET_SURFACE_KEY, 'runtime')`

业务场景 mock 建议与平台文档对齐（如请假台账、工作台 KPI），便于 Board 交付物直接复用。

## 开发步骤

### 1. 创建配置 `config.ts`

```ts
import type { WidgetConfig } from '../base/types'

export const inputConfig: WidgetConfig = {
  name: 'FgInput',           // 组件名
  displayName: '输入框',      // 显示名
  description: '文本输入组件',
  author: 'your-name',
  defaultStyle: { width: '100%', height: '40px' },
  defaultProps: {
    placeholder: '请输入',
    clearable: true,
  },
  propertyPanel: {
    basic: ['label'],         // 基础属性
    style: [],                // 样式属性
    props: [                  // 组件特有属性
      { key: 'placeholder', label: '占位文本', type: 'input' },
      { key: 'clearable', label: '可清除', type: 'switch' },
    ],
  },
  exposedValues: [
    { key: 'value', type: 'string', description: '输入值' },
  ],
  configPanels: ['events', 'variables'],
  receivableEvents: [
    { name: 'set-value', description: '设置值' },
    { name: 'focus', description: '聚焦' },
  ],
}
```

### 2. 创建工厂函数 `schema.ts`

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

### 3. 实现组件 `FgInput.vue`

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
    :placeholder="(widgetData.props?.placeholder as string) || '请输入'"
    :disabled="isDisabled"
  />
</template>
```

### 4. 注册到 registry

在 `widgets/entries/{type}.ts` 中注册：

```ts
import { registerWidget } from '../registry'
import { inputConfig } from '../form/input/config'
import { createInputWidget } from '../form/input/schema'

registerWidget('input', inputConfig, createInputWidget)
```

## 关键规则

1. **样式隔离**：必须使用 CSS Module（`style.module.scss`）
2. **禁止硬编码样式**：所有样式由 Schema 配置驱动
3. **禁止组件嵌套**：基础组件/业务组件不能互相嵌套
4. **属性面板完整**：每个可配置行为都必须有对应的属性面板配置
5. **注入而非导入**：通过 `inject(widgetDataKey)` 获取数据，不直接导入 Store
