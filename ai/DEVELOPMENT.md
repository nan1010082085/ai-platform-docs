# 开发指南

本指南涵盖开发环境搭建、架构和贡献最佳实践。

---

## 目录

- [架构概览](#架构概览)
- [开发环境](#开发环境)
- [项目结构](#项目结构)
- [编码规范](#编码规范)
- [测试](#测试)
- [调试](#调试)
- [常见任务](#常见任务)
- [常见问题](#常见问题)

---

## 架构概览

Schema Platform AI 采用模块化架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    浏览器（Vue 3 SPA）                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  AI 对话     │  │  工作流      │  │  插件中心    │         │
│  │  面板        │  │  设计器      │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
          │                    │                  │
          ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              后端（Koa.js + MongoDB）                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ LangGraph │  │ Workflow │  │   RAG    │  │  Plugin  │   │
│  │  对话引擎  │  │  执行器   │  │ 检索增强  │  │  Registry│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 前后端通信

- **REST API**：常规请求（CRUD、执行、配置）
- **WebSocket**（Socket.IO）：流式对话、实时执行进度
- **Open API**：外部系统通过 API Key 调用已发布工作流

---

## 开发环境

### 前置条件

- Node.js >= 20
- pnpm >= 9
- MongoDB 8

### 安装

```bash
# 共享包
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# 后端
cd server && pnpm install && cd ..

# 前端
cd ai/app && pnpm install && cd ../..
```

### 启动开发服务器

```bash
# 终端 1：后端
cd server && pnpm dev

# 终端 2：前端
cd ai/app && pnpm dev
```

### 生产构建

```bash
cd shared/platform-shared && pnpm build
cd server && npx tsc
cd ai/app && pnpm build
```

---

## 项目结构

```
ai/
├── app/                          @ai-app（Vue 3 前端）
│   ├── src/
│   │   ├── api/                  API 客户端（按域拆分）
│   │   ├── components/           Vue 组件
│   │   ├── composables/          组合式 API（useXXX）
│   │   ├── constants/            常量（节点定义、配置）
│   │   ├── stores/               Pinia 状态管理
│   │   ├── types/                TypeScript 类型
│   │   └── views/                页面视图
│   └── package.json
├── docs/                         文档
└── README.md

server/src/ai/
├── graph/                        LangGraph StateGraph
├── models/                       Mongoose 模型
├── nodes/                        节点执行器（按类型拆分）
├── queue/                        BullMQ 队列 + Worker
├── runtime/                      纯函数运行时
├── services/                     业务服务
└── routes/                       API 路由

shared/platform-shared/
├── ai/                           AI 共享类型 + 模板
│   ├── agentWorkflow/            工作流类型 + 模板工厂
│   └── index.ts
├── components/                   共享 Vue 组件
└── utils/                        共享工具
```

---

## 编码规范

### TypeScript

- 严格模式（`strict: true`）
- 禁止 `any`，用 `unknown` + 类型守卫
- 接口用 `interface`，联合类型用 `type`

### Vue 组件

- `<script setup lang="ts">` 组合式 API
- CSS Modules（`*.module.scss`），禁止全局样式
- 组件只做渲染，业务逻辑进 composable 或 store

### API 层

- 所有 API 调用聚合到 `src/api/`
- 组件/store 禁止直接 `fetch()`
- 使用 `request()` 封装（自动注入 JWT）

### 状态管理

- 全局状态用 Pinia Store
- 组合式逻辑用 `useXXX` composable
- 废弃零散 utils

### 文件组织

- 视图文件 > 300 行考虑拆分
- composable > 200 行考虑拆分
- 一个文件一个职责

---

## 测试

### 单元测试

```bash
# 前端
cd ai/app && pnpm test

# 后端
cd server && pnpm test
```

### 测试覆盖率

```bash
cd ai/app && pnpm test:coverage
```

### 类型检查

```bash
cd ai/app && pnpm typecheck    # vue-tsc
cd server && npx tsc --noEmit  # tsc
```

---

## 调试

### 调试模式

后端日志输出到控制台，关键节点有 `console.log` 标记：

```bash
cd server && pnpm dev  # 看 [router] [pluginExpert] [afterTools] 等日志
```

### 热重载

- 前端：Vite HMR（保存即刷新）
- 后端：ts-node-dev（保存即重启）
- 共享包：改后需 `pnpm build`，前端 vite alias 自动生效

### 数据库检查

```bash
# 连接 MongoDB
mongosh "mongodb://formgrid:formgrid@localhost:27017/formgrid"

# 查看集合
show collections
db.conversations.find().limit(5).pretty()
db.agentworkflows.find({status: 'published'}).pretty()
```

---

## 常见任务

### 添加新节点类型

1. `shared/platform-shared/ai/agentWorkflow/types.ts`：加 `AgentNodeType`
2. `shared/platform-shared/ai/agentWorkflow/defaults.ts`：加 `createDefaultNodeData` case
3. `server/src/ai/services/nodes/`：新建 `xxxNode.ts` 执行器
4. `server/src/ai/services/agentWorkflowExecutor.ts`：注册 dispatch case
5. `ai/app/src/constants/agentNodes.ts`：加 palette 项
6. `ai/app/src/components/agent-workflow/property-panel/panels/`：新建面板组件
7. `ai/app/src/composables/useAgentNodePropertyPanel.ts`：注册面板

### 添加新专家

在 `server/config/plugins/local/` 创建 JSON 配置，或通过插件中心 UI 添加。

### 添加新模板

1. `shared/platform-shared/ai/agentWorkflow/templates.ts`：加模板元数据
2. `shared/platform-shared/ai/agentWorkflow/templateFactories/`：新建工厂函数
3. `shared/platform-shared/ai/agentWorkflow/createByTemplate.ts`：注册 switch case

---

## 常见问题

### 端口被占用

```bash
lsof -ti:3001 | xargs kill  # 后端
lsof -ti:5300 | xargs kill  # 前端
```

### MongoDB 连接失败

- 确认 MongoDB 在运行：`docker ps | grep mongo`
- 检查连接字符串
- SSH 隧道：`ssh -fN -L 27018:localhost:27017 服务器`

### 构建错误

- 清理 node_modules：`rm -rf node_modules && pnpm install`
- 重新构建共享包：`cd shared/platform-shared && pnpm build`
- 清理 Vite 缓存：`rm -rf ai/app/node_modules/.vite`

### 测试失败

- 确认 MongoDB 在运行（部分测试需要）
- 检查 mock 是否正确
- 预存失败：4 个测试因前端模块引用导致，非代码问题
