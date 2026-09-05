# Integration & SDK

> The three-capability platform (editor / flow / **ai**) uses unified **JWT** for human interaction (access + refresh, see `platform-shared/authSession`).
> The **AI app**, as an open-source **application-capability platform**, uses the **unified invoke entry + Key** for external integration.
> See [platform.md](./platform.md) for the overview.

---

## How Credentials Are Used

| Scenario | Credential | Description |
|------|------|------|
| editor / flow / ai UI ops | **JWT** `Authorization: Bearer` | Same login session, auto-refresh |
| User scripts / external systems calling workflows | **User platform key** `X-API-Key: sk_...` | Created by the user in the AI app; can call all published flows they have permission to |
| Expose only a single workflow | **Workflow key** `X-Workflow-Key: wf_...` | Auto-generated on publish; copy from the designer |

```http
POST /api/ai/workflows/invoke/{slug}
X-Tenant-Id: 000000
X-API-Key: sk_...              # or X-Workflow-Key: wf_...
Content-Type: application/json

{ "input": { ... }, "trigger": "api" }
```

Query execution:

```http
GET /api/ai/workflows/invoke/executions/{executionId}
```

(Same key; see auth rules in [platform.md](./platform.md).)

---

## External Integration

External systems (cron, middle platform, third party) call the REST API directly; no extra SDK needed.

### cURL example

```bash
# Execute a workflow
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-workflow-slug \
  -H "X-Tenant-Id: 000000" \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": {"key": "value"}, "trigger": "api"}'

# Query execution status
curl http://localhost:3001/api/ai/workflows/invoke/executions/{executionId} \
  -H "X-Workflow-Key: wf_your_key"
```

### JavaScript/TypeScript example

```typescript
// Execute a workflow
const response = await fetch('http://localhost:3001/api/ai/workflows/invoke/your-slug', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-Id': '000000',
    'X-Workflow-Key': 'wf_your_key',
  },
  body: JSON.stringify({ input: { key: 'value' }, trigger: 'api' }),
})

const { data } = await response.json()
const { executionId, execution } = data

// Poll for completion
let status = execution.status
while (!['success', 'error', 'cancelled'].includes(status)) {
  await new Promise(r => setTimeout(r, 800))
  const pollRes = await fetch(
    `http://localhost:3001/api/ai/workflows/invoke/executions/${executionId}`,
    { headers: { 'X-Workflow-Key': 'wf_your_key' } }
  )
  const { data: pollData } = await pollRes.json()
  status = pollData.status
}
```

---

## Removed Paths

- `/api/ai/open/*` - removed in baseline 1.0
- `@ai-sdk` - no consumers, deleted
- `@schema-platform/workflow-client` - just a REST API wrapper; external systems call the API directly

---

## Related Docs

- [platform.md](./platform.md) - three capabilities + JWT + dual key + open-source small-platform positioning
- [agent-workflow.md](./agent-workflow.md) - workflow orchestration
- [plugin.md](./plugin.md) - plugin center
