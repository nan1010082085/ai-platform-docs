# AI 项目深耕分析

> 2026-07-29 · 站在开源肩膀上构建垂直场景独特价值
> 内部开发文档，不发布到站点（随 `ai/product/**` 排除）
> 核心思路：不对标追赶，而是复用/集成开源成果，聚焦"表单/流程 + AI 垂直一体化"这个开源没有的独特价值

---

## 一、核心思路

不是"对标 Dify/Coze 补差距"（追赶者），而是"站在 LangGraph / BGE-M3 / MCP 等开源之上，构建表单/流程 + AI 垂直一体化平台"（建设者）。

**深耕三问**：
1. 哪些直接复用开源（不造轮子）？
2. 哪些集成开源（站在肩膀上）？
3. 哪些自建（独特价值，开源没有）？

Dify/Coze 是通用 LLMOps 平台，不做表单/流程设计器；我们的独特性恰在垂直场景一体化。通用能力（RAG/评测/文档解析）站在开源上，垂直能力（表单/流程节点/行业模板/三能力一体）自建深耕。

---

## 二、已站在其上的开源底座

| 层 | 开源 | 用途 |
|---|---|---|
| Agent 框架 | LangGraph | 多专家 StateGraph + Checkpoint + interrupt |
| Embedding | BGE-M3（SiliconFlow 托管） | RAG 向量化 |
| Rerank | BGE-Reranker | RAG 重排 |
| 工具协议 | MCP | 5 个 MCP Server（schema/flow/widget/rag/industry） |
| 队列 | BullMQ + Redis | 工作流执行引擎 |
| 实时 | Socket.IO | 流式通信 |
| Web | Koa | 后端 |
| DB | MongoDB + Mongoose | 存储 |

---

## 三、可集成的开源（不重复造轮子）

### RAG 质量深化（站在 LlamaIndex / Unstructured / ragas 上）
- **文档解析**：集成 [Unstructured](https://github.com/Unstructured-IO/unstructured) 或 [MinerU](https://github.com/opendatalab/MinerU)（PDF/表格/图片结构化）替代/增强自研 document-parse，不自己写解析器
- **分块策略**：复用 LangChain/LlamaIndex 的 RecursiveCharacterTextSplitter / 语义分块，不自己写
- **混合检索**：BGE-M3 原生支持 sparse，用 FlagEmbedding 启用 dense+sparse 融合，不自己实现
- **评测**：集成 [ragas](https://github.com/explodinggradients/ragas)（RAG 评测）+ [promptfoo](https://github.com/promptfoo/promptfoo)（prompt 评测），不自己写评测框架

### 工作流生态（站在 MCP 生态上）
- **集成节点**：复用社区 MCP Server（数据库/消息/文件类），不自己写 400+ 节点（n8n 模式不可复制，MCP 生态是更轻的路径）
- **工具市场**：站在 MCP 生态上，复用社区工具，自建市场只做垂直专家/模板分发

### Agent 能力（站在 LangGraph 上）
- 多 agent 模式复用 LangGraph（已有 handoff/parallel/memory）
- 不自己写 agent 框架，只做垂直专家编排

---

## 四、自建的核心独特价值（开源没有，要深耕）

这是聚焦点，通用开源平台不做：

1. **垂直场景节点**--表单生成/流程生成/审批分析/合规检查/异常检测，结合 editor/flow 数据
2. **pluginExpert + 四层 Registry**--Expert/Skill/Tool/MCP，垂直专家体系（Skill 拼装规范是独特设计）
3. **32 行业模板**--表单/流程垂直场景模板，覆盖 10 分类
4. **editor + flow + ai 一体化**--三能力共享 JWT（`platform-shared/authSession`），唯一性
5. **Schema-Flow-Widget MCP Server**--专门为表单/流程设计的 MCP 工具，通用平台没有
6. **垂直 RAG**--Schema/Flow 结构化知识库（非通用文档 RAG），结合 editor/flow 元数据

---

## 五、深耕方向：集成开源（省力）+ 放大独特（护城河）

### A. 集成开源（快速拉齐基础能力，不造轮子）

1. **RAG 基础能力**：Unstructured/MinerU 文档解析 + LlamaIndex 分块 + ragas 评测 + FlagEmbedding 混合检索
2. **评测体系**：ragas + promptfoo 集成，不自己写
3. **集成节点**：MCP 社区 Server（DB/消息/文件）

### B. 放大独特（聚焦护城河，开源没有）

1. **垂直场景节点深化**--表单/流程/审批/合规节点更智能（结合 editor Schema 与 flow 节点上下文）
2. **行业模板扩充**--32 -> 更多垂直行业（医疗/金融/教育/制造），每个行业表单+流程+Agent 模板套件
3. **editor + flow + ai 闭环**--AI 生成 -> 可视化编辑 -> 审批执行 -> 数据反哺，三能力一体闭环
4. **垂直 RAG**--Schema/Flow 结构化知识库，索引表单字段语义 + 流程节点模式，反哺 AI 生成质量
5. **pluginExpert 垂直专家体系**--按行业/场景扩充专家，Skill 拼装规范支撑快速组合

---

## 六、与 editor 协同深耕（最大独特价值）

ai + editor + flow 一体是最大护城河，通用平台无法复制：

1. **AI 生成 -> editor 编辑闭环**：ai 生成 Schema/Flow，editor 接手精修，版本 diff/局部编辑/AI 辅助布局
2. **editor 数据源 -> ai 垂直 RAG**：editor 的 Schema/字段语义自动进 ai 垂直 RAG，反哺生成质量
3. **flow 审批 + ai 建议**：RuntimeAgent 在审批节点给建议，表单+审批+AI 一体
4. **统一评测**：表单质量（字段命名/必填/布局）+ AI 生成质量统一评测（站在 ragas 上）

---

## 七、最高杠杆

- **集成开源**：用 Unstructured/ragas/promptfoo 快速拉齐 RAG/评测基础（省力，不造轮子）
- **放大独特**：垂直 RAG（Schema/Flow 结构化知识库）+ 三能力一体闭环（开源没有，护城河）

---

## 八、相关文档

- [architecture.md](../architecture.md) - 双引擎架构
- [platform.md](../platform.md) - 三能力一体定位
- [rag-architecture.md](../rag-architecture.md) - RAG 现状（BGE-M3）
- [agent-workflow.md](../agent-workflow.md) - 工作流节点
- [product/archive/ai-five-phase-iteration.md](./archive/ai-five-phase-iteration.md) - 历史迭代
- [product/open-platform-roadmap.md](./open-platform-roadmap.md) - 开放平台路线
