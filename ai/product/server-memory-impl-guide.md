# Server 端实现指南：长程记忆 + 多智能体深化 + Agentic RAG

> 日期：2026-07-27
> 上游：[evolution-plan-2026-07-27-multi-agent-memory.md](./evolution-plan-2026-07-27-multi-agent-memory.md)
> 本文档给出 server 端全部 task 的完整实现代码，供切到 server 项目上下文后直接复制应用。
> 前端 task（B0/B4/B5/A2）已在 ai/app 完成，本文件仅覆盖 server 端 task（B1/B2/B3/B6/B7/B8/A1/A3/C1）。

---

## 改动清单

| Task | 文件 | 操作 |
|---|---|---|
| B1 | `server/src/models/AgentMemory.ts` | 新建 |
| B2 | `server/src/ai/services/memoryService.ts` | 新建 |
| B3a | `server/src/ai/services/nodes/memoryRecall.ts` | 新建 |
| B3b | `server/src/ai/services/nodes/memoryWrite.ts` | 新建 |
| B3c | `server/src/ai/services/nodes/memoryExtract.ts` | 新建 |
| B3d | `server/src/ai/services/agentWorkflowExecutor.ts` | 改：import + case + RuntimeContext 扩展 |
| B6 | `server/src/ai/memoryRoutes.ts` | 新建 |
| B6 | `server/src/ai/routes.ts` | 改：注册 memoryRoutes |
| B7 | `server/src/ai/chatStreamRunner.ts` | 改：prompt 组装时注入用户记忆 |
| A1 | `server/src/ai/services/nodes/agentTeam.ts` | 改：加 parallel 分支 |
| C1 | `server/src/ai/services/agentWorkflowExecutor.ts` | 改：agent-loop 默认 prompt 加 Agentic RAG 指引 |
| C1 | `rag__search` 工具描述 | 改：见 MCP ragServer 定义 |

---

## B1：AgentMemory model

文件：`server/src/models/AgentMemory.ts`（新建）

```typescript
/**
 * AgentMemory - 用户长程记忆（跨会话，按 tenantId + userId 隔离）
 *
 * 与 SchemaEmbedding 的区别：
 * - SchemaEmbedding 索引知识文档（schema/flow/document）
 * - AgentMemory 索引用户个性化记忆（偏好/事实/事件/技能）
 *
 * 复用 embeddingService（BGE-M3）生成向量，检索走余弦 top-k。
 */
import mongoose from 'mongoose'
import { tenantPlugin } from '../middleware/tenantPlugin.js'

export type MemoryNamespace = 'preference' | 'fact' | 'event' | 'skill'

export interface IAgentMemory {
  tenantId: string
  userId: string
  namespace: MemoryNamespace
  content: string
  embedding: number[]
  importance: number
  lastAccessedAt: Date
  accessCount: number
  source: {
    conversationId?: string
    messageId?: string
    workflowId?: string
    nodeId?: string
  }
  supersededBy?: string | null
  createdAt: Date
  updatedAt: Date
}

const sourceSchema = new mongoose.Schema(
  {
    conversationId: { type: String },
    messageId: { type: String },
    workflowId: { type: String },
    nodeId: { type: String },
  },
  { _id: false },
)

const agentMemoryDef = new mongoose.Schema(
  {
    tenantId: { type: String, default: '000000', index: true },
    userId: { type: String, required: true, index: true },
    namespace: { type: String, enum: ['preference', 'fact', 'event', 'skill'], default: 'fact', index: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    importance: { type: Number, default: 0.5, min: 0, max: 1 },
    lastAccessedAt: { type: Date, default: () => new Date() },
    accessCount: { type: Number, default: 0 },
    source: { type: sourceSchema, default: () => ({}) },
    supersededBy: { type: String, default: null },
  },
  { timestamps: true },
)

agentMemoryDef.index({ userId: 1, namespace: 1 })
agentMemoryDef.index({ userId: 1, importance: -1, lastAccessedAt: -1 })

agentMemoryDef.plugin(tenantPlugin)

export const AgentMemoryModel =
  mongoose.models.AgentMemory ?? mongoose.model<IAgentMemory>('AgentMemory', agentMemoryDef)
```

