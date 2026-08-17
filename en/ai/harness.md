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
└─ custom plugins (statically loaded):
   ├─ runner-http           session API + SSE (via ctx.agents)
   ├─ platform-tools        platform_echo / platform_workflow_invoke (workflow-as-tool)
   └─ trajectory-forward    platform.nodeTrace projection (session events -> AgentNodeTrace)
```

## 3. Directories

| Path | Description |
|------|------|
| `dsh-home/profiles/ai-harness/` | Profile source (package.json embeds `dsh.profile.bundles` + `cordis.patch.yml`) |
| `plugins/` | Three custom plugins (referenced via `link:`, take effect on change) |
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
| GET | `/healthz` | Health check |
| POST | `/session/start` | Create a persistent agent session → `{ sessionId }` |
| POST | `/session/:id/message` | Submit a user message, wait until settled → `{ text, reason }` |
| GET | `/session/:id/events` | SSE deltas of session events (raw trace data) |
| GET | `/session/:id/trace` | `platform.nodeTrace` projection snapshot (`AgentNodeTrace`) |

Auth: Bearer token (POC `poc-token`; goes through a gateway before production).

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

- Plugins = static code (loaded via `cordis.patch.yml`); tools = data (registered at runtime via `ctx.tools.register`); a workflow is always data, never a plugin
- Trace = projection of the session event log; protocol types stay 1:1 with the projection schema
- `server/` is never touched; formal integration requires passing the design doc §5.4 gate (multi-tenant isolation POC, deployment form confirmation)

## 9. Related Docs

- [AI App Overview](./app/index) — frontend app (`debug/harness` entry)
- [AI App Architecture & Layers](./app/architecture) — plugin adapter and Harness client
- [Architecture](./architecture) — AI platform dual-engine overview
- [Plugin Center](./plugin) — Expert / Skill / Tool / MCP configuration
