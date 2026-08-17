---
title: Deployment & Operations
---

# Backend Service · Deployment & Operations

> Incremental deployment via the repo-root `deploy/` scripts (single nginx + single HTTPS): packaging, PM2 process management, nginx reverse proxy and config directories.

## 1. Packaging

```bash
# Backend only (also syncs shared packages)
bash deploy/pack.sh --target server

# With an explicit version
bash deploy/pack.sh --target server v1.0.0

# Full build (editor + flow + ai + server + shared)
bash deploy/pack.sh --target all
```

Artifact: `deploy/output/server-{VERSION}.tar.gz` (`platform-{VERSION}.tar.gz` for full). Packaging excludes `.map`, `__tests__/`, `*.spec.*`; keeps the latest 3 tarballs locally.

## 2. Deploy

```bash
export DEPLOY_SERVER=ubuntu@your-server-ip   # target host
bash deploy/deploy.sh --target server 20260703-120000

# Full deploy (also updates nginx and reloads by default)
bash deploy/deploy.sh --target all
```

Remote layout under `~/schema-platform/`:

```
~/schema-platform/
├── apps/                  # frontend artifacts (editor/ flow/ ai/)
├── server/                # ← backend dist + package.json
├── shared/
│   ├── flow-shared/       # server runtime deps
│   └── ai-shared/
├── flow-shared → shared/flow-shared   # symlink
├── ai-shared   → shared/ai-shared     # symlink
├── .env.production
├── ecosystem.config.cjs
└── nginx-schema-platform.conf
```

> After changing shared packages (`shared/flow-shared` / `ai/shared`), repack and redeploy the server, otherwise production is not affected.

## 3. Process Management (PM2)

`deploy/ecosystem.config.cjs`:

| Item | Value |
|------|------|
| App name | `platform-server` |
| Entry | `server/index.js` |
| Mode | fork, single instance |
| Auto restart | `autorestart` + `max_restarts: 10` + `restart_delay: 3000` |
| Memory limit | `max_memory_restart: 800M` |
| Env file | `.env.production` |
| Plugin config dir | `AI_PLUGIN_CONFIG_DIR` → `server/config` (Expert/Skill/Tool/MCP config) |

Common ops commands:

```bash
pm2 start ecosystem.config.cjs      # start / update
pm2 reload platform-server          # graceful restart
pm2 logs platform-server            # view logs
pm2 status                          # process status
```

## 4. nginx Reverse Proxy

| Path | Rule |
|------|------|
| `/schema-platform/api/` | proxy → `127.0.0.1:30001` (REST API) |
| `/schema-platform/ws` | proxy → `127.0.0.1:30001` (WebSocket, with Upgrade headers) |
| `/schema-platform/editor|flow|ai` | alias → `apps/*` (static assets) |

Dev port is 3001; production is 30001 (`PORT` in `.env.production`).

## 5. Data & Cache Dependencies

- **MongoDB 8** (Mongoose ODM): business data, AgentWorkflowExecution etc.
- **Redis**: BullMQ queue (persistent + retry + dead-letter), RBAC permission cache (5min TTL)
- **Vector store**: RAG retrieval (BGE-M3 embedding + reranker, see [RAG Architecture](./rag-architecture))

## 6. Config & Secrets

- `.env.production`: JWT secrets, MongoDB/Redis connections, LLM provider credentials (DeepSeek/OpenAI/Anthropic), RAG service endpoints
- `server/config/`: plugin center config dir (`plugins/experts|skills|tools|mcps`), SIGHUP hot-reload
- Platform-hosted LLM can be disabled with `PLATFORM_LLM_ENABLED=false` to allow DB config only

## 7. Related Docs

- [Capabilities](./capabilities) — feature matrix
- [API Overview](./api) — REST endpoint overview
- [Database](./database) — MongoDB connection and config
- [Plugin Center](./plugin-center) — plugin config and hot-reload
- [RAG Architecture](./rag-architecture) — retrieval chain and dependencies
