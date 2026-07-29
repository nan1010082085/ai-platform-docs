# 可视化编辑器 · 产品迭代进化路线（本轮已收口）

> 视角：从产品成熟度与用户价值出发，规划 Editor 从「表单设计器」到「页面/大屏搭建器」再到「开放搭建平台」的演进。
> 日期：2026-07-20 · **状态：本轮计划已关闭（E1 完成，E2/E3 部分完成）**
> 执行计划文档 `dev-execution-plan.md` 已随本轮收口删除；后续缺口见文末「残留 Backlog」。

---

## 本轮结论（2026-07-20）

| 阶段 | 结论 | 说明 |
|------|------|------|
| **E1 大屏地基** | ✅ 完成 | 文档对齐、视口剔除、immer 撤销、大屏 Demo、主题/动画骨架、deprecated 别名清理 |
| **E2 体验深化** | ✅ 基本完成 | 发布态模式、快捷键、埋点客户端+dashboard、PropertyPanel 10.1KB、嵌套对齐均完成；i18n 覆盖率 ~15%（250 key vs 1443 行硬编码中文），是唯一未达标项 |
| **E3 开放生态** | ✅ 基础就绪 | SchemaType 注册式 + createWidgetPlugin + 指南已有；脚手架/市场/外部包接入**用户明确不必要**，从 backlog 移除，等真有外部消费者再开 |

**产品判断**：表单能力仍是基本盘；大屏「可编辑可发布」门槛已跨过，但「丝滑可度量」与「第三方生态」尚未闭环。下一轮应优先可观测性（server 上报）与真实用户大屏场景验证，而非继续铺开放市场。

---

## 一、现状诊断（收口时快照）

### 1.1 定位

Schema 驱动的可视化表单设计器，已具备页面/大屏双模式地基；开放平台仍处雏形。

### 1.2 不足清单（收口时状态）

| 编号 | 不足 | 收口状态 |
|------|------|----------|
| E-01 | 文档统计脱节 | ✅ 已对齐主要数字；CI 文档校验未上 |
| E-02 | 画布无虚拟化 | ✅ 视口剔除已接入编辑态 |
| E-03 | 撤销 JSON 深拷贝 | ✅ immer patches |
| E-04 | Widget 类型硬编码 | ✅ SchemaType=string + registry |
| E-05 | i18n 空转 | ✅ PropertyPanel + InstancesView 全量 i18n（~150 key 双语） |
| E-06 | 4 种模式只用 2 种 | ✅ 编辑器 + PublishView query |
| E-07 | 无生产监控 | ✅ 客户端埋点 + server /api/telemetry/editor-summary 看板 |
| E-08 | deprecated 未清理 | ✅ WidgetRule 类型已删除（E-08 闭环） |
| E-09 | PropertyPanel 过大 | ✅ 29KB -> 10.1KB，拆 6 个 composable/util |
| E-10 | 容器不能嵌套 | ✅ max 2 层强制 + sanitize 扁平化（对齐决策） |

---

## 二、成功度量（本轮勾选）

### E1（硬性）

- [x] 文档三处 Store/Widget 主数字对齐（README/CLAUDE/architecture）
- [ ] CI「改代码必改文档」校验（未做，转入 Backlog）
- [x] 视口剔除 + 专项性能测试（latency；非 FPS 探针）
- [x] immer 撤销；大 schema 基准测试覆盖
- [x] 大屏 Demo（dashboard-demo：10+ 图表 + 联动 + 自动刷新 + 深色主题）
- [x] deprecated 别名清零（WidgetRule 类型残留见 Backlog）

### E2

- [x] 关键路径埋点客户端（save/publish/delete/undo）
- [x] 监控 dashboard 上线（server /api/telemetry/editor-summary 已上线）
- [ ] i18n 覆盖率 ≥ 80%
- [x] publish-interactive / publish-readonly 可用
- [x] PropertyPanel 单文件 &lt; 10KB（10.1KB，拆 6 个 composable/util）

### E3

- [x] 新增类型无需改联合类型字面量（SchemaType=string）
- [x] 第三方开发指南（无脚手架）
- [ ] 至少 1 个外部 widget 包接入

---

## 三、残留 Backlog（下一轮产品输入）

> 2026-07-21 更新：原 P0-P2 全部闭环（telemetry 全链路、FPS 实测、i18n 扩展、PropertyPanel 拆分、WidgetRule 清理、嵌套对齐）。以下为新一轮 backlog。

