# 快速开始

这一页只做一件事：把 Schema Platform 跑起来。

## 方式一：Docker Compose

适合大多数人。

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform/ai

cp .env.example .env
```

编辑 `.env`，至少填写：

```env
DEEPSEEK_API_KEY=你的模型 API Key
JWT_SECRET=随机生成的 32 位以上字符串
```

启动：

```bash
docker compose -f docker-compose.ai.yml up -d
```

启动完成后：

| 服务 | 地址 |
|---|---|
| AI 前端 | `http://localhost:5300` |
| 后端 API | `http://localhost:3001` |
| 健康检查 | `http://localhost:3001/api/health` |

## 方式二：本地开发

适合需要改代码或调试的人。

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform

cd shared/platform-shared
pnpm install
pnpm build
cd ../..

cd server
pnpm install
pnpm db:up
cp .env.example .env
pnpm dev
```

另开一个终端：

```bash
cd ai/app
pnpm install
pnpm dev
```

打开 `http://localhost:5300`。

## 下一步

- [表单与页面](./forms.md)
- [流程设计](./flows.md)
- [业务数据](./data.md)
- [用户与租户](./users.md)
- [AI 助手](./ai-assistant.md)
- [智能体工作流](./workflows.md)

如果你不打算自己部署，只需要使用已有环境，可直接从 [能力总览](./) 开始。
