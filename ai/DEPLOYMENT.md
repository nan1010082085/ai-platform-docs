# 部署指南

本指南介绍如何快速启动 Schema Platform AI 应用。仓库已提供 Docker Compose 编排与 Dockerfile，推荐以容器方式运行。

如需裸机部署，可参考 `server/Dockerfile` 与 `ai/app/Dockerfile` 的构建步骤。

---

## 前置条件

- Docker 24+ 及 Compose v2
- MongoDB 8+（Docker Compose 已内置，无需单独安装）
- 至少一个 LLM Provider 的 API Key

---

## 快速开始

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform/ai

cp .env.example .env
# 编辑 .env，至少填写 DEEPSEEK_API_KEY 和 JWT_SECRET

docker compose -f docker-compose.ai.yml up -d
```

启动后访问 http://localhost:5300 即可使用 AI 应用。

| 服务 | 地址 |
|---|---|
| AI 前端 | http://localhost:5300 |
| 后端 API | http://localhost:3001 |
| 健康检查 | http://localhost:3001/api/health |

---

## 环境变量

完整变量清单见 `ai/.env.example`。最小配置只需两项：

| 变量 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | LLM API Key（也支持 OpenAI / Anthropic / Mimo，任选一个） |
| `JWT_SECRET` | JWT 签名密钥，`openssl rand -hex 32` 生成 |

其他常用可选项：

| 变量 | 说明 |
|---|---|
| `MONGODB_URI` | MongoDB 连接串，Docker Compose 内置默认值 |
| `CORS_ORIGINS` | 允许的前端来源 |
| `CREDENTIAL_SECRET` | 凭证加密密钥，`openssl rand -hex 32` 生成 |
| `EMBEDDING_API_KEY` | RAG 向量化用，默认走 SiliconFlow BGE-M3 |

> ⚠️ `JWT_SECRET`、`CREDENTIAL_SECRET`、各 API Key 属于敏感信息，切勿提交到版本控制。

---

**最后更新**：2026-07-28
