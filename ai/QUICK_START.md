# 快速开始

5 分钟启动 Schema Platform AI。

---

## 前置条件

- **Node.js** >= 20.x
- **pnpm** >= 9.x（`npm install -g pnpm`）
- **MongoDB** 8.x
- **Git**

### 可选

- **Docker** - 容器化部署
- **LLM API Key** - DeepSeek（推荐）、OpenAI 或 Anthropic

---

## 方式一：本地开发环境

### 步骤 1：克隆仓库

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform
```

### 步骤 2：安装依赖

```bash
# 构建共享包（必须）
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# 安装后端
cd server && pnpm install && cd ..

# 安装 AI 前端
cd ai/app && pnpm install && cd ../..
```

### 步骤 3：启动 MongoDB

```bash
cd server && pnpm db:up && cd ..
```

MongoDB 8 运行在端口 27017（用户 `formgrid`，密码 `formgrid`，数据库 `formgrid`）。

### 步骤 4：配置环境

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=<随机 32 字节 hex>
DEEPSEEK_API_KEY=<你的 API Key>
```

### 步骤 5：初始化数据（可选）

```bash
cd server && pnpm db:seed && cd ..
```

### 步骤 6：启动后端

```bash
cd server && pnpm dev
```

后端运行在 `http://localhost:3001`。

### 步骤 7：启动前端

```bash
cd ai/app && pnpm dev
```

打开 `http://localhost:5300`。

---

## 方式二：Docker Compose

```bash
cp ai/.env.example ai/.env
# 编辑 ai/.env 设置 DEEPSEEK_API_KEY 和 JWT_SECRET
docker compose -f ai/docker-compose.ai.yml up -d
```

启动 MongoDB + 后端 + 前端，打开 `http://localhost:5300`。

---

## 验证

```bash
# 后端健康检查
curl http://localhost:3001/api/health

# 前端页面
open http://localhost:5300
```

---

## 下一步

- [AI 对话 Agent](./agent) - 了解多专家对话
- [Agent Workflow](./agent-workflow) - 可视化工作流编排
- [RAG 知识库](./rag-tool-mcp-boundary) - 向量检索
- [插件中心](./plugin) - 扩展 AI 能力

---

## 常见问题

### 端口被占用

```bash
lsof -ti:3001 | xargs kill  # 后端
lsof -ti:5300 | xargs kill  # 前端
```

### MongoDB 连接失败

- 确认 MongoDB 在运行：`docker ps | grep mongo`
- 检查连接字符串：`MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid`

### LLM 调用失败

- 确认 API Key 有效
- DeepSeek：`DEEPSEEK_API_KEY=sk-xxx`
- 自定义模型：参考[自定义模型接入指南](/extend/custom-models)
