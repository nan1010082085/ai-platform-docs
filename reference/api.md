# API

平台开放能力以 HTTP API 为主。

## 业务数据

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` / `POST` | `/api/data/list` | 查询业务数据列表 |
| `GET` | `/api/data/{id}` | 查询单条业务数据 |

## 认证

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/auth/login` | 用户登录 |
| `POST` | `/api/auth/logout` | 用户登出 |
| `GET` | `/api/auth/me` | 获取当前用户 |

## 智能体工作流

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/ai/workflows/invoke/{slugOrId}` | 触发已发布工作流 |
| `GET` | `/api/ai/workflows/invoke/executions/{executionId}` | 查询执行结果 |

## 认证

| 请求头 | 说明 |
|---|---|
| `X-API-Key` | 用户 API Key |
| `X-Workflow-Key` | 单个工作流 Key |

## 常用返回结构

```json
{
  "success": true,
  "data": {
    "executionId": "exec-xxxxxxxx",
    "status": "running"
  }
}
```

失败时：

```json
{
  "success": false,
  "error": {
    "code": "invalid_workflow_key",
    "message": "Workflow key is invalid"
  }
}
```

## 调用约定

- 请求和响应使用 JSON。
- 触发工作流是异步的。
- 回调请求带 HMAC 签名。
- 生产环境建议使用 HTTPS。

## 下一步

- [工作流 API](../integration/workflow-api.md)
