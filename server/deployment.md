---
title: 部署与运维
---

# 后端服务 · 部署与运维

> 基于仓库根 `deploy/` 脚本的增量部署（单 nginx + 单 HTTPS），覆盖打包、PM2 进程管理、nginx 反代与配置目录。

## 一、打包

```bash
# 仅后端（含 shared 公共包同步）
bash deploy/pack.sh --target server

# 指定版本号
bash deploy/pack.sh --target server v1.0.0

# 全量（editor + flow + ai + server + shared）
bash deploy/pack.sh --target all
```

产物：`deploy/output/server-{VERSION}.tar.gz`（全量为 `platform-{VERSION}.tar.gz`）。打包自动排除 `.map`、`__tests__/`、`*.spec.*`；本地保留最新 3 个 tarball。

## 二、部署

```bash
export DEPLOY_SERVER=ubuntu@your-server-ip   # 目标机
bash deploy/deploy.sh --target server 20260703-120000

# 全量（默认同时更新 nginx 并 reload）
bash deploy/deploy.sh --target all
```

远程目录 `~/schema-platform/`：

```
~/schema-platform/
├── apps/                  # 前端产物（editor/ flow/ ai/ ua/ docs/）
├── server/                # ← 后端 dist + package.json
├── shared/
│   ├── flow-shared/       # server 运行时依赖
│   └── ai-shared/
├── harness/               # AI Harness Agent 运行时（DSH）
├── flow-shared → shared/flow-shared   # symlink
├── ai-shared   → shared/ai-shared     # symlink
├── .env.production
├── ecosystem.config.cjs
└── nginx-schema-platform.conf
```

> 修改 `shared/flow-shared` / `ai/shared`（公共包）后必须重新打包部署 server，否则线上不生效。

## 三、进程管理（PM2）

`deploy/ecosystem.config.cjs` 管理以下进程：

### platform-server

| 项 | 值 |
|------|------|
| 应用名 | `platform-server` |
| 启动脚本 | `server/index.js` |
| 模式 | fork，单实例 |
| 自动重启 | `autorestart` + `max_restarts: 10` + `restart_delay: 3000` |
| 内存上限 | `max_memory_restart: 800M` |
| 环境文件 | `.env.production` |
| 插件配置目录 | `AI_PLUGIN_CONFIG_DIR` → `server/config`（Expert/Skill/Tool/MCP 配置） |

### ai-harness

| 项 | 值 |
|------|------|
| 应用名 | `ai-harness` |
| 启动命令 | `pnpm exec dsh --profile ai-harness` |
| 工作目录 | `~/schema-platform/harness` |
| 模式 | fork，单实例 |
| 端口 | 5310（nginx 反代 `/schema-platform/harness/`） |

### 常用运维命令

```bash
pm2 start ecosystem.config.cjs      # 启动/更新
pm2 reload platform-server          # 平滑重启
pm2 logs platform-server            # 查看日志
pm2 status                          # 进程状态
```

## 四、nginx 反代

nginx 配置位于 `/etc/nginx/sites-available/schema-platform`，由 `deploy/nginx-schema-platform.conf` snippet 管理。

| 路径 | 规则 |
|------|------|
| `/schema-platform/api/` | proxy → `127.0.0.1:30001`（REST API，`client_max_body_size 12m`） |
| `/schema-platform/ws` | proxy → `127.0.0.1:30001`（WebSocket，含 Upgrade 头，超时 7200s） |
| `/schema-platform/harness/` | proxy → `127.0.0.1:5310`（AI Harness Agent 运行时） |
| `/schema-platform/editor/` | alias → `apps/editor/`（SPA，fallback 到 index.html） |
| `/schema-platform/flow/` | alias → `apps/flow/` |
| `/schema-platform/ai/` | alias → `apps/ai/` |
| `/schema-platform/ua/` | alias → `apps/ua/` |
| `/schema-platform/docs/` | alias → `apps/docs/`（VitePress 文档站） |
| `~* ^/schema-platform/.+\.(js\|css\|svg\|png\|jpg\|jpeg\|gif\|woff2?\|ttf\|eot\|map)$` | 静态资源 404 兜底（避免 MIME 类型错误） |

> 开发环境端口为 3001；生产 30001（`.env.production` 中 `PORT`）。
>
> **部署注意事项**：nginx 配置可能被直接修改过，部署前必须先 `scp` 拉取线上配置做 diff，避免覆盖其他项目的配置。

## 五、数据与缓存依赖

- **MongoDB 8**（Mongoose ODM）：业务数据、AgentWorkflowExecution 等
- **Redis**：BullMQ 队列（持久化 + 重试 + 死信）、RBAC 权限缓存（5min TTL）
- **向量库**：RAG 检索（BGE-M3 embedding + Reranker，见 [RAG 架构](./rag-architecture)）

## 六、配置与密钥

- `.env.production`：JWT 密钥、MongoDB/Redis 连接、LLM Provider 凭据（DeepSeek/OpenAI/Anthropic）、RAG 服务地址
- `server/config/`：插件中心配置目录（`plugins/experts|skills|tools|mcps`），SIGHUP 热重载
- 平台托管 LLM 可用 `PLATFORM_LLM_ENABLED=false` 关闭，仅允许 DB 配置

## 七、相关文档

- [能力总览](./capabilities) — 功能矩阵
- [API 接口](./api) — REST API 端点概览
- [数据库](./database) — MongoDB 连接与配置
- [插件中心](./plugin-center) — 插件配置与热重载
- [RAG 架构](./rag-architecture) — 检索链路与依赖
