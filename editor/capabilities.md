# Editor 产品能力总览

> 面向使用者与集成方，说明可视化编辑器当前可用能力。

---

## 1. 产品定位

用拖拽搭建：

1. **审批 / 业务表单**（Grid）
2. **运营大屏 / 自由页面**（Free）
3. **可发布、可嵌入**的运行页（`/view/:code`）

技术内核：Schema JSON + Widget 注册表 + 事件 / 联动 / API / 变量四大配置系统。

---

## 2. 能力清单

| 能力域 | 能力项 | 说明 |
|--------|--------|------|
| 搭建 | Free 绝对定位画布 | `layoutMode: 'free'` |
| 搭建 | Grid 栅格布局 | 多列自适应、跨列 span |
| 搭建 | 丰富控件库 | 表单、图表、容器等 Widget |
| 搭建 | 大屏 Demo | 实例新建可一键创建运营大屏示例 |
| 搭建 | 深色大屏主题 | 主题预设 |
| 交互 | 拖拽 / 缩放 / 辅助线 | Free 与 Grid 各有编辑手势 |
| 交互 | 撤销重做 | 设计器操作历史 |
| 交互 | 对齐 / 分布 / 锁定 / 隐藏 | 快捷键与工具栏 |
| 配置 | 事件 / 联动 / API / 变量 | 属性面板统一配置 |
| 发布 | 保存 / 版本 / 发布 | 工具栏与 API |
| 发布 | 交互模式 | edit / preview / publish；URL `?interaction=` |
| 集成 | qiankun 子应用 | 可嵌入宿主 |
| 集成 | postMessage 宿主协议 | 发布页与宿主通信 |
| 扩展 | SchemaType 注册式 | 自定义页面类型 |
| 扩展 | createWidgetPlugin | 第三方控件接入 |

---

## 3. 推荐体验路径

### 3.1 大屏

1. 打开 Editor → **实例** → 新建  
2. 布局选 **自由布局**，预设选运营大屏 Demo  
3. 确认深色背景、图表与区域筛选联动  
4. 保存 → 发布 → 打开 `/view/{code}?interaction=interactive`

### 3.2 表单 Grid

1. 新建 → **Grid** → 表单 / 列表 / 详情模板  
2. 拖入控件，配置事件与联动  
3. 预览 → 保存发布

### 3.3 发布态模式

| URL | 预期 |
|-----|------|
| `/view/{code}?interaction=interactive` | 可编辑交互 |
| `/view/{code}?interaction=readonly` | 全局只读 |
| 另加 `&showModeToggle=1` | 右上角可切换 |

---

## 4. 架构速览

```
设计器 EditorView
  ├── 左：部件库 / 树 / 模板
  ├── 中：EditorCanvas
  │     ├── Free → SchemaRender + 编辑覆盖层
  │     └── Grid → WidgetRenderer（grid 引擎）
  └── 右：PropertyPanel（基础 / 样式 / 属性 + 四大配置）

运行态 PublishView / Preview
  └── WidgetRenderer + 事件引擎 + 联动
```

---

## 5. 相关文档

- [架构设计](./architecture.md)
- [控件体系](./widgets.md)
- [第三方控件指南](./third-party-widget-guide.md)
- [更新日志](./changelog.md)