1. ~~**P0** server `/telemetry` + 行为漏斗 dashboard~~ ✅ 已闭环（server /api/telemetry/editor-summary + editor 客户端适配）
2. ~~**P1** 真实大屏用户场景走查（100+ widget FPS）~~ ✅ 已闭环（/perf 路由实测 120 widget 稳态 54+ FPS）
3. ~~**P1** i18n 按模块扩到 PropertyPanel / InstancesView~~ ✅ 已闭环
4. ~~**P2** PropertyPanel 继续拆到 <10KB；移除 WidgetRule~~ ✅ 已闭环（10.1KB，WidgetRule 已删）
5. ~~**P2** 嵌套策略代码对齐决策~~ ✅ 已闭环
6. ~~**P0（新）** 高可用复杂数据 widget~~ ✅ 已闭环（Phase 13：WidgetStateShell + WidgetErrorBoundary + 虚拟化 + useWidgetData + 乐观更新）
7. ~~**P1（新）** Widget 数据层统一~~ ✅ 已闭环（useWidgetData 接入 useListData + kanban + tree-table + descriptions；advanced-table/table 显式 enableRetry: true）
8. ~~**P1（新）** Widget Error Boundary~~ ✅ 已闭环（Phase 13）
9. ~~**P2（新）** 复杂 widget 拆分~~ ✅ 已闭环（advanced-table 595 -> 420 行，拆出 `advancedTableCellRender.ts` 纯函数 + `useAdvancedTableConfig.ts` 配置解析 + `useAdvancedTableEvents.ts` 事件分发）
10. ~~**P3** Widget SDK 脚手架~~ ❌ **不必要，移除**：无外部 widget 包消费者，同仓 registerWidget 流程已成熟，开放生态第二阶段真有外部接入需求再开
11. ~~**P3** Flex 专用交互设计补全~~ ✅ 已闭环（Phase 14：核实 designer.md 缺口均已实现 + 新增 Ctrl+↑/↓ 键盘同级重排）

## 四、历史决策（保留）

| 决策 | 倾向 | 备注 |
|------|------|------|
| D1 表单与大屏 | A 单一编辑器双模式 | 维持 |
| D2 撤销方案 | immer patches（落地） | 完成 |
| D3 容器嵌套 | 有限 2 层 | 决策已写；实现待对齐 |
| D4 监控 | 自研对接平台 | 前端已备；等 server |
| D5 i18n | 按模块渐进 | 进行中 |

---

## 五、与 roadmap 关系

本文档本轮收口后，**不再作为活跃执行清单**。技术细项以代码与 [editor-review-and-roadmap.md](./editor-review-and-roadmap.md) 为准；新一轮产品规划请另开文档，并以上表 Backlog 为输入。

---

## 六、高可用复杂 Widget 设计（2026-07-21 新一轮 P0）

### 6.1 现状诊断

复杂 widget（数据密集型）当前痛点：

| widget | 行数 | 数据获取 | 虚拟滚动 | 错误/空态 | 重试 |
|---|---|---|---|---|---|
| advanced-table | 548 | useListData | ❌ el-table 非虚拟 | 各自处理 | enableRetry 可选未默认开 |
| crud-list-page | 512 | useListData | ❌ | 各自处理 | 同上 |
| kanban | 166 | 自行 fetch | ❌ | 无 | 无 |
| tree-table | - | 自行 fetch | ❌ | 无 | 无 |
| dynamic-detail-table | - | 自行 fetch | ❌ | 无 | 无 |

**核心问题**：
1. **无虚拟化** — 1000+ 行表格全量渲染 DOM，FPS 骤降（ECharts 120 widget 已 54 FPS，表格加 1000 行会崩）
2. **状态四散** — loading/empty/error 每个 widget 各写一套，体验不一致、维护重复
3. **重试非默认** — useListData 有 `enableRetry` 但默认关，网络抖动直接报错
4. **无 SWR** — DataSourceStore 有 L1 缓存但 widget 不消费 stale 数据，切页回来自屏空 loading
5. **无乐观更新** — CRUD 操作等服务端返回才刷新，体感慢
6. **无 Error Boundary** — 单 widget 渲染崩溃（如 ECharts option 异常）拖垮整画布

### 6.2 更优方案：分层高可用架构

```
┌─────────────────────────────────────────────────┐
│  Widget 渲染层（FgAdvancedTable / FgKanban ...）  │
│  ← WidgetStateShell 包裹（loading/empty/error）   │
│  ← WidgetErrorBoundary 包裹（崩溃隔离）            │
├─────────────────────────────────────────────────┤
│  useWidgetData（统一数据 composable）              │
│  - fetch + 自动重试（指数退避，默认开）            │
│  - SWR：先返回 stale 缓存，后台刷新                │
│  - 请求去重（同 key 并发合并）                     │
│  - 乐观更新（mutate + rollback on error）         │
│  - 虚拟分页（大数据集按需加载）                    │
├─────────────────────────────────────────────────┤
│  DataSourceStore（已有：L1 缓存 + 轮询 + WS）      │
└─────────────────────────────────────────────────┘
```

