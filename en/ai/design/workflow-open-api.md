# Agent Workflow Integration API

> **Converged**: `/api/ai/open/*` was **removed** in baseline 1.0. Use the unified invoke entry.

## Recommended: invoke + Key

See [sdk.md](../sdk.md):

```http
POST /api/ai/workflows/invoke/{slug}
X-API-Key: sk_...              # user platform key
# or X-Workflow-Key: wf_...    # single-workflow key
```

## Recommended: JWT intranet API

Same as ai-app; after login, `Authorization: Bearer <jwt>`:

| Method | Path |
|---|---|
| POST | `/api/ai/workflows/:id/execute` |
| GET | `/api/ai/workflow-executions/:id` |

---

The historical Open API design draft is deprecated; do not reference `/api/ai/open` anymore.
