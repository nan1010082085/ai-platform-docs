---
title: DSH Agent Runtime (ai/harness)
---

# DSH Agent Runtime (ai/harness)

> `ai/harness/` — standalone Node service built on `@deepseek-ai/dsh@0.1.0-rc.6` (exact version): exposes the DSH agent as an HTTP session API for platform-side consumption.
> Design basis: `ai/docs/design/dsh-cordis-integration.md` (Direction A + C; this service is the Direction C POC).

## 1. Positioning

DSH (DeepSeek Harness) as an agent runtime: reuse mature agent infrastructure (goal / plan / subagent / skill / workflow) to reduce custom agent-loop development. Currently a **POC**: single process, fixed token, no persistence. Formal integration requires passing the design doc §5.4 gate (multi-tenant isolation POC, deployment form confirmation).

## 2. Architecture

```
dsh --profile ai-harness            # DSH launcher
└─ bundles: @deepseek-ai/dsh-base   # session/agent/tools/skill/goal/plan family (no browser UI)
└─ custom plugins (cordis.patch.yml static loading):
   ├─ tenant-gateway        Tenant isolation gateway (token auth + session quota + budget assertion + SSE tickets)
   ├─ runner-http           session API + SSE (via ctx.agents + harnessGateway)
   ├─ platform-tools        platform_echo / platform_workflow_invoke (workflow-as-tool)
   └─ trajectory-forward    platform.nodeTrace projection (session events -> AgentNodeTrace)
```

### Cordis Plugin System

