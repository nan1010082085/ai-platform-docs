---
title: 更新日志
---

# 可视化编辑器 · 更新日志

> 记录编辑器（表单 / 页面 / 大屏设计器）的主要功能迭代。
> 内部规划文档归档于 `editor/iteration-evolution.md`，不在此展示。

## 2026-08-03 · Flex -> Grid 布局引擎改造

### 布局模式改名 flex -> grid

- `BoardLayoutMode` 从 `"free" | "flex"` 改为 `"free" | "grid"`
- 全量改名：类型定义、工具栏、属性面板、i18n、测试（约 30 个文件）
- 旧数据兼容：`useSchemaLoader` 加载时 `"flex" -> "grid"` 映射
- 工具栏移除布局切换按钮，两种布局创建时固定不可切换
- 状态栏修复：根据 `schemaType` 正确显示表单/页面 + 图标

### Grid 引擎（参考 formily Grid）

- 新增 `utils/gridEngine.ts`：移植 formily `calcSatisfyColumns`、`computeTemplateColumns`、`resolveChildSpan`
- 新增 `composables/useGridEngine.ts`：Vue composable 封装，ResizeObserver + computed
- `WidgetRenderer` 集成：`flowContainerStyle` 用 grid engine 驱动，子节点 `gridColumn` 包裹
- `CanvasConfig.gridLayout`：rowGap / columnGap / minColumns / maxColumns / minWidth / maxWidth / colWrap
- `Widget.gridSpan`：跨列数（-1 = 撑满剩余列）
- 画布属性面板暴露全部 9 个 grid 参数
- Widget 属性面板暴露 `gridSpan`（根级 widget）
- `boardTemplates` 创建时默认 gridLayout（maxColumns=3, minWidth=200）
- `widgetLayoutAdapter` 满宽部件默认 `gridSpan=-1`

### Widget 双画布适配

- 移除 11 个容器 widget 的 `contexts: ["free"]` 限制，双模式可用
- 仅 `row-container` 保留 `contexts: ["grid"]`（24 栅格 span，grid 专属）

### 简化自 formily（编辑器不需要）

- breakpoints（响应式断点）-- 编辑时固定，响应式交给运行时
- strictAutoFit（严格自适应）-- span 收缩更直觉
- shouldVisible（条件显示）-- 由 widget.hidden 处理
- MutationObserver -- Vue 响应式替代
- @formily/reactive -- 用 Vue ref/computed

## 2026-07-20 · E1–E3 收口

### E1 大屏地基

- 文档统计对齐、视口剔除、immer 撤销、大屏 Demo
- 主题/动画骨架、deprecated 别名清理

### E2 体验深化

- 发布态模式、快捷键、埋点客户端 + dashboard
- PropertyPanel 29KB -> 10.1KB（拆分 6 个 composable/util）
- 嵌套对齐、i18n 覆盖率 ~15%

### E3 开放生态

- SchemaType 注册式 + createWidgetPlugin + 第三方 Widget 指南
- 脚手架/市场因无外部消费者从 backlog 移除

## 度量基线

| 指标 | 数量 |
|---|---|
| Widget 目录 | 86 |
| registerWidget | 97 |
| Pinia Store | 12 |
| Composable | 46 |
| Vitest 测试 | ~1941 |

## 更早 · 能力地基

- **双画布系统**：Free 绝对定位 + Grid CSS Grid 布局
- **四大配置系统**：事件 / 联动 / API / 变量
- **条件表达式**：visibleOn / disabledOn / requiredOn，沙箱执行
- **事件引擎**：18 种动作类型
- **qiankun 微前端**：子应用集成
