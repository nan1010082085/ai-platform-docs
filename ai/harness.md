---
title: DSH Agent 运行时（ai/harness）
---

# DSH Agent 运行时（ai/harness）

> `ai/harness/` — 基于 `@deepseek-ai/dsh@0.1.0-rc.6`（精确锁定）的独立 Node 服务：把 DSH Agent 暴露为 HTTP 会话 API，供平台侧消费。
> 设计依据：`ai/docs/design/dsh-cordis-integration.md`（方向 A + C，本服务为方向 C POC）。

## 一、定位

DSH（DeepSeek Harness）作为 Agent 运行时接入：复用 goal / plan / subagent / skill / workflow 等成熟 Agent 基建，减少自研 agent loop。当前为 **POC 形态**：单进程、固定 token、不落库，正式接入需过设计文档 §5.4 门禁（多租户隔离 POC、部署形态确认）。

## 二、架构

```
dsh --profile ai-harness            # DSH 启动器
└─ bundles: @deepseek-ai/dsh-base   # session/agent/tools/skill/goal/plan 全家桶（无浏览器 UI）
└─ 自写插件（cordis.patch.yml 静态装载）:
   ├─ tenant-gateway        租户隔离网关（token 鉴权 + 会话配额 + 预算断言 + SSE 票据）
   ├─ runner-http           session API + SSE（走 ctx.agents + harnessGateway）
   ├─ platform-tools        platform_echo / platform_workflow_invoke（workflow-as-tool）
   └─ trajectory-forward    platform.nodeTrace 投影（会话事件 -> AgentNodeTrace）
```

### Cordis 插件系统

