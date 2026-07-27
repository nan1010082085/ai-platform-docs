# Workflow LLM 节点变量文档

> 本文档描述工作流中可用的模板变量及其解析规则。变量在 LLM 节点的 `prompt`、`systemPrompt`，以及 Tool 节点的 `toolArgs`、HITL 节点的 `confirmMessage` 等字符串字段中均可使用。

**相关源码**：[agentWorkflowTemplateResolver.ts](../../server/src/ai/services/agentWorkflowTemplateResolver.ts) · [agentWorkflowExecutor.ts](../../server/src/ai/services/agentWorkflowExecutor.ts) · [agentWorkflow.ts](../../ai/shared/agentWorkflow.ts)

---

## 一、变量总览

| 变量 | 语法 | 说明 |
|------|------|------|
| 工作流输入 | `{{$input.path}}` | 触发时传入的输入对象，支持点号路径 |
| 上游节点输出 | `{{$node.nodeId}}` | 指定节点的完整输出 |
| 上游节点字段 | `{{$node.nodeId.field}}` | 指定节点输出的特定字段，支持嵌套路径 |
| 上一个节点输出 | `{{$json}}` | 当前节点的直接上游输出（即 `lastOutput`） |
| 对话历史 | `{{$conversation}}` | 当前执行实例的对话记录，格式化为可读文本 |

所有变量使用 `{{...}}` 双花括号包裹，变量名以 `$` 开头。

---

## 二、变量详解

### 2.1 `$input` — 工作流输入

引用工作流触发时传入的输入数据。支持点号分隔的嵌套路径访问。

**语法**：

```text
{{$input.path}}
{{$input.nested.path}}
```

**解析规则**：

正则 `{{\$input\.([\w.]+)}}` 匹配 `$input.` 后的路径段，逐层从输入对象中取值。

**取值逻辑**（`getNestedValue`）：

1. 按 `.` 分割路径为 segments
2. 从 `ctx.input` 根对象开始，逐 segment 向下取值
3. 中间遇到 `null` / `undefined` / 非对象则返回 `undefined`
4. 最终值经过 `formatTemplateValue` 转为字符串：`null` / `undefined` → 空字符串，对象 → `JSON.stringify`

**示例**：

假设工作流触发时传入：

```json
{
  "message": "请分析这份合同",
  "nested": { "id": "doc-1" },
  "callbackUrl": "https://example.com/webhook"
}
```

| 模板 | 解析结果 |
|------|----------|
| `{{$input.message}}` | `请分析这份合同` |
| `{{$input.nested.id}}` | `doc-1` |
| `{{$input.callbackUrl}}` | `https://example.com/webhook` |
| `{{$input.missing}}` | （空字符串） |

**典型用途**：

```text
当前问题：{{$input.message}}
```

```json
{
  "url": "{{$input.callbackUrl}}",
  "query": "{{$input.message}}"
}
```

---

### 2.2 `$node` — 上游节点输出

引用指定节点的执行输出。`nodeId` 是节点在工作流图中的唯一标识（如 `parse-1`、`llm-1`）。

#### 2.2.1 完整输出

```text
{{$node.nodeId}}
```

省略字段路径时，返回该节点的完整输出对象（经 `JSON.stringify` 序列化）。

**示例**：

```text
知识库检索结果：{{$node.rag-1}}
```

#### 2.2.2 特定字段

```text
{{$node.nodeId.field}}
{{$node.nodeId.nested.field}}
```

通过点号路径访问输出对象的特定字段，支持多层嵌套。

**解析规则**：

正则 `{{\$node\.([\w-]+)(?:\.([\w.]+))?}}` 先匹配 `nodeId`（允许连字符），再匹配可选的字段路径。字段路径通过 `getNestedValue` 逐层取值。

**示例**：

假设 `parse-1` 节点（document-parse 类型）的输出为：

```json
{
  "filename": "invoice.pdf",
  "text": "发票正文内容...",
  "extractionMethod": "pdf",
  "textLength": 1234
}
```

| 模板 | 解析结果 |
|------|----------|
| `{{$node.parse-1}}` | `{"filename":"invoice.pdf","text":"发票正文内容...","extractionMethod":"pdf","textLength":1234}` |
| `{{$node.parse-1.filename}}` | `invoice.pdf` |
| `{{$node.parse-1.text}}` | `发票正文内容...` |
| `{{$node.parse-1.missing}}` | （空字符串） |

**典型用途**：

```text
文件名：{{$node.parse-1.filename}}

正文：
{{$node.parse-1.text}}
```

```json
{
  "content": "{{$node.llm-1}}",
  "metadata": { "filename": "{{$node.parse-1.filename}}" }
}
```

---

### 2.3 `$json` — 上一个节点输出

引用当前节点的直接上游输出，即 `lastOutput`。这是最常用的"透传上游结果"方式。

**语法**：

```text
{{$json}}
```

**解析规则**：

正则 `{{\$json}}` 直接替换为 `ctx.lastOutput` 的序列化值。无嵌套路径访问，始终返回完整对象。

