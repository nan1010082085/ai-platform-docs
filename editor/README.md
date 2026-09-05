# 表单设计器文档

> 零代码搭建表单、页面和数据大屏

## 快速开始

### 启动开发

```bash
cd editor
pnpm install
pnpm dev
```

打开 `http://localhost:5100` 开始使用。

### 基本使用

1. 点击「新建实例」
2. 选择布局模式（Flex/Free）
3. 从组件面板拖拽组件到画布
4. 配置组件属性
5. 发布页面

## 核心功能

### 双布局模式

| 模式 | 适用场景 | 特点 |
|------|----------|------|
| Flex | 表单、列表、详情页 | 自动流式排列，响应式 |
| Free | 大屏、自由设计 | 绝对定位，像素级控制 |

### 87+ 组件

**表单组件（27 种）**
- 输入框、文本域、数字输入
- 下拉选择、单选、多选
- 日期选择、时间选择
- 文件上传、图片上传
- 级联选择、树形选择

**图表组件（19 种）**
- 柱状图、折线图、饼图
- 散点图、雷达图、仪表盘
- 热力图、漏斗图、K线图

**业务组件（15 种）**
- CRUD 列表页
- 用户管理
- 审批流程

**布局组件（11 种）**
- 卡片、标签页、对话框
- 栅格列、分栏

### 四大配置系统

1. **事件配置** — 点击、改变、提交等事件处理
2. **联动配置** — 组件间数据联动、显示/隐藏控制
3. **API 配置** — 数据源绑定、远程数据加载
4. **变量配置** — 全局变量、计算属性

### 智能辅助

- **视口剔除** — 大屏编辑时只渲染可视区域
- **撤销/重做** — 支持多步撤销
- **快捷键** — 复制粘贴、对齐分布、锁定隐藏
- **辅助线** — 拖拽时自动对齐

## 文档目录

### 产品与架构

| 文档 | 说明 |
|------|------|
| [capabilities.md](./capabilities.md) | 产品能力清单与体验路径 |
| [architecture.md](./architecture.md) | 分层、Store、渲染双路径、Schema |

### 开发指南

| 文档 | 说明 |
|------|------|
| [widget-development.md](./widget-development.md) | 内置控件开发步骤 |
| [third-party-widget-guide.md](./third-party-widget-guide.md) | `createWidgetPlugin` 扩展 |
| [property-panel.md](./property-panel.md) | propertyPanel 声明与编辑器 |
| [widgets.md](./widgets.md) | 控件体系总览 |
| [canvas-system.md](./canvas-system.md) | 双画布系统 |
| [config-systems.md](./config-systems.md) | 四大配置系统 |
| [store-design.md](./store-design.md) | 状态库设计 |

### 集成与嵌入

| 文档 | 说明 |
|------|------|
| [qiankun-integration.md](./qiankun-integration.md) | 微前端接入 |
| [micro-app-container-design.md](./micro-app-container-design.md) | FgMicroAppContainer |

### 设计文档

| 文档 | 说明 |
|------|------|
| [设计文档索引](./design/) | 页面线框、Mermaid 交互流 |
| [design/overview.md](./design/overview.md) | 信息架构、路由、Store |
| [design/designer.md](./design/designer.md) | 三栏设计器、拖拽、保存发布 |
| [design/instances-publish.md](./design/instances-publish.md) | 实例列表、PublishView、postMessage |
| [design/runtime.md](./design/runtime.md) | WidgetRenderer、事件、联动、校验 |

## 使用场景

### 场景 1：创建审批表单

1. 选择「Flex」布局模式
2. 拖入表单组件：输入框、下拉选择、日期选择
3. 配置表单校验规则
4. 配置提交事件
5. 发布，获取访问链接

### 场景 2：搭建运营大屏

1. 选择「Free」布局模式
2. 设置画布尺寸（1920×1080）
3. 拖入图表组件
4. 绑定数据源
5. 配置样式和动画
6. 发布为只读模式

### 场景 3：创建数据录入页面

1. 使用「CRUD 列表页」组件
2. 配置表格列和搜索条件
3. 配置新增/编辑表单
4. 配置删除确认
5. 发布，团队即可使用

## 发布与访问

### 发布模式

| 模式 | 说明 | URL 参数 |
|------|------|----------|
| 交互模式 | 用户可以填写、提交 | `?interaction=interactive` |
| 只读模式 | 仅查看，不可编辑 | `?interaction=readonly` |

### 访问地址

```
https://pyflow.icu/schema-platform/editor/view/{schemaCode}
```

### 嵌入到其他系统

```html
<iframe src="https://pyflow.icu/schema-platform/editor/view/{schemaCode}?interaction=interactive" />
```

## 快速导航

| 我想… | 看这里 |
|--------|--------|
| 了解产品能做什么 | [能力总览](./capabilities.md) |
| 理解架构与分层 | [架构文档](./architecture.md) |
| 新做一个 Widget | [控件开发](./widget-development.md) · [第三方指南](./third-party-widget-guide.md) |
| 配属性面板 | [属性面板](./property-panel.md) |
| 接 qiankun / 嵌入发布页 | [qiankun](./qiankun-integration.md) · [实例与发布设计](./design/instances-publish.md) |

## 外部集成

- qiankun 子应用
- Schema CRUD / 发布 REST API
- PublishView `postMessage` 协议
- WidgetRenderer 独立嵌入

## 常见问题

**Q: 组件不够用怎么办？**
A: 支持第三方 Widget 扩展，详见 [第三方 Widget 指南](./third-party-widget-guide.md)。

**Q: 大屏编辑很卡怎么办？**
A: 已启用视口剔除优化。如仍卡顿，尝试减少组件数量或使用更简单的图表。

**Q: 如何实现组件间联动？**
A: 使用「联动配置」，设置数据源和条件表达式。

**Q: 支持国际化吗？**
A: 支持，使用 vue-i18n，可配置多语言。

## 相关链接

- [Editor README](../../../editor/README.md) — 用户使用指南
- [Server API 文档](../server/README.md) — 后端 API 接口
- [部署指南](../../deploy/README.md) — 生产环境部署