DSH 基于 [Cordis](https://github.com/cordiverse/cordis) 依赖注入框架：
- **插件 = 静态代码**：在 `cordis.patch.yml` 中声明装载，运行时不可变
- **工具 = 数据**：插件运行时通过 `ctx.tools.register` 动态注册
- **workflow = 数据**：永远不是插件，通过 platform_workflow_invoke 工具调用

插件通过 `export const inject = ['serviceName']` 声明依赖，Cordis 自动注入对应 Service 实例。

### Agent Loop 逻辑

```
用户消息 -> runner-http.sendMessage()
  ├─ gateway.assertBudget()        # 前置预算断言（token/RMB/工具调用）
  ├─ agent.followup(userMessage)   # 注入用户消息
  ├─ agent.whenIdle()              # 等待 agent loop 停稳
  │   ├─ LLM 推理 -> assistant message
  │   ├─ tool/call -> 执行工具 -> tool/result
  │   └─ 循环直到无 tool call（turn/end）
  └─ summarize(events)             # 提取最终文本 + 停止原因
```

## 三、目录

| 路径 | 说明 |
|------|------|
| `dsh-home/profiles/ai-harness/` | profile 源码（package.json 内嵌 `dsh.profile.bundles` + `cordis.patch.yml`） |
| `plugins/` | 四个自写插件（profile 以 `link:` 引用，即改即生效） |
| `plugins/tenant-gateway/` | 租户隔离网关（鉴权 + 配额 + 预算 + 票据） |
| `plugins/runner-http/` | HTTP API 服务（session/message/events/trace） |
| `plugins/platform-tools/` | 平台工具注册（echo + workflow invoke） |
| `plugins/trajectory-forward/` | 轨迹投影（会话事件 → AgentNodeTrace） |
| `scripts/smoke.mjs` | 全链路验收（mock LLM 驱动） |
| `scripts/smoke-isolation.mjs` | 多租户隔离冒烟 |

## 四、运行

```bash
cd ai/harness
pnpm install                       # 根：dsh + 插件作者依赖
pnpm smoke                         # 全链路验收（mock LLM，无需任何真实 API key）
pnpm start                         # 真实启动（需 DeepSeek 凭据）
```

生产凭据：`DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY`（或 `$DSH_HOME/.credentials.yaml`）。服务默认监听 `127.0.0.1:5310`，鉴权 token 在 `cordis.patch.yml`（当前 `poc-token`）。

## 五、API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/healthz` | 健康检查 + 网关统计（租户数/会话数/预算配置） |
| POST | `/session/start` | 创建持久化 Agent 会话 → `{ sessionId }`（租户配额检查） |
| POST | `/session/:id/message` | 提交用户消息，等待停稳 → `{ text, reason }`（预算断言） |
| POST | `/session/:id/events-ticket` | 签发 SSE 票据 → `{ ticket }`（短时效，替代明文 token） |
| GET | `/session/:id/events?ticket=N` | SSE 增量推送会话事件（票据鉴权） |
| GET | `/session/:id/trace` | `platform.nodeTrace` 投影快照（`AgentNodeTrace`） |

### 鉴权流程

```
请求 Bearer token -> tenant-gateway.resolveTenant()
  ├─ allowlist 模式：POC 阶段静态 token -> tenantId 映射
  └─ verifyUrl 模式：POST 内省端点 -> { tenantId }（JWT 不验签，仅解析 exp 用于缓存 TTL）
```

### 预算控制

| 维度 | 默认值 | 环境变量 |
|------|--------|----------|
| 每会话 token 上限 | 100,000 | `AI_HARNESS_BUDGET_TOKENS` |
| 每会话工具调用上限 | 20 | `AI_HARNESS_BUDGET_WORK_UNITS` |
| 每日 RMB 预算 | 10 元 | `AI_HARNESS_DAILY_RMB_BUDGET` |
| 每租户活跃会话数 | 5 | `AI_HARNESS_SESSIONS_PER_TENANT` |

预算断言在每次 `sendMessage` 前执行，任一维度超限返回 `402 BUDGET_EXCEEDED`。

### SSE 票据机制

替代明文 token 传递：`events-ticket` 签发短时效票据（5 分钟），`events?ticket=N` 消费。同一会话允许多个并发 SSE 订阅（多页签场景）。

## 六、轨迹投影协议

轨迹 = 会话事件日志的投影（`sessionProjections` 纯函数折叠），协议类型见 `ai/app/src/types/harnessTrace.ts`：

```ts
interface AgentNodeTrace {
  turns: AgentNodeTraceTurn[]        // { turn, startSeq, endSeq, endReason }
  toolCalls: AgentNodeTraceToolCall[] // { callId, turn, step, name, arguments, callSeq, resultSeq, isError }
  messages: AgentNodeTraceMessage[]   // { turn, step, text }
}
```

与 trajectory-forward 插件的 zod schema 一一对应；改 schema 必须同步改类型并升 `stateVersion`。

## 七、前端消费

- **API 客户端**：`ai/app/src/api/harness/index.ts`（`startHarnessSession` / `sendHarnessMessage` / `fetchHarnessTrace` / `subscribeHarnessEvents`）
- **调试页**：`/debug/harness`（`HarnessTraceView`）— 创建会话 → 发送消息 → 查看轨迹与事件
- **环境变量**：`VITE_HARNESS_BASE_URL`（默认 `/schema-platform/harness`）、`VITE_HARNESS_TOKEN`（默认 `poc-token`）

详见 [AI App 架构与分层](./app/architecture#六harness-客户端与轨迹协议)。

## 八、心智模型（铁律）

- **插件 = 静态代码**（`cordis.patch.yml` 装载）；**工具 = 数据**（插件运行时 `ctx.tools.register` 注册）；**workflow = 数据**（永远不是插件）
- **轨迹 = 会话事件日志的投影**，协议类型与投影 schema 一一对应（`trajectory-forward` 的 zod schema）
- **Agent Loop**：`followup` 注入消息 → `whenIdle()` 等待停稳（LLM 推理 + 工具调用循环） → `summarize` 提取结果
- **租户隔离**：`tenant-gateway` 是第一道门（token → tenantId → 会话配额 → 预算断言 → SSE 票据）
- `server/` 全程不动；正式接入需过设计文档 §5.4 门禁（多租户隔离 POC、部署形态确认）

## 九、相关文档

- [AI App 概览](./app/index) — 前端应用（`debug/harness` 页入口）
- [AI App 架构与分层](./app/architecture) — 插件适配层与 Harness 客户端
- [架构设计](./architecture) — AI 平台双引擎整体架构
- [插件中心](./plugin) — Expert / Skill / Tool / MCP 配置
