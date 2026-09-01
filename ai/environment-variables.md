# 环境变量参考

Schema Platform AI 相关环境变量完整清单。

## 必需

| 变量 | 说明 | 示例 |
|---|---|---|
| `MONGODB_URI` | MongoDB 连接串 | `mongodb://formgrid:formgrid@localhost:27017/formgrid` |
| `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` | 至少一个 LLM API Key | `sk-...` |

## 服务端

| 变量 | 说明 | 默认值 |
|---|---|---|
| `PORT` | HTTP 服务端口 | `3001` |
| `NODE_ENV` | `development` 或 `production` | `development` |
| `CORS_ORIGINS` | 允许的跨域来源（逗号分隔） | `*` |
| `JWT_SECRET` | JWT 签名密钥 | 自动生成（随机） |
| `CREDENTIAL_SECRET` | 凭证加密密钥 | -- |
| `SKIP_PERMISSION_CHECK` | 跳过 RBAC（仅开发，生产禁止） | `false` |

## LLM 提供商

### DeepSeek

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key | -- |
| `DEEPSEEK_BASE_URL` | DeepSeek API 基址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 默认模型 | `deepseek-v4-flash` |

### OpenAI

| 变量 | 说明 | 默认值 |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API Key | -- |
| `OPENAI_BASE_URL` | OpenAI API 基址 | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 默认模型 | `gpt-4o` |

### Anthropic（Claude）

| 变量 | 说明 | 默认值 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API Key | -- |
| `ANTHROPIC_BASE_URL` | Anthropic API 基址 | `https://api.anthropic.com` |

### Claude（别名）

| 变量 | 说明 | 默认值 |
|---|---|---|
| `CLAUDE_API_KEY` | Claude API Key | -- |
| `CLAUDE_BASE_URL` | Claude API 基址 | -- |
| `CLAUDE_MODEL` | Claude 模型名 | -- |

### Mimo

| 变量 | 说明 | 默认值 |
|---|---|---|
| `MIMO_API_KEY` | Mimo API Key | -- |
| `MIMO_BASE_URL` | Mimo API 基址 | `https://token-plan-cn.xiaomimimo.com/v1` |
| `MIMO_MODEL` | Mimo 模型名 | `mimo-v2.5` |

### 平台 LLM 策略

| 变量 | 说明 | 默认值 |
|---|---|---|
| `PLATFORM_LLM_ENABLED` | 启用平台托管 LLM（基于环境变量） | `true` |
| `DEFAULT_LLM` | 默认 LLM 提供商 | -- |
| `DEFAULT_LLM_STRATEGY` | LLM 路由策略 | -- |

当 `PLATFORM_LLM_ENABLED=false` 时，仅使用数据库中的 `ModelConfig` 凭证。

## Embedding（RAG）

DeepSeek 不提供 embedding API。平台默认使用 SiliconFlow 托管的 BGE-M3（免费、中文效果好、无需 GPU）。

| 变量 | 说明 | 默认值 |
|---|---|---|
| `EMBEDDING_API_KEY` | Embedding API Key | -- |
| `EMBEDDING_BASE_URL` | Embedding API 端点 | `https://api.hpc-ai.com/inference/v1` |
| `EMBEDDING_MODEL` | Embedding 模型 | `BAAI/bge-m3` |
| `EMBEDDING_DIMENSIONS` | 向量维度 | `1024` |

备选（OpenAI）：

```env
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## AI 功能

| 变量 | 说明 | 默认值 |
|---|---|---|
| `AI_PLUGIN_CONFIG_DIR` | 插件配置目录 | `config/plugins` |
| `AI_PLUGIN_CONFIG_PATH` | 单个插件配置文件 | -- |
| `AI_PLUGIN_TENANT_ID` | 插件租户 ID | -- |
| `AI_PLUGIN_WATCH` | 监听插件配置变更 | -- |
| `AI_DOCUMENT_STORAGE_ROOT` | 文档上传存储路径 | -- |
| `AI_DOCUMENT_TEXT_MODEL` | 文档文本提取模型 | -- |
| `AI_VISION_OCR_MODEL` | 图片 OCR 模型 | -- |
| `AI_ENABLE_TASK_PLANNER` | 启用任务规划能力 | -- |
| `AI_WEBHOOK_SKIP_HMAC` | 跳过 Webhook HMAC 校验 | `false` |

## WebSocket 与超时

| 变量 | 说明 | 默认值 |
|---|---|---|
| `WORKFLOW_FETCH_TIMEOUT_MS` | 工作流 fetch 超时 | `30000` |
| `WORKFLOW_LLM_TIMEOUT_MS` | 工作流 LLM 调用超时 | `120000` |

## Redis（可选）

| 变量 | 说明 | 默认值 |
|---|---|---|
| `REDIS_URL` | Redis 连接 URL | -- |

## 仅开发环境

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DEV_AUTH_TENANT_ID` | 开发鉴权自动注入租户 ID | -- |
| `DEV_AUTH_USERNAME` | 开发鉴权自动注入用户名 | -- |
| `PROD_ORIGIN` | 开发时 CORS 使用的生产域名 | -- |

## 前端（ai/app）

Vite 构建期变量，前缀为 `VITE_`：

| 变量 | 说明 | 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | API 基路径 | `/api` |
| `VITE_ROUTE_BASE` | 应用基路径 | `/` |

## 本地开发最小 .env

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
DEEPSEEK_API_KEY=sk-your-key-here
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5300
```

## 生产环境最小 .env

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/schema-form
DEEPSEEK_API_KEY=sk-your-key-here
JWT_SECRET=a-long-random-string
PORT=30001
NODE_ENV=production
CORS_ORIGINS=https://your-domain.com
EMBEDDING_API_KEY=sk-your-key-here
EMBEDDING_BASE_URL=https://api.hpc-ai.com/inference/v1
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSIONS=1024
```
