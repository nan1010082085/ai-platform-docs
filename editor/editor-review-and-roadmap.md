# 可视化编辑器审查 · 产品分析 · 迭代路线图

> 2026-07-16 · 基于全代码库深度扫描

---

## 一、现状审查

### 1.1 架构总览

```
EditorView (主编排)
  ├── EditorViewToolbar        顶部工具栏：保存/发布/版本/AI/模式切换
  ├── EditorViewLeftPanel       左面板：组件面板 + Schema 树 + 模板库
  ├── EditorCanvas              画布区
  │     ├── EditorRuler         标尺
  │     ├── SchemaRender        双路径渲染器
  │     │     ├── SchemaNode    编辑模式：绝对定位
  │     │     └── WidgetNode    运行模式：流式布局
  │     ├── EditorOverlay       选中手柄/缩放/拖拽反馈
  │     └── ZoomIndicator       浮动 HUD
  ├── EditorViewRightPanel      右面板：属性面板 (PropertyPanel)
  └── AI Drawer                 AI 助手侧栏 (iframe + WebSocket)
```

**技术栈**：Vue 3.5 + TypeScript 5.7 + Element Plus 2.9 + ECharts 6.1 + Pinia + Vite 5
**微前端**：qiankun 集成，可独立运行或作为子应用
**样式规范**：强制 CSS Modules (`.module.scss`)

### 1.2 Widget 体系（64 目录 · 67 注册类型）

| 分组 | 数量 | Widget 列表 |
|------|------|------------|
| **layout** | 8 | card, tabs, single-col, double-col, triple-col, quad-col, divider, spacer, tree-layout |
| **container** | 4 | form, dialog, micro-app-container, iframe, micro-app |
| **form** | 21 | input, select, number, radio, checkbox, date, textarea, switch, slider, rate, richtext, upload, date-time-slot, time-picker, cascader, color-picker, tag-input, autocomplete, file-list, transfer, icon-picker, tree-select, permission-tree, dynamic-detail-table, qr-scanner |
| **static** | 4 | title, banner, statistic, descriptions |
| **action** | 2 | toolbar-buttons, button |
| **table** | 3 | table, advanced-table, tree-table, crud-list-page |
| **chart** | 17 | bar, stacked-bar, horizontal-bar, line, area, pie, donut, scatter, bubble, radar, filled-radar, gauge, multi-gauge, heatmap, funnel, compare-funnel, candlestick |
| **business** | 12 | approval-user-picker, approval-role-picker, approval-comment, user-management, role-management, user-selector, flow-timeline, flow-task-actions, calendar, kanban, adhoc-query, notification, auto-refresh, compliance-checklist |

### 1.3 四大配置系统

| 系统 | 能力 | 覆盖面 |
|------|------|--------|
| **Events** | 20 种动作类型（显示/隐藏、打开/关闭对话框、切换 Tab、设值、提交/重置、emit、设变量、触发事件、PostMessage、关闭 Tab、复制、刷新、API、导航、发起/结束流程、提交 Submission、导出数据） | 全部 widget |
| **Linkages** | 6 种联动类型（visible, disabled, required, options, set-value, reset-fields）+ 依赖图 + DFS 环检测 | 表单类 widget |
| **API** | 动态数据源（dictCode/url/TTL/retry/cacheLevel）+ 预取系统（L1 内存 + L2 IndexedDB） | 数据类 widget |
| **Variables** | Widget 级变量作用域 | 全部 widget |

### 1.4 渲染引擎双路径

- **SchemaNode**：编辑模式，绝对定位，支持拖拽/缩放/选中
- **WidgetNode**：运行/预览模式，流式布局，支持容器嵌套

### 1.5 现有模式

```typescript
// useConstant.ts
export const INTERACTION_MODES = ['edit', 'preview', 'publish-interactive', 'publish-readonly'] as const
```

实际使用中只有 `edit` 和 `preview` 两种模式在 `useEditorStore` 中切换。**没有"仪表盘模式"或"大屏模式"** —— 所有 widget 都是表单导向的。

### 1.6 画布系统（BoardStore）