---

## B2：memoryService

文件：`server/src/ai/services/memoryService.ts`（新建）

```typescript
/**
 * memoryService - 长程记忆的写入、检索、提取、整合、遗忘
 *
 * 复用 embeddingService（embedText）生成向量；
 * 检索走余弦 top-k（pattern 同 vectorStore MongoVectorStore）；
 * 提取用 getLLM（llmCache）。
 */
import { AgentMemoryModel, type IAgentMemory, type MemoryNamespace } from '../../models/AgentMemory.js'
import { embedText } from './embeddingService.js'
import { getLLM } from './llmCache.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { logger } from '../../utils/logger.js'

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

export interface MemoryWriteInput {
  tenantId: string
  userId: string
  namespace: MemoryNamespace
  content: string
  importance?: number
  source?: IAgentMemory['source']
}

/** 写入一条记忆（含 embedding） */
export async function writeMemory(input: MemoryWriteInput): Promise<IAgentMemory> {
  const { tenantId, userId, namespace, content, importance = 0.5, source } = input
  const trimmed = content.trim()
  if (!trimmed) throw new Error('记忆内容为空')

  const { vector } = await embedText(trimmed)

  // B8 整合：同 namespace 下语义高度相似的记忆，标记被取代（冲突解决）
  await consolidateSimilar(tenantId, userId, namespace, trimmed, vector)

  const doc = await AgentMemoryModel.create({
    tenantId,
    userId,
    namespace,
    content: trimmed,
    embedding: vector,
    importance,
    source: source ?? {},
  })
  logger.info({ msg: '[memory] write', tenantId, userId, namespace, importance })
  return doc.toObject()
}

/** 检索用户长程记忆（语义 top-k + 重要性/时序加权） */
export async function recallMemory(params: {
  tenantId: string
  userId: string
  query: string
  namespace?: 'all' | MemoryNamespace
  limit?: number
}): Promise<IAgentMemory[]> {
  const { tenantId, userId, query, namespace = 'all', limit = 5 } = params
  const { vector } = await embedText(query)

  const filter: Record<string, unknown> = { tenantId, userId, supersededBy: null }
  if (namespace !== 'all') filter.namespace = namespace

  const candidates = await AgentMemoryModel.find(filter)
    .select('namespace content embedding importance lastAccessedAt accessCount source createdAt')
    .lean() as Array<IAgentMemory & { embedding: number[] }>

  const scored = candidates.map((doc) => {
    const sim = cosineSimilarity(vector, doc.embedding)
    // 加权：语义相似度 * 0.7 + 重要性 * 0.2 + 时序新鲜度 * 0.1
    const ageDays = (Date.now() - new Date(doc.lastAccessedAt).getTime()) / 86_400_000
    const freshness = Math.max(0, 1 - ageDays / 30) // 30 天衰减到 0
    const score = sim * 0.7 + (doc.importance ?? 0.5) * 0.2 + freshness * 0.1
    return { doc, score, sim }
  })

  const top = scored
    .filter((s) => s.sim > 0.3) // 语义阈值
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  // 更新访问计数与最后访问时间（fire-and-forget）
  if (top.length) {
    void AgentMemoryModel.updateMany(
      { _id: { $in: top.map((t) => t.doc._id) } },
      { $inc: { accessCount: 1 }, $set: { lastAccessedAt: new Date() } },
    ).catch((err) => logger.warn({ msg: '[memory] recall touch failed', error: String(err) }))
  }

  return top.map((t) => t.doc)
}

/** LLM 从文本提取值得记忆的事实/偏好 */
export async function extractMemory(params: {
  text: string
  namespace?: MemoryNamespace
  model?: string
}): Promise<Array<{ namespace: MemoryNamespace; content: string; importance: number }>> {
  const { text, namespace = 'fact', model } = params
  const llm = await getLLM({ temperature: 0, model: model?.trim() && model !== 'default' ? model : undefined })

  const system = `你是一个记忆提取器。从给定文本中提取值得长期记住的事实、偏好、事件或技能。
