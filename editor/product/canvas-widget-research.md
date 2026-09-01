# 双画布深化 + Widget 实用部件扩展研究

> 2026-07-30 · 基于 editor 代码库审查 + 行业需求分析
> 内部开发文档，不发布到站点

---

## 一、双画布深化方案

### 1.1 现状

- Free/Flex 切换按钮已在 EditorViewToolbar
- Free 画布：绝对定位、视口剔除、网格对齐、辅助线、对齐分布
- Flex 画布：流式布局、拖放重排、span 栅格、容器嵌套（max 2 层）
- 两种模式完全独立，不支持混合

### 1.2 深化方向

#### A. Free-Flex 混合布局（最大独特价值）

**场景**：大屏内嵌表单区域、仪表盘内嵌交互表单

**方案**：
- 新增 `flex-zone` Widget 类型（Free canvas 里的 Flex 子区域）
- `flex-zone` 在 Free 画布中按绝对定位放置
- 内部用 Flex 布局渲染子 Widget
- 实现：`WidgetRenderer` 根据 `layoutMode` 分支渲染

**示例**：
```
Free 画布
├── 图表 Widget（绝对定位）
├── 标题 Widget（绝对定位）
└── flex-zone Widget（绝对定位）
    ├── input（Flex）
    ├── select（Flex）
    └── button（Flex）
```

#### B. 响应式预览增强

**场景**：Free 大屏在不同分辨率下的预览

**方案**：
- 用 `useResponsivePosition` 的断点机制
- 在 Free 模式下支持 desktop/tablet/mobile 预览
- Widget 位置按断点覆盖

#### C. 画布性能增强

**方案**：
- Free 模式：`useViewportCulling` 已实现，可优化 buffer 计算
- Flex 模式：容器内 Widget 过多时虚拟化

---

## 二、Widget 实用部件扩展方案

### 2.1 现有 Widget 生态（96 个 registerWidget）

| 分组 | 数量 | 代表 Widget |
|------|------|------|
| form | 27 | input, select, date, cascader, upload |
| chart | 19 | bar, line, pie, radar, gauge, map |
| business | 15 | crud-list-page, user-management, kanban |
| layout | 11 | form, card, tabs, dialog, *-col |
| static | 8 | title, banner, statistic, descriptions |
| container | 5 | search-list, tab-container |
| table | 3 | table, advanced-table, tree-table |
| action | 3 | button, toolbar-buttons, filter-bar |

**垂直 Widget**（与 ai 项目行业模板呼应）：
- approval-comment / approval-role-picker / approval-user-picker（审批）
- compliance-checklist（合规）
- flow-task-actions / flow-timeline（流程）
- score-card / risk-badge（金融/质检）
- ai-suggestion-panel（AI 一体）

### 2.2 竞品 Widget 对比

| Widget | Amis | Formily | Appsmith | Editor 现状 |
|---|---|---|---|---|
| 签名板 | ✅ | ❌ | ❌ | ❌ |
| 位置选择 | ✅ | ❌ | ❌ | ❌ |
| 扫码 | ✅ | ❌ | ✅ | ✅ (qr-scanner) |
| 甘特图 | ❌ | ❌ | ❌ | ❌ |
| 思维导图 | ❌ | ❌ | ❌ | ❌ |
| 数据透视表 | ❌ | ❌ | ✅ | ❌ |
| 文件预览 | ✅ | ❌ | ❌ | ❌ |
| 富文本编辑器 | ✅ | ✅ | ❌ | ✅ (richtext) |
| KPI 卡片 | ✅ | ❌ | ✅ | ✅ (statistic) |
| 日程日历 | ✅ | ❌ | ✅ | ✅ (calendar) |

### 2.3 新增 Widget 方案（按行业需求优先级）

#### P0：行业必用 Widget

**1. 签名板（Signature）**
- 适用：审批、合同、确认场景
- 实现：Canvas 2D 绘制 + 压感支持
- 输出：base64 图片
- 参考：Amis 的 signature 组件

**2. 甘特图（Gantt）**
- 适用：项目管理、排期展示
- 实现：基于 ECharts 自定义或 dhtmlxGantt
- 输出：任务列表 + 时间轴
- 参考：Jira、Notion

**3. 数据透视表（Pivot Table）**
- 适用：数据分析、报表
- 实现：基于 advanced-table 扩展
- 输出：行列分组 + 聚合

#### P1：通用增强 Widget

**4. 思维导图（Mind Map）**
- 适用：头脑风暴、知识整理
- 实现：基于 d3.js 或 markmap
- 输出：树形结构 JSON

**5. 文件预览器（File Viewer）**
- 适用：文档查看、审批附件
- 实现：PDF.js + 图片查看器
- 输入：文件 URL/base64

**6. 流程图编辑器（Flow Editor）**
- 适用：流程设计、拓扑图
- 实现：基于 Vue Flow（已有依赖）
- 输出：节点+边 JSON

#### P2：行业专属 Widget

**7. 医疗病历表单（Medical Record）**
- 适用：医疗行业
- 实现：基于 sub-form + 专用字段模板
- 输出：结构化病历 JSON

**8. 金融风险矩阵（Risk Matrix）**
- 适用：金融/合规
- 实现：基于表格 + 颜色映射
- 输出：风险等级矩阵

**9. 能耗仪表盘（Energy Dashboard）**
- 适用：制造/能源
- 实现：组合 chart + statistic Widget
- 输出：能耗数据面板

---

## 三、实施计划

### 第一批（可立即实施）
1. **签名板 Widget** - Canvas 2D，独立，不依赖外部库
2. **甘特图 Widget** - 基于 ECharts，有基础
3. **数据透视表** - 基于 advanced-table 扩展

### 第二批（需依赖）
4. 思维导图 - 需引入 markmap
5. 文件预览器 - 需引入 PDF.js
6. 流程图编辑器 - 复用 Vue Flow

### 第三批（行业定制）
7. 医疗病历 - 需行业知识
8. 金融风险矩阵 - 需行业知识
9. 能耗仪表盘 - 需行业知识

### 双画布深化
1. Free-Flex 混合布局 - 需修改 WidgetRenderer + EditorCanvas
2. 响应式预览 - 基于 useResponsivePosition 扩展
3. 画布性能增强 - 渐进式优化

---

## 四、站在开源肩膀上

- **甘特图**：复用 ECharts 甘特图或 dhtmlxGantt（开源）
- **思维导图**：复用 markmap（开源）
- **签名板**：Canvas 2D API，不依赖外部
- **数据透视表**：基于 advanced-table 扩展，复用现有 table 能力
- **流程图编辑器**：复用 Vue Flow（已依赖）
- **双画布混合**：复用现有 WidgetRenderer + EditorCanvas 架构

---

## 五、相关文档

- [editor/deep-analysis-2026-07-29.md](./deep-analysis-2026-07-29.md) - editor 深耕分析
- [editor/architecture.md](../architecture.md) - 架构设计
- [editor/canvas-system.md](../canvas-system.md) - 双画布系统
- [editor/widgets.md](../widgets.md) - 控件体系