- **布局模式**：`free`（绝对定位）和 `flex`（流式布局）
- **画布配置**：width, height, widthUnit/heightUnit (px/%), backgroundColor, padding, zoom (50-200)
- **预设模板**：full (1440×900), form-narrow (960×1200), list-standard (1200×900), list-wide (1440×900)
- **Flex 模板**：form, list, detail, blank

### 1.7 11 个 Pinia Store

| Store | 职责 |
|-------|------|
| `useEditorStore` | 选中、模式、撤销/重做（30步）、剪贴板、脏标记 |
| `useWidgetStore` | Widget CRUD、树遍历、O(1) 索引、容器操作、布局模式适配 |
| `useBoardStore` | 画布配置、板级变量、板级事件、缩放 |
| `useDragStore` | 拖拽状态、碰撞检测、参考线、吸附 |
| `useApiStore` | Schema CRUD、发布、分页、搜索 |
| `useRequestStore` | 请求去重、响应缓存、预取队列 |
| `useSchemaVersionStore` | 版本列表、差异对比、回滚、导出 |
| `useTemplateStore` | 模板库 CRUD |
| `useCredentialStore` | 凭证管理 |
| `useTenantStore` | 多租户 |
| `useAppStore` | 用户/全局上下文 |

### 1.8 事件引擎（纯逻辑层）

20 种动作类型，沙箱化表达式评估（`with(env)` + `new Function()`），完整的 `EventExecutionContext` 提供：findWidget、updateWidget、openDialog、closeDialog、submitForm、validateForm、resetForm、getFormData、emit、confirm、variables、setVariable、getVariable 等能力。

---

## 二、产品分析：两种编辑器模式

### 2.1 模式定义

当前编辑器是**表单设计器**，所有 widget 围绕表单采集展开。但实际业务场景已远超表单：

| 维度 | 模式 A：表单设计器（当前） | 模式 B：页面/大屏搭建器（缺失） |
|------|--------------------------|-------------------------------|
| **核心目标** | 数据采集、表单联动、审批流转 | 数据展示、可视化大屏、业务看板 |
| **典型场景** | 审批表单、调查问卷、配置面板 | 运营大屏、数据看板、业务仪表盘、工位终端 |
| **布局模式** | 以 flex 为主，free 为辅 | 以 free 为主（大屏绝对定位），flex 为辅 |
| **核心 widget** | form/input/select/table | chart/statistic/banner/kanban/描述列表 |
| **数据流向** | 用户 → 表单 → 提交 → 流程 | API → 数据源 → 图表 → 自动刷新 |
| **交互重心** | 联动、校验、条件显隐 | 钻取、筛选、实时刷新、轮播 |
| **画布尺寸** | 自适应内容（960~1440 宽） | 固定大屏（1920×1080 / 3840×2160） |

### 2.2 当前差距分析

**已有基础（可直接复用）**：
- ✅ 17 种图表 widget（ECharts 6.1）
- ✅ statistic、banner、descriptions 等静态展示 widget
- ✅ kanban、calendar 等业务可视化 widget
- ✅ free 布局引擎（绝对定位 + 拖拽 + 缩放）
- ✅ API 数据源系统（dictCode/url/TTL/cache）
- ✅ auto-refresh widget（定时刷新）
- ✅ AI page agent（已能生成页面级 schema）
- ✅ 画布配置（尺寸、背景、缩放）
- ✅ 事件引擎（20 种动作）

**缺失能力（需要新建）**：
- ❌ **编辑器模式切换**：没有"表单模式"vs"页面/大屏模式"的概念
- ❌ **数据源中心**：widget 各自配 API，缺少全局数据源管理和复用
- ❌ **图表联动**：图表间无钻取/筛选联动能力
- ❌ **大屏专用布局**：缺少网格对齐、等比缩放、多分辨率适配
- ❌ **实时数据流**：只有轮询（auto-refresh），缺少 WebSocket 推送
- ❌ **主题/皮肤系统**：无大屏深色主题、科技感样式
- ❌ **组件动画**：无入场/数据变化动画
- ❌ **页面路由容器**：无法在一个页面内嵌套子页面/Tab 切换
- ❌ **权限视图**：无基于角色的 widget 可见性控制
- ❌ **多画布/多页面**：一个 schema 只有一个画布，不支持多页签

