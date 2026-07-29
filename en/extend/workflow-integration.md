# Workflow Open API Integration Guide

> Integration documentation for third-party systems: trigger published workflows via Open API, poll for results, and receive callbacks.
> Related: [Workflow Template RFC](./workflow-template-rfc)

---

## 1. Overview

Every published Workflow on the Schema platform exposes an **Open API** that third-party systems can invoke over HTTP without logging into the platform. Typical scenarios:

- External systems trigger a workflow at a business node (e.g., trigger an approval suggestion after a form submission)
- Scheduled tasks / ETL pipelines call a workflow to process data
- Third-party apps embed workflow capabilities (e.g., document parsing, compliance review)

**Two invocation modes**:

| Mode | Description | Use case |
|---|---|---|
| **Polling** | Trigger -> get executionId -> poll until complete | Short flows, clients without callback capability |
| **Callback** | Pass callbackUrl on trigger -> platform POSTs on completion | Long flows, server-side integration (recommended) |

---

## 2. Prerequisites

1. **Workflow is published**: Publish the workflow in the platform designer to get a `publishId` + `slug` (optional but recommended)
2. **Hold the invoke key**: An `invokeKey` (`wf_` prefix) is generated on publish and shown only once; rotate it in the designer if needed
3. **Record the endpoint**: `/api/ai/workflows/invoke/<slug>` (slug preferred; use workflow id if no slug)

> The key is power: `invokeKey` is the credential for invoking this workflow. Keep it safe. If leaked, rotate immediately in the designer to invalidate the old key.

---

## 3. Authentication

Choose one, passed via request headers:

| Header | Format | Description |
|---|---|---|
| `X-Workflow-Key` | `wf_xxxxxxxx` | Workflow-specific invoke key (from publish/rotate) |
| `X-API-Key` | `sk_xxxxxxxx` | Platform API key (can invoke multiple workflows in the same tenant) |

Returns `401 invalid_workflow_key` if no valid key is provided.

---

## 4. Trigger Execution

```
POST /api/ai/workflows/invoke/:slugOrId
```

**Headers**:
```
X-Workflow-Key: wf_xxxxxxxx
Content-Type: application/json
```

**Body**:
```json
{
  "input": { "message": "User input content" },
  "trigger": "api",
  "callbackUrl": "https://your-server.com/callback",
  "callbackSecret": "your-shared-secret"
}
```

| Field | Required | Description |
|---|---|---|
| `input` | Yes | Workflow input, usually contains a `message` field |
| `trigger` | No | Trigger source: `api` (default) / `manual` / `webhook` / `chat` |
| `callbackUrl` | No | Callback URL on completion (see section 6) |
| `callbackSecret` | No | Callback signing secret (paired with callbackUrl) |

**Response** (`202 Accepted`):
```json
{
  "success": true,
  "data": {
    "executionId": "exec-xxxxxxxx",
    "workflowId": "wf-id",
    "workflowName": "Leave Approval Advisor",
    "status": "running",
    "execution": { /* full execution object */ }
  }
}
```

> Triggering is asynchronous: 202 means accepted, `status` starts as `running`. Poll or use callbacks to get the final result.

---

## 5. Poll Execution Result

```
GET /api/ai/workflows/invoke/executions/:executionId
```

**Headers**: `X-Workflow-Key: wf_xxxxxxxx` (same key as trigger)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "exec-xxxxxxxx",
    "status": "success",
    "durationMs": 3200,
    "nodeRecords": [
      { "nodeName": "LLM", "status": "success", "output": { "text": "..." } }
    ]
  }
}
```

`status` values: `running` / `success` / `error` / `waiting` (HITL pending human confirmation) / `cancelled`

**Polling recommendation**: interval 1.5–2s, max 90s (`waiting` means human confirmation required; do not keep polling).

---

## 6. Callback Notification (Recommended)

Pass `callbackUrl` + `callbackSecret` on trigger; the platform POSTs to `callbackUrl` on completion:

**Callback headers**:
```
X-Webhook-Signature: sha256=<hmac_hex>
Content-Type: application/json
```

**Signature**: `HMAC-SHA256(callbackSecret, <raw_request_body>)`, hex output, prefixed with `sha256=`.

**Callback body**: the execution result object (same as the polling response `data`).

**Verification example (Node.js)**:
```javascript
import crypto from 'node:crypto'

