# Agent Workflow 集成 API

> **已收敛**：`/api/ai/open/*` 在基线 1.0 **已删除**。请使用统一 invoke 入口。

## 推荐：invoke + Key

见 [sdk.md](../sdk.md)：

```http
POST /api/ai/workflows/invoke/{slug}
X-API-Key: sk_...              # 用户平台 Key
# 或 X-Workflow-Key: wf_...    # 单工作流 Key
```

## 推荐：JWT 内网 API

与 ai-app 相同，登录后 `Authorization: Bearer <jwt>`：

| 方法 | 路径 |
|---|---|
| POST | `/api/ai/workflows/:id/execute` |
| GET | `/api/ai/workflow-executions/:id` |

---

历史 Open API 设计稿已废弃，勿再引用 `/api/ai/open`。
