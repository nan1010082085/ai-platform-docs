# Schema Platform Docs

这是 Schema Platform 的公开文档源码。

## 核心业务

Schema Platform 是**表单 / 流程垂直场景的 AI 应用平台**。

公开文档围绕这条业务闭环组织：

```text
定义表单 / 页面
→ 编排审批 / 业务流程
→ 管理业务数据
→ 管理用户 / 租户 / 权限
→ 用 AI 助手和智能体工作流提效
→ 接入现有系统
```

## 本地运行

```bash
npm install
npm run dev
```

默认访问 `http://localhost:5173`。

## 构建

```bash
npm run build
npm run preview
```

构建产物位于 `.vitepress/dist`。

## 文档定位

公开文档只回答两类问题：

1. 平台有什么能力。
2. 用户如何完成一个具体任务。

架构设计、运行时细节、迭代计划和 RFC 不放在公开站点中。相关资料保留在仓库内部目录，构建时会被排除。

## 目录

```text
guide/        使用指南
integration/  外部集成
extension/    扩展开发
deploy/       自托管与运维
reference/    稳定参考
```
