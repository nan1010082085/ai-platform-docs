# Server Capabilities

> Last updated: 2026-06-28

## 1. Positioning

`@server` is the backend API service of Schema Platform, providing a unified data and business-logic layer for the visual form designer, BPMN engine, and AI assistant.

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js + TypeScript (ESM) |
| Web framework | Koa.js |
| Database | MongoDB 8 (Mongoose ODM) |
| Auth | JWT + bcryptjs + OAuth2 authorization code |
| AI engine | LangGraph (multi-agent architecture) |
| Realtime | Socket.IO |
| Cache | Redis (optional) |
| Deploy | Traditional HTTP server (self-hosted) |

## 3. Core Capability Matrix

### 3.1 User & Permission

| Capability | Description | Status |
|---|---|---|
| Multi-tenant isolation | AsyncLocalStorage + Mongoose plugin auto-injects tenantId | ✅ |
| RBAC permissions | Role-permission mapping, middleware validation, Redis cache (5min TTL) | ✅ |
| Data permission scope | all / dept / self / custom modes | ✅ |
| SSO | OAuth2 authorization code, cross-app session sharing | ✅ |
| API Key auth | Machine-to-machine calls, supports scopes and expiry | ✅ |
| JWT + API Key dual channel | apiOrJwtAuth middleware, flexible switching | ✅ |
| Audit log | Auto-records write ops, including body, IP, user | ✅ |
| Login log | Records login success/failure, supports clearing | ✅ |
| Online user management | Based on SSO sessions, supports force logout | ✅ |
| Password policy | Configurable password strength validation | ✅ |

### 3.2 Organization

| Capability | Description | Status |
|---|---|---|
| Department management | Tree structure, supports move (with cycle detection) | ✅ |
| Position management | Position CRUD, supports sorting and status | ✅ |
| Menu management | Tree menu, supports frontend dynamic route generation | ✅ |
| User management | CRUD + batch import/export Excel | ✅ |
| Tenant management | Auto-initializes roles/admin/menus on creation | ✅ |

### 3.3 Schema Management

| Capability | Description | Status |
|---|---|---|
| Schema CRUD | Create, edit, delete form schemas | ✅ |
| Version management | Auto-push version snapshots (up to 15), view/delete | ✅ |
| Publish mechanism | Draft -> published, supports publishing a specific version | ✅ |
| Schema import | Deep validation of widget tree + ID regeneration | ✅ |
| Component templates | Template CRUD + apply (returns widgets with regenerated IDs) | ✅ |
| Mock data generation | Auto-generates mock form data from a schema | ✅ |

### 3.4 Form Data

| Capability | Description | Status |
|---|---|---|
| Form submission | Submit data per schema | ✅ |
| Submission management | Paginated query, status filter, single/batch delete | ✅ |
| Approval flow | submitted -> approved / rejected state transition | ✅ |
| Data export | CSV / Excel export | ✅ |
| Batch operations | Batch delete, batch update status | ✅ |

### 3.5 Flow Engine

| Capability | Description | Status |
|---|---|---|
| Flow definition | CRUD + publish + archive lifecycle | ✅ |
| Flow version | Versioned storage, supports coexistence of multiple versions | ✅ |
| Flow instance | Start, cancel, status query, flow graph retrieval | ✅ |
| Task management | Claim, complete, reject, reject-to-node, delegate | ✅ |
| Batch approval | Batch approve, batch reject, batch delegate | ✅ |
| Approval log | Full approval trail | ✅ |
| Flow notifications | Task create/timeout/complete/delegate/reject/flow-complete | ✅ |
| Flow templates | Built-in + custom templates, apply to create flows | ✅ |
| Flow monitoring | Overview, bottleneck analysis, trend analysis | ✅ |
| Intermediate events | Message events (send/receive/complete) | ✅ |
| Timers | Timer Intermediate Event, Cron trigger | ✅ |
| Data export | Approval log CSV/Excel export | ✅ |

### 3.6 AI Capabilities