### 2.3 Server 端现状

- Schema `type` 枚举已包含：`form`, `search_list`, `layout`, `table`, `chart`, `business`, `report`, `other`
- Menu 模型已支持 `routeType: 'schema'` + `schemaId`，schema 天然可作为页面
- Server `VALID_WIDGET_TYPES` 仅有 35 种，落后于编辑器的 67 种
- AI promptBuilder 已有 `buildPageSystemPrompt`，page agent 已能生成页面级 schema

---

## 三、迭代计划

### Phase 0：基础治理（1~2 周）✅ 已完成 2026-07-16

> 不加新功能，先清理技术债，为双模式打基础

| 编号 | 任务 | 优先级 | 状态 | 说明 |
|------|------|--------|------|------|
| 0.1 | **统一类型系统** | P0 | ✅ | `FormFieldValue`/`DictItem` 改为从 base/types 重导出；`FormItemRule` 统一使用 Element Plus 官方类型；消除双定义 |
| 0.2 | **Server VALID_WIDGET_TYPES 同步** | P0 | ✅ | 从 35 种扩展到 91 种（80 当前 + 11 旧版兼容），新 widget 可正常发布 |
| 0.3 | **画布尺寸读取修复** | P0 | ✅ | `calculateColPosition` 中 1920×1080 替换为 `boardStore.getCanvasWidthPx()/getCanvasHeightPx()` |
| 0.4 | **容器嵌套策略优化** | P1 | 待规划 | 当前容器不能嵌套容器（自动提升到根级），需评估是否放开限制以支持页面嵌套 |
| 0.5 | **撤销/重做优化** | P1 | 待规划 | JSON 序列化方案丢失函数/Date，大 schema 下内存压力大，评估增量 diff 方案 |
| 0.6 | **补齐 composable 测试** | P1 | 待规划 | useDrag、useResize、useBoardLayout、useFlexCanvasDrop 等核心 composable 无测试覆盖 |

### Phase 1：双模式架构（2~3 周）✅ 已完成 2026-07-16

> 在编辑器层面引入"表单模式"和"页面模式"的概念

| 编号 | 任务 | 优先级 | 状态 | 说明 |
|------|------|--------|------|------|
| 1.1 | **EditorMode 类型定义** | P0 | ✅ | `useConstant.ts` 新增 `LayoutEditMode = 'free' \| 'flex'` |
| 1.2 | **模式切换 UI** | P0 | ✅ | Toolbar 新增 Free/Flex 下拉切换器，切换时自动调整画布尺寸和单位 |
| 1.3 | **模式感知的组件面板** | P0 | ✅ | `ComponentPanel` 按 `boardStore.layoutMode` 过滤 widget；`WidgetRegistryItem.availableIn` 支持按模式注册 |
| 1.4 | **模式感知的属性面板** | P0 | ✅ | Flex 模式新增 "Flex 布局" section；Free 模式保留绝对坐标 section |
| 1.5 | **页面模式预设模板** | P0 | ✅ | `FlexPageTemplate` 新增 `'page'` 类型；`seedPageFlex()` 生成标题+统计卡片+图表卡片 |
| 1.6 | **模式持久化** | P0 | ✅ | `CanvasConfig.layoutMode` 已持久化，`boardStore.layoutMode` computed 全局响应式 |

### Phase 2：页面/大屏核心能力（3~4 周）🔄 进行中 2026-07-16

> 页面模式所需的基础设施

