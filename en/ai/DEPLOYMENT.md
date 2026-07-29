# Deployment Guide

This guide describes how to quickly start the Schema Platform AI application. The repo provides Docker Compose orchestration and Dockerfiles; running in containers is recommended.

For bare-metal deployment, refer to the build steps in `server/Dockerfile` and `ai/app/Dockerfile`.

---

## Prerequisites

- Docker 24+ and Compose v2
- MongoDB 8+ (Docker Compose includes it; no separate install needed)
- At least one LLM provider API key

---

## Quick Start

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform/ai

cp .env.example .env
# Edit .env; at minimum fill in DEEPSEEK_API_KEY and JWT_SECRET

docker compose -f docker-compose.ai.yml up -d
```

After startup, visit http://localhost:5300 to use the AI app.

| Service | Address |
|---|---|
| AI frontend | http://localhost:5300 |
| Backend API | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

---

## Environment Variables

See `ai/.env.example` for the full list. The minimal config needs only two:

| Variable | Description |
|---|---|
| `DEEPSEEK_API_KEY` | LLM API key (also supports OpenAI / Anthropic / Mimo; pick one) |
| `JWT_SECRET` | JWT signing secret; generate with `openssl rand -hex 32` |

Other common options:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string; Docker Compose has a built-in default |
| `CORS_ORIGINS` | Allowed frontend origins |
| `CREDENTIAL_SECRET` | Credential encryption key; generate with `openssl rand -hex 32` |
| `EMBEDDING_API_KEY` | For RAG vectorization; defaults to SiliconFlow BGE-M3 |

> ⚠️ `JWT_SECRET`, `CREDENTIAL_SECRET`, and API keys are sensitive; never commit them to version control.

---

**Last updated**: 2026-07-28