| Capability | Description | Status |
|---|---|---|
| Multi-agent chat | LangGraph-driven, Router -> Editor/Flow/Page/General | ✅ |
| SSE streaming | thinking/text/tool_call/schema/flow/diff events | ✅ |
| HITL interrupt-resume | Pause on confirmation, resume after user confirms | ✅ |
| RAG semantic search | BGE-M3 vectors (SiliconFlow hosted) + cosine similarity + keyword fallback | ✅ |
| Multi LLM provider | DeepSeek/OpenAI/Claude/Ollama, with routing strategy | ✅ |
| LLM config priority | User request -> tenant DB default -> platform env -> error guidance | ✅ |
| PLATFORM_LLM_ENABLED | Set false to disable platform-hosted LLM, allow DB config only | ✅ |
| MCP protocol | SSE transport, Schema/Flow/Widget MCP servers | ✅ |
| Version management | AI-generated content auto-versioned, supports diff and rollback | ✅ |
| Plugin marketplace | Plugin CRUD + install/uninstall | ✅ |
| Prompt management | Template CRUD + quality analysis + feedback optimization + testing | ✅ |
| Industry agents | Medical/finance/education industry templates | ✅ |
| Behavior learning | User behavior recording -> preference analysis -> personalized recommendation | ✅ |
| Schema-Flow sync | Schema updates auto-sync referencing Flow nodes | ✅ |
| @mention search | Search schema/flow/widget and reference | ✅ |
| Conversation export | Export as JSON | ✅ |
| AI monitoring | Agent performance stats, alerts, overview | ✅ |
| Message feedback | Positive/negative feedback, supports comments | ✅ |

### 3.7 Integration & Extension

| Capability | Description | Status |
|---|---|---|
| Webhook | Event-driven, HMAC signature verification, auto-start flow | ✅ |
| Dictionary management | Dict types + data items, query by code | ✅ |
| System params | System/business params, query by key | ✅ |
| Micro-frontend apps | qiankun micro-app registration and management | ✅ |
| File upload | Image/avatar/general files, static file access | ✅ |
| Dashboard stats | Schema/Flow/AI/activity aggregate stats | ✅ |
| Event bus | schema.published / submission.created / webhook.triggered | ✅ |

### 3.8 Infrastructure

| Capability | Description | Status |
|---|---|---|
| Global error handling | errorHandler middleware, unified error response | ✅ |
| Request timeout | 30s timeout, SSE endpoints auto-skip | ✅ |
| Request validation | Zod schema validation middleware | ✅ |
| CORS | Configurable cross-origin | ✅ |
| Helmet | Security headers | ✅ |
| Graceful shutdown | SIGTERM/SIGINT signal handling | ✅ |
| Redis cache | Optional cache layer, supports key-pattern deletion | ✅ |
| Structured logging | Unified log format | ✅ |
| DB seed | Permissions/roles/menus/admin/micro-apps/templates/OAuth clients | ✅ |
| DB migration | src/migrations/ directory, role migration scripts | ✅ |

## 4. Known TODOs

| Endpoint | Current state | Note |
|---|---|---|
| `POST /api/ai/runtime/recommend-assignee` | Rule-engine placeholder | Smart assignee recommendation pending AI |
| `POST /api/ai/runtime/evaluate-condition` | Returns fixed true | Condition expression evaluation pending |
| `POST /api/ai/runtime/predict-outcome` | Returns default | Approval outcome prediction pending |
| `POST /api/ai/runtime/approval-suggestion` | Returns generic advice | Approval suggestion pending |
| Online user / today's visit stats | Returns 0 | Activity stats pending |

## 5. Architecture Highlights

1. **Clear layering**: routes -> middleware -> models, well-separated responsibilities
2. **Native multi-tenancy**: full-chain tenant isolation from middleware to model layer
3. **Event-driven**: EventBus decouples schema publish, form submission, webhook trigger
4. **AI-First**: LangGraph multi-agent architecture, supports streaming and human-in-the-loop
5. **ObjectId primary key**: all models use MongoDB native ObjectId for consistent data references