| 编号 | 任务 | 优先级 | 状态 | 说明 |
|------|------|--------|------|------|
| 2.1 | **全局数据源管理** | P0 | ✅ | `DataSourceStore` 已创建：集中管理 API 数据源定义，支持 HTTP 轮询 + WebSocket 推送，L1 内存缓存。`useDataSource` composable 供 widget 消费。`SchemaApiConfig.dataSourceId` 已添加 |
| 2.2 | **图表联动引擎** | P0 | ✅ 基础 | `useChartEvents` composable 已创建：ECharts click 事件转发到事件引擎。`EventExecutionContext.chartEvent` 已扩展。bar-chart 已接入，`eventTargets: ['chart-click']` 已配置 |
| 2.3 | **大屏网格系统** | P0 | ✅ | `FreeLayoutOptions` 新增 snapToGrid/gridColumns/gridRowHeight；拖拽/缩放实时吸附；网格线可视化层；PropertyPanel 配置 UI |
| 2.4 | **实时数据推送** | P1 | ✅ 基础 | DataSourceStore 已内置 WebSocket 支持（connectWebSocket/closeWebSocket），widget 通过 subscribe 自动接收推送 |
| 2.5 | **多画布/多页面** | P1 | ✅ | BoardPage 类型 + boardStore 多页面管理 + widgetStore 页面缓存 + PageTabBar 组件 |
| 2.6 | **Widget 入场动画** | P2 | 待规划 | 支持配置 widget 的入场动画和数据变化动画 |

### Phase 3：Widget 扩展计划（持续迭代）🔄 进行中 2026-07-16

#### 3.1 页面模式新增 Widget

| Widget | 分组 | 优先级 | 状态 | 说明 |
|--------|------|--------|------|------|
| **filter-bar** | action | P0 | ✅ | 全局筛选栏：日期范围、下拉筛选、搜索框，输出筛选参数供图表/表格消费 |
| **sub-form** | form | P0 | ✅ | 子表单/明细表单，动态增删行，字段配置驱动，暴露 rows 数据 |
| **progress-bar** | chart | P1 | ✅ | 线性/环形进度条，阈值颜色，百分比/数值显示 |
| **rank-list** | static | P1 | ✅ | 排行榜列表，数据源驱动，趋势箭头，Top N 高亮 |
| **comparison-card** | static | P1 | ✅ | 对比卡片，同比/环比，趋势箭头，大数字格式化 |
| **realtime-clock** | static | P1 | ✅ | 实时时钟，12/24 小时制，日期/星期显示 |
| **marquee-text** | static | P1 | ✅ | 跑马灯/滚动公告，数据源驱动，悬停暂停 |
| **tab-container** | layout | P1 | ✅ | Tab 容器，内部切换多个子画布 |
| **form-steps** | layout | P1 | ✅ | 分步表单容器，内置步骤条 + 上一步/下一步 |
| **condition-builder** | form | P1 | ✅ | 可视化条件表达式编辑器，AND/OR 组合 |
| **treemap** | chart | P2 | ✅ | 矩形树图，层级占比展示 |
| **realtime-clock** | static | P1 | 实时时钟 + 日期显示，大屏必备 |
| **marquee-text** | static | P1 | 跑马灯/滚动公告，支持数据源驱动 |
| **count-down** | static | P2 | 倒计时器，支持目标时间配置 |
| **progress-bar** | chart | P1 | 进度条/环形进度，支持阈值颜色 |
| **word-cloud** | chart | P1 | 词云图，支持权重映射 |
| **sankey** | chart | P2 | 桑基图，适合流程/转化分析 |
| **treemap** | chart | P2 | 矩形树图，适合层级占比 |
| **parallel** | chart | P2 | 平行坐标图，适合多维数据 |
| **map** | chart | P0 | 地图组件（中国地图/世界地图/省市下钻），大屏核心 widget |
| **video-player** | media | P2 | 视频播放器，支持直播流 |
| **iframe-embed** | container | P1 | 增强版 iframe，支持跨域通信 + 自适应高度 |
| **tab-container** | layout | P1 | Tab 容器，内部切换多个子画布 |
| **carousel** | layout | P2 | 轮播容器，自动/手动切换子页面 |
| **data-table-pro** | table | P1 | 增强表格：虚拟滚动、列固定、行展开、服务端分页、导出 |
| **comparison-card** | static | P1 | 对比卡片：两个指标对比（同比/环比），带趋势箭头 |
| **rank-list** | static | P1 | 排行榜列表，支持数据源驱动 + 动态排名 |
| **image-board** | static | P2 | 图片画板，支持标注/缩放/拖拽 |