**运行时语义**：

`lastOutput` 在执行引擎中按以下逻辑维护：

1. 工作流启动时，`lastOutput` 初始化为 `input`（触发输入）
2. 每个节点执行成功后，`lastOutput` 更新为该节点的输出
3. 因此 `$json` 始终指向上一个成功执行的节点的输出

**与 `$node` 的区别**：

| 场景 | 使用 `$json` | 使用 `$node.xxx` |
|------|-------------|-----------------|
| 引用直接上游 | 简洁，无需知道 nodeId | 需要写明 nodeId |
| 引用非直接上游 | 不可用 | 可引用任意已执行节点 |
| 访问特定字段 | 不支持 | 支持点号路径 |

---

### 2.4 `$conversation` — 对话历史

引用当前工作流执行实例积累的对话历史，格式化为可读文本。

**语法**：

```text
{{$conversation}}
```

**解析规则**：

正则 `{{\$conversation}}` 替换为格式化后的对话文本。

**格式化逻辑**：

```
用户：<第一条用户消息>
助手：<第一条助手回复>
系统：<系统消息>
用户：<第二条用户消息>
...
```

- `role: 'user'` → 前缀 `用户：`
- `role: 'assistant'` → 前缀 `助手：`
- `role: 'system'` → 前缀 `系统：`
- 各轮之间以 `\n` 分隔
- 无历史对话时显示 `（无历史对话）`

**对话历史来源**：

对话历史在以下场景被写入：

1. **初始加载**：触发输入中的 `history` / `conversationHistory` 字段，或通过 `continueFromExecutionId` 继承父执行的对话
2. **conversation-memory 节点**：以 `append` 模式运行时，将消息追加到历史
3. **LLM 节点**：当 `appendAssistantReply: true` 时，LLM 回复自动追加为 assistant 角色

**典型用途**（智能助手问答模板）：

```text
对话历史：
{{$conversation}}

当前问题：{{$input.message}}

知识库检索结果：
{{$node.rag-1}}

请给出完整回答。
```

---

## 三、变量解析引擎

### 3.1 解析入口

所有模板变量通过 `resolveWorkflowTemplate` 函数统一解析：

```typescript
// server/src/ai/services/agentWorkflowTemplateResolver.ts
export function resolveWorkflowTemplate(
  text: string,
  ctx: WorkflowTemplateContext,
): string
```

`WorkflowTemplateContext` 结构：

```typescript
interface WorkflowTemplateContext {
  input: Record<string, unknown>       // 触发输入
  lastOutput: unknown                   // 上一个节点输出
  nodeOutputs: Record<string, unknown>  // 所有已执行节点的输出，key 为 nodeId
  conversationHistory?: Array<{ role: string; content: string }>
}
```

### 3.2 解析顺序

变量按以下固定顺序依次替换（单次遍历，非递归）：

1. `{{$input.path}}` → 从 `ctx.input` 取值
2. `{{$json}}` → 替换为 `ctx.lastOutput`
3. `{{$conversation}}` → 格式化 `ctx.conversationHistory`
4. `{{$node.nodeId}}` / `{{$node.nodeId.path}}` → 从 `ctx.nodeOutputs` 取值

### 3.3 值格式化

所有变量值在替换前经过 `formatTemplateValue` 处理：

| 输入类型 | 输出 |
|----------|------|
| `null` / `undefined` | 空字符串 `""` |
| `string` | 原样返回 |
| `number` / `boolean` | `String(val)` |
| 对象 / 数组 | `JSON.stringify(val)` |

### 3.4 解析范围

模板变量解析应用于以下位置：

| 位置 | 说明 |
|------|------|
| LLM 节点 `prompt` | 用户提示词 |
| LLM 节点 `systemPrompt` | 系统提示词 |
| Tool 节点 `toolArgs` | 工具参数（递归解析字符串值、数组元素、嵌套对象） |
| HITL 节点 `confirmMessage` | 确认消息 |
| document-parse / vision-analyze 节点配置 | `fetchUrl`、`fetchBody`、`visionPrompt` 等 |

Tool 节点的 `toolArgs` 递归解析逻辑（`resolveTemplateInArgs`）：

- `string` 值 → 直接解析模板
- `Array` → 遍历元素，字符串元素解析模板，对象元素递归
- 嵌套 `object` → 递归解析所有字符串值
- 其他类型 → 原样保留

---

## 四、条件表达式中的变量

`if` 节点的 `expression` 字段不是模板变量语法，而是 JavaScript 表达式，通过 `new Function` 沙箱执行：

```typescript
// agentWorkflowExecutor.ts
function evaluateIfExpression(expression: string, ctx: RuntimeContext): boolean {
  const fn = new Function(
    'input',        // ctx.input
    'lastOutput',   // ctx.lastOutput
    'nodeOutputs',  // ctx.nodeOutputs
    `return Boolean(${trimmed})`,
  )
  return fn(ctx.input, ctx.lastOutput, ctx.nodeOutputs) === true
}
```

三个变量名直接作为函数参数注入：

