# AI 助手文档

> 用自然语言创建表单、流程和智能应用

## 快速开始

### 启动开发

```bash
# 启动 AI 前端
cd ai/app && pnpm dev

# 启动后端服务（新终端）
cd server && pnpm dev
```

打开 `http://localhost:5300` 开始使用。

### 基本使用

1. 点击「新建对话」
2. 选择 Agent 类型
3. 输入你的需求
4. 查看 AI 生成的结果

## 核心功能

### 多 Agent 对话

| Agent | 擅长 |
|-------|------|
| Auto | 自动识别意图，智能路由 |
| Editor | 表单设计，生成 Schema JSON |
| Flow | 流程设计，生成 BPMN 流程图 |

### 智能体工作流

可视化工作流编排，32 种节点类型：

- **触发器** — 手动、Webhook、定时
- **AI 节点** — LLM、Agent Loop、Agent Team、意图路由
- **文档处理** — 文档解析、视觉分析、音频转录
- **逻辑控制** — 条件分支、多路分支、变量赋值
- **人工介入** — HITL 审批（暂停→确认→继续）

### RAG 知识库

- 向量检索 + 关键词 fallback
- Rerank 重排（BGE-Reranker）
- Hybrid 混合检索（语义 + 关键词加权融合）
- 检索调试视图（三路对比）

### 评测体系

- 数据集管理（CRUD + CSV 导入）
- 评测运行（选目标 workflow + 数据集）
- 结果对比（通过率/耗时/token/LLM 评分）

### 插件中心

JSON 配置 Experts、Skills、Tools、MCP servers。热重载，CLI 打包安装。

## 文档目录

### 架构

- [架构总览](./architecture.md) — 双引擎架构、系统概览
- [能力平台定位](./platform.md) — editor / flow / ai 一体、JWT、双 Key

### 对话系统

- [智能体系统](./agent.md) — 5 种专家 Agent、执行流程、协作机制
- [事件协议](./events.md) — v1/v2 事件类型、WebSocket 传输、HITL

### 工作流

- [工作流编排](./agent-workflow.md) — 节点参考、模板、执行引擎、REST API

### 工具与协议

- [工具系统](./tool.md) — MCP 与 LangGraph 工具、注册表、扩展
- [MCP 协议](./mcp.md) — 5 个 MCP Server、Bridge 架构

### 插件

- [插件中心](./plugin.md) — 架构、配置、生产清单、CLI
- [插件注册表](./plugin-registry.md) — 插件注册表
- [第三方插件开发](./extend/third-party-plugin-guide.md) — 专家/技能/工具/MCP

### 前端应用

- [应用概览](./app/) — `@ai-app` 前端应用：功能、运行与嵌入模式
- [架构与分层](./app/architecture.md) — 目录结构、Store/Composable/API 清单
- [路由与页面](./app/routing.md) — 路由表与守卫逻辑

### 共享包

- [ai-shared API](./ai-shared.md) — 类型、导出、工具名、Prompt 构建器
- [环境变量清单](./environment-variables.md) — 全部环境变量说明

### 设计文档

- [设计文档索引](./design/) — 页面线框、Mermaid 交互流
- [信息架构与布局](./design/overview.md) — 导航、嵌入模式、Store 关系
- [AI 对话设计](./design/chat.md) — Chat / 侧边栏 / LangGraph vs Workflow
- [智能体编排设计](./design/workflows.md) — 设计器、执行监控、Webhook
- [RAG 知识库设计](./design/rag.md) — 索引管理、检索测试、Chat 内联 RAG
- [运行时架构](./design/runtime.md) — LangGraph / Workflow Executor / RAG 执行图

## 外部集成

### REST API

```bash
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-slug \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "your data"}'
```

### WebSocket

使用 Socket.IO 连接，支持流式输出。

### MCP 协议

通过插件中心配置 MCP Server，扩展 AI 能力。

## 环境变量

### 必需

| 变量 | 说明 |
|------|------|
| MONGODB_URI | MongoDB 连接字符串 |
| JWT_SECRET | JWT 签名密钥 |
| DEEPSEEK_API_KEY | DeepSeek API key |

### 可选

| 变量 | 默认值 | 说明 |
|------|--------|------|
| OPENAI_API_KEY | — | OpenAI API key |
| ANTHROPIC_API_KEY | — | Anthropic API key |
| EMBEDDING_API_KEY | — | Embedding API key |
| REDIS_URL | redis://localhost:6379 | Redis（可选） |

## 常见问题

**Q: AI 生成的内容不准确怎么办？**
A: 上传相关文档到知识库，AI 会参考已有设计。也可以继续对话，让 AI 调整。

**Q: 如何扩展 AI 能力？**
A: 使用插件中心配置 Experts、Skills、Tools 或 MCP Server。

**Q: 工作流执行失败怎么办？**
A: 查看执行日志，检查节点配置和 API 调用。

## 相关链接

- [AI 应用 README](../../../ai/app/README.md) — 用户使用指南
- [Server API 文档](../server/README.md) — 后端 API 接口
- [部署指南](../../deploy/README.md) — 生产环境部署
