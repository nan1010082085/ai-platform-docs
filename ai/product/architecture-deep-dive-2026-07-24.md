# AI 平台架构深度分析：竞品对标 × 架构方向

> 日期：2026-07-24
> 视角：架构师（技术选型 × 可扩展性 × 差异化）
> 依据：代码核实（server/ai 全量 44 services + 13 models + 14 routes + 63 tests）+ 行业知识

---

## 一、当前架构画像

### 1.1 技术栈

| 层 | 技术 | 特点 |
|---|---|---|
| 前端 | Vue 3 + Pinia + Element Plus + CSS Modules | 组件化成熟，687 测试 |
| 后端 | Koa + MongoDB + Socket.IO | 轻量，无 ORM 抽象层 |
| AI 引擎 | LangChain.js + 自研 executor | 25 节点 DAG + agent-loop + agent-team |
| 存储 | MongoDB（文档+向量+指标） | 单一存储，应用层 cosine |
| 缓存 | 内存 Map（LLM 实例 + embedding LRU） | 无分布式缓存 |
| 消息 | Socket.IO WebSocket | 仅 chat 流式 |
| 队列 | 无 | fire-and-forget + .catch() |
| 追踪 | 自研 telemetry（MongoDB 写入） | 无分布式追踪 |
| 部署 | PM2 + nginx | 单实例 |

### 1.2 执行模型

```
用户请求 → Koa 路由 → startAgentWorkflowExecution()
                          ↓
                    executeAgentWorkflow()  ← fire-and-forget (.catch())
                          ↓
                    DAG 遍历 → 节点执行器（switch-case 25 种）
                          ↓
                    LLM 调用 / 工具调用 / 子 workflow
                          ↓
                    写 MongoDB（nodeRecords + status）
                          ↓
                    前端轮询 / WebSocket 推送
```

**关键特征**：
- 执行在进程内异步，无持久化队列
- 状态全部写 MongoDB（无 Redis 状态缓存）
- 前端通过轮询或 WebSocket 获取进度
- 无重试机制（失败即终止）
- 无分布式追踪（只有 MongoDB telemetry 写入）

### 1.3 模块规模

| 模块 | 文件数 | 说明 |
|---|---|---|
| executor | 1 个文件 2435 行 | 所有 25 种节点的执行逻辑集中 |
| services | 44 个 | 业务逻辑层 |
| models | 13 个 | Mongoose schema |
| routes | 14 个 | API 端点 |
| 前端视图 | 29 个 | Vue SFC |
| 前端组件 | 60+ | 含渲染器/面板/卡片 |

---

## 二、竞品架构对比

### 2.1 Dify（Python，最接近的竞品）

| 维度 | Dify | 我们 | 差距 |
|---|---|---|---|
| **语言** | Python (Flask) | TypeScript (Koa) | 各有优劣 |
| **数据库** | PostgreSQL + Redis + Weaviate/Qdrant | MongoDB（全功能） | Dify 更成熟 |
| **执行引擎** | Celery 异步任务队列 | 进程内 async fire-and-forget | **Dify 显著领先** |
| **RAG** | 多向量库 + hybrid + rerank + 分段策略 | MongoDB cosine + rerank(SiliconFlow) | Dify 更灵活 |
| **节点类型** | ~15 种 | 25 种 | **我们领先** |
| **Agent** | ReAct loop + function calling | agent-loop + agent-team | **我们领先** |
| **评测** | 内置 evaluation | 我们刚加 | 相当 |
| **插件** | 插件市场 + API 工具 | MCP + 插件中心 | 相当 |
| **多租户** | 企业版 | 内置 | 相当 |
| **社区** | 50k+ star | 起步 | Dify 显著领先 |

### 2.2 n8n（TypeScript，自动化平台）

| 维度 | n8n | 我们 | 差距 |
|---|---|---|---|
| **语言** | TypeScript | TypeScript | 同栈 |
| **集成数** | 400+ | MCP + 少量内置 | **n8n 碾压** |
| **触发器** | cron/webhook/email/DB/SaaS | manual/webhook/chat/api/schedule | n8n 更丰富 |
| **AI Agent** | LangChain Agent 节点 | agent-loop + agent-team | 相当 |
| **执行引擎** | BullMQ (Redis) + Worker 进程 | 进程内 async | **n8n 显著领先** |
| **企业版** | SSO/RBAC/Git sync/审计 | 基础多租户 | n8n 领先 |
| **可扩展性** | Queue mode + 多 Worker | 单实例 | **n8n 显著领先** |

### 2.3 Coze（字节，闭源 SaaS）

| 维度 | Coze | 我们 | 差距 |
|---|---|---|---|
| **渠道部署** | Discord/Telegram/飞书/微信 | 仅 Web | **Coze 碾压** |
| **插件市场** | 海量 | 起步 | Coze 领先 |
| **多模态** | 原生图文视频 | 支持（刚加） | 相当 |
| **自部署** | 不支持 | 支持 | **我们领先** |

### 2.4 LangGraph（库，非平台）