| 参数 | 对应 | 说明 |
|------|------|------|
| `input` | `ctx.input` | 触发输入 |
| `lastOutput` | `ctx.lastOutput` | 上一个节点输出 |
| `nodeOutputs` | `ctx.nodeOutputs` | 所有节点输出映射 |

**示例**：

```javascript
// 判断上游 LLM 输出的 passed 字段
lastOutput && lastOutput.passed === true

// 判断 HITL 用户选择
hitlResult && hitlResult.q1 === '入库'
```

注意：`if` 表达式中的变量名不含 `$` 前缀，与模板变量语法不同。

---

## 五、与 Skill 的关系

### 5.1 作用层级

工作流变量和 Skill 处于不同的作用层级：

```
工作流变量（模板层）
  └─ 解决：节点间数据传递，将上游输出注入下游 prompt/toolArgs

Skill（指令层）
  └─ 解决：Expert 的 system prompt 组装，向 LLM 注入行为约束
```

两者互不干扰：工作流变量在模板替换阶段解析，Skill 在 Expert 被调度时拼接到 system prompt。

### 5.2 Expert 节点中的交汇点

当工作流包含 `expert` 或 `agent-intent` 节点时，两套机制在同一节点中交汇：

1. **模板变量先解析** — 节点的 `prompt` 字段中的 `{{$input.xxx}}`、`{{$node.xxx}}` 等变量先被替换为实际值
2. **Expert 被调度** — 解析后的 prompt 作为用户消息传入 Expert
3. **Skill 拼装 system prompt** — Expert 的 system prompt 由 base prompt + 挂载的 Skill content 组装而成

```text
┌─ 工作流模板解析 ─────────────────────┐
│  prompt: "请分析 {{$node.parse-1.text}}" │
│           ↓ 替换为实际值               │
│  prompt: "请分析 合同正文内容..."       │
└──────────────────────────────────────┘
                ↓ 传入 Expert
┌─ Expert system prompt 组装 ───────────┐
│  base prompt                          │
│  + Skill 1 content（如中文回复约束）   │
│  + Skill 2 content（如输出格式约束）   │
└──────────────────────────────────────┘
```

### 5.3 工具集合并

Skill 可以声明 `tools` 字段。当 Expert 节点被调度时，Expert 自身的 `tools` 和挂载 Skill 的 `tools` 会合并去重，形成该次调用可用的完整工具集。这与工作流的 `tool` 节点（独立的工具调用节点）是两套不同的工具调用机制：

| 机制 | 触发方式 | 工具来源 |
|------|----------|----------|
| 工作流 `tool` 节点 | DAG 流转到该节点时自动调用 | 节点 `data.toolName` 指定 |
| Expert + Skill 工具 | LLM 自主决策调用 | Expert `tools` + 挂载 Skill `tools` 合并 |

---

## 六、完整示例

### 6.1 文档摘要工作流

```text
Webhook 触发 → 文档解析 → LLM 摘要 → 结束
```

LLM 节点 prompt：

```text
请为以下文档生成结构化摘要：

文件名：{{$node.parse-1.filename}}

正文：
{{$node.parse-1.text}}
```

### 6.2 RAG 智能助手

```text
手动触发 → 记录用户问题 → 知识库检索 → LLM 生成回答 → 结束
```

Tool 节点（知识库检索）toolArgs：

```json
{
  "query": "{{$input.message}}",
  "limit": 5
}
```

LLM 节点 prompt：

```text
对话历史：
{{$conversation}}

当前问题：{{$input.message}}

知识库检索结果：
{{$node.rag-1}}

请给出完整回答。
```

### 6.3 HTTP 回调通知

Tool 节点（HTTP POST）toolArgs：

```json
{
  "url": "{{$input.callbackUrl}}",
  "method": "POST",
  "headers": { "Content-Type": "application/json" },
  "body": {
    "status": "completed",
    "result": "{{$node.llm-1}}"
  }
}
```

### 6.4 条件分支 + HITL

`if` 节点 expression：

```javascript
lastOutput && lastOutput.passed === true
```

HITL 节点 confirmMessage：

```text
文档「{{$node.parse-1.filename}}」质检未通过，原因：{{$node.llm-qa.reason}}。请确认是否仍要入库？
```

---

## 七、注意事项

1. **路径不存在返回空字符串** — 访问不存在的节点 ID 或字段路径不会报错，返回空字符串
2. **nodeId 允许连字符** — 如 `parse-1`、`llm-qa`，正则中 `[\w-]+` 匹配
3. **变量不支持嵌套** — `{{$node.{{$input.target}}}}` 不会被解析，变量名必须是字面量
4. **单次替换** — 变量值中如果包含 `{{...}}` 模式，不会被二次解析
5. **`$input` 必须带路径** — `{{$input}}` 不带点号路径时不会被匹配，必须写 `{{$input.message}}` 等
6. **`$json` 无路径访问** — `$json` 始终返回完整对象，不支持 `{{$json.field}}` 语法；需要访问特定字段时使用 `$node.nodeId.field`
