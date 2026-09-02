# Schema Platform 文档

> 平台使用指南、API 参考和开发文档

## 快速导航

### 我是用户

- **[快速开始](./guide/getting-started.md)** — 5 分钟上手平台
- **[AI 助手使用](./ai/README.md)** — 用对话创建表单和流程
- **[表单设计器](./editor/README.md)** — 可视化搭建页面
- **[流程设计器](./flow/README.md)** — 设计业务审批流程
- **[用户管理](./ua/README.md)** — 管理用户和权限

### 我是开发者

- **[API 参考](./server/README.md)** — 后端 API 接口文档
- **[架构设计](./design/README.md)** — 系统架构说明
- **[扩展开发](./extend/README.md)** — 二次开发指南
- **[部署指南](./guide/deployment.md)** — 生产环境部署

### 我想了解产品

- **[产品介绍](./guide/introduction.md)** — 平台能做什么
- **[使用场景](./guide/scenarios.md)** — 典型应用场景
- **[更新日志](../CHANGELOG.md)** — 版本更新记录

## 文档结构

```
docs/
├── guide/               # 入门指南
│   ├── getting-started.md
│   ├── introduction.md
│   ├── scenarios.md
│   └── deployment.md
├── ai/                  # AI 助手文档
│   ├── README.md
│   ├── architecture.md
│   └── ...
├── editor/              # 表单设计器文档
│   ├── README.md
│   ├── capabilities.md
│   └── ...
├── flow/                # 流程设计器文档
│   ├── README.md
│   └── ...
├── server/              # 后端 API 文档
│   ├── README.md
│   └── ...
├── design/              # 架构设计文档
│   ├── README.md
│   └── ...
├── extend/              # 扩展开发文档
│   ├── README.md
│   └── ...
└── en/                  # English documentation
```

## 本地开发

### 安装依赖

```bash
cd docs
npm install
```

### 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:5173 查看文档站点。

### 构建生产版本

```bash
npm run build
npm run preview
```

## 文档编写规范

### Markdown 语法

文档使用 VitePress 增强的 Markdown：

```markdown
# 一级标题

## 二级标题

正文内容。

::: tip
这是一个提示框。
:::

::: warning
这是一个警告框。
:::

::: danger
这是一个危险提示框。
:::

```代码块
console.log('Hello')
```
```

### 添加新页面

1. 在对应目录创建 `.md` 文件
2. 在 `.vitepress/config.ts` 中添加到侧边栏
3. 编写内容，遵循现有文档风格

### 文档原则

- **面向用户** — 说明"能做什么"而非"怎么实现"
- **场景驱动** — 用实际场景说明功能
- **简洁明了** — 避免技术术语，用通俗语言
- **图文并茂** — 适当使用截图和示意图

## 部署

### GitHub Pages（推荐）

文档会自动部署到 GitHub Pages：

**访问地址**：https://nan1010082085.github.io/ai-platform/

### 手动部署

```bash
npm run deploy
```

### 其他平台

构建产物可以部署到任何静态托管：

- **Vercel**：`vercel --prod`
- **Netlify**：连接 GitHub 仓库
- **AWS S3**：上传 `docs/.vitepress/dist` 到 S3

## 贡献

欢迎贡献文档！

1. Fork 仓库
2. 创建功能分支
3. 编写或修改文档
4. 提交 Pull Request

## 资源

- **VitePress 文档**：https://vitepress.dev/
- **Markdown 指南**：https://www.markdownguide.org/
- **Vue.js 文档**：https://vuejs.org/

## 许可证

本文档是 Schema Platform 的一部分，遵循 MIT 许可证。
