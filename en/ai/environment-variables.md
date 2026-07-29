# Environment Variables Reference

Complete list of environment variables for the Schema Form AI platform.

## Required

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://formgrid:formgrid@localhost:27017/formgrid` |
| `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` | At least one LLM API key | `sk-...` |

## Server

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port | `3001` |
| `NODE_ENV` | `development` or `production` | `development` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `*` |
| `JWT_SECRET` | JWT signing secret | Auto-generated (random) |
| `CREDENTIAL_SECRET` | Encryption key for stored credentials | -- |
| `SKIP_PERMISSION_CHECK` | Skip RBAC checks (dev only, never in production) | `false` |

## LLM Providers

### DeepSeek

| Variable | Description | Default |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API key | -- |
| `DEEPSEEK_BASE_URL` | DeepSeek API base URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | Default model | `deepseek-v4-flash` |

### OpenAI

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | -- |
| `OPENAI_BASE_URL` | OpenAI API base URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Default model | `gpt-4o` |

### Anthropic (Claude)

| Variable | Description | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key | -- |
| `ANTHROPIC_BASE_URL` | Anthropic API base URL | `https://api.anthropic.com` |

### Claude (alias)

| Variable | Description | Default |
|---|---|---|
| `CLAUDE_API_KEY` | Claude API key | -- |
| `CLAUDE_BASE_URL` | Claude API base URL | -- |
| `CLAUDE_MODEL` | Claude model name | -- |

### Mimo

| Variable | Description | Default |
|---|---|---|
| `MIMO_API_KEY` | Mimo API key | -- |
| `MIMO_BASE_URL` | Mimo API base URL | `https://token-plan-cn.xiaomimimo.com/v1` |
| `MIMO_MODEL` | Mimo model name | `mimo-v2.5` |

### Platform LLM Strategy

| Variable | Description | Default |
|---|---|---|
| `PLATFORM_LLM_ENABLED` | Enable platform-managed LLM (env-based) | `true` |
| `DEFAULT_LLM` | Default LLM provider | -- |
| `DEFAULT_LLM_STRATEGY` | LLM routing strategy | -- |

When `PLATFORM_LLM_ENABLED=false`, only database-stored `ModelConfig` records supply LLM credentials.

## Embedding (RAG)

DeepSeek does not provide an embedding API. The platform uses SiliconFlow-hosted BGE-M3 by default (free, best Chinese support, no GPU required).

| Variable | Description | Default |
|---|---|---|
| `EMBEDDING_API_KEY` | Embedding API key | -- |
| `EMBEDDING_BASE_URL` | Embedding API endpoint | `https://api.hpc-ai.com/inference/v1` |
| `EMBEDDING_MODEL` | Embedding model | `BAAI/bge-m3` |
| `EMBEDDING_DIMENSIONS` | Vector dimensions | `1024` |

Alternative (OpenAI):

```env
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## AI Features

| Variable | Description | Default |
|---|---|---|
| `AI_PLUGIN_CONFIG_DIR` | Plugin config directory | `config/plugins` |
| `AI_PLUGIN_CONFIG_PATH` | Single plugin config file | -- |
| `AI_PLUGIN_TENANT_ID` | Plugin tenant ID | -- |
| `AI_PLUGIN_WATCH` | Watch plugin configs for changes | -- |
| `AI_DOCUMENT_STORAGE_ROOT` | Document upload storage path | -- |
| `AI_DOCUMENT_TEXT_MODEL` | Model for document text extraction | -- |
| `AI_VISION_OCR_MODEL` | Model for image OCR | -- |
| `AI_ENABLE_TASK_PLANNER` | Enable task planner feature | -- |
| `AI_WEBHOOK_SKIP_HMAC` | Skip webhook HMAC verification | `false` |

## WebSocket & Timeouts

| Variable | Description | Default |
|---|---|---|
| `WORKFLOW_FETCH_TIMEOUT_MS` | Workflow fetch timeout | `30000` |
| `WORKFLOW_LLM_TIMEOUT_MS` | Workflow LLM call timeout | `120000` |

## Redis (optional)

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Redis connection URL | -- |

## Dev-only

| Variable | Description | Default |
|---|---|---|
| `DEV_AUTH_TENANT_ID` | Auto-inject tenant ID for dev auth | -- |
| `DEV_AUTH_USERNAME` | Auto-inject username for dev auth | -- |
| `PROD_ORIGIN` | Production origin for CORS in dev | -- |

## Frontend (ai/app)

These are Vite build-time variables prefixed with `VITE_`:

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | API base path | `/api` |
| `VITE_ROUTE_BASE` | App base path | `/` |

## Minimal .env for Local Development

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
DEEPSEEK_API_KEY=sk-your-key-here
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5300
```

## Minimal .env for Production

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