只提取有长期价值的信息，忽略临时性、上下文相关、一次性的内容。
输出 JSON 数组，每项格式：{"namespace": "preference|fact|event|skill", "content": "简洁陈述", "importance": 0-1}
- preference: 用户偏好/习惯（如"偏好简洁回答"）
- fact: 关于用户的客观事实（如"用户是 HR"）
- event: 发生过的事件（如"用户上周提交了请假流程"）
- skill: 用户展现的能力/需求（如"用户需要做表单设计"）
默认归类倾向：${namespace}。若无值得提取的内容，返回空数组 []。`

  const resp = await llm.invoke([new SystemMessage(system), new HumanMessage(text)])
  const raw = typeof resp === 'string' ? resp : String((resp as { content?: unknown }).content ?? '')

  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0]) as Array<{ namespace: string; content: string; importance?: number }>
    return parsed
      .filter((item) => ['preference', 'fact', 'event', 'skill'].includes(item.namespace))
      .map((item) => ({
        namespace: item.namespace as MemoryNamespace,
        content: String(item.content).trim(),
        importance: typeof item.importance === 'number' ? Math.min(1, Math.max(0, item.importance)) : 0.5,
      }))
      .filter((item) => item.content)
  } catch {
    logger.warn({ msg: '[memory] extract parse failed', raw: raw.slice(0, 200) })
    return []
  }
}

/** B8 整合：同 namespace 下语义高度相似的记忆，标记被取代 */
async function consolidateSimilar(
  tenantId: string,
  userId: string,
  namespace: MemoryNamespace,
  newContent: string,
  newVector: number[],
): Promise<void> {
  const existing = await AgentMemoryModel.find({ tenantId, userId, namespace, supersededBy: null })
    .select('content embedding')
    .lean() as Array<{ _id: string; content: string; embedding: number[] }>

  for (const doc of existing) {
    const sim = cosineSimilarity(newVector, doc.embedding)
    if (sim > 0.85) {
      // 高度相似：旧记忆被新记忆取代
      await AgentMemoryModel.updateOne({ _id: doc._id }, { $set: { supersededBy: 'superseded' } })
      logger.info({ msg: '[memory] consolidate supersede', oldContent: doc.content.slice(0, 50), newContent: newContent.slice(0, 50) })
    }
  }
}

/** B8 遗忘：删除低重要性 + 长期未访问的记忆（定期任务调用） */
export async function forgetStaleMemories(tenantId: string, userId: string, maxPerUser = 200): Promise<number> {
  const count = await AgentMemoryModel.countDocuments({ tenantId, userId, supersededBy: null })
  if (count <= maxPerUser) return 0

  // 按重要性升序、最后访问时间升序，删除超出部分
  const toDelete = await AgentMemoryModel.find({ tenantId, userId, supersededBy: null })
    .sort({ importance: 1, lastAccessedAt: 1 })
    .limit(count - maxPerUser)
    .select('_id')
    .lean()

  const ids = toDelete.map((d) => d._id)
  if (ids.length) {
    await AgentMemoryModel.deleteMany({ _id: { $in: ids } })
  }
  return ids.length
}
```

---

## B3d + RuntimeContext 扩展

文件：`server/src/ai/services/agentWorkflowExecutor.ts`（改）

### 1. RuntimeContext 加 tenantId / userId（约 418 行）

```typescript
export interface RuntimeContext {
  executionId: string
  triggeredBy: string
  tenantId: string          // 新增
  userId?: string           // 新增：优先 input.userId，fallback triggeredBy
  input: Record<string, unknown>
  lastOutput: unknown
  nodeOutputs: Record<string, unknown>
  conversationHistory: WorkflowConversationTurn[]
}
```

