# Editor 产品能力总览

> 更新日期：2026-07-20 · 与本轮产品收口结论对齐  
> 详细演进见 [iteration-evolution.md](./iteration-evolution.md)

---

## 1. 产品定位

让非开发人员用拖拽搭建：

1. **审批 / 业务表单**（Flex）
2. **运营大屏 / 自由页面**（Free）
3. **可发布、可嵌入**的运行页（`/view/:code`）

技术内核：Schema JSON + Widget 注册表 + 事件/联动/API/变量四大配置系统。

---

## 2. 能力矩阵

| 能力域 | 能力项 | 状态 | 入口 / 证据 |
|--------|--------|------|-------------|
| 搭建 | Free 绝对定位画布 | ✅ | `layoutMode: 'free'` |
| 搭建 | Flex 流式页面 | 🟡 | 渲染 + 投放可用；容器嵌套仍单层 flatten，见 [container-nesting-decision.md](./container-nesting-decision.md) |
| 搭建 | 85+ Widget | ✅ | `widgets/` + registry |
| 搭建 | 大屏 Demo 一键创建 | ✅ | 实例新建 →「运营大屏 Demo」 |
| 搭建 | 深色大屏主题 | ✅ | `boardThemes` / canvas.themePreset |
| 交互 | 拖拽 / 缩放 / 辅助线 | ✅ | **Free**：EditorOverlay + useDrag；Flex 无 resize/辅助线 |
| 交互 | Flex 部件拖入 | 🟡 | useFlexCanvasDrop / FlexColDropZone；缺插入指示线、嵌套 2 层未落地 |
| 交互 | 撤销重做（immer） | ✅ | editorStore |
| 交互 | 对齐 / 分布 / 锁定 / 隐藏 | ✅ | useWidgetAlignment + 快捷键 |
| 性能 | 视口剔除 | ✅ | useViewportCulling（编辑态） |
| 配置 | 事件 / 联动 / API / 变量 | ✅ | PropertyPanel 配置入口 |
| 发布 | 保存 / 版本 / 发布 | ✅ | apiStore + 工具栏 |
| 发布 | 4 种交互模式 | ✅ | edit / preview / publish-* |
| 发布 | URL 只读/交互切换 | ✅ | `?interaction=` |
| 集成 | qiankun 子应用 | ✅ | microapp + platform-shared |
| 集成 | postMessage 宿主协议 | ✅ | PublishView |
| 扩展 | SchemaType 注册式 | ✅ | `type SchemaType = string` |
| 扩展 | createWidgetPlugin | ✅ | registry.ts |
| 观测 | 前端埋点 | 🟡 | telemetry；缺 server/dashboard |
| 国际化 | vue-i18n | 🟡 | 框架就绪；UI 覆盖不足 |
| 开放 | Widget 市场 / 脚手架 | ❌ | 见 Backlog |

---

## 3. 推荐验收路径

### 3.1 大屏地基（E1）

1. 打开 Editor → **实例** → 新建  
2. 布局选 **自由布局**，预设选 **运营大屏 Demo（E1 验收）**  
3. 确认：深色背景、10+ 图表、区域筛选、实时时钟、自动刷新  
4. 切换区域为「隐藏图表」→ 图表因联动隐藏  
5. 保存 → 发布 → 打开 `/view/{code}?interaction=interactive`

### 3.2 表单 Flex

1. 新建 → **Flex** → 表单 / 列表 / 详情模板  
2. 拖入控件，配置事件与联动  
3. 预览 → 保存发布

### 3.3 发布态模式

| URL | 预期 |
|-----|------|
| `/view/{code}?interaction=interactive` | 可编辑交互 |
| `/view/{code}?interaction=readonly` | 全局只读 |
| 另加 `&showModeToggle=1` | 右上角可切换 |

---

## 4. 架构速览（产品视角）

```
设计器 EditorView
  ├── 左：部件库 / 树 / 模板
  ├── 中：EditorCanvas
  │     ├── Free → SchemaRender（视口剔除）+ EditorOverlay（命中全量数据）
  │     └── Flex → WidgetRenderer
  └── 右：PropertyPanel（basic / style / props + 四大配置）

运行态 PublishView / Preview
  └── WidgetRenderer + eventEngine + linkage
```

要点：**虚拟化只影响 DOM，不影响拖拽命中**（命中仍用全量 widget 数据）。

---

## 5. 已知缺口（产品优先级）

| 优先级 | 缺口 | 影响 |
|--------|------|------|
| P0 | server `/telemetry` + dashboard | 无法度量流失与卡顿 |
| P1 | 真实 100+ widget FPS 体感验收 | 大屏上限仍偏「理论」 |
| P1 | i18n 覆盖 ≥ 80% | 出海/开源受阻 |
| P1 | Flex 插入指示线 / span / 模式切换 | Flex 编辑 chrome 弱于 free |
| P2 | PropertyPanel 继续拆分；清理 WidgetRule | 维护成本 |
| P2 | 嵌套 2 层决策落地代码 | 决策与实现不一致（仍 flatten） |
| P3 | Flex 专用交互设计稿 | designer.md 拖拽流几乎仅 free |
| P3 | SDK 脚手架 + Widget 市场 | 生态未开 |

---

## 6. 相关文档

- 根 README：[../README.md](../README.md)
- 架构：[architecture.md](./architecture.md)
- 本轮收口：[iteration-evolution.md](./iteration-evolution.md)
- 贡献：[../CONTRIBUTING.md](../CONTRIBUTING.md)
