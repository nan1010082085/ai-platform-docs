# 安装

把 Schema Platform 跑起来。

## 前置条件

| 依赖 | 建议版本 |
|---|---|
| Docker | 24 或更高 |
| Docker Compose | v2 |
| Node.js | 20 或更高 |
| pnpm | 9 或更高 |
| MongoDB | 8 或更高 |

如果你使用 Docker Compose，不需要单独安装 MongoDB。

## Docker Compose 安装

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform/ai

cp .env.example .env
```

编辑 `.env` 后启动：

```bash
docker compose -f docker-compose.ai.yml up -d
```

启动后检查：

```bash
curl http://localhost:3001/api/health
```

如果返回正常状态，说明后端已经可用。

## 本地开发安装

适合需要修改代码的场景。

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

## 常见问题

| 问题 | 处理 |
|---|---|
| 端口被占用 | 检查 3001 和 5300 端口 |
| 数据库连不上 | 确认 MongoDB 是否启动 |
| 页面打不开 | 检查前端进程和浏览器控制台 |
| 模型调用失败 | 检查 API Key 和模型服务地址 |

## 下一步

- [配置](./configuration.md)