### 2. ctx 构造处补字段（约 1170 行，executeAgentWorkflow 内）

```typescript
  const ctx: RuntimeContext = {
    executionId,
    triggeredBy,
    tenantId: executionDoc?.tenantId ?? '000000',
    userId: typeof input.userId === 'string' ? input.userId : String(executionDoc?.triggeredBy ?? '') || undefined,
    input,
    lastOutput: input,
    nodeOutputs: {},
    conversationHistory,
  }
```

### 3. import 三个 memory 节点（顶部 import 区，紧挨 agentTeam import）

```typescript
import { executeMemoryRecallNode } from './nodes/memoryRecall.js'
import { executeMemoryWriteNode } from './nodes/memoryWrite.js'
import { executeMemoryExtractNode } from './nodes/memoryExtract.js'
```

### 4. runNode switch 加 case（约 952 行，agent-team 后面）

```typescript
    case 'agent-team':
      return executeAgentTeamNode(node, data, ctx)
    case 'memory-recall':
      return executeMemoryRecallNode(node, data, ctx)
    case 'memory-write':
      return executeMemoryWriteNode(node, data, ctx)
    case 'memory-extract':
      return executeMemoryExtractNode(node, data, ctx)
```

---

## B3a：memoryRecall 节点

文件：`server/src/ai/services/nodes/memoryRecall.ts`（新建）

```typescript
/**
 * memory-recall 节点：从用户长程记忆库检索跨会话记忆，注入下游 prompt
 */
import {
  type WorkflowGraphNode,
  type RuntimeContext,
  type NodeRunResult,
  resolveTemplate,
} from '../agentWorkflowExecutor.js'
import { nodeFailure } from '../agentWorkflowNodeErrors.js'
import { recallMemory } from '../memoryService.js'

export async function executeMemoryRecallNode(
  node: WorkflowGraphNode,
  data: NonNullable<WorkflowGraphNode['data']>,
  ctx: RuntimeContext,
): Promise<NodeRunResult> {
  const queryTemplate = data.memoryRecallQuery ?? '{{$input.message}}'
  const query = resolveTemplate(queryTemplate, ctx)
  if (!query?.trim()) return nodeFailure('记忆检索 query 为空')

  const limit = data.memoryRecallLimit ?? 5
  const namespace = data.memoryRecallNamespace ?? 'all'

  const userId = resolveUserId(data, ctx)
  if (!userId) return nodeFailure('无法确定用户 ID，长程记忆需 userId 隔离')

  const items = await recallMemory({
    tenantId: ctx.tenantId,
    userId,
    query,
    namespace,
    limit,
  })

  const text = items.length
    ? items.map((m, i) => `${i + 1}. [${m.namespace}] ${m.content}`).join('\n')
    : ''

  return {
    output: {
      memories: items.map((m) => ({ namespace: m.namespace, content: m.content, importance: m.importance })),
      text,
      count: items.length,
    },
  }
}

function resolveUserId(
  data: NonNullable<WorkflowGraphNode['data']>,
  ctx: RuntimeContext,
): string | undefined {
  const source = data.memoryRecallUserIdSource ?? 'auto'
  if (source === 'custom') return data.memoryRecallUserId?.trim() || undefined
  if (source === 'input') return typeof ctx.input.userId === 'string' ? ctx.input.userId : undefined
  // auto
  return ctx.userId ?? (typeof ctx.input.userId === 'string' ? ctx.input.userId : undefined)
}
```

---

## B3b：memoryWrite 节点

文件：`server/src/ai/services/nodes/memoryWrite.ts`（新建）

