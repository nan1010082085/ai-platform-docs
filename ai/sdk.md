# 集成与 SDK

> 三能力平台（editor / flow / **ai**）人机交互统一 **JWT**（access + refresh，见 `platform-shared/authSession`）。  
> **AI 应用**作为开源 **应用能力小平台**，对外集成使用 **invoke 统一入口 + Key**。  
> 总览见 [platform.md](./platform.md)。

---

## 凭证怎么用

| 场景 | 凭证 | 说明 |
|------|------|------|
| editor / flow / ai 界面操作 | **JWT** `Authorization: Bearer` | 同一登录态，自动刷新 |
| 用户脚本 / 外部系统调工作流 | **用户平台 Key** `X-API-Key: sk_...` | 用户自己在 AI 应用创建，可调其有权限的 **所有** 已发布流 |
| 仅开放单条工作流 | **工作流 Key** `X-Workflow-Key: wf_...` | 发布时自动生成，设计器内复制 |

```http
POST /api/ai/workflows/invoke/{slug}
X-Tenant-Id: 000000
X-API-Key: sk_...              # 或 X-Workflow-Key: wf_...
Content-Type: application/json

{ "input": { ... }, "trigger": "api" }
```

查询执行：

```http
GET /api/ai/workflows/invoke/executions/{executionId}
```

（同样带 Key；用户平台 Key 场景下需与 invoke 鉴权规则一致，见 [platform.md](./platform.md) 演进清单。）

---

## 外部集成方式

外部系统（cron、中台、第三方）直接调用 REST API，无需额外 SDK。

### cURL 示例

```bash
# 执行工作流
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-workflow-slug \
  -H "X-Tenant-Id: 000000" \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": {"key": "value"}, "trigger": "api"}'

# 查询执行状态
curl http://localhost:3001/api/ai/workflows/invoke/executions/{executionId} \
  -H "X-Workflow-Key: wf_your_key"
```

### JavaScript/TypeScript 示例

```typescript
// 执行工作流
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

// 轮询等待完成
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

## 已移除的路径

- `/api/ai/open/*` — 基线 1.0 删除
- `@ai-sdk` — 无消费者，已删除
- `@schema-platform/workflow-client` — 仅为 REST API 包装器，外部系统直接调用 API 即可

---

## 相关文档

- [platform.md](./platform.md) — 三能力 + JWT + 双 Key + 开源小平台定位
- [agent-workflow.md](./agent-workflow.md) — 工作流编排
- [plugin.md](./plugin.md) — 插件中心