#### 3.2 表单模式增强 Widget

| Widget | 分组 | 优先级 | 说明 |
|--------|------|--------|------|
| **signature-pad** | form | P1 | 签名板，支持手写签名 + 图片导出 |
| **location-picker** | form | P2 | 地点选择器（地图选点 + 地址解析） |
| **sub-form** | form | P0 | 子表单/明细表单，支持动态增删行，比 dynamic-detail-table 更通用 |
| **condition-builder** | form | P1 | 条件构建器（可视化 SQL/表达式编辑），替代手动写表达式 |
| **cascader-multi** | form | P1 | 多选级联，当前 cascader 只支持单选 |
| **rich-text-pro** | form | P2 | 增强富文本：支持图片上传、表格、代码块 |
| **approval-process** | business | P1 | 审批流程图预览，展示当前审批节点和历史 |
| **form-steps** | layout | P1 | 分步表单容器，内置步骤条 + 上一步/下一步 |

#### 3.3 通用增强

| Widget/能力 | 优先级 | 说明 |
|------------|--------|------|
| **widget 样式面板增强** | P1 | 支持边框、阴影、圆角、背景图、渐变等视觉配置 |
| **widget 复制样式** | P2 | 从一个 widget 复制样式到另一个（类似 Figma 的"复制属性"） |
| **响应式断点** | P1 | 同一 schema 支持 desktop/tablet/mobile 三种断点配置 |
| **Widget 版本兼容** | P0 | widget config 版本化，升级时自动迁移旧 schema |

### Phase 4：智能增强（2~3 周）

| 编号 | 任务 | 优先级 | 说明 |
|------|------|--------|------|
| 4.1 | **AI 页面生成增强** | P0 | 扩展 page agent 的 prompt，支持描述 → 完整大屏（含数据源配置、图表联动、布局） |
| 4.2 | **AI 数据源推荐** | P1 | 根据 widget 类型自动推荐合适的数据源配置 |
| 4.3 | **AI 布局优化** | P2 | 给定 widget 列表，AI 自动排列布局（对齐、间距、层级） |
| 4.4 | **智能模板匹配** | P1 | 用户描述需求后，从模板库中匹配最相似的模板并推荐 |

### Phase 5：工程化与性能（持续）

| 编号 | 任务 | 优先级 | 说明 |
|------|------|--------|------|
| 5.1 | **Widget 按需加载** | P0 | 大屏场景 widget 数量多，chart widget 体积大，需实现懒加载 |
| 5.2 | **画布虚拟化** | P1 | free 布局下 widget 数量超过 100 时，只渲染可视区域 |
| 5.3 | **Schema 压缩** | P1 | 大 schema 的 JSON 体积优化（去除默认值、引用复用） |
| 5.4 | **ECharts 实例池** | P1 | 大屏多图表场景复用 ECharts 实例，避免内存暴涨 |
| 5.5 | **增量发布** | P2 | 当前发布是全量替换，支持增量更新单个 widget 配置 |

---

## 四、技术架构演进建议

### 4.1 双模式架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    EditorView                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Toolbar   │  │ ModeSwitch│  │ (form / page 模式)   │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
│                                                          │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ LeftPanel │  │     Canvas       │  │  RightPanel  │  │
│  │           │  │                  │  │              │  │
│  │ FormMode: │  │  BoardStore      │  │ FormMode:    │  │
│  │  表单组件  │  │  .mode = form    │  │  联动/校验   │  │
│  │  优先展示  │  │       or         │  │  API 配置    │  │
│  │           │  │  .mode = page    │  │              │  │
│  │ PageMode: │  │                  │  │ PageMode:    │  │
│  │  图表/展示 │  │  + DataSourceStore│  │  数据源/刷新 │  │
│  │  优先展示  │  │  + ChartLinkage  │  │  交互/动画   │  │
│  └──────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 数据源中心设计

