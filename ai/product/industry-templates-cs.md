# 客服行业模板包（customer-service）

开箱即用的客服场景 Agent 工作流模板，定义于 `shared/platform-shared/ai/agentWorkflow.ts`，分类 `category: 'customer-service'`。

## 模板一览

| ID | 名称 | 触发 | 图结构 |
|----|------|------|--------|
| `cs-ticket-triage` | 客服工单智能分流 | Webhook `POST /cs-ticket-triage` | webhook → llm 分类 → if → 专员/普通 end |
| `cs-kb-reply` | 客服知识库回复 | 手动触发 | manual → rag__search → llm 草稿 → end |
| `cs-sentiment-escalate` | 情绪检测与升级 | Webhook `POST /cs-sentiment-escalate` | webhook → llm 情绪 → if 负面 → hitl → end |

## 1. cs-ticket-triage

**用途**：接收工单文本，自动分成咨询 / 投诉 / 退款 / 技术，并给出优先级与建议团队。

**LLM 输出（JSON）**：`category`、`priority`（high|medium|low）、`suggestedTeam`、`summary`、`needsSpecialist`。

**条件分支**：`needsSpecialist`、高优先级或类别为投诉/退款时走「专员队列」结束节点，否则走「普通队列」。两端均以分类节点输出为工作流结果。

## 2. cs-kb-reply

**用途**：根据客户问题检索知识库，生成可发送的客服回复草稿。

**节点**：手动触发 → `rag__search` → LLM（仅输出回复正文）→ 结束。

## 3. cs-sentiment-escalate

**用途**：对客户消息做情绪分析；负面或需升级时进入 HITL 人工审核。

**LLM 输出（JSON）**：`sentiment`、`score`、`reason`、`needsEscalation`。

**条件分支**：负面或 `needsEscalation` 为真 → `hitl`（升级人工 / 自动安抚后关闭）→ 结束；否则直接结束。

## UI

`ai/app` 模板列表通过 `TEMPLATE_CATEGORY_LABELS['customer-service'] = '客服'` 展示分类标签。试用按钮仍仅对 `assistant` / `document` 显示，客服模板走「使用模板」创建草稿即可。

## 扩展建议

- 工单分流可接 HTTP 回调，把 `category` / `suggestedTeam` 推到工单系统。
- 知识库回复可在 LLM 后加 HITL，供坐席确认后再发送。
- 情绪升级可在 HITL 确认后接通知节点（如 `http-notify` 模式）。