function verifyCallback(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // use timingSafeEqual to prevent timing attacks
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHeader)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
```

**Callback response**: the third party should return `200`; the platform uses the response code to determine delivery success; failed deliveries are retried.

---

## 7. Error Codes

| HTTP | code | Description |
|---|---|---|
| 400 | `invalid_param` | Invalid slugOrId (empty/too long) |
| 401 | `invalid_workflow_key` | No key provided or key invalid |
| 404 | `workflow_not_found` | Workflow not found or not published |
| 404 | `execution_not_found` | Polled executionId not found (or key unauthorized) |
| 500 | `invoke_failed` | Trigger execution failed (internal error) |

Error body:
```json
{ "success": false, "error": { "message": "...", "code": "invalid_workflow_key" } }
```

---

## 8. Code Examples

### cURL
```bash
curl -X POST 'https://<host>/schema-platform/api/ai/workflows/invoke/leave-approval' \
  -H 'X-Workflow-Key: wf_xxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{"input":{"message":"3 days leave"},"trigger":"api"}'
```

### JavaScript (browser / fetch)
```javascript
const res = await fetch('https://<host>/schema-platform/api/ai/workflows/invoke/leave-approval', {
  method: 'POST',
  headers: {
    'X-Workflow-Key': 'wf_xxxxxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ input: { message: '3 days leave' } }),
});
const { data } = await res.json();
console.log(data.executionId);

// Poll
const poll = async (id) => {
  const r = await fetch(`https://<host>/schema-platform/api/ai/workflows/invoke/executions/${id}`, {
    headers: { 'X-Workflow-Key': 'wf_xxxxxxxx' },
  });
  return (await r.json()).data;
};
```

### Python
```python
import requests, time

BASE = 'https://<host>/schema-platform/api/ai/workflows/invoke'
HEADERS = {'X-Workflow-Key': 'wf_xxxxxxxx', 'Content-Type': 'application/json'}

# Trigger
res = requests.post(f'{BASE}/leave-approval', headers=HEADERS,
                    json={'input': {'message': '3 days leave'}}).json()
exec_id = res['data']['executionId']

# Poll
while True:
    r = requests.get(f'{BASE}/executions/{exec_id}', headers=HEADERS).json()
    if r['data']['status'] in ('success', 'error'):
        print(r['data'])
        break
    time.sleep(2)
```

### Node.js (with callback verification)
```javascript
import express from 'express'
import crypto from 'node:crypto'

const app = express()
app.use(express.json({ verify: (req, buf) => { req.rawBody = buf } })) // keep raw body for verification

// 1. Trigger with callbackUrl
await fetch('https://<host>/schema-platform/api/ai/workflows/invoke/leave-approval', {
  method: 'POST',
  headers: { 'X-Workflow-Key': 'wf_xxxxxxxx', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: { message: '3 days leave' },
    callbackUrl: 'https://your-server.com/wf-callback',
    callbackSecret: 'your-shared-secret',
  }),
})

// 2. Receive callback + verify
app.post('/wf-callback', (req, res) => {
  const sig = req.headers['x-webhook-signature']
  const expected = 'sha256=' + crypto.createHmac('sha256', 'your-shared-secret').update(req.rawBody).digest('hex')
  if (sig !== expected) return res.status(401).end()
  console.log('workflow completed:', req.body)
  res.status(200).end()
})
```

---

## 9. Online Playground

The platform has a built-in integration test page: **Settings -> Integration Test** (`/integration`).

- Lists all published workflows; selecting one auto-generates curl/JS/Python examples
- Try the Open API online with live response + polling result
- "Get Key" button calls `rotateWorkflowInvokeKey` (note: rotation invalidates the old key)
- "Show real key in examples" toggle: defaults to `<YOUR_WORKFLOW_KEY>` placeholder to avoid leaking keys when copying examples

---

## 10. Best Practices

1. **Prefer callbacks over polling**: callbacks reduce requests and latency, ideal for server-side integration
2. **Key security**: never hardcode keys in frontend code / logs / repos; use env variables or a secret manager
3. **Slug over id**: slug is readable and stable (id changes on re-publish); always set a slug on publish
4. **Idempotency**: triggering is async; duplicate calls create multiple executions; third parties should dedupe (e.g., correlate via a business ID)
5. **Timeout handling**: poll max 90s; switch to callbacks or check status on timeout; `waiting` means human confirmation required - do not keep polling
6. **Error retry**: retry on `5xx`; do not retry on `4xx` (auth/param errors); the platform auto-retries failed callbacks

---

## 11. Related Docs

- [Workflow Template RFC](./workflow-template-rfc) - Template registration and distribution
- [Workflow Variables](./workflow-variables) - `$input` / `$node` / `$conversation` resolution rules
- [Custom Models](./custom-models) - Private model gateway configuration
- [Skill Author Guide](./skill-author-guide) - Skill packaging and distribution
