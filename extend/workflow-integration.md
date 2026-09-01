# 工作流开放 API 集成指南

> 面向三方系统的 工作流集成文档：通过 Open API 触发已发布工作流、轮询结果、接收回调。
> 关联：[工作流模板 RFC](/extend/workflow-template-rfc)

---

## 一、概述

Schema 平台的每个已发布 Workflow 都暴露一个 **Open API**，三方系统可通过 HTTP 调用触发执行，无需登录平台。典型场景：

- 外部系统在业务节点触发 workflow（如表单提交后触发审批建议）
- 定时任务 / ETL 管道调用 workflow 处理数据
- 三方应用嵌入 workflow 能力（如文档解析、合规审查）

**两种调用模式**：

| 模式 | 说明 | 适用 |
|---|---|---|
| **轮询** | 调用触发 -> 拿 executionId -> 轮询直到完成 | 短流程、无回调能力的客户端 |
| **回调** | 调用触发时带 callbackUrl -> 执行完成后平台 POST 回调 | 长流程、服务端集成（推荐） |

---

## 二、前置条件

1. **Workflow 已发布**：在平台设计器中发布 workflow，获得 `publishId` + `slug`（可选但推荐）
2. **持有调用密钥**：发布时生成 `invokeKey`（`wf_` 前缀），仅显示一次；可在设计器「轮换密钥」重新生成
3. **记录调用路径**：`/api/ai/workflows/invoke/<slug>`（slug 优先；无 slug 用 workflow id）

> 密钥即权力：`invokeKey` 等同于该 workflow 的调用凭证，请妥善保管。泄露后立即在设计器「轮换密钥」使旧密钥失效。

---

## 三、鉴权

二选一，通过请求头传递：

| Header | 格式 | 说明 |
|---|---|---|
| `X-Workflow-Key` | `wf_xxxxxxxx` | Workflow 专属调用密钥（发布/轮换时获取） |
| `X-API-Key` | `sk_xxxxxxxx` | 平台 API Key（可调用同租户下多个 workflow） |

无有效密钥或密钥错误返回 `401 invalid_workflow_key`。

---

## 四、触发执行

```
POST /api/ai/workflows/invoke/:slugOrId
```

**请求头**：
```
X-Workflow-Key: wf_xxxxxxxx
Content-Type: application/json
```

**请求体**：
```json
{
  "input": { "message": "用户的输入内容" },
  "trigger": "api",
  "callbackUrl": "https://your-server.com/callback",
  "callbackSecret": "your-shared-secret"
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `input` | 是 | 工作流输入，通常含 `message` 字段 |
| `trigger` | 否 | 触发来源标记：`api`（默认）/ `manual` / `webhook` / `chat` |
| `callbackUrl` | 否 | 执行完成后的回调地址（见第六节） |
| `callbackSecret` | 否 | 回调签名密钥（与 callbackUrl 配对） |

**响应**（`202 Accepted`）：
```json
{
  "success": true,
  "data": {
    "executionId": "exec-xxxxxxxx",
    "workflowId": "wf-id",
    "workflowName": "请假审批建议",
    "status": "running",
    "execution": { /* 完整执行对象 */ }
  }
}
```

> 触发是异步的：返回 202 表示已受理，`status` 初始为 `running`。需通过轮询或回调获取最终结果。

---

## 五、轮询执行结果

```
GET /api/ai/workflows/invoke/executions/:executionId
```

**请求头**：`X-Workflow-Key: wf_xxxxxxxx`（与触发同一密钥）

**响应**：
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

`status` 取值：`running` / `success` / `error` / `waiting`（HITL 人工确认中）/ `cancelled`

**轮询建议**：间隔 1.5–2s，最长 90s（`waiting` 表示需人工确认，不应继续轮询）。

---

## 六、回调通知（推荐）

触发时传 `callbackUrl` + `callbackSecret`，执行完成后平台向 `callbackUrl` 发 `POST`：

**回调请求头**：
```
X-Webhook-Signature: sha256=<hmac_hex>
Content-Type: application/json
```

**签名计算**：`HMAC-SHA256(callbackSecret, <raw_request_body>)`，输出 hex，前缀 `sha256=`。

**回调请求体**：执行结果对象（同轮询响应的 `data`）。

**三方验签示例（Node.js）**：
```javascript
import crypto from 'node:crypto'

