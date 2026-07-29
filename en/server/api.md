# API Documentation

Base path: `/api`

All responses use a unified format:
```ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Array<{ path: string; message: string }> | unknown
  }
}
```

Error body convention:
- Contract fields are inside `error`: `code` + `message` (optional `details`)
- **No** top-level `message`; HTTP status is in the status line, not in `error.status`
- Common `code`s: `VALIDATION_ERROR` (Zod validation), `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`

> **ID format**: all resource IDs are MongoDB ObjectId (24-char hex string), e.g. `685faa86c32e0839b4f9de6f`.

## Auth

| Method | Path | Description | Auth |
|------|------|------|------|
| POST | `/auth/login` | Login | No |
| POST | `/auth/register` | Register | No |
| GET | `/auth/me` | Current user info | Yes |
| POST | `/auth/logout` | Logout | Yes |
| POST | `/auth/refresh` | Refresh token | No |
| POST | `/auth/change-password` | Change password | Yes |

## Schema Management

| Method | Path | Description | Auth |
|------|------|------|------|
| GET | `/schemas` | List (supports search/type/status pagination) | Yes |
| POST | `/schemas` | Create | Yes |
| GET | `/schemas/:id` | Detail | Yes |
| PUT | `/schemas/:id` | Update | Yes |
| DELETE | `/schemas/:id` | Delete | Yes |
| POST | `/schemas/import` | Import schema | Yes |
| GET | `/schemas/published` | Published list | Yes |
| GET | `/schemas/published/:sourceId` | View published by sourceId | Yes |
| POST | `/schemas/:id/publish` | Publish schema | Yes |
| GET | `/schemas/:param/versions` | Version list | Yes |
| GET | `/schemas/:param/versions/:version` | Specific version | Yes |
| DELETE | `/schemas/:param/versions/:version` | Delete version | Yes |

## Templates

| Method | Path | Description | Auth |
|------|------|------|------|
| GET | `/templates` | List (supports search/category/tag pagination) | No |
| POST | `/templates` | Create | Yes |
| GET | `/templates/:id` | Detail | No |
| PUT | `/templates/:id` | Update | Yes |
| DELETE | `/templates/:id` | Delete | Yes |
| POST | `/templates/:id/apply` | Apply template (returns cloned widgets) | No |

## Form Submissions

| Method | Path | Description | Auth |
|------|------|------|------|
| POST | `/submissions/:schemaId` | Submit form data | Yes |
| GET | `/submissions/:schemaId` | Query submissions (paginated + status filter) | Yes |
| GET | `/submissions/:schemaId/:id` | Get a single submission | Yes |
| PATCH | `/submissions/:schemaId/:id/status` | Update status | Yes |
| DELETE | `/submissions/:schemaId/:id` | Delete submission | Yes |
| GET | `/submissions/:schemaId/export` | Export CSV/Excel | Yes |
| POST | `/submissions/:schemaId/batch/delete` | Batch delete | Yes |
| POST | `/submissions/:schemaId/batch/status` | Batch update status | Yes |

## Flow

| Method | Path | Description | Auth |
|------|------|------|------|
| GET | `/flows` | Flow definition list | Yes |
| POST | `/flows` | Create flow definition | Yes |
| GET | `/flows/:id` | Flow definition detail | Yes |
| PUT | `/flows/:id` | Update flow definition | Yes |
| DELETE | `/flows/:id` | Delete flow definition | Yes |
| POST | `/flows/:id/publish` | Publish flow | Yes |
| POST | `/flows/:id/archive` | Archive flow | Yes |
| GET | `/flows/:definitionId/versions` | Version list | Yes |
| POST | `/flows/:definitionId/versions` | Save version | Yes |
| POST | `/flow-instances` | Start flow instance | Yes |
| GET | `/flow-instances` | Instance list | Yes |
| GET | `/flow-instances/:id` | Instance detail | Yes |
| POST | `/flow-instances/:id/cancel` | Cancel instance | Yes |
| GET | `/flow-instances/:id/graph` | Get flow graph | Yes |
| GET | `/flow-tasks/my` | My pending tasks | Yes |
| POST | `/flow-tasks/:id/complete` | Complete task | Yes |
| POST | `/flow-tasks/:id/reject` | Reject task | Yes |

## System Management

| Method | Path | Description | Auth |
|------|------|------|------|
| GET | `/menus` | Menu list (supports `?tree=true`) | Yes |
| GET | `/menus/route` | Current user's visible menu tree | Yes |
| GET | `/users` | User list | Yes |
| GET | `/roles` | Role list | Yes |
| GET | `/roles/permissions` | Available permissions | Yes |
| GET | `/depts` | Department list (supports `?tree=true`) | Yes |
| GET | `/posts` | Position list | Yes |
| GET | `/dict/types` | Dictionary type list | Yes |
| GET | `/dict/data/by-type/:code` | Query dict data by code | Yes |
| GET | `/micro-apps` | Micro-app list | Yes |
| GET | `/model-configs` | Model config list | Yes |
| GET | `/tenants` | Tenant list | Yes |
| GET | `/config` | System params list | Yes |
| GET | `/audit-logs` | Audit log list | Yes |
| GET | `/login-logs` | Login log list | Yes |
| GET | `/online-users` | Online user list | Yes |

## Webhook

| Method | Path | Description | Auth |
|------|------|------|------|
| POST | `/webhooks` | Create webhook | Yes |
| GET | `/webhooks` | Webhook list | Yes |
| GET | `/webhooks/:id` | Get webhook | Yes |
| PUT | `/webhooks/:id` | Update webhook | Yes |
| DELETE | `/webhooks/:id` | Delete webhook | Yes |
| GET | `/webhooks/:id/logs` | Delivery logs | Yes |
| POST | `/webhooks/:webhookId/trigger` | External trigger (HMAC signature) | No |

## AI Capabilities

| Method | Path | Description | Auth |
|------|------|------|------|
| POST | `/ai/chat` | SSE streaming chat | Yes |
| GET | `/ai/conversations` | Conversation list | Yes |
| GET | `/ai/conversations/:id` | Conversation detail | Yes |
| GET | `/ai/rag/search` | RAG semantic search | Yes |
| GET | `/ai/plugins` | Plugin list | Yes |
| GET | `/ai/prompts` | Prompt template list | Yes |
| GET | `/ai/health` | AI health check | Yes |
| GET | `/ai/monitor/stats` | Agent performance stats | Yes |

## Health Check

| Method | Path | Description | Auth |
|------|------|------|------|
| GET | `/health` | Health check (includes DB ping) | No |
