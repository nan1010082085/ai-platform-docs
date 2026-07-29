# Editor 项目深耕分析

> 2026-07-29 · 基于低代码/表单设计器行业对标的深耕分析与优先级规划
> 内部开发文档，不发布到站点（随 `editor/product/**` 排除）
> 对标项目认知截至知识截止，非实时检索；需精确对比请补充竞品版本/URL

---

## 一、行业全景：低代码/表单设计器梯队

| 梯队 | 项目 | 定位 | 核心优势 | 短板 |
|---|---|---|---|---|
| 表单引擎 | **Formily**（阿里） | 表单协议 + 设计器 | Schema 协议、联动、生态（designable/react-vue） | 大屏/自由布局弱 |
| 配置渲染 | **Amis**（百度） | JSON 配置渲染 | 组件多、配置化、响应式 | 设计器弱 |
| 应用平台 | **Appsmith / ToolJet** | 低代码应用 | 数据源、JS 扩展、市场 | 表单协议弱 |
| 搭建器 | **H5-Dooring / 鲁班** | H5/大屏搭建 | 模板、营销场景 | 表单弱 |

---

## 二、editor 项目差异化优势（要守住）

1. **双画布**--Free（大屏/自由页，绝对定位）+ Flex（表单，流式）。Formily 只有表单，Amis 无自由布局，这是 editor 独特。
2. **四大配置系统 + 事件引擎**--事件（20 动作类型）/联动（6 类型）/API/变量，比 Amis 配置化更强、比 Formily 联动更全。
3. **高可用 Widget 架构**--WidgetStateShell + WidgetErrorBoundary + useWidgetData（重试/SWR/去重/乐观更新）+ el-table-v2 虚拟化（10000 行 42ms），生产级。
4. **与 AI 一体**--AiSidebarView 嵌入，Formily/Amis 都没有原生 AI 辅助。
5. **Schema 驱动 + 注册式类型**--`SchemaType = string` + registry + createWidgetPlugin，扩展无需改类型联合。
6. **视口剔除 + immer 撤销**--大屏性能与编辑体验。

---

## 三、与头部差距（要补的）

| 维度 | Formily/Amis/Appsmith | editor 现状 | 差距 |
|---|---|---|---|
| **生态** | Formily 完整生态（designable/react-vue/组件库） | 闭源，无外部消费者 | 生态未开 |
| **性能** | Formily 按需、Amis 轻量 | Bundle 3.7MB（UMD 单包） | 首屏重 |
| **i18n** | Formily/Amis 多语言 | 16.9% 覆盖 | 出海受阻 |
| **组件市场** | Amis 社区组件、Appsmith 市场 | createWidgetPlugin 有，无市场 | 生态未开 |
| **移动端** | Amis 响应式、H5-Dooring 移动 | 响应式断点骨架有，落地浅 | 移动场景弱 |
| **协议兼容** | Formily 协议成标准 | 自有 Schema | 迁移成本高 |
| **代码分割** | 按需加载 | qiankun UMD 限制 | 无法 code split |

---

## 四、深耕优先级

### P0（体验与性能）

**1. Bundle 优化** - 首屏体验，开源第一印象
- CSS code splitting（当前 `cssCodeSplit: false`）
- 路由级懒加载（EditorView/InstancesView/PublishView）
- Widget 分组懒加载（chart/business 按需）
- Element Plus 按需引入（改 `shared/platform-shared/config/element.ts`）
- 目标：首屏 JS < 1MB gzip（当前 3.7MB -> gzip 1.24MB）
- product-architecture-analysis 已列方案，需落地

**2. i18n 80%+** - 出海/开源门槛
- Widget config 翻译层（`translateWidgetPropLabel/Desc` 已有，需扩展）
- 高频组件 locale key（input/select/table/chart/crud-list-page）
- 目标：16.9% -> 80%+

### P1（生态与场景）

**3. 组件市场 + 第三方 Widget 生态**
- createWidgetPlugin 打包分发
- 市场 UI（浏览/搜索/安装）
- 版本管理 + 签名
- 对标 Appsmith 市场

**4. 移动端适配深化**
- 响应式断点落地（desktop/tablet/mobile 三套布局可用）
- 移动端预览模式
- 移动端专属组件（如手势、底部抽屉）
- `useResponsivePosition` 骨架已有，需落地

**5. Formily 协议兼容/导入**
- Formily Schema 导入转换器
- 降低 Formily 用户迁移成本，借势生态

### P2（架构演进）

**6. 代码分割架构**
- 评估 qiankun -> Module Federation 迁移
- 解除 UMD 限制，支持全量 code splitting
- 跨项目协调（shared/platform-shared）

**7. Schema 协议开放**
- 发布 Schema 协议文档
- 渲染器独立包（WidgetRenderer 可被外部消费）
- Widget SDK（脚手架，当前 backlog 移除，可重启）

---

## 五、与 ai 协同深耕点（最大差异化）

editor + ai 一体是最大护城河，协同深耕：

1. **AI 生成 -> editor 可视化编辑闭环**：ai 生成 Schema，editor 接手精修。深化版本 diff、局部编辑、AI 辅助布局。
2. **editor 数据源 -> ai RAG 自动索引**：editor 的 Schema/数据自动进 ai RAG，反哺 AI 生成质量。
3. **editor 表单 + flow 审批 + ai 建议**：RuntimeAgent 在审批节点给建议，三能力一体。
4. **统一评测**：editor 表单质量（字段命名/必填/布局）+ ai 生成质量统一评测。

---

## 六、最高杠杆切入建议

- **Bundle 优化**：首屏体验，开源第一印象，方案已就绪待落地
- **i18n 80%+**：出海/开源门槛，翻译层已有基础

---

## 七、相关文档

- [architecture.md](../architecture.md) - 分层架构
- [capabilities.md](../capabilities.md) - 能力矩阵
- [widgets.md](../widgets.md) - Widget 体系
- [canvas-system.md](../canvas-system.md) - 双画布
- [product-architecture-analysis-2026-07-28.md](../product-architecture-analysis-2026-07-28.md) - 上次架构分析（含 Bundle 优化方案）
- [iteration-evolution.md](../iteration-evolution.md) - E1-E3 收口