```typescript
/**
 * memory-write 节点：将一条记忆持久化到用户长程记忆库
 */
import {
  type WorkflowGraphNode,
  type RuntimeContext,
  type NodeRunResult,
  resolveTemplate,
} from '../agentWorkflowExecutor.js'
import { nodeFailure } from '../agentWorkflowNodeErrors.js'
import { writeMemory } from '../memoryService.js'
import type { MemoryNamespace } from '../../../models/AgentMemory.js'

export async function executeMemoryWriteNode(
  node: WorkflowGraphNode,
  data: NonNullable<WorkflowGraphNode['data']>,
  ctx: RuntimeContext,
): Promise<NodeRunResult> {
  const contentTemplate = data.memoryWriteContent ?? '{{$input.message}}'
  const content = resolveTemplate(contentTemplate, ctx)
  if (!content?.trim()) return nodeFailure('记忆内容为空')

  const namespace = (data.memoryWriteNamespace ?? 'fact') as MemoryNamespace
  const importance = data.memoryWriteImportance ?? 0.5
  const userId = resolveUserId(data, ctx)
  if (!userId) return nodeFailure('无法确定用户 ID，长程记忆需 userId 隔离')

  const doc = await writeMemory({
    tenantId: ctx.tenantId,
    userId,
    namespace,
    content,
    importance,
    source: { workflowId: ctx.input.workflowId as string | undefined, nodeId: node.id },
  })

  return { output: { id: doc._id?.toString(), namespace, content, importance, written: true } }
}

function resolveUserId(
  data: NonNullable<WorkflowGraphNode['data']>,
  ctx: RuntimeContext,
): string | undefined {
  const source = data.memoryWriteUserIdSource ?? 'auto'
  if (source === 'custom') return data.memoryWriteUserId?.trim() || undefined
  if (source === 'input') return typeof ctx.input.userId === 'string' ? ctx.input.userId : undefined
  return ctx.userId ?? (typeof ctx.input.userId === 'string' ? ctx.input.userId : undefined)
}
```

---

## B3c：memoryExtract 节点

文件：`server/src/ai/services/nodes/memoryExtract.ts`（新建）

```typescript
/**
 * memory-extract 节点：LLM 从对话/节点输出提取值得记忆的事实/偏好
 * 输出结构化记忆条目，典型用法：接 memory-write 持久化
 */
import {
  type WorkflowGraphNode,
  type RuntimeContext,
  type NodeRunResult,
  resolveTemplate,
} from '../agentWorkflowExecutor.js'
import { nodeFailure } from '../agentWorkflowNodeErrors.js'
import { extractMemory, writeMemory } from '../memoryService.js'
import type { MemoryNamespace } from '../../../models/AgentMemory.js'

export async function executeMemoryExtractNode(
  node: WorkflowGraphNode,
  data: NonNullable<WorkflowGraphNode['data']>,
  ctx: RuntimeContext,
): Promise<NodeRunResult> {
  const source = data.memoryExtractSource ?? 'lastOutput'
  let text: string
  if (source === 'input') {
    text = typeof ctx.input.message === 'string' ? ctx.input.message : JSON.stringify(ctx.input ?? '')
  } else if (source === 'custom' && data.memoryExtractTemplate?.trim()) {
    text = resolveTemplate(data.memoryExtractTemplate, ctx)
  } else {
    text = typeof ctx.lastOutput === 'string' ? ctx.lastOutput : JSON.stringify(ctx.lastOutput ?? '')
  }
  if (!text?.trim()) return nodeFailure('待提取的文本为空')

  const namespace = (data.memoryExtractNamespace ?? 'fact') as MemoryNamespace
  const model = data.memoryExtractModel

  const items = await extractMemory({ text, namespace, model: model ?? undefined })

  // 若能确定用户，直接写入（便捷模式）；否则仅输出提取结果，由后续 memory-write 节点写入
  const userId = ctx.userId ?? (typeof ctx.input.userId === 'string' ? ctx.input.userId : undefined)
  const written: Array<{ id?: string; namespace: string; content: string }> = []
  if (userId) {
    for (const item of items) {
      const doc = await writeMemory({
        tenantId: ctx.tenantId,
        userId,
        namespace: item.namespace,
        content: item.content,
        importance: item.importance,
        source: { workflowId: ctx.input.workflowId as string | undefined, nodeId: node.id },
      })
      written.push({ id: doc._id?.toString(), namespace: item.namespace, content: item.content })
    }
  }

  return {
    output: {
      extracted: items,
      written,
      autoWritten: userId ? items.length : 0,
    },
  }
}
```