| 维度 | LangGraph | 我们 | 差距 |
|---|---|---|---|
| **图原语** | StateGraph + conditional edges | DAG + if/switch | LangGraph 更灵活 |
| **中断恢复** | 一等公民（checkpoint + interrupt） | 我们刚加（状态序列化） | LangGraph 更成熟 |
| **持久化** | PostgreSQL checkpoint | MongoDB nodeRecords | 相当 |
| **可观测** | LangSmith 集成 | 自研 telemetry | LangSmith 更强 |
| **可视化** | LangGraph Studio | WorkflowDebugView | 相当 |

---

## 三、架构差距分析

### 3.1 执行引擎（最大差距）

**现状**：`executeAgentWorkflow()` 在进程内 async 执行，`.catch()` fire-and-forget。

**问题**：
- 进程崩溃 → 执行丢失（无持久化）
- 无重试机制（LLM 超时/网络抖动 → 直接失败）
- 无并发控制（100 个 workflow 同时跑 → 进程 OOM）
- 无死信队列（失败后无法重放）
- 单实例（无法水平扩展）

**行业标准**：
- Dify: Celery + Redis（任务持久化 + 重试 + 并发控制）
- n8n: BullMQ + Worker 进程（队列持久化 + 多 Worker 水平扩展）
- Temporal: Workflow as Code（最强持久化执行引擎）

**差距等级**：🔴 **架构级差距**

### 3.2 可观测性（重要差距）

**现状**：自研 telemetry 写 MongoDB（AgentMetric + TelemetryEvent）。

**问题**：
- 无分布式追踪（跨服务调用无法关联）
- 无实时告警（只有事后查询）
- 无 cost allocation per user/workflow
- 无 trace export（无法接 Jaeger/Grafana）

**行业标准**：
- Dify: 内置 trace 界面 + LangSmith 集成
- n8n: Execution log + 历史回放
- LangSmith: 全链路追踪 + 评估 + Playground

**差距等级**：🟡 **功能级差距**

### 3.3 向量存储（扩展性差距）

**现状**：MongoDB 存向量 + 应用层 cosine 计算。

**问题**：
- 全量扫描（每次检索加载所有 embedding 到内存）
- 无 ANN 索引（HNSW/IVF）
- 10k+ 文档时性能急剧下降

**行业标准**：
- Dify: Weaviate/Qdrant/Milvus（ANN 索引，百万级文档）
- n8n: Pinecone/Qdrant 集成

**差距等级**：🟡 **扩展性差距**（当前规模可接受，增长后成瓶颈）

### 3.4 集成生态（差异化差距）

**现状**：MCP 协议 + 少量内置工具。

**问题**：
- 无预置集成（n8n 有 400+）
- 用户需要自己写 MCP server
- 无 OAuth 连接器（无法连 GitHub/Slack/Google）

**行业标准**：
- n8n: 400+ 预置集成
- Dify: API 工具 + 插件市场
- Coze: 海量插件

**差距等级**：🟡 **生态差距**（MCP 方向正确，但需要时间积累）

### 3.5 渠道部署（差异化差距）

**现状**：仅 Web chat（Socket.IO）。

**问题**：
- 无法部署到 Discord/Telegram/飞书/微信/钉钉
- 企业客户需要内部 IM 集成

**行业标准**：
- Coze: 10+ 渠道一键部署
- Dify: API + 嵌入
- Botpress: Omni-channel

**差距等级**：🟡 **差异化差距**

---

## 四、架构师视角：方向建议

### 4.1 核心判断

> **我们是"表单平台 + AI"，不是"AI 平台 + 表单"。**

这是我们的**差异化定位**。Dify/n8n/Coze 是通用 AI 平台，我们是**垂直场景平台**（表单/流程/数据 + AI）。

这意味着：
- 不需要和 Dify 比通用 AI 能力
- 需要在"表单/流程场景 + AI"上做到极致
- 需要让 AI 理解表单结构、流程语义、业务数据

### 4.2 架构演进路线

#### Phase 1：执行引擎升级（最高优先）

**目标**：从 fire-and-forget 到持久化可靠执行。

**方案**：
```
当前：  Koa → executeAgentWorkflow() → .catch()
目标：  Koa → BullMQ Queue → Worker 进程 → MongoDB 状态
```

**实现**：
1. 引入 BullMQ（Redis-backed 任务队列）
2. `startAgentWorkflowExecution()` 改为：写 MongoDB 状态 + 推 BullMQ 任务
3. Worker 进程消费任务，执行 `executeAgentWorkflow()`
4. 执行状态实时写 MongoDB（已有）
5. 失败自动重试（可配置次数 + 指数退避）
6. 死信队列（超过重试次数 → 人工介入）

**收益**：
- 进程崩溃不丢执行
- 自动重试（LLM 超时/网络抖动）
- 并发控制（Worker 数 = 并发上限）
- 水平扩展（多 Worker 实例）

**工期**：5-7d

#### Phase 2：可观测性升级

**目标**：从 MongoDB telemetry 到 OpenTelemetry 全链路追踪。

