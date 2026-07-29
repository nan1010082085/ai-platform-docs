# RAG Knowledge Base - Architecture & Embedding Choice

> Last updated: 2026-07-06
> Production status: ✅ deployed, 150 Schema + Flow fully indexed

## 1. Architecture Overview

The RAG (Retrieval-Augmented Generation) knowledge base provides semantic retrieval for AI agents, letting the LLM reference existing schemas and flow definitions when generating answers.

### 1.1 Data Flow

```
Index pipeline (write):
  Schema/Flow create/update
    -> Mongoose hook (scheduleSchemaRagIndex)
    -> indexSchema / indexFlowDefinition
    -> contentHash compare (skip unchanged)
    -> embedText (Embedding API)
    -> SchemaEmbeddingModel.upsert

Retrieval pipeline (read):
  User query / Agent tool call
    -> semanticSearch
    -> embedText (Embedding API) -> vector cosine similarity top-k
    -> fallback: fuzzySearchSchemas (Jaccard keyword match)
    -> return SearchResult[]
```

### 1.2 Core Components

| Component | File | Responsibility |
|---|---|---|
| Embedding service | `services/embeddingService.ts` | OpenAI-compatible Embedding API client, LRU cache (500) |
| RAG service | `services/ragService.ts` | Index management + semantic search + keyword fallback |
| Vector store | `models/SchemaEmbedding.ts` | MongoDB stores vectors + metadata |
| Admin routes | `ragRoutes.ts` | REST API: reindex / status / delete |
| MCP tool | `mcp/ragServer.ts` | `rag__search` semantic search tool |
| LangGraph tool | `tools/ragTools.ts` | `rag_index` index write tool |
| Context injection | `graph/ragContextRetriever.ts` | Auto-retrieves top-3 reference schemas before agent call |
| Auto indexing | `services/ragIndexScheduler.ts` | Fire-and-forget index triggered by Mongoose hook |

---

## 2. Embedding Model Choice

### 2.1 Candidate Comparison

| Dimension | BGE-M3 | text-embedding-3-small | text-embedding-3-large |
|---|---|---|---|
| **Provider** | BAAI | OpenAI | OpenAI |
| **Dimensions** | 1024 | 1536 | 3072 |
| **Max tokens** | 8192 | 8191 | 8191 |
| **Chinese quality** | C-MTEB SOTA | Good | Good |
| **Multilingual** | 100+ languages | Limited | Limited |
| **Sparse retrieval** | Native | No | No |
| **ColBERT rerank** | Native | No | No |
| **Matryoshka** | Yes (256/512) | No | Yes (256) |
| **License** | MIT (free commercial) | Paid | Paid |
| **Price** | Free (self-hosted/managed) | $0.02/1M tokens | $0.13/1M tokens |

### 2.2 Conclusion

**Recommended: BGE-M3**, because:
1. Best Chinese quality (long-time C-MTEB leader)
2. Free (MIT license), no per-token cost
3. Native dense + sparse + ColBERT retrieval modes, extensible to hybrid retrieval
4. Supports 8192-token long text, suitable for long form descriptions

### 2.3 BGE-M3 Specs

| Parameter | Value |
|---|---|
| Model name | BAAI/bge-m3 |
| Architecture | XLM-RoBERTa |
| Parameters | ~568M |
| Model size | ~1.1GB (FP16) |
| Output dim | 1024 (dense) |
| Max input | 8192 tokens |
| License | MIT |
| Three retrievals | dense (vector), sparse (keyword weight), ColBERT (token-level rerank) |

---

## 3. Deployment Options

| Option | GPU needed | Integration difficulty | Latency | Use case |
|---|---|---|---|---|
| **SiliconFlow hosted** | ❌ | ⭐ Lowest | ~50-100ms | Production (recommended) |
| Ollama local | ❌ (CPU OK) | ⭐⭐ | 1-3s | Dev/test |
| TEI Docker | ✅ | ⭐⭐⭐ | ~20ms | Production with GPU |
| FlagEmbedding | ✅ | ⭐⭐⭐⭐ | ~20ms | Needs sparse/ColBERT |

### Recommended: SiliconFlow-hosted BGE-M3

SiliconFlow is a domestic AI inference cloud platform offering a hosted BGE-M3 API, fully OpenAI-compatible.

**Advantages**:
- No local model deployment, no GPU needed
- Free quota, very low cost after exceeding
- Domestic nodes, low latency (~50-100ms)
- OpenAI-compatible API, zero code changes

---

## 4. SiliconFlow Setup Guide

### 4.1 Register & Get Key

