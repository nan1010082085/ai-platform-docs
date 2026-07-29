---
outline: deep
---

# 双画布系统

编辑器支持 Free（绝对定位）和 Flex（流式布局）两种画布模式。

## 模式对比

| 维度 | Free 模式 | Flex 模式 |
|------|----------|----------|
| 布局方式 | 绝对定位 (left/top/width/height) | 流式排列 (CSS Flow) |
| 适用场景 | 大屏、自由页面、仪表盘 | 表单、列表、详情页 |
| 拖拽交互 | 自由拖拽 + 辅助线 + 对齐 | 拖入 + 排序 + 宽度 resize |
| Widget 定位 | position 属性（px/%） | DOM 顺序 |
| 视口剔除 | ✅ 支持 | ❌ 不需要 |
| 缩放 | 支持 50-200% | 自适应容器 |

## Free 模式

### 渲染路径

```
EditorCanvas
  └─ SchemaRender :widgets (预览模式)
       └─ SchemaNode (position: absolute)
  └─ EditorOverlay (编辑模式)
       ├─ 选中框 + resize handle
       ├─ 拖拽对齐辅助线
       └─ SchemaNode
```

### 核心能力

- **绝对定位**：每个 Widget 独立定位，互不影响
- **px/% 单位**：`xUnit/yUnit/wUnit/hUnit` 支持像素和百分比
- **视口剔除**：`useViewportCulling` 跳过不可见 Widget 的 DOM 渲染
- **网格吸附**：`snapToGrid` + `gridColumns` + `gridRowHeight`
- **对齐分布**：左/右/居中对齐 + 水平/垂直等距分布
- **锁定/隐藏**：Widget 锁定防误操作，隐藏不参与渲染

### 画布配置

```typescript
interface CanvasConfig {
  width: number           // 画布宽度
  height: number          // 画布高度
  widthUnit: 'px' | '%'   // 宽度单位
  heightUnit: 'px' | '%'  // 高度单位
  backgroundColor: string // 背景色
  padding: string         // 内边距
  zoom: number            // 缩放比例 (50-200)
  themePreset?: string    // 大屏主题
  layoutMode: 'free' | 'flex'
  // 网格
  snapToGrid?: boolean
  gridColumns?: 12 | 24
  gridRowHeight?: number
}
```

## Flex 模式

### 渲染路径

```
EditorCanvas
  └─ WidgetRenderer (Flex 模式)
       └─ el-form + SchemaRender :schema
            └─ WidgetNode (flow layout)
```

### 核心能力

- **流式布局**：Widget 按 DOM 顺序排列，自动换行
- **拖入指示线**：拖入 Widget 时显示蓝色插入指示线
- **拖拽重排**：同级 Widget 拖拽改变顺序
- **宽度 resize**：右边缘拖拽调整宽度
- **容器嵌套**：最多 2 层嵌套（form/card/tabs/dialog 内放基础组件）
- **span 栅格**：1-24 栅格 span 控制单元格宽度

## 多分辨率适配

`useCanvasScale` composable 支持 4 种缩放模式：

| 模式 | 说明 |
|------|------|
| `contain` | 等比缩放，适应容器（默认） |
| `fit-width` | 适应容器宽度 |
| `fit-height` | 适应容器高度 |
| `stretch` | 拉伸填充 |

预设分辨率：1080p / 2K / 4K / 自定义。

## 响应式断点

`useResponsivePosition` composable 支持 per-breakpoint 位置覆盖：

```typescript
interface ResponsivePosition {
  desktop?: Partial<WidgetPosition>
  tablet?: Partial<WidgetPosition>
  mobile?: Partial<WidgetPosition>
  hidden?: boolean  // 某断点下隐藏
}
```

编辑器工具栏提供 desktop/tablet/mobile 切换预览。

## 多画布/多页面

BoardPage 类型支持一个 Schema 包含多个页面：

```typescript
interface BoardPage {
  id: string
  name: string
  widgets: Widget[]
}
```

PageTabBar 组件提供页面切换 UI。
