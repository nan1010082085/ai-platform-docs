# Agent Workflow 集成 API

> 工作流对外开放的集成 API，支持触发执行、查询状态、获取结果。

## 认证方式

| 方式 | 适用场景 | Header |
|------|----------|--------|
| API Key | 外部系统集成 | `X-API-Key: sk_...` |
| Workflow Key | 单工作流授权 | `X-Workflow-Key: wf_...` |
| JWT | 内网系统 | `Authorization: Bearer <jwt>` |

## API 端点

### 触发执行

```http
POST /api/ai/workflows/invoke/{slug}
Content-Type: application/json
X-API-Key: sk_...

{
  "input": {
    "message": "帮我创建一个请假表单",
    "context": {}
  },
  "callback": "https://your-callback-url.com/webhook"  // 可选
}

# 响应
{
  "executionId": "exec_abc123",
  "status": "running",
  "startedAt": "2026-07-27T10:00:00Z"
}
```

### 查询执行状态

```http
GET /api/ai/workflow-executions/{executionId}
X-API-Key: sk_...

# 响应
{
  "executionId": "exec_abc123",
  "workflowId": "wf_xyz",
  "status": "completed",  // running | completed | failed
  "input": {...},
  "output": {
    "result": "表单已创建",
    "schema": {...}
  },
  "startedAt": "2026-07-27T10:00:00Z",
  "completedAt": "2026-07-27T10:00:05Z",
  "duration": 5000
}
```

### 获取执行结果

```http
GET /api/ai/workflow-executions/{executionId}/result
X-API-Key: sk_...

# 响应
{
  "result": {...},
  "artifacts": [
    {
      "type": "schema",
      "name": "请假表单",
      "content": {...}
    }
  ]
}
```

## 回调模式

触发执行时传入 `callback` URL，执行完成后自动 POST 回调：

```http
POST https://your-callback-url.com/webhook
Content-Type: application/json

{
  "executionId": "exec_abc123",
  "status": "completed",
  "result": {...},
  "completedAt": "2026-07-27T10:00:05Z"
}
```

## 错误码

| HTTP | 说明 |
|------|------|
| 400 | 请求参数错误 |
| 401 | 认证失败（API Key / JWT 无效） |
| 403 | 无权限（Workflow Key 不匹配） |
| 404 | 工作流不存在 |
| 429 | 请求频率超限 |
| 500 | 服务端错误 |

## SDK 集成

见 [SDK 指南](../sdk.md) 获取各语言 SDK 集成示例。

## 相关文档

| 文档 | 说明 |
|------|------|
| [SDK 指南](../sdk.md) | REST API + WebSocket + SDK 集成 |
| [Agent Workflow](../agent-workflow) | 工作流编排、节点类型 |
| [事件协议](../events) | WebSocket 实时事件 |
| [安全最佳实践](../SECURITY_BEST_PRACTICES) | API Key 管理、数据隔离 |
