# 工作流 API

用 HTTP 调用一个已发布的智能体工作流。

## 前置条件

1. 工作流已经发布。
2. 你有对应的 API Key 或工作流 Key。
3. 你知道工作流的 `slug` 或 `id`。

## 触发执行

```http
POST /api/ai/workflows/invoke/{slugOrId}
Content-Type: application/json
X-Workflow-Key: wf_xxxxxxxx
```

请求体：

```json
{
  "input": {
    "message": "请处理这条业务数据"
  },
  "trigger": "api"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "executionId": "exec-xxxxxxxx",
    "status": "running"
  }
}
```

触发是异步的。返回 `202` 表示平台已经受理请求，不代表执行完成。

## 查询结果

```http
GET /api/ai/workflows/invoke/executions/{executionId}
X-Workflow-Key: wf_xxxxxxxx
```

状态可能是：

| 状态 | 含义 |
|---|---|
| `running` | 正在执行 |
| `waiting` | 等待人工确认 |
| `success` | 执行成功 |
| `error` | 执行失败 |
| `cancelled` | 已取消 |

如果状态是 `waiting`，不要继续轮询，需要先处理人工确认。

## 使用回调

如果你不希望一直轮询，可以在触发时传入回调地址：

```json
{
  "input": {
    "message": "请处理这条业务数据"
  },
  "callbackUrl": "https://your-server.com/callback",
  "callbackSecret": "your-shared-secret"
}
```

执行完成后，平台会向 `callbackUrl` 发送 `POST` 请求。

回调请求头：

```http
X-Webhook-Signature: sha256=<hmac_hex>
```

签名算法：

```text
HMAC-SHA256(callbackSecret, raw_request_body)
```

你的服务端应该验证签名后再处理结果。

## cURL 示例

```bash
curl -X POST 'https://your-host/api/ai/workflows/invoke/leave-approval' \
  -H 'X-Workflow-Key: wf_xxxxxxxx' \
  -H 'Content-Type: application/json' \
  -d '{"input":{"message":"请假 3 天"}}'
```

## 常见错误

| HTTP 状态 | 含义 |
|---|---|
| `400` | 参数不合法 |
| `401` | 密钥缺失或无效 |
| `404` | 工作流不存在或未发布 |
| `500` | 平台内部执行错误 |

## 下一步

- [认证方式](./authentication.md)
- [智能体工作流](../guide/workflows.md)