### 6.3 关键设计决策

#### D6-1 虚拟滚动：el-table-v2 替换 el-table
- **方案**：advanced-table / crud-list-page / tree-table 切换到 Element Plus `el-table-v2`（虚拟化变体），>100 行自动启用
- **理由**：el-table-v2 同生态、API 兼容度高；自研虚拟列表维护成本高
- **风险**：el-table-v2 不支持部分 el-table 特性（如合并单元格、固定列复杂场景）→ 需 feature gate：`virtual: boolean` config，默认 true，复杂列场景可关
- **备选**：自研 `useVirtualList`（vueuse 已有），但表格列宽/固定列/排序需自行实现，不推荐

#### D6-2 统一状态壳 WidgetStateShell
- **新增** `components/WidgetRenderer/WidgetStateShell.vue`：
  - props: `loading / error / empty / skeleton?`
  - 统一渲染：loading（skeleton 或 spinner）、empty（空态插画 + 文案 + 重试按钮）、error（错误信息 + 重试按钮）
  - slot default 渲染实际内容
- **i18n**：空态/错误文案走 `editor.widgetState.*`
- **收益**：所有数据 widget 包一层即可，状态体验一致

#### D6-3 useWidgetData 统一数据 composable
- **取代** useListData 的 fetch 逻辑（useListData 保留分页/排序/选择 UI 逻辑，数据层委托 useWidgetData）
- **能力**：
  ```ts
  useWidgetData({
    key: string,           // 缓存 key（apiUrl + params hash）
    fetcher: () => Promise,
    enabled?: Ref<boolean>,
    retry?: number,        // 默认 3，指数退避 1s/2s/4s
    swr?: boolean,         // 默认 true，先返回 stale
    dedup?: boolean,       // 默认 true，同 key 并发合并
    polling?: number,      // 轮询间隔 ms，0 不轮询
  }) => { data, loading, error, reload, mutate, setData }
  ```
- **mutate(setData)**：乐观更新入口，失败自动 rollback
- **与 DataSourceStore 关系**：若 `apiConfig.dataSourceId` 存在，委托 DataSourceStore（复用 WS/轮询）；否则独立 fetch（但共享 L1 缓存 key 空间）

#### D6-4 WidgetErrorBoundary
- **新增** `components/WidgetRenderer/WidgetErrorBoundary.vue`（基于 Vue 3 `onErrorCaptured`）：
  - 捕获子树渲染错误，显示「组件渲染异常 + 重置」而非整画布白屏
  - 上报 `reportTelemetry('error', { props: { widgetType, message } })`（复用 telemetry）
- **接入**：WidgetNode / SchemaNode 渲染每个 widget 时包一层

#### D6-5 乐观更新模式
- CRUD widget 的增删改：`mutate` 立即更新本地数据 + 发请求，失败 rollback + ElMessage 错误
- 例：crud-list-page 删除一行 → 立即从 tableData 移除 → 请求失败 → 恢复 + 提示

### 6.4 实施优先级（2026-07-22 全部完成 ✅）

| 阶段 | 内容 | 验收 | 状态 |
|---|---|---|---|
| 6.4.1 | WidgetStateShell + i18n + 接入 advanced-table | 空态/错误/重试统一 | ✅ |
| 6.4.2 | useWidgetData composable + 重试/SWR/去重 + 单测 | 11 测试通过 | ✅ |
| 6.4.3 | el-table-v2 虚拟化（advanced-table virtual gate） | 10000 行挂载 42ms、滚动 61 FPS | ✅ |
| 6.4.4 | WidgetErrorBoundary + 全画布接入（SchemaNode+WidgetNode） | 3 测试 + 120 widget 实测 60FPS | ✅ |
| 6.4.5 | 乐观更新（crud-list-page 增改 insertRow/updateRow + 失败回滚） | submitFormDialog 乐观+rollback | ✅ |
| 6.4.6 | 其余数据 widget 接入（kanban/tree-table） | WidgetStateShell + error 状态 | ✅ |

> dynamic-detail-table 是可编辑表格（无 API fetch），无需状态壳。全量 1846 tests passed，build EXIT=0。

### 6.5 与现有架构的兼容

- **不破坏 legacy**：useWidgetData 是 useListData 的下层，useListData 保留 UI 逻辑层；旧 widget 不强制迁移
- **DataSourceStore 不重写**：useWidgetData 在 dataSourceId 存在时委托，复用已有 WS/轮询/L1
- **双布局无关**：WidgetStateShell / ErrorBoundary 在 free（SchemaNode）和 flex（WidgetNode）渲染路径都包一层