---

## B6：memoryRoutes

文件：`server/src/ai/memoryRoutes.ts`（新建）

```typescript
/**
 * Memory Routes - 长程记忆管理 API
 * - POST   /api/ai/memory/recall  - 检索用户记忆
 * - POST   /api/ai/memory         - 写入一条记忆
 * - GET    /api/ai/memory         - 列出用户全部记忆
 * - DELETE /api/ai/memory/:id     - 删除一条记忆
 */
import Router from '@koa/router'
import { recallMemory, writeMemory, forgetStaleMemories } from './services/memoryService.js'
import { AgentMemoryModel } from '../models/AgentMemory.js'
import { authMiddleware } from '../middleware/auth.js'

const router = new Router({ prefix: '/api/ai/memory' })

router.use(authMiddleware())

function getUserId(ctx: { state: { user?: { id?: string; userId?: string } } }): string {
  return ctx.state.user?.id ?? ctx.state.user?.userId ?? 'anonymous'
}

function getTenantId(ctx: { state: { user?: { tenantId?: string }; tenantId?: string } }): string {
  return ctx.state.user?.tenantId ?? ctx.state.tenantId ?? '000000'
}

router.post('/recall', async (ctx) => {
  const body = ctx.request.body as { query?: string; userId?: string; namespace?: string; limit?: number }
  if (!body.query?.trim()) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'query is required' } }
    return
  }
  const tenantId = getTenantId(ctx)
  const userId = body.userId?.trim() || getUserId(ctx)
  const items = await recallMemory({
    tenantId,
    userId,
    query: body.query,
    namespace: (body.namespace as 'all' | 'preference' | 'fact' | 'event' | 'skill') ?? 'all',
    limit: body.limit ?? 5,
  })
  ctx.body = { success: true, data: items }
})

router.post('/', async (ctx) => {
  const body = ctx.request.body as { content?: string; userId?: string; namespace?: string; importance?: number }
  if (!body.content?.trim()) {
    ctx.status = 400
    ctx.body = { success: false, error: { message: 'content is required' } }
    return
  }
  const tenantId = getTenantId(ctx)
  const userId = body.userId?.trim() || getUserId(ctx)
  const doc = await writeMemory({
    tenantId,
    userId,
    namespace: (body.namespace as 'preference' | 'fact' | 'event' | 'skill') ?? 'fact',
    content: body.content,
    importance: body.importance,
  })
  ctx.body = { success: true, data: doc }
})

router.get('/', async (ctx) => {
  const userId = (ctx.query.userId as string)?.trim() || getUserId(ctx)
  const tenantId = getTenantId(ctx)
  const items = await AgentMemoryModel.find({ tenantId, userId, supersededBy: null })
    .sort({ updatedAt: -1 })
    .limit(200)
    .select('-embedding')
    .lean()
  ctx.body = { success: true, data: items }
})

router.delete('/:id', async (ctx) => {
  const tenantId = getTenantId(ctx)
  const res = await AgentMemoryModel.deleteOne({ _id: ctx.params.id, tenantId })
  ctx.body = { success: true, data: { id: ctx.params.id, deleted: res.deletedCount > 0 } }
})

// B8 遗忘：手动触发（也可接入定时任务）
router.post('/forget', async (ctx) => {
  const userId = (ctx.request.body as { userId?: string })?.userId?.trim() || getUserId(ctx)
  const tenantId = getTenantId(ctx)
  const removed = await forgetStaleMemories(tenantId, userId)
  ctx.body = { success: true, data: { removed } }
})

export default router
```

### 注册到 routes.ts

文件：`server/src/ai/routes.ts`（改）

