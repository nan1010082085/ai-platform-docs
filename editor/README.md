# Editor 文档索引

`@editor` - Schema 驱动的可视化表单 / 页面 / 大屏编辑器（Vue 3 + Vite + Element Plus）

本地：`cd editor && pnpm dev` -> http://localhost:5100

---

## 快速导航

| 我想… | 看这里 |
|--------|--------|
| 了解产品能做什么 | [能力总览](./capabilities.md) |
| 理解架构与分层 | [架构文档](./architecture.md) |
| 新做一个 Widget | [Widget 开发](./widget-development.md) · [第三方指南](./third-party-widget-guide.md) |
| 配属性面板 | [属性面板](./property-panel.md) |
| 接 qiankun / 嵌入发布页 | [qiankun](./qiankun-integration.md) · [实例与发布设计](./design/instances-publish.md) |

---

## 文档目录

### 产品与架构

| 文档 | 说明 |
|------|------|
| [capabilities.md](./capabilities.md) | 产品能力矩阵、验收路径、已知缺口 |
| [architecture.md](./architecture.md) | 分层、Store、渲染双路径、Schema |

### 开发

| 文档 | 说明 |
|------|------|
| [widget-development.md](./widget-development.md) | 内置 Widget 开发步骤 |
| [third-party-widget-guide.md](./third-party-widget-guide.md) | `createWidgetPlugin` 扩展 |
| [property-panel.md](./property-panel.md) | propertyPanel 声明与编辑器 |
| [widgets.md](./widgets.md) | Widget 体系总览 |
| [canvas-system.md](./canvas-system.md) | 双画布系统 |
| [config-systems.md](./config-systems.md) | 四大配置系统 |
| [store-design.md](./store-design.md) | Store 设计 |

### 集成与嵌入

| 文档 | 说明 |
|------|------|
| [qiankun-integration.md](./qiankun-integration.md) | 微前端接入 |
| [micro-app-container-design.md](./micro-app-container-design.md) | FgMicroAppContainer |

### 设计与运行时

| 文档 | 说明 |
|------|------|
| [设计文档索引](./design/) | 页面线框、Mermaid 交互流 |
| [design/overview.md](./design/overview.md) | 信息架构、路由、Store |
| [design/designer.md](./design/designer.md) | 三栏设计器、拖拽、保存发布 |
| [design/instances-publish.md](./design/instances-publish.md) | 实例列表、PublishView、postMessage |
| [design/runtime.md](./design/runtime.md) | WidgetRenderer、事件、联动、校验 |

---

## 外部集成

- qiankun 子应用
- Schema CRUD / 发布 REST API
- PublishView `postMessage` 协议（`fg:set-mode` 等）
- WidgetRenderer 独立嵌入