```typescript
// stores/dataSource.ts
interface DataSource {
  id: string
  name: string
  type: 'api' | 'dict' | 'static' | 'websocket'
  config: ApiSourceConfig | DictSourceConfig | StaticSourceConfig | WsSourceConfig
  cache: { enabled: boolean; ttl: number; level: 'memory' | 'indexeddb' }
  refresh: { enabled: boolean; interval: number; mode: 'poll' | 'push' }
}

// Widget 引用方式
interface WidgetDataSourceRef {
  sourceId: string          // 引用全局 DataSource
  transform?: string        // 数据转换表达式
  field?: string            // 取哪个字段
}
```

### 4.3 图表联动设计

```typescript
// composables/useChartLinkage.ts
interface ChartLinkage {
  id: string
  sourceWidgetId: string     // 触发联动的图表
  trigger: 'click' | 'select' | 'hover'
  targetWidgetIds: string[]  // 被联动的图表/表格
  paramMapping: Record<string, string>  // 参数映射
  action: 'filter' | 'drilldown' | 'highlight' | 'refresh'
}
```

### 4.4 大屏网格系统设计

```typescript
// 扩展 BoardStore.canvasConfig
interface ScreenConfig {
  resolution: '1080p' | '2K' | '4K' | 'custom'
  gridColumns: 12 | 24
  gridSize: number           // 网格单元像素
  snapToGrid: boolean
  scaleMode: 'fit-width' | 'fit-height' | 'contain' | 'stretch'
  backgroundColor: string
  backgroundGradient?: string
  backgroundImage?: string
}
```

---

## 五、实施优先级矩阵

```
紧急度 ↑
  高 │  Phase 0 基础治理        Phase 1 双模式架构
     │  (0.1~0.3)             (1.1~1.4)
     │
  中 │  Phase 3 Widget 扩展    Phase 2 页面核心能力
     │  (sub-form, filter-bar) (2.1~2.3)
     │
  低 │  Phase 5 工程化         Phase 4 智能增强
     │  (5.1~5.2)             (4.1~4.2)
     └──────────────────────────────────────→ 复杂度
        低                      高
```

**建议执行顺序**：

1. **Phase 0**（立即开始）—— 技术债治理，0 风险，直接提升开发体验
2. **Phase 1**（Phase 0 完成后）—— 双模式架构，为后续所有工作奠基
3. **Phase 2.1~2.3**（与 Phase 1 并行）—— 数据源中心 + 图表联动 + 网格系统，页面模式的核心能力
4. **Phase 3 P0 widgets**（Phase 2 完成后）—— filter-bar、map、sub-form 等高优先级 widget
5. **Phase 4**（持续）—— AI 增强，可与 widget 开发并行
6. **Phase 5**（按需）—— 性能优化在大场景出现时再启动

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 双模式增加编辑器复杂度 | 维护成本翻倍 | 通过 composable 抽象模式差异，渲染层保持统一 |
| 大屏场景性能瓶颈 | 100+ widget 卡顿 | 虚拟化 + ECharts 实例池 + 按需加载 |
| 图表联动逻辑复杂 | Bug 率上升 | 联动引擎独立为纯逻辑层，单元测试覆盖 |
| Server VALID_WIDGET_TYPES 不同步 | 新 widget 无法发布 | Phase 0 立即修复，后续 CI 自动校验 |
| AI page agent prompt 膨胀 | Token 超限 | 分层 prompt：基础能力 + 模式特定片段 |

---

## 七、里程碑时间线（建议）

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M0: 基础治理完成 | Week 2 | 类型统一、Server 同步、画布修复 |
| M1: 双模式可用 | Week 5 | 模式切换 UI、模式感知面板、模板系统 |
| M2: 页面模式核心 | Week 9 | 数据源中心、图表联动、网格系统 |
| M3: Widget 扩展 V1 | Week 12 | filter-bar、map、sub-form、data-table-pro 等 8 个新 widget |
| M4: 智能增强 V1 | Week 15 | AI 页面生成增强、数据源推荐 |
| M5: 大屏实战 | Week 18 | 完整大屏搭建 demo（10+ 图表、联动、实时刷新） |