在 router 注册区加：

```typescript
import memoryRoutes from './memoryRoutes.js'
// ...
router.use(memoryRoutes.routes())
```

---

## B7：chatStreamRunner 集成记忆注入

文件：`server/src/ai/chatStreamRunner.ts`（改）

在组装 chat prompt 时，并行检索用户记忆并注入 system prompt。

定位：`chatStreamRunner.ts` 中组装 system prompt / messages 的位置（搜索 `systemPrompt` 或 `buildMessages`）。

```typescript
import { recallMemory } from './services/memoryService.js'

// 在组装 messages 前，检索用户长程记忆（与 RAG 并行）
let memoryText = ''
try {
  const userId = getUserId(ctx)  // 复用现有 userId 取法
  const tenantId = getTenantId(ctx)
  if (userId && userId !== 'anonymous') {
    const memories = await recallMemory({
      tenantId,
      userId,
      query: userMessage,  // 当前用户输入
      limit: 5,
    })
    if (memories.length) {
      memoryText = '\n\n[用户长程记忆]\n' + memories.map((m, i) => `${i + 1}. [${m.namespace}] ${m.content}`).join('\n')
    }
  }
} catch (err) {
  logger.warn({ msg: '[chat] memory recall failed', error: String(err) })
}

// 将 memoryText 追加到 system prompt
const finalSystem = baseSystem + memoryText
```

> **定位提示**：搜索 `chatStreamRunner.ts` 里 `systemPrompt` 拼装处，或 `buildSystemPrompt`。若 chat 走 langgraph，则在 graph 的 system message 构造节点注入。

---

## C1：Agentic RAG 指引

### 1. agent-loop 默认 system prompt 加 Agentic RAG 指引

文件：`server/src/ai/services/agentWorkflowExecutor.ts`（改）

定位 `runAgentLoop` 附近或 agent-loop 节点构造 system 的地方。在默认 system prompt 末尾追加：

```typescript
// 若工具列表含 rag__search，追加 Agentic RAG 指引
const hasRagTool = data.agentLoopTools?.some((n) => n.includes('rag'))
const agenticRagHint = hasRagTool
  ? '\n\n遇到知识性/事实性问题时，优先调用 rag__search 检索知识库。判断检索结果是否充分回答问题；若不充分，改写 query 再次检索。综合检索结果与自身知识作答，标注哪些来自检索。'
  : ''
const finalSystem = (data.agentLoopSystemPrompt || defaultLoopSystem) + agenticRagHint
```

### 2. `rag__search` 工具描述优化

定位 MCP ragServer 定义（`server/src/ai/mcp/` 或 `server/config/plugins/` 下 rag server）。将 `rag__search` 的 description 改为：

```
检索知识库（schema/flow/document）。可改写 query 多次调用以获取不同视角的结果；
若首次结果不足以回答，请用更具体/更宽泛的 query 重试。返回相关文档片段与相关度评分。
```

---

## A1：agent-team parallel 模式

文件：`server/src/ai/services/nodes/agentTeam.ts`（改）

在现有 `executeAgentTeamNode` 中，`mode === 'parallel'` 时走并行分支（不进 runAgentLoop 自主循环，而是 supervisor 先拆解 -> 并行执行 -> 合成）。

在 `const modeHint = ...` 之前插入 parallel 分支：

```typescript
  if (mode === 'parallel') {
    return executeParallelTeam(node, data, ctx, members, supervisorModelId, supervisorSystem)
  }
```

并新增函数（同文件底部）：

```typescript
async function executeParallelTeam(
  node: WorkflowGraphNode,
  data: NonNullable<WorkflowGraphNode['data']>,
  ctx: RuntimeContext,
  members: Array<{ name: string; persona: string; model?: string; tools?: string[] }>,
  supervisorModelId: string | undefined,
  supervisorSystem: string,
): Promise<NodeRunResult> {
  const userInput = resolveUserInput(data, ctx)  // 复用现有 input 解析逻辑（提取为函数）
  const supervisorLlm = await getLLM({ temperature: 0.2, model: supervisorModelId })

  // 1. supervisor 拆解：为每个成员生成子任务
  const memberList = members.map((m) => `- ${m.name}: ${m.persona}`).join('\n')
  const planSystem = supervisorSystem || `你是团队 Supervisor。将任务拆解为每个成员的独立子任务。
