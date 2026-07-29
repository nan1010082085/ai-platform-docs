# Editor 项目深耕分析

> 2026-07-29 · 站在开源肩膀上构建表单/大屏 + AI 一体化独特价值
> 内部开发文档，不发布到站点（随 `editor/product/**` 排除）
> 核心思路：不对标追赶 Formily/Amis，而是站在 Vue/EP/ECharts/Vue Flow 等开源之上，聚焦"双画布 + 四大配置 + AI 一体"这个开源没有的独特价值

---

## 一、核心思路

不是"对标 Formily/Amis 补差距"（追赶者），而是"站在 Vue 3 / Element Plus / ECharts / Vue Flow 等开源之上，构建表单/大屏 + AI 一体化可视化搭建平台"（建设者）。

**深耕三问**：
1. 哪些直接复用开源（不造轮子）？
2. 哪些集成开源（站在肩膀上）？
3. 哪些自建（独特价值，开源没有）？

Formily 是表单引擎（无大屏/自由布局），Amis 是配置渲染（设计器弱），Appsmith 是应用平台（表单协议弱）。我们的独特性：双画布（Free+Flex）+ 四大配置 + AI 一体。通用组件站在 EP/ECharts 上，垂直能力（双画布/配置系统/AI 一体）自建深耕。

---

## 二、已站在其上的开源底座

| 层 | 开源 | 用途 |
|---|---|---|
| 框架 | Vue 3.5 + TypeScript | SPA |
| UI | Element Plus 2.9 | 组件库 |
| 图表 | ECharts 6.1（tree-shaken） | 大屏图表 |
| 流程画布 | Vue Flow | BPMN 设计器（flow 用，editor 可借鉴） |
| 微前端 | qiankun | 子应用集成 |
| 撤销 | immer | patches 历史 |
| 状态 | Pinia | Store |
| 构建 | Vite | dev/build |

---

## 三、可集成/兼容的开源（不重复造轮子）

### 表单生态（站在 Formily 协议上）
- **Formily 协议兼容/导入**：支持导入 Formily Schema，借势 Formily 生态（designable/组件库），降低 Formily 用户迁移成本
- 不自己造表单协议，复用 Formily 设计思路与生态

### 组件生态（站在 EP/ECharts 上）
- **Element Plus 按需**：复用 EP 组件，按需引入（当前全量，需优化 Bundle）
- **ECharts 按需**：tree-shaken 已做，深化按图表类型懒加载
- **第三方组件**：兼容 EP 生态组件，不自己造所有组件

### 可视化（站在 Vue Flow 上）
- **画布交互**：复用 Vue Flow（flow 已用），editor Free 画布交互可借鉴
- 不自己造画布引擎

---

## 四、自建的核心独特价值（开源没有，要深耕）

1. **双画布**--Free（大屏/自由页，绝对定位）+ Flex（表单，流式）。Formily 只有表单，Amis 无自由布局
2. **四大配置系统 + 事件引擎**--事件（20 动作）/联动（6 类型）/API/变量，比 Amis 配置化更强
3. **高可用 Widget 架构**--WidgetStateShell + WidgetErrorBoundary + useWidgetData + el-table-v2 虚拟化，生产级
4. **与 AI 一体**--AiSidebarView 嵌入，Formily/Amis 无原生 AI 辅助
5. **Schema 驱动 + 注册式类型**--`SchemaType = string` + registry + createWidgetPlugin
6. **视口剔除 + immer 撤销**--大屏性能与编辑体验

---

## 五、深耕方向：集成开源（省力）+ 放大独特（护城河）

### A. 集成开源（快速补齐基础，不造轮子）

1. **Formily 协议兼容**--导入转换器，借势 Formily 生态
2. **EP 按需 + ECharts 懒加载**--站在 EP/ECharts 上，优化 Bundle（CSS split + 按需引入）
3. **组件市场**--参考 npm 生态，Widget 打包分发（createWidgetPlugin 已有基础）

### B. 放大独特（聚焦护城河，开源没有）

1. **双画布深化**--Free + Flex 模式更完整，大屏+表单混合场景
2. **四大配置系统增强**--事件/联动/API/变量更强大（条件表达式增强、API 编排、变量联动）
3. **AI 一体闭环**--AI 生成 Schema -> editor 精修 -> 回灌 AI 优化，Formily/Amis 无法复制
4. **垂直 Widget**--表单/流程/审批场景 Widget（结合 ai/flow），通用平台没有
5. **大屏 + AI**--AI 辅助大屏布局（数据源推荐、图表类型选择、配色方案）

---

## 六、与 ai 协同深耕（最大独特价值）

editor + ai + flow 一体是最大护城河，通用平台无法复制：

1. **AI 生成 -> editor 编辑闭环**--ai 生成 Schema，editor 接手精修，版本 diff/局部编辑
2. **editor 数据源 -> ai 垂直 RAG**--Schema/字段语义进 ai 垂直 RAG，反哺生成
3. **垂直 Widget + ai**--审批/合规 Widget 配 AI 建议
4. **统一评测**--表单质量（字段命名/必填/布局）+ AI 生成质量（站在 ragas 上）

---

## 七、最高杠杆

- **集成开源**：Formily 协议兼容（借势生态）+ EP/ECharts 按需（Bundle 优化）
- **放大独特**：AI 一体闭环（生成 -> 编辑 -> 回灌）+ 垂直 Widget（表单/流程场景）

---

## 八、相关文档

- [architecture.md](../architecture.md) - 分层架构
- [capabilities.md](../capabilities.md) - 能力矩阵
- [widgets.md](../widgets.md) - Widget 体系
- [canvas-system.md](../canvas-system.md) - 双画布
- [product-architecture-analysis-2026-07-28.md](../product-architecture-analysis-2026-07-28.md) - 上次架构分析（Bundle 优化方案）
- [iteration-evolution.md](../iteration-evolution.md) - E1-E3 收口
