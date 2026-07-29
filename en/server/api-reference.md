# API Reference

> Last updated: 2026-06-28
>
> Base URL: `http://localhost:3001`
>
> Auth: `Authorization: Bearer <token>` or `X-API-Key: sk-xxx`

---

## Table of Contents

- [1. Health Check](#1-health-check)
- [2. Auth](#2-auth)
- [3. SSO](#3-sso)
- [4. Schema Management](#4-schema-management)
- [5. User Management](#5-user-management)
- [6. Role Management](#6-role-management)
- [7. Department Management](#7-department-management)
- [8. Menu Management](#8-menu-management)
- [9. Position Management](#9-position-management)
- [10. Dictionary Management](#10-dictionary-management)
- [11. System Params](#11-system-params)
- [12. Tenant Management](#12-tenant-management)
- [13. Component Templates](#13-component-templates)
- [14. Form Submissions](#14-form-submissions)
- [15. Webhook](#15-webhook)
- [16. API Key](#16-api-key)
- [17. Credential Management](#17-credential-management)
- [18. LLM Model Config](#18-llm-model-config)
- [19. Micro-frontend Apps](#19-micro-frontend-apps)
- [20. Audit Log](#20-audit-log)
- [21. Login Log](#21-login-log)
- [22. Online Users](#22-online-users)
- [23. File Upload](#23-file-upload)
- [24. Dashboard Stats](#24-dashboard-stats)
- [25. Auxiliary APIs](#25-auxiliary-apis)
- [26. Flow Definition](#26-flow-definition)
- [27. Flow Version](#27-flow-version)
- [28. Flow Instance](#28-flow-instance)
- [29. Flow Task](#29-flow-task)
- [30. Approval Log](#30-approval-log)
- [31. Flow Message](#31-flow-message)
- [32. Flow Notification](#32-flow-notification)
- [33. Flow Template](#33-flow-template)
- [34. Flow Monitoring](#34-flow-monitoring)
- [35. Flow Timer](#35-flow-timer)
- [36. AI Core](#36-ai-core)
- [37. AI Health Check](#37-ai-health-check)
- [38. AI Monitoring](#38-ai-monitoring)
- [39. AI Plugin Marketplace](#39-ai-plugin-marketplace)
- [40. RAG Knowledge Base](#40-rag-knowledge-base)
- [41. LLM Provider](#41-llm-provider)
- [42. AI Collaboration](#42-ai-collaboration)
- [43. Prompt Template](#43-prompt-template)
- [44. AI Runtime Decision](#44-ai-runtime-decision)

---

## 1. Health Check

### `GET /api/health`

Returns service status, uptime, and database connection status.

**Auth**: None

**Response**:
```json
{
  "status": "ok",
  "uptime": 12345,
  "database": "connected"
}
```

---

## 2. Auth

### `POST /api/auth/login`

User login; supports `tenantCode` or `X-Tenant-Id` to resolve the tenant.

**Auth**: None

**Request body**:
```json
{
  "username": "admin",
  "password": "admin123",
  "tenantCode": "default"
}
```

**Response**:
```json
{
  "token": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "...",
    "username": "admin",
    "displayName": "Admin",
    "roles": ["admin"]
  }
}
```

### `POST /api/auth/refresh`

Refresh the access token.

**Request body**:
```json
{
  "refreshToken": "eyJ..."
}
```

### `POST /api/auth/logout`

Logout; clears the token blacklist and SSO session.

**Auth**: Bearer Token

### `GET /api/auth/me`

Get the current user info and permissions.

**Auth**: Bearer Token

**Response**:
```json
{
  "user": {
    "id": "...",
    "username": "admin",
    "displayName": "Admin",
    "roles": ["admin"],
    "permissions": ["system:user:list", "..."]
  }
}
```

### `POST /api/auth/register`

Self-registration (open endpoint).

**Request body**:
```json
{
  "username": "newuser",
  "password": "pass123",
  "displayName": "New User"
}
```

### `POST /api/auth/change-password`

Change password.

**Auth**: Bearer Token

**Request body**:
```json
{
  "oldPassword": "old123",
  "newPassword": "new456"
}
```

---

## 3. SSO

OAuth2 authorization code flow.

### `GET /api/auth/sso/authorize`

SSO authorization endpoint.

**Params**:
| Param | Type | Required | Description |
|---|---|---|---|
| client_id | string | Yes | OAuth client ID |
| redirect_uri | string | Yes | Callback URL |
| response_type | string | Yes | Fixed `code` |
| scope | string | No | Permission scope |
| state | string | No | Anti-CSRF state |

### `POST /api/auth/sso/token`

Exchange an authorization code for a token.

**Request body**:
```json
{
  "grant_type": "authorization_code",
  "code": "...",
  "client_id": "...",
  "client_secret": "...",
  "redirect_uri": "..."
}
```

### `POST /api/auth/sso/refresh`

Token rotation.

### `GET /api/auth/sso/session`

Check SSO session status.

### `POST /api/auth/sso/logout`

Destroy the SSO session.

---

## 4. Schema Management

### `GET /api/schemas`

Schema list (pagination + search + type filter).

**Params**:
| Param | Type | Description |
|---|---|---|
| page | number | Page number |
| pageSize | number | Page size |
| keyword | string | Search keyword |
| type | string | Schema type filter |

### `POST /api/schemas`

Create a schema.

**Request body** - `json` can be a Widget array or an object with canvas config:
```json
{
  "name": "Leave Form",
  "type": "form",
  "json": {
    "widgets": [],
    "board": {
      "canvas": { "layoutMode": "flex" },
      "variables": [],
      "events": []
    }
  }
}
```

On failure the error envelope: `{ "success": false, "error": { "code": "VALIDATION_ERROR" | "BAD_REQUEST", "message": "...", "details?": [...] } }`.

### `POST /api/schemas/import`

Import a schema (deep validation of widget tree + ID regeneration).

### `GET /api/schemas/published`

Published schema list.

### `GET /api/schemas/published/:sourceId`

View a published schema by sourceId.

### `GET /api/schemas/published/by-publish-id/:publishId`

View a published schema by publishId.

### `GET /api/schemas/:param/versions`

View schema version history.

### `GET /api/schemas/:param/versions/:version`

View a specific version.

### `DELETE /api/schemas/:param/versions/:version`

Delete a specific version (cannot delete the current version).

### `GET /api/schemas/:id`

Get a single schema.

### `PUT /api/schemas/:id`

Update a schema (auto-pushes a version snapshot, up to 15).

### `POST /api/schemas/:id/publish`

Publish a schema (can specify a version).

### `DELETE /api/schemas/:id`

Delete a schema (also deletes published versions).

---

## 5. User Management

### `GET /api/users`

User list (pagination + search + tenant/dept/status/role filter).

**Params**:
| Param | Type | Description |
|---|---|---|
| page | number | Page number |
| pageSize | number | Page size |
| keyword | string | Search keyword |
| tenantId | string | Tenant ID |
| deptId | string | Department ID |
| status | number | Status |
| roleId | string | Role ID |

### `GET /api/users/:id`

Get a single user.

### `POST /api/users`

Create a user.

**Request body**:
```json
{
  "username": "user1",
  "password": "pass123",
  "displayName": "User 1",
  "roles": ["role_id"],
  "deptId": "dept_id",
  "email": "user1@example.com"
}
```

### `PUT /api/users/:id`

Update a user.

### `DELETE /api/users/:id`

Delete a user.

### `PUT /api/users/:id/password`

Reset a user's password.

### `GET /api/users/export`

Export users to Excel.

### `POST /api/users/import`

Import users from Excel.

---

## 6. Role Management

### `GET /api/roles/permissions`

Get available permissions (grouped by module).

### `GET /api/roles`

Role list (pagination + search).

### `GET /api/roles/:id`

Get a single role.

### `POST /api/roles`

Create a role (with permissions and data scope).

**Request body**:
```json
{
  "name": "Admin",
  "description": "System administrator",
  "permissions": ["system:user:list", "..."],
  "data_scope": "all",
  "dept_ids": []
}
```

### `PUT /api/roles/:id`

Update a role.

### `DELETE /api/roles/:id`

Delete a role (auto-removed from users).

### `GET /api/roles/:id/users`

Get users under a role.

---

## 7. Department Management

### `GET /api/depts`

Department list (supports `?tree=true` for tree response).

### `GET /api/depts/:id`

Get a single department.

### `POST /api/depts`

Create a department.

### `PUT /api/depts/:id`

Update a department.

### `PATCH /api/depts/:id/move`

Move a department (with cycle detection).

**Request body**:
```json
{
  "parentId": "new_parent_id"
}
```

### `DELETE /api/depts/:id`

Delete a department (refused if it has sub-departments or associated users).

---

## 8. Menu Management

### `GET /api/menus`

Menu list (supports `?tree=true`).

### `GET /api/menus/route`

Current user's visible menu tree (frontend dynamic routes).

### `GET /api/menus/:id`

Get a single menu.

### `POST /api/menus`

Create a menu.

### `PUT /api/menus/:id`

Update a menu (with cycle detection).

### `DELETE /api/menus/:id`

Delete a menu.

---

## 9. Position Management

### `GET /api/posts`

Position list (pagination + search).

### `GET /api/posts/all`

All enabled positions (for dropdowns).

### `GET /api/posts/:id`

Get a single position.

### `POST /api/posts`

Create a position.

### `PUT /api/posts/:id`

Update a position.

### `DELETE /api/posts/:id`

Delete a position.

---

## 10. Dictionary Management

### `GET /api/dict/types`

Dictionary type list.

### `GET /api/dict/types/:id`

Get a dictionary type.

### `POST /api/dict/types`

Create a dictionary type.

### `PUT /api/dict/types/:id`

Update a dictionary type.

### `DELETE /api/dict/types/:id`

Delete a dictionary type (cascades to data).

### `GET /api/dict/data`

Dictionary data list.

### `GET /api/dict/data/by-type/:code`

Get data items by type code (public endpoint).

### `GET /api/dict/data/:id`

Get dictionary data.

### `POST /api/dict/data`

Create dictionary data.

### `PUT /api/dict/data/:id`

Update dictionary data.

### `DELETE /api/dict/data/:id`

Delete dictionary data.

---

## 11. System Params

### `GET /api/config`

Param list.

### `GET /api/config/key/:key`

Query a param value by key.

### `GET /api/config/:id`

Get a param.

### `POST /api/config`

Create a param.

### `PUT /api/config/:id`

Update a param.

### `DELETE /api/config/:id`

Delete a param.

---

## 12. Tenant Management

### `GET /api/tenants`

Tenant list.

### `GET /api/tenants/:id`

Get a tenant.

### `POST /api/tenants`

Create a tenant (auto-initializes default roles/admin/menus).

### `PUT /api/tenants/:id`

Update a tenant.

### `DELETE /api/tenants/:id`

Delete a tenant.

---

## 13. Component Templates

### `GET /api/templates`

Template list (search + category + tag + component type filter).

### `POST /api/templates`

Create a template.

### `GET /api/templates/:id`

Get a template.

### `PUT /api/templates/:id`

Update a template.

### `DELETE /api/templates/:id`

Delete a template.

### `POST /api/templates/:id/apply`

Apply a template (returns widgets with regenerated IDs).

---

## 14. Form Submissions

### `POST /api/submissions/:schemaId`

Submit form data.

### `GET /api/submissions/:schemaId`

Query submissions (pagination + status filter).

### `GET /api/submissions/:schemaId/export`

Export as CSV/Excel.

### `GET /api/submissions/:schemaId/:id`

Get a single submission.

### `PATCH /api/submissions/:schemaId/:id/status`

Update submission status (approve/reject).

### `DELETE /api/submissions/:schemaId/:id`

Delete a submission.

### `POST /api/submissions/:schemaId/batch/delete`

Batch delete.

### `POST /api/submissions/:schemaId/batch/status`

Batch update status.

---

## 15. Webhook

### `POST /api/webhooks`

Create a webhook.

**Request body**:
```json
{
  "name": "Flow Trigger",
  "url": "https://example.com/hook",
  "events": ["schema.published"],
  "secret": "my_secret",
  "flowDefinitionId": "flow_id",
  "bodyMapping": {}
}
```

### `GET /api/webhooks`

Webhook list.

### `GET /api/webhooks/:id`

Get a webhook.

### `PUT /api/webhooks/:id`

Update a webhook.

### `DELETE /api/webhooks/:id`

Delete a webhook.

### `GET /api/webhooks/:id/logs`

Delivery logs.

### `POST /api/webhooks/:webhookId/trigger`

External trigger (HMAC signature verification -> start flow instance).

### `GET /api/webhooks/:webhookId/trigger`

GET trigger (query-param HMAC verification).

---

## 16. API Key

**User isolation**: non-admin roles can only view/manage their own keys; admins (role `data_scope` = `all`) can view and manage all keys in the tenant.

### `POST /api/keys`

Create an API key (returns the full key, only once). `createdBy` is auto-set to the current user.

### `GET /api/keys`

API key list (masked). Non-admins only get their own keys; admins get all in the tenant.

Query params: `page`, `pageSize`, `status` (active/disabled).

### `GET /api/keys/:id`

Get API key detail. Non-admins can only view their own keys; otherwise 404.

### `DELETE /api/keys/:id`

Delete an API key. Non-admins can only delete their own keys; otherwise 404.

### `PATCH /api/keys/:id/status`

Enable/disable. Non-admins can only modify their own keys; otherwise 404.

---

## 17. Credential Management

Encrypted storage of third-party credentials.

### `GET /api/credentials`

Credential list (without data).

### `POST /api/credentials`

Create a credential (data encrypted at rest).

### `GET /api/credentials/:id`

Get credential detail (data decrypted).

### `PUT /api/credentials/:id`

Update a credential.

### `DELETE /api/credentials/:id`

Delete a credential.

---

## 18. LLM Model Config

### `GET /api/model-configs`

Model config list. The `apiKey` field is masked (keep first 4 and last 4, middle `****`).

### `POST /api/model-configs`

Create a model config. Response returns the full `apiKey` (one-time echo).

### `GET /api/model-configs/:id`

Get a model config. `apiKey` is masked.

### `PUT /api/model-configs/:id`

Update a model config. Response returns the full `apiKey` (one-time echo).

### `DELETE /api/model-configs/:id`

Delete a model config.

### `POST /api/model-configs/:id/test`

Test model connectivity.

---

## 19. Micro-frontend Apps

### `GET /api/micro-apps`

Micro-app list.

### `GET /api/micro-apps/:id`

Get a micro-app.

### `POST /api/micro-apps`

Create a micro-app.

### `PUT /api/micro-apps/:id`

Update a micro-app.

### `DELETE /api/micro-apps/:id`

Delete a micro-app.

---

## 20. Audit Log

### `GET /api/audit-logs`

Log list (multi-dimensional filter).

### `GET /api/audit-logs/:id`

Log detail (includes request body).

### `GET /api/audit-logs/modules/list`

Get all module names.

---

## 21. Login Log

### `GET /api/login-logs`

Login log list.

### `DELETE /api/login-logs`

Clear login logs.

---

## 22. Online Users

### `GET /api/online-users`

Online user list (based on SSO sessions).

### `DELETE /api/online-users/:sessionId`

Force logout.

---

## 23. File Upload

### `POST /api/files/upload/image`

Image upload (5MB limit).

### `POST /api/files/upload/avatar`

Avatar upload.

### `POST /api/files/upload/file`

General file upload (20MB limit).

### `GET /api/files/:subdir/:filename`

Static file access.

---

## 24. Dashboard Stats

### `GET /api/stats`

Platform aggregate stats (Schema/Flow/AI/activity).

### `GET /api/stats/conversations`

Recent AI conversation list.

---

## 25. Auxiliary APIs

### `GET /api/data`

Mock data (200 mock records, supports pagination + filtering).

### `GET /api/options`

Static option data (cities/departments/roles/skills, supports tree).

### `GET /api/mock`

Generate mock form data from a schema.

### `GET /api/docs`

Swagger UI page.

### `GET /api/docs.json`

OpenAPI JSON spec.

### `GET /api/mcp`

MCP (Model Context Protocol) SSE transport.

---

## 26. Flow Definition

### `GET /api/flows`

Flow definition list.

### `POST /api/flows`

Create a flow definition.

### `GET /api/flows/:id`

Get a flow definition.

### `PUT /api/flows/:id`

Update a flow definition.

### `DELETE /api/flows/:id`

Delete a flow definition.

### `POST /api/flows/:id/publish`

Publish a flow.

### `POST /api/flows/:id/archive`

Archive a flow.

---

## 27. Flow Version

### `GET /api/flows/:definitionId/versions`

Version list.

### `POST /api/flows/:definitionId/versions`

Save a new version.

### `GET /api/flows/:definitionId/versions/:versionId`

Get a specific version.

---

## 28. Flow Instance

### `GET /api/flow-instances/stats`

Instance status stats (supports time range).

### `POST /api/flow-instances`

Start a flow instance.

### `GET /api/flow-instances`

Instance list.

### `GET /api/flow-instances/:id`

Instance detail.

### `POST /api/flow-instances/:id/cancel`

Cancel an instance.

### `GET /api/flow-instances/:id/graph`

Get the flow graph.

### `GET /api/flow-instances/:id/state`

Get execution state.

### `GET /api/flow-instances/:id/logs`

Get approval logs.

---

## 29. Flow Task

### `GET /api/flow-tasks/my`

My pending tasks.

### `GET /api/flow-tasks/:id`

Task detail.

### `POST /api/flow-tasks/:id/claim`

Claim a task.

### `POST /api/flow-tasks/:id/complete`

Complete a task (approve).

### `POST /api/flow-tasks/:id/reject`

Reject a task.

### `POST /api/flow-tasks/:id/reject-to-node`

Reject to a specific node.

### `POST /api/flow-tasks/:id/delegate`

Delegate a task.

### `GET /api/flow-tasks/:id/reject-targets`

Get reject target node list.

### `POST /api/flow-tasks/batch/approve`

Batch approve.

### `POST /api/flow-tasks/batch/reject`

Batch reject.

### `POST /api/flow-tasks/batch/delegate`

Batch delegate.

---

## 30. Approval Log

### `GET /api/flow-approvals`

Query approval logs (by instanceId).

### `GET /api/flow-export/approval-logs`

Export approval logs as CSV/Excel.

---

## 31. Flow Message

### `POST /api/flow-messages`

Send a message to a channel (external trigger).

### `POST /api/flow-messages/complete`

Complete a message task.

---

## 32. Flow Notification

### `GET /api/flow/notifications`

Notification list (pagination + unread filter).

### `GET /api/flow/notifications/unread-count`

Unread notification count.

### `PUT /api/flow/notifications/:id/read`

Mark as read.

### `PUT /api/flow/notifications/read-all`

Mark all as read.

---

## 33. Flow Template

### `GET /api/flow-templates`

Flow template list.

### `POST /api/flow-templates`

Create a flow template.

### `GET /api/flow-templates/:id`

Get a template.

### `PUT /api/flow-templates/:id`

Update a template.

### `DELETE /api/flow-templates/:id`

Delete a template.

### `POST /api/flow-templates/:id/apply`

Apply a template (creates a flow definition + version).

### `POST /api/flow-templates/seed`

Seed built-in templates.

---

## 34. Flow Monitoring

### `GET /api/flow-monitor/overview`

Monitoring overview.

### `GET /api/flow-monitor/bottleneck`

Bottleneck analysis.

### `GET /api/flow-monitor/trends`

Trend analysis.

---

## 35. Flow Timer

### `GET /api/flow-timers/check`

Check and trigger due timers (Cron invocation).

---

## 36. AI Core

### Chat Streaming (WebSocket)

The chat UI streams via Socket.IO, not HTTP SSE.

| Event | Direction | Description |
|------|------|------|
| `chat:send` | Client -> Server | Send a message, start the LangGraph stream |
| `chat:event` | Server -> Client | Stream events (text, tool_call, schema, flow, done, etc.) |
| `chat:resume` | Client -> Server | Resume after a HITL interrupt |
| `chat:cancel` | Client -> Server | Cancel the current stream |

Implementation: `server/src/ai/chatStreamHandler.ts` + `chatStreamRunner.ts`.

### Agent Workflow Execution Progress (WebSocket)

In-platform execution (Chat, designer, execution detail/list) pushes progress via Socket.IO:

| Event | Direction | Description |
|------|------|------|
| `workflow:subscribe` | Client -> Server | Subscribe to the `workflow:{executionId}` room |
| `workflow:event` | Server -> Client | Execution snapshot (status, nodeRecords, streamingOutput) |
| `workflow:unsubscribe` | Client -> Server | Unsubscribe |
| `workflow:error` | Server -> Client | Subscription failed (no permission, execution not found) |

Starting an execution still goes through REST: `POST /api/ai/workflows/:id/execute` (can pass `trigger: chat|manual|...`).

Implementation: `server/src/ai/workflowStreamHandler.ts` + `workflowExecutionPush.ts`.

### `GET /api/ai/chat/interrupt/:threadId`

Check HITL interrupt status (REST query; resume via the `chat:resume` WebSocket).

### `POST /api/ai/publish`

Publish an AI-generated Schema/Flow.

### `GET /api/ai/conversations`

Conversation list.

### `GET /api/ai/conversations/search`

Search conversations.

### `GET /api/ai/conversations/:id`

Conversation detail.

### `DELETE /api/ai/conversations/:id`

Delete a conversation.

### `POST /api/ai/messages/:id/feedback`

Message feedback (positive/negative).

### `GET /api/ai/conversations/:id/versions`

Version history.

### `GET /api/ai/versions/compare`

Version comparison (structured diff).

### `GET /api/ai/versions/:versionId`

Get version content.

### `POST /api/ai/conversations/:id/rollback`

Roll back to a specific version.

### `GET /api/ai/rag/search`

RAG semantic search.

### `GET /api/ai/industries`

Industry agent list.

### `GET /api/ai/industries/:industry/templates`

Industry templates.

### `POST /api/ai/behavior`

Record user behavior.

### `POST /api/ai/behavior/batch`

Batch record behavior.

### `GET /api/ai/behavior/preferences`

Get user preferences.

### `GET /api/ai/behavior/stats`

Behavior stats.

### `GET /api/ai/mention/search/:type`

@mention search (schema/flow/widget).

### `GET /api/ai/sync/schema/:schemaId/flows`

Schema -> Flow reverse query.

### `GET /api/ai/sync/flow/:flowId/node/:nodeId/schema`

Flow -> Schema forward query.

### `POST /api/ai/sync/schema/:schemaId/update-flows`

Sync Flow when a Schema updates.

### `POST /api/ai/sync/bind`

Bind a Schema to a Flow node.

---

## 37. AI Health Check

### `GET /api/ai/health`

AI provider connectivity and API key status.

---

## 38. AI Monitoring

### `GET /api/ai/monitor/stats`

Agent performance stats (aggregated).

### `GET /api/ai/monitor/recent`

Recent agent metrics.

### `GET /api/ai/monitor/alerts`

Performance alerts (slow ops/failures/high tokens).

### `GET /api/ai/monitor/summary`

Quick overview.

---

## 39. AI Plugin Marketplace

### `GET /api/ai/plugins`

Plugin list.

### `GET /api/ai/plugins/user/installed`

User's installed plugins.

### `GET /api/ai/plugins/:id`

Plugin detail.

### `POST /api/ai/plugins`

Create a plugin.

### `PUT /api/ai/plugins/:id`

Update a plugin.

### `DELETE /api/ai/plugins/:id`

Delete a plugin.

### `POST /api/ai/plugins/:id/install`

Install a plugin.

### `POST /api/ai/plugins/:id/uninstall`

Uninstall a plugin.

---

## 40. RAG Knowledge Base

> See [rag-architecture.md](./rag-architecture.md) for details.

### `POST /api/ai/rag/reindex`

Batch rebuild vector embedding indexes for all schemas and flows.

**Auth**: Bearer Token

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 128,
    "created": 100,
    "updated": 20,
    "skipped": 5,
    "errors": 3,
    "flowsTotal": 42,
    "flowsCreated": 40,
    "flowsUpdated": 1,
    "flowsSkipped": 1,
    "flowsErrors": 0
  }
}
```

### `GET /api/ai/rag/status`

Index status stats, including indexed/pending/stale counts and the unindexed resource list.

**Auth**: Bearer Token

**Response**:
```json
{
  "success": true,
  "data": {
    "embeddingConfigured": true,
    "autoIndexEnabled": true,
    "totalSchemas": 128,
    "totalFlows": 42,
    "totalEmbeddings": 170,
    "indexed": 125,
    "unindexed": 3,
    "indexedFlows": 41,
    "unindexedFlows": 1,
    "stale": 2,
    "unindexedSchemas": [
      { "id": "...", "name": "New Form", "type": "form" }
    ]
  }
}
```

### `DELETE /api/ai/rag/:schemaId`

Delete the vector embeddings of a schema (does not delete the source schema).

**Auth**: Bearer Token

**Response**:
```json
{
  "success": true,
  "data": { "schemaId": "...", "deleted": true }
}
```

### `POST /api/ai/rag/reindex/:schemaId`

Rebuild the vector embedding index for a single schema.

**Auth**: Bearer Token

**Response**:
```json
{
  "success": true,
  "data": {
    "schemaId": "...",
    "action": "updated"
  }
}
```

`action` values: `created` (new) / `updated` (update) / `skipped` (unchanged)

---

## 41. LLM Provider

### `GET /api/ai/llm-providers`

Provider list and strategy.

### `POST /api/ai/llm-provider`

Set the default provider/strategy.

### `GET /api/ai/llm-usage`

Usage stats.

---

## 42. AI Collaboration

### `GET /api/ai/collaboration/sessions`

Active collaboration sessions.

### `GET /api/ai/collaboration/sessions/:id`

Session info.

### `GET /api/ai/collaboration/conversations/:id/export`

Export a conversation as JSON.

---

## 43. Prompt Template

### `GET /api/ai/prompts`

Prompt template list.

### `POST /api/ai/prompts`

Create a template.

### `GET /api/ai/prompts/:id`

Template detail.

### `PUT /api/ai/prompts/:id`

Update a template.

### `DELETE /api/ai/prompts/:id`

Delete a template.

### `POST /api/ai/prompts/:id/analyze`

Analyze prompt quality.

### `POST /api/ai/prompts/:id/optimize`

Optimize a prompt based on feedback.

### `POST /api/ai/prompts/:id/test`

Test a prompt.

### `GET /api/ai/prompts/:id/versions`

Version history.

### `POST /api/ai/prompts/:id/render`

Render template variables.

### `POST /api/ai/prompts/seed`

Seed built-in templates.

---

## 44. AI Runtime Decision

> ⚠️ Some of the following APIs are TODO placeholders.

### `POST /api/ai/runtime/recommend-assignee`

Smart assignee recommendation (current: rule engine).

### `POST /api/ai/runtime/evaluate-condition`

Condition expression evaluation (current: returns fixed true).

### `POST /api/ai/runtime/predict-outcome`

Predict approval outcome (current: returns default).

### `POST /api/ai/runtime/detect-anomaly`

Anomaly detection (current: timeout detection).

### `POST /api/ai/runtime/approval-suggestion`

Approval suggestion (current: returns generic advice).

---

## Agent Workflow (in-platform JWT)

| Method | Path | Description |
|---|---|---|
| GET | `/api/ai/workflows` | List |
| POST | `/api/ai/workflows` | Create |
| GET | `/api/ai/workflows/:id` | Detail (includes slug, onCompleteWebhook) |
| PUT | `/api/ai/workflows/:id` | Update (name / slug / onCompleteWebhook / draftGraph) |
| POST | `/api/ai/workflows/:id/publish` | Publish |
| POST | `/api/ai/workflows/:id/execute` | Test execution |
| GET | `/api/ai/workflow-executions/:id` | Execution detail |
| POST | `/api/ai/workflow-executions/:id/resume` | HITL resume |
| POST | `/api/ai/workflow-executions/:id/cancel` | Cancel |

Webhook trigger: `POST /api/ai/webhooks/*path` (HMAC `X-Webhook-Signature`).

Plugin registry (designer): `GET /api/ai/plugins` - returns an experts / tools / mcpServers config snapshot. See [Plugin Center](/ai/plugin).

---

## Agent Workflow External Integration (invoke)

> **Only external entry**: `POST /api/ai/workflows/invoke/:slugOrId` (by slug or workflow `_id`).
> `/api/ai/open/*` was **removed** in baseline 1.0. See [SDK Guide](/ai/sdk), [Workflow Open API](/ai/design/workflow-open-api).

**Auth (one of)**:

| Key type | Header | Format | Description |
|---|---|---|---|
| Workflow Key | `X-Workflow-Key` | `wf_...` | `invokeKey` generated on workflow publish |
| API Key | `X-API-Key` | `sk_...` | Platform API key (created via `POST /api/keys`) |

| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/workflows/invoke/:slugOrId` | Execute a published workflow (202 + executionId) |
| GET | `/api/ai/workflows/invoke/executions/:executionId` | Query execution status |

**Headers**:

| Header | Required | Description |
|---|---|---|
| `X-Workflow-Key` | One of | Workflow-level invoke key |
| `X-API-Key` | One of | Platform API key |
| `X-Tenant-Id` | No | Default `000000` |

**Body** (JSON, all optional):

| Field | Description |
|---|---|
| `input` | Workflow input object |
| `trigger` | `manual` \| `webhook` \| `chat` \| `api` (default `api`) |
| `callbackUrl` / `callbackSecret` | Override the workflow-level `onCompleteWebhook` |

**Admin plane** (JWT): `POST /api/ai/workflows/:id/execute` is the same as the ai-app designer test execution; the owner holding the key is equivalent to invoke.

---

## Appendix: ID Format

The `_id` field of all resources is a MongoDB ObjectId (24-char hex string), e.g. `685faa86c32e0839b4f9de6f`.

Route param ID validation uniformly uses `mongoose.Types.ObjectId.isValid(id)`.

---

## Appendix: Middleware

| Middleware | Purpose | Usage |
|---|---|---|
| `auth` | JWT auth | `Authorization: Bearer <token>` |
| `apiKeyAuth` | API key auth | `X-API-Key: sk-xxx` |
| `apiOrJwtAuth` | Dual-channel auth | Either of the above |
| `permission` | Permission check | Requires a permission code |
| `dataScope` | Data scope filter | Based on role config |
| `tenantContext` | Tenant context | Auto-injects tenantId |
| `auditLog` | Audit log | Auto-records write ops |
| `validate` | Zod validation | Request body / query params |
| `timeout` | Timeout control | 30s, SSE skipped |

## Appendix: Common Response Format

### Success response
```json
{
  "code": 200,
  "data": { ... },
  "message": "success"
}
```

### Paginated response
```json
{
  "code": 200,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### Error response
```json
{
  "code": 400,
  "message": "Invalid params",
  "errors": [...]
}
```