可用成员：\n${memberList}\n
输出 JSON 数组，每项 {"member": "成员名", "task": "具体子任务"}。每个成员恰好一个子任务，子任务相互独立可并行。`

  const planResp = await supervisorLlm.invoke([
    new SystemMessage(planSystem),
    new HumanMessage(userInput),
  ])
  const planRaw = typeof planResp === 'string' ? planResp : String((planResp as { content?: unknown }).content ?? '')

  let plan: Array<{ member: string; task: string }> = []
  try {
    const match = planRaw.match(/\[[\s\S]*\]/)
    if (match) plan = JSON.parse(match[0])
  } catch { /* ignore */ }

  if (!plan.length) {
    // fallback：每个成员都处理完整任务
    plan = members.map((m) => ({ member: m.name, task: userInput }))
  }

  // 2. 并行执行所有成员（A3 精炼：每个成员输出已是简洁分析）
  const results = await Promise.all(plan.map(async (item) => {
    const member = members.find((m) => m.name === item.member) ?? members[0]
    const memberModelId = member.model?.trim() && member.model !== 'default' ? member.model : undefined
    const memberLlm = await getLLM({ temperature: 0.3, model: memberModelId })
    const memberSystem = `你是团队成员「${member.name}」。角色：${member.persona}\n请根据分配的任务给出专业分析，简洁明了。`
    try {
      const resp = await memberLlm.invoke([new SystemMessage(memberSystem), new HumanMessage(item.task)])
      const text = typeof resp === 'string' ? resp : String((resp as { content?: unknown }).content ?? '')
      return { member: member.name, task: item.task, result: text }
    } catch (err) {
      return { member: member.name, task: item.task, result: `执行失败: ${err instanceof Error ? err.message : String(err)}` }
    }
  }))

  // 3. supervisor 合成最终结论
  const summaryInput = results.map((r) => `【${r.member}】任务: ${r.task}\n结果: ${r.result}`).join('\n\n')
  const synthSystem = `你是团队 Supervisor。综合以下各成员的并行分析结果，给出结构化最终结论，标注分歧点（如有）。`
  const synthResp = await supervisorLlm.invoke([
    new SystemMessage(synthSystem),
    new HumanMessage(summaryInput),
  ])
  const finalText = typeof synthResp === 'string' ? synthResp : String((synthResp as { content?: unknown }).content ?? '')

  return {
    output: {
      text: finalText,
      mode: 'parallel',
      members: results.length,
      details: results,
    },
  }
}
```

> **配套**：需将现有 `userInput` 解析逻辑（第 70-80 行）提取为 `resolveUserInput(data, ctx)` 函数，供 parallel 分支复用。

---

## 验收自检清单（server 端应用后）

1. `mongosh` 里 `agentmemories` 集合存在，写入记忆有 embedding 字段
2. `POST /api/ai/memory` 写入一条记忆，`POST /api/ai/memory/recall` 能召回
3. workflow 里 `memory-recall` -> `llm`（`{{$node.memory-recall-1}}`）能注入记忆文本
4. 跨会话：第一次对话 `memory-write` 写入"用户偏好简洁"，第二次对话 `memory-recall` 召回
5. agent-team parallel 模式：3 成员并行，总耗时 ≈ 最慢成员（非三者之和）
6. agent-loop 选了 `rag__search` 工具时，遇知识问题自主检索
7. 记忆整合：写入与已有记忆语义高度相似（sim>0.85）时，旧记忆被标记 supersededBy

按 [[no-skip-issues]]：应用后逐项验证，报错找根因修复，不跳过。