function verifyCallback(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // 用 timingSafeEqual 防时序攻击
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHeader)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
```

**回调响应**：三方应返回 `200`，平台据响应码判断投递成功；失败会重试。

---

## 七、错误码

| HTTP | code | 说明 |
|---|---|---|
| 400 | `invalid_param` | slugOrId 非法（空/过长） |
| 401 | `invalid_workflow_key` | 未提供密钥或密钥无效 |
| 404 | `workflow_not_found` | workflow 不存在或未发布 |
| 404 | `execution_not_found` | 轮询的 executionId 不存在（或密钥无权访问） |
| 500 | `invoke_failed` | 触发执行失败（内部错误） |

错误响应体：
```json
{ "success": false, "error": { "message": "...", "code": "invalid_workflow_key" } }
```

---

## 八、代码示例

### cURL
```bash
curl -X POST 'https://<host>/schema-platform/api/ai/workflows/invoke/leave-approval' \
  -H 'X-Workflow-Key: wf_xxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{"input":{"message":"请假 3 天"},"trigger":"api"}'
```

### JavaScript（浏览器 / fetch）
```javascript
const res = await fetch('https://<host>/schema-platform/api/ai/workflows/invoke/leave-approval', {
  method: 'POST',
  headers: {
    'X-Workflow-Key': 'wf_xxxxxxxx',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ input: { message: '请假 3 天' } }),
});
const { data } = await res.json();
console.log(data.executionId);

// 轮询
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

# 触发
res = requests.post(f'{BASE}/leave-approval', headers=HEADERS,
                    json={'input': {'message': '请假 3 天'}}).json()
exec_id = res['data']['executionId']

# 轮询
while True:
    r = requests.get(f'{BASE}/executions/{exec_id}', headers=HEADERS).json()
    if r['data']['status'] in ('success', 'error'):
        print(r['data'])
        break
    time.sleep(2)
```

### Node.js（含回调验签）
```javascript
import express from 'express'
import crypto from 'node:crypto'

const app = express()
app.use(express.json({ verify: (req, buf) => { req.rawBody = buf } })) // 保留 raw body 用于验签

// 1. 触发时带 callbackUrl
await fetch('https://<host>/schema-platform/api/ai/workflows/invoke/leave-approval', {
  method: 'POST',
  headers: { 'X-Workflow-Key': 'wf_xxxxxxxx', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: { message: '请假 3 天' },
    callbackUrl: 'https://your-server.com/wf-callback',
    callbackSecret: 'your-shared-secret',
  }),
})

// 2. 接收回调 + 验签
app.post('/wf-callback', (req, res) => {
  const sig = req.headers['x-webhook-signature']
  const expected = 'sha256=' + crypto.createHmac('sha256', 'your-shared-secret').update(req.rawBody).digest('hex')
  if (sig !== expected) return res.status(401).end()
  console.log('workflow 完成:', req.body)
  res.status(200).end()
})
```

---

## 九、在线 Playground

平台内置集成测试页：**设置 → 集成测试**（`/integration`）。

- 列出所有已发布 workflow，选择后自动生成 curl/JS/Python 示例
- 在线试调 Open API，实时查看调用响应 + 轮询执行结果
- 「获取密钥」按钮调 `rotateWorkflowInvokeKey`（注意：轮换使旧密钥失效）
- 「示例显示真实密钥」开关：默认用 `<YOUR_WORKFLOW_KEY>` 占位符，避免复制示例时泄露密钥

---

## 十、最佳实践

1. **优先用回调而非轮询**：回调减少请求量、降低延迟，适合服务端集成
2. **密钥安全**：不在前端代码 / 日志 / 仓库中硬编码密钥；用环境变量或密钥管理服务
3. **slug 优于 id**：slug 可读、稳定（id 会随重新发布变化）；发布时务必设置 slug
4. **幂等性**：触发是异步的，重复调用会创建多个执行；三方应自行去重（如用业务 ID 关联）
5. **超时处理**：轮询最长 90s，超时后改用回调或检查执行状态；`waiting` 表示需人工确认，不要继续轮询
6. **错误重试**：`5xx` 可重试，`4xx`（鉴权/参数错误）不应重试；回调失败平台会自动重试

---

## 十一、相关文档

- [工作流模板 RFC](/extend/workflow-template-rfc) - 模板注册与分发机制
- [工作流变量文档](/extend/workflow-variables) - `$input` / `$node` / `$conversation` 解析规则
- [自定义模型接入](/extend/custom-models) - 私有模型网关配置
- [技能作者手册](/extend/skill-author-guide) - Skill 打包与分发