**方案**：
1. 引入 OpenTelemetry SDK
2. 每个节点执行创建 span（nodeId + nodeType + duration + tokenUsage）
3. LLM 调用创建子 span（model + prompt tokens + completion tokens + latency）
4. 导出到 Jaeger/Grafana（可视化）+ 保留 MongoDB 查询（兼容现有监控）
5. Cost allocation：按 userId/workflowId 聚合 token 消耗

**收益**：
- 全链路可视化（哪个节点慢、哪个 LLM 调用贵）
- 实时告警（Grafana alerting）
- 成本归因（哪个用户/工作流消耗最多 token）

**工期**：3-5d

#### Phase 3：向量存储可选升级

**目标**：MongoDB cosine 保持默认，可选接入 Qdrant。

**方案**：
1. 抽象 `VectorStore` 接口（search/index/delete）
2. 默认实现：MongoDB cosine（当前逻辑）
3. 可选实现：Qdrant client（ANN 索引，百万级）
4. 通过环境变量切换 `VECTOR_STORE=mongodb|qdrant`

**收益**：
- 小规模用户零依赖（MongoDB 即可）
- 大规模用户可选 Qdrant 获得 10-100x 性能提升

**工期**：3-4d

#### Phase 4：渠道部署

**目标**：workflow 可部署到多个渠道（Web/飞书/钉钉/企业微信）。

**方案**：
1. 抽象 `ChannelAdapter` 接口（sendMessage/receiveMessage）
2. 实现 WebChannel（已有 Socket.IO）
3. 实现 FeishuChannel（飞书机器人 API）
4. 实现 DingTalkChannel（钉钉机器人 API）
5. workflow 发布时选择部署渠道

**收益**：
- 企业客户内部 IM 直接用
- 一个 workflow 多渠道部署

**工期**：每个渠道 3-5d

#### Phase 5：集成生态

**目标**：MCP 生态 + 预置连接器。

**方案**：
1. MCP 方向已正确，继续深化
2. 预置 10 个高频 MCP server（GitHub/Slack/Google Sheets/Notion/飞书文档/钉钉/企业微信/数据库/HTTP/文件系统）
3. 连接器 OAuth 授权流（用户授权后自动获取 token）
4. 连接器市场（社区贡献）

**收益**：
- 用户开箱即用，不用自己写 MCP server
- 社区生态增长

**工期**：每个连接器 2-3d

### 4.3 架构原则

| 原则 | 说明 |
|---|---|
| **模块化单体 → 按需拆分** | 不急于微服务。当 AI 模块需要独立扩缩容时再拆 |
| **事件驱动** | 执行引擎改为队列驱动，为未来事件溯源打基础 |
| **插件优先** | 节点/工具/触发器/渠道都是插件，核心是调度引擎 |
| **可观测原生** | 每个操作都有 span，每个成本都有归因 |
| **渐进增强** | MongoDB 默认，Redis/Qdrant 可选，不强制依赖 |
| **垂直深耕** | 不追求通用 AI 平台，在"表单/流程+AI"场景做到极致 |

### 4.4 不做的事

| 不做 | 原因 |
|---|---|
| 微服务拆分 | 当前规模不需要，增加运维复杂度 |
| 自建向量库 | 用 Qdrant/Milvus，不造轮子 |
| 通用 AI 平台 | Dify/n8n 已经做得很好，我们垂直场景差异化 |
| 自建 LLM | 调用现有 Provider，专注应用层 |
| 移动端原生应用 | Web + 渠道部署足够 |

---

## 五、与已有能力的衔接

### 5.1 已有优势（保持并深化）

| 优势 | 如何深化 |
|---|---|
| 25 种节点（行业最多） | 继续深耕垂直场景节点（表单生成/数据校验/审批流） |
| agent-team（独有） | 强化 supervisor 策略，支持更多协作模式 |
| Schema 语义理解 | AI 理解表单结构 → 智能填充/校验/生成 |
| 流程 + AI 融合 | BPMN 流程节点内嵌 AI 决策 |

### 5.2 已有债务（按优先级偿还）

| 债务 | 优先级 | 方案 |
|---|---|---|
| executor 2435 行 | 高 | 按节点类型拆分到独立文件 |
| 内联类型重复 | 中 | executor data 类型统一用 shared |
| 无重试机制 | 高 | Phase 1 解决 |
| 无分布式追踪 | 中 | Phase 2 解决 |

---

## 六、总结

### 一句话定位
> **表单/流程垂直场景的 AI 应用平台**，不是通用 AI 开发平台。

### 三件最重要的事
1. **执行引擎可靠化**（BullMQ 队列 + Worker + 重试）—— 生产可用的基础
2. **可观测性升级**（OpenTelemetry + 成本归因）—— 企业客户信任的基础
3. **垂直场景深耕**（表单 AI + 流程 AI + 业务模板）—— 差异化竞争的基础

### 与 Dify/n8n 的关系
- **不做** Dify 的通用 AI 应用平台
- **不做** n8n 的通用自动化平台
- **做** "表单/流程 + AI" 场景的最佳选择
- **借鉴** Dify 的 RAG 质量、n8n 的执行引擎、LangGraph 的图原语
