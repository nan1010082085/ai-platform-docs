---
outline: deep
---

# Widget 体系

## 概览

编辑器拥有 **98 个 Widget 目录**，**104 次 registerWidget**，分 8 组。

| 分组 | 数量 | 代表 |
|------|------|------|
| form | 27 | input, select, date, upload, cascader |
| chart | 19 | bar, line, pie, scatter, radar, gauge, map |
| business | 15 | crud-list-page, user-management, approval-* |
| layout | 11 | form, card, tabs, dialog, *-col |
| static | 8 | title, banner, statistic, descriptions |
| container | 5 | search-list, tab-container |
| table | 3 | table, advanced-table, tree-table |
| action | 3 | button, toolbar-buttons, filter-bar |

## Widget 注册

新增 Widget 只需 `registerWidget` / `createWidgetPlugin`，无需改 `SchemaType` 联合类型。

```typescript
// src/widgets/my-widget/config.ts
import type { WidgetConfig } from '../base/types'

const config: WidgetConfig = {
  type: 'my-widget',
  displayName: '我的组件',
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

## Widget 目录结构

```
src/widgets/my-widget/
├── FgMyWidget.vue          # 运行时组件
├── FgMyWidget.module.scss  # 样式
├── config.ts               # 元数据 + 属性面板
├── schema.ts               # 工厂函数
├── index.ts                # 导出
└── __tests__/              # 测试
```

## 多组件 Widget 模式

复杂业务 Widget 由多个子组件组合：

### FgCrudListPage（CRUD 台账页）

```
FgCrudListPage
  ├─ FgAdvancedTable (子组件)
  ├─ el-dialog (详情弹窗)
  │    ├─ el-descriptions
  │    └─ el-timeline (审批时间线)
  └─ el-dialog (新增/编辑弹窗)
       └─ el-form + CrudFormField
```

### FgAdvancedTable（高级表格）

```
FgAdvancedTable
  ├─ useAdvancedTableConfig (列/工具栏/分页配置)
  ├─ useAdvancedTableEvents (事件分发)
  ├─ useListData (数据层)
  ├─ FgAdvancedTableVirtual (虚拟滚动)
  └─ clickIntercept (事件拦截)
```

### FgFilterBar（筛选栏）

```
FgFilterBar
  ├─ 筛选控件组 (text/select/date/date-range)
  ├─ 搜索框
  └─ useFilterSync (参数同步到 DataSourceStore + URL)
```

## 通信机制

| 机制 | 用途 |
|------|------|
| `widgetDataKey` (provide/inject) | 父组件覆盖子组件的 widgetData |
| `TABLE_CLICK_INTERCEPT_KEY` | CrudListPage 拦截表格点击事件 |
| `useExposeWidget` + `trigger-event` | 跨 Widget 事件触发 |
| `useFilterSync` | 筛选参数自动同步到全局 |
| `useChartLinkage` | 图表钻取/筛选/高亮联动 |

## 高可用架构

| 能力 | 说明 |
|------|------|
| WidgetStateShell | 统一 loading/empty/error 状态壳 |
| WidgetErrorBoundary | 崩溃隔离，单 widget 不拖垮画布 |
| useWidgetData | 统一数据 composable（重试/SWR/去重/乐观更新） |
| el-table-v2 虚拟化 | 10000 行挂载 42ms |
