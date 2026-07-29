# LLM 提示词与调用参数优化

> 日期：2026-07-27
> 范围：server/src/ai/services/nodes/*.ts + shared/platform-shared/ai/agentWorkflow/templateFactories/*.ts + server/src/ai/runtime/summarizer.ts

## 一、问题诊断

### 1. 提示词质量问题
- 部分节点 systemPrompt 过于简陋（如 `llm` 节点默认 prompt 仅一句话）
- 缺少明确的输出格式约束（部分节点未明确要求"只输出 JSON，不要 markdown 代码块"）
- 缺少字段类型说明（JSON 字段未标注 string/number/boolean 等类型）
- 缺少错误处理指引（输入为空或无法解析时 LLM 行为不确定）

### 2. 温度策略问题
- 分析类节点（审批/合规/异常检测）使用 temperature=0.1，不够确定性，应为 0
- 生成类节点（图表/模块/文案）温度不统一
- 对话类节点（摘要）在 summarizer runtime 中使用 temperature=0.7，过高
- `llm` 节点固定使用 temperature=0.3，无法按模板类型区分

### 3. 缺少 fallback 机制
- 所有 LLM 节点在返回无法解析的 JSON 时直接 nodeFailure，无重试
- 提示词中缺少"如果无法判断，返回 {error: true, reason: ...}"的指引

## 二、温度策略

| 节点类型 | temperature | 理由 |
|---------|-------------|------|
| 分析类（审批/合规/异常检测/质检/分类/提取） | 0 | 确定性最高，避免随机性影响判断 |
| 生成类（图表/模块/文案/PPT/FAQ/视频脚本） | 0.3-0.5 | 需要一定创造性，但不可过于发散 |
| 对话类（摘要/回复/智能助手/建议） | 0.2 | 平衡准确性与自然度 |
| 智能体循环（agent-loop/agent-team supervisor） | 0.2 | 推理需要稳定性 |
| 智能体团队成员（agent-team member） | 0.3 | 需要一定创造性输出 |

## 三、Server 节点优化清单

### 1. approvalAnalyze.ts（审批分析）
- **温度**：0.1 -> 0
- **提示词优化**：添加角色定义"资深审批分析专家"、字段类型说明、错误处理指引、2 条 few-shot 示例
- **输出 schema**：`{ decision, reason, suggestions[], riskLevel }`

### 2. anomalyDetect.ts（异常检测）
- **温度**：0.1 -> 0
- **提示词优化**：添加角色定义"异常检测专家"、severity 判定标准、错误处理指引
- **输出 schema**：`{ anomalies[{type,value,reason,severity}], summary }`

### 3. complianceCheck.ts（合规检查）
- **温度**：0.1 -> 0
- **提示词优化**：添加角色定义"合规检查专家"、severity 判定标准、错误处理指引、1 条 few-shot 示例
- **输出 schema**：`{ compliant, violations[{rule,detail,severity}], suggestion }`

### 4. chartGenerate.ts（图表生成）
- **温度**：0.2 -> 0.3
- **提示词优化**：添加角色定义"数据可视化专家"、data 数值类型约束、错误处理指引
- **输出 schema**：`{ chartType, option, data[] }`

### 5. moduleAssemble.ts（模块组装）
- **温度**：0.3（不变）
- **提示词优化**：添加角色定义"业务模块架构师"、字段类型标注、错误处理指引
- **输出 schema**：`{ schema, flow, listView, detailView }`

### 6. llm.ts（通用 LLM 节点）
- **温度**：0.3 -> 支持节点级 `data.temperature` 配置，默认 0.3
- **提示词优化**：默认 systemPrompt 增加输出格式指引
- **改动**：新增 `temperature` 字段读取，分析类模板可设 0，生成类可设 0.5

### 7. agentLoop.ts（自主智能体循环）
- **温度**：0.2（不变）
- **提示词优化**：默认 systemPrompt 增加 5 条行为规则（工具调用、失败处理、最终回答格式）

### 8. agentTeam.ts（多 Agent 协作）
- **温度**：supervisor 0.2 / member 0.3（不变）
- **提示词优化**：supervisor 默认 systemPrompt 增加任务分配规则、审阅规则、结论整合规则

### 9. summarizer.ts（runtime 摘要）
- **温度**：0.7 -> 0.2
- **提示词优化**：无变化（提示词在 runtime/summarizer.ts 中，已足够详细）

## 四、模板工厂优化清单

### 分析类模板（temperature=0）

| 模板 | 优化点 |
|------|--------|
| contentCompliance | 角色定义 + 字段类型 + 错误处理 |
| expenseAudit | 角色定义 + 字段类型 + 错误处理 |
| contractExtract | 角色定义 + 日期 null 规则 + 错误处理 |
| contractRiskTag | 角色定义 + overallRisk 规则 + 错误处理 |
| resumeScreening | 角色定义 + 评分区间规则 + 错误处理 |
| csSentimentEscalate | 角色定义 + score 语义 + 错误处理 |
| csTicketTriage | 角色定义 + 分类映射规则 + 错误处理 |
| excelReport | 角色定义 + trend 语义 + 错误处理 |
| faqQualityCheck | 角色定义 + 维度阈值规则 + 错误处理 |
| feedbackAnalysis | 角色定义 + 计数规则 + 错误处理 |
| multiDocCompare | 角色定义 + conflict 语义 + 错误处理 |
| ragIngestQa | 角色定义 + 判定规则 + 错误处理 |
| smartActionProposals | 角色定义 + type 枚举 + 错误处理 |
| structuredExtract | 角色定义 + 类型约束 + 错误处理 |
| docImageRecognition | 角色定义 + 错误处理（两个 LLM 节点） |

### 生成类模板（temperature=0.3-0.5）

| 模板 | 温度 | 优化点 |
|------|------|--------|
| imageTextGeneration | 0.5 | 角色定义 + 段落数量约束 |
| multimodalImageText | 0.5 | 角色定义 + imagePrompts 规则 |
| multimodalVideoPromo | 0.5 | 角色定义 + duration 规则 |
| pptGeneration | 0.3 | 角色定义 + 页数规则（两个 LLM 节点） |
| kbFaq | 0.3 | 角色定义 + 数量约束 |

### 对话类模板（temperature=0.2）

| 模板 | 优化点 |
|------|--------|
| csKbReply | 角色定义 + 输出格式约束 |
| documentSummary | 角色定义 + 摘要结构指引 |
| intelligentAssistant | 角色定义 + 对话连贯规则 |
| multiDocBatch | 角色定义 + 错误处理（两个 LLM 节点） |
| smartSuggestions | 角色定义 + type 枚举 + 错误处理 |
| httpNotify | 角色定义 + 输出 schema |
| imageAnalysis | 角色定义（三个 LLM 节点：parse=0, emotion=0.5, event=0.3） |

### 无 LLM 节点的模板（无需修改）

| 模板 | 说明 |
|------|------|
| chatParityAssistant | 使用 intent-router + requirement-analyzer + task-planner + task-chain + expert + summarizer |
| requirementGatedBuild | 使用 requirement-analyzer + task-planner + task-chain + expert + summarizer |
| webhookBatchDispatch | 使用 task-planner + task-chain + summarizer |

## 五、类型变更

### shared/platform-shared/ai/agentWorkflow/types.ts

新增字段：
```typescript
/** llm 节点温度：分析类=0，生成类=0.3-0.5，对话类=0.2。未设置时默认 0.3 */
temperature?: number
```

### server/src/ai/services/nodes/llm.ts

读取 `data.temperature`（通过类型断言访问，因 `WorkflowGraphNode.data` 类型定义在 agentWorkflowExecutor.ts 中未包含此字段），默认 0.3。

## 六、提示词统一规范

所有 LLM 节点的 systemPrompt 遵循以下结构：

```
你是[角色]，擅长[能力描述]。

## 输出格式

只输出 JSON，不要 markdown 代码块。输出 schema：
{ 字段定义 }

## 规则

- 字段约束说明
- 枚举值说明
- 边界条件说明

## 错误处理

如果[异常情况]，返回 { ... }
```

高风险节点（审批/合规）额外添加 `## 示例` 部分，包含 few-shot 示例。

## 七、构建验证

- shared/platform-shared build：通过
- server tsc --noEmit：通过
