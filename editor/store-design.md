# Store 设计

7 个 Pinia Store，各司其职。

## useWidgetStore（`stores/widget.ts`）

Widget 数据的唯一 source of truth。

**职责**：
- Widget[] 的 CRUD（addWidget、removeWidget、updateWidget）
- 树结构遍历（findWidget、findParentContainer）
- 位置操作（moveWidget、resizeWidget）
- 容器操作（addToContainer、reparentToContainer）
- 批量操作（loadWidgets、clearWidgets）
- 数据补全（normalizePosition — 确保所有 widget 有 position）

**数据**：`widgets: Ref<Widget[]>` — 根级 Widget 数组

## useEditorStore（`stores/editor.ts`）

编辑器交互状态。

**职责**：
- 选中状态（selectedId）
- 模式切换（edit/preview）
- 撤销/重做（history stack，主画布和弹窗独立管理）
- 剪贴板（copy/paste）
- 脏标记（isDirty）

## useSchemaStore（`stores/api.ts`）

Schema 的后端 CRUD。

**职责**：
- Schema 列表（list、search）
- Schema 详情（loadSchema）
- Schema 保存（saveSchema）
- Schema 发布（publishSchema）
- 已发布 Schema 查询

## useDragStore（`stores/drag.ts`）

拖拽状态管理。

**职责**：
- 拖拽源（panel/canvas）
- 拖拽位置（dragX、dragY）
- 碰撞容器（hoveredContainerId）
- 辅助线（guideLines、snapX、snapY）
- 放置预览线（dropPreviewLine）

## useBoardStore（`stores/board.ts`）

画布视口状态。

**职责**：
- 画布尺寸（width、height）
- 缩放比例（zoom）
- 滚动位置（scrollLeft、scrollTop）
- 画布名称（name）

## useAppStore（`stores/app.ts`）

全局应用状态。

**职责**：
- 主题（theme）
- 语言（locale）
- 全局配置

## useRequestStore（`stores/request.ts`）

HTTP 请求状态。

**职责**：
- 请求队列
- 请求状态追踪
- 错误处理