DSH is built on the [Cordis](https://github.com/cordiverse/cordis) dependency injection framework:
- **Plugins = static code**: declared in `cordis.patch.yml`, immutable at runtime
- **Tools = data**: registered dynamically via `ctx.tools.register` at plugin runtime
- **Workflow = data**: never a plugin; invoked via the platform_workflow_invoke tool

Plugins declare dependencies via `export const inject = ['serviceName']`; Cordis auto-injects the corresponding Service instances.

### Agent Loop Logic

```
User message -> runner-http.sendMessage()
  ├─ gateway.assertBudget()        # Budget pre-check (token/RMB/tool calls)
  ├─ agent.followup(userMessage)   # Inject user message
  ├─ agent.whenIdle()              # Wait for agent loop to settle
  │   ├─ LLM inference -> assistant message
  │   ├─ tool/call -> execute tool -> tool/result
  │   └─ Loop until no tool calls (turn/end)
  └─ summarize(events)             # Extract final text + stop reason
```

## 3. Directories

| Path | Description |
|------|------|
| `dsh-home/profiles/ai-harness/` | Profile source (package.json embeds `dsh.profile.bundles` + `cordis.patch.yml`) |
| `plugins/` | Four custom plugins (referenced via `link:`, take effect on change) |
| `plugins/tenant-gateway/` | Tenant isolation gateway (auth + quota + budget + tickets) |
| `plugins/runner-http/` | HTTP API service (session/message/events/trace) |
| `plugins/platform-tools/` | Platform tool registration (echo + workflow invoke) |
| `plugins/trajectory-forward/` | Trace projection (session events → AgentNodeTrace) |
| `scripts/smoke.mjs` | Full-chain acceptance (mock-LLM driven) |
| `scripts/smoke-isolation.mjs` | Multi-tenant isolation smoke test |

## 4. Run

```bash
cd ai/harness
pnpm install                       # root: dsh + plugin author deps
pnpm smoke                         # full-chain acceptance (mock LLM, no real API keys)
pnpm start                         # real start (needs DeepSeek credentials)
```

Production credentials: `DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY` (or `$DSH_HOME/.credentials.yaml`). The service listens on `127.0.0.1:5310` by default; the auth token is in `cordis.patch.yml` (currently `poc-token`).

## 5. API

| Method | Path | Description |
|---|---|---|
| GET | `/healthz` | Health check + gateway stats (tenants/sessions/budget config) |
| POST | `/session/start` | Create a persistent agent session → `{ sessionId }` (tenant quota check) |
| POST | `/session/:id/message` | Submit a user message, wait until settled → `{ text, reason }` (budget assertion) |
| POST | `/session/:id/events-ticket` | Issue SSE ticket → `{ ticket }` (short-lived, replaces plaintext token) |
| GET | `/session/:id/events?ticket=N` | SSE deltas of session events (ticket auth) |
| GET | `/session/:id/trace` | `platform.nodeTrace` projection snapshot (`AgentNodeTrace`) |

### Auth Flow

```
Request Bearer token -> tenant-gateway.resolveTenant()
  ├─ allowlist mode: POC static token -> tenantId mapping
  └─ verifyUrl mode: POST introspect endpoint -> { tenantId } (JWT not verified, exp parsed for cache TTL only)
```

### Budget Control

| Dimension | Default | Env Var |
|------|--------|----------|
| Per-session token limit | 100,000 | `AI_HARNESS_BUDGET_TOKENS` |
| Per-session tool call limit | 20 | `AI_HARNESS_BUDGET_WORK_UNITS` |
| Daily RMB budget | ¥10 | `AI_HARNESS_DAILY_RMB_BUDGET` |
| Sessions per tenant | 5 | `AI_HARNESS_SESSIONS_PER_TENANT` |

Budget assertion runs before each `sendMessage`; exceeding any dimension returns `402 BUDGET_EXCEEDED`.

### SSE Ticket Mechanism

Replaces plaintext token passing: `events-ticket` issues a short-lived ticket (5 min), `events?ticket=N` consumes it. Multiple concurrent SSE subscriptions per session are allowed (multi-tab scenario).

## 6. Trace Projection Protocol

Trace = projection of the session event log (`sessionProjections` pure-function folding); protocol types live in `ai/app/src/types/harnessTrace.ts`:

```ts
interface AgentNodeTrace {
  turns: AgentNodeTraceTurn[]        // { turn, startSeq, endSeq, endReason }
  toolCalls: AgentNodeTraceToolCall[] // { callId, turn, step, name, arguments, callSeq, resultSeq, isError }
  messages: AgentNodeTraceMessage[]   // { turn, step, text }
}
```

1:1 with the trajectory-forward plugin zod schema; schema changes must sync the types and bump `stateVersion`.

## 7. Frontend Consumption

- **API client**: `ai/app/src/api/harness/index.ts` (`startHarnessSession` / `sendHarnessMessage` / `fetchHarnessTrace` / `subscribeHarnessEvents`)
- **Debug page**: `/debug/harness` (`HarnessTraceView`) — create session → send message → view trace and events
- **Env vars**: `VITE_HARNESS_BASE_URL` (default `/schema-platform/harness`), `VITE_HARNESS_TOKEN` (default `poc-token`)

See [AI App Architecture & Layers](./app/architecture#6-harness-client--trace-protocol).

## 8. Mental Model (Iron Rules)

- **Plugins = static code** (loaded via `cordis.patch.yml`); **tools = data** (registered at runtime via `ctx.tools.register`); **workflow = data** (never a plugin)
- **Trace = projection of the session event log**; protocol types stay 1:1 with the projection schema (`trajectory-forward` zod schema)
- **Agent Loop**: `followup` injects message → `whenIdle()` waits for settlement (LLM inference + tool call loop) → `summarize` extracts result
- **Tenant isolation**: `tenant-gateway` is the first gate (token → tenantId → session quota → budget assertion → SSE tickets)
- `server/` is never touched; formal integration requires passing the design doc §5.4 gate (multi-tenant isolation POC, deployment form confirmation)

## 9. Related Docs

- [AI App Overview](./app/index) — frontend app (`debug/harness` entry)
- [AI App Architecture & Layers](./app/architecture) — plugin adapter and Harness client
- [Architecture](./architecture) — AI platform dual-engine overview
- [Plugin Center](./plugin) — Expert / Skill / Tool / MCP configuration