1. Visit [siliconflow.cn](https://siliconflow.cn) to register
2. Console -> API Key management -> Create Key
3. Free quota is enough for small-to-medium scale

### 4.2 Configuration

Set in `.env`:

```env
EMBEDDING_API_KEY=sk-xxx           # SiliconFlow API Key
EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSIONS=1024
```

### 4.3 Post-switch Steps

1. Restart server
2. Call `POST /api/ai/rag/reindex` to fully rebuild vector index (dimension 1536 -> 1024, existing vectors incompatible)
3. Verify search in the AI knowledge base management page

### 4.4 API Compatibility

SiliconFlow's Embedding API is fully OpenAI-compatible:

```json
// Request
POST /v1/embeddings
{
  "model": "BAAI/bge-m3",
  "input": "Employee leave form"
}

// Response
{
  "data": [{ "embedding": [0.012, -0.034, ...], "index": 0 }],
  "model": "BAAI/bge-m3",
  "usage": { "prompt_tokens": 5, "total_tokens": 5 }
}
```

---

## 5. Search Strategy

### 5.1 Semantic Search (main path)

```
User query -> embedText -> vector
  ↓
Iterate SchemaEmbedding -> cosineSimilarity(query, embedding) -> score
  ↓
Filter score >= minScore -> sort -> top-k
```

- Default top-k: 5 (ragContextRetriever uses 3)
- Default minScore: 10 (ragContextRetriever uses 15)
- Score range: 0-100 (cosine * 100)

### 5.2 Keyword Fallback

When the Embedding API is not configured or fails, auto-fallback to Jaccard keyword matching:

```
User query -> fuzzySearchSchemas -> Jaccard similarity -> top-k
```

Fallback triggers:
- `isEmbeddingConfigured()` returns false
- `embedText()` throws (network error, API rate limit, etc.)

### 5.3 ragContextRetriever Auto-injection

The `pluginExpert` node injects domain context via `expertUserContext` by expert type before calling the LLM, and auto-runs RAG retrieval:

```typescript
const { context } = await retrieveRagContext(userMessage, { topK: 3, minScore: 15 })
// context injected into the system prompt's "Reference Schema" section
```

Skip condition: user message < 4 chars (greetings, single chars, etc.).

---

## 6. Index Management

### 6.1 Incremental Index (auto)

On Schema/Flow create or update, the Mongoose post-save hook triggers `scheduleSchemaRagIndex`:
- Fire-and-forget, non-blocking
- contentHash compare, skip if unchanged
- Failure only warns, does not affect business

### 6.2 Full Rebuild (manual)

`POST /api/ai/rag/reindex` iterates all schemas and flows, indexing one by one:
- Returns stats: created / updated / skipped / errors
- Use cases: first onboarding, switching embedding model, after data migration

### 6.3 Startup Sync

On server startup, `scheduleRagStartupSync()` auto-fills missing indexes:
- Only processes unindexed schemas/flows, does not rebuild existing
- Async, non-blocking service start

### 6.4 Stale Detection

`GET /api/ai/rag/status` compares SchemaEmbedding.updatedAt with FormSchema.updatedAt:
- Source updated later than index -> marked stale
- Stale count shown on the admin page summary card

---

## 7. Advanced Optimization Roadmap

### 7.1 Hybrid Retrieval (dense + sparse)

BGE-M3 natively supports sparse embedding (BM25-like keyword weights) for hybrid retrieval:

```
Query -> dense vector retrieval + sparse keyword retrieval -> score fusion -> top-k
```

Benefit: precise keyword match + semantic understanding, recall significantly improved.

Prerequisite: needs FlagEmbedding (Python) to deploy BGE-M3 for sparse output.

### 7.2 ColBERT Rerank

BGE-M3's ColBERT output provides token-level vectors for two-stage rerank:

```
Stage 1: dense + sparse -> candidate set (top-20)
Stage 2: ColBERT rerank -> final result (top-5)
```

Benefit: another leap in precision, especially for long-text matching.

### 7.3 MongoDB Atlas Vector Search

If migrating to MongoDB Atlas, use native `$vectorSearch` instead of application-layer cosine:
- DB-level ANN (Approximate Nearest Neighbor) index
- Far better performance than full traversal at scale

---

## 8. Production Deployment Status

### 8.1 Current Config

| Config | Value |
|---|---|
| Embedding model | BAAI/bge-m3 (SiliconFlow hosted) |
| API endpoint | `https://api.siliconflow.cn/v1` |
| Vector dim | 1024 |
| API Key | configured in `.env.production` |

### 8.2 Index Stats

| Metric | Count |
|---|---|
| Total schemas | 150 |
| Indexed | 150 |
| Coverage | 100% |
| Vector dim | 1024 |
| Embedding cache | LRU 500 |

### 8.3 Verification Result

Semantic search test (query: "search leave-related forms"):

| Rank | Schema | Similarity |
|---|---|---|
| 1 | Leave request | 84% |
| 2 | Leave ledger | 79% |
| 3 | Business trip request | 70% |
| 4 | Overtime request | 69% |
| 5 | Meeting booking | 68% |

Semantic understanding is accurate: "leave" forms rank first, related concepts like "business trip" and "overtime" match correctly.

### 8.4 Deployment Notes

1. **PM2 env vars**: use `pm2 delete` + `pm2 start` instead of `pm2 restart --update-env`
2. **Compiled code sync**: on TypeScript compile failure, manually update `dist/`
3. **API rate limit**: add 200ms delay for batch indexing to avoid SiliconFlow rate limits
4. **contentHash detection**: identical content is not re-indexed; full rebuild is safe
