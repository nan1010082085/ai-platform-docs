# AI 项目深耕分析

> 2026-07-29 · 基于 AI agent 平台行业对标的深耕分析与优先级规划
> 内部开发文档，不发布到站点（随 `ai/product/**` 排除）
> 对标项目认知截至知识截止，非实时检索；需精确对比请补充竞品版本/URL

---

## 一、行业全景：AI Agent 平台梯队

| 梯队 | 项目 | 定位 | 核心优势 | 短板 |
|---|---|---|---|---|
| LLMOps 平台 | **Dify** | 开源 LLMOps 全家桶 | workflow 可视化、RAG 质量、评测、企业级 | 垂直场景弱 |
| 闭源平台 | **Coze**（字节） | Agent + 插件生态 | 插件市场、多渠道部署、UI | 闭源 |
| 自动化 | **n8n** | 工作流自动化 + AI | 400+ 集成节点、社区 | AI 原生弱 |
| 可视化 LLM | **Flowise / LangFlow** | 可视化 LangChain | 灵活、低门槛 | 生产化弱 |
| 知识库 | **FastGPT** | RAG + workflow | RAG 深度 | 编排弱 |
| 框架 | **LangGraph / AutoGen / CrewAI** | 多 agent 框架 | 协作能力 | 无平台/UI |

---

## 二、ai 项目差异化优势（要守住）

1. **垂直场景一体化**--表单/流程 + AI 是 Dify/Coze 都不做的。editor + flow + ai 共享 JWT（`platform-shared/authSession`），三能力一体是唯一性。
2. **双引擎**--Chat LangGraph（多专家 StateGraph）+ Agent Workflow DAG。Dify 是 workflow + chat 分离，ai 的 Chat 是图式多专家协作（router -> requirementAnalyzer -> taskPlanner -> pluginExpert），更灵活。
3. **pluginExpert 统一专家 + Registry**--Expert/Skill/Tool/MCP 四层，比 Coze 插件更结构化。Skill 拼装规范（`resolveExpertPrompt.ts`，顺序/分隔符/冲突处理）是亮点。
4. **32 行业模板 + 表单/流程节点**--垂直场景深度，通用平台没有。模板覆盖 10 分类（HR/财务/运营/客服/法务等）。
5. **多智能体 + 长程记忆**--memory 节点 + handoff + parallel + Agentic RAG（2026-07-27 落地）。

---

## 三、与头部差距（要补的）

| 维度 | Dify/Coze 现状 | ai 现状 | 差距 |
|---|---|---|---|
| **RAG 质量** | 分块策略丰富、多路召回、rerank 调优、文档预处理 | BGE-M3 + rerank + 关键词降级 | 分块/预处理深度不足 |
| **评测体系** | 完整（数据集/运行/版本对比/LLM-as-judge） | 框架就绪，coverage 未达 70% | 评测是 Dify 护城河 |
| **工作流节点** | n8n 400+ 集成；Dify 工具丰富 | 19 节点（垂直够，集成少） | HTTP/DB/消息/文件类集成节点缺 |
| **渠道部署** | Coze 飞书/钉钉/微信/Discord | ChannelAdapter 抽象有，渠道少 | 渠道落地不足 |
| **插件市场** | Coze/Dify 成熟市场 + SDK | 插件中心有，市场未开 | 生态未启动 |
| **可观测** | token/成本/trace/链路 | AiMonitorView 后端有，前端监控弱 | 体验监控缺 |
| **工作流调试** | 断点/单步/变量检视/回放 | 有调试界面，深度待补 | 调试能力浅 |

---

## 四、深耕优先级

### P0（护城河补强）

**1. RAG 质量深化** - 对标 Dify 最强项
- 分块策略：递归分块 / 语义分块 / 标题感知分块
- 混合检索：dense + sparse 分数融合（BGE-M3 原生支持 sparse，需启用 FlagEmbedding）
- Rerank 调参面板：可视化调 top-k / minScore / 权重
- 文档预处理：表格结构化、图片 OCR + 描述、PDF 结构化
- 检索调试三路对比视图（已有，需深化）

**2. 评测体系落地** - 达到 Dify 水平
- 数据集管理（导入/标注/版本）
- 评测运行（workflow 批量执行 + 评判）
- 版本对比（通过率/耗时/token/LLM 评分）
- LLM-as-judge 评分
- memory 显示已配未达标，补到可用

### P1（生态与集成）

**3. 工作流集成节点** - 对标 n8n 集成广度
- DB Query（MySQL/MongoDB/PostgreSQL）
- 消息推送（飞书/钉钉/邮件/企业微信）
- 文件操作（OSS/S3/本地）
- 定时器增强（Cron 表达式 + 时区）
- HTTP Request 已内置，需补上述

**4. 渠道部署落地** - 对标 Coze
- ChannelAdapter 落地飞书/钉钉/微信至少 3 个
- 一个 workflow 部署到 Web/飞书/钉钉

**5. 工作流调试增强** - 对标 Dify 调试体验
- 断点（节点级暂停）
- 单步执行
- 变量检视（RuntimeContext 实时查看）
- 执行回放
- 节点级 mock（跳过 LLM 调用，用预设输出）

### P2（规模化）

**6. 插件市场 + SDK**
- 插件打包（pack-spec-v1 已有）+ 市场 UI
- 第三方 SDK + 签名审核
- 插件版本管理

**7. 可观测闭环**
- 前端体验监控（错误/性能上报）
- token/成本看板（按租户/工作流/Agent）
- 链路 trace（LangGraph 节点级耗时）

---

## 五、与 editor 协同深耕点（最大差异化）

ai + editor 一体是最大护城河，协同深耕：

1. **AI 生成 -> editor 可视化编辑闭环**：ai 生成 Schema/Flow，editor 接手精修。目前有 Sidebar，链路可更深（版本 diff、局部编辑、AI 辅助布局）。
2. **editor 数据源 -> ai RAG 自动索引**：editor 的 Schema/数据自动进 ai RAG，反哺 AI 生成质量。
3. **flow 审批 -> ai 审批建议**：RuntimeAgent 在审批节点给建议，editor 表单 + flow 审批 + ai 建议一体。
4. **统一评测**：editor 表单质量 + ai 生成质量统一评测体系。

---

## 六、最高杠杆切入建议

- **RAG 质量深化**：对标 Dify 最强项，直接决定 AI 口碑
- **评测体系落地**：Dify 护城河，开源竞争必备

---

## 七、相关文档

- [architecture.md](../architecture.md) - 双引擎架构
- [platform.md](../platform.md) - 三能力一体定位
- [rag-architecture.md](../rag-architecture.md) - RAG 现状
- [agent-workflow.md](../agent-workflow.md) - 工作流节点
- [product/ai-five-phase-iteration.md](./ai-five-phase-iteration.md) - 历史迭代
- [product/open-platform-roadmap.md](./open-platform-roadmap.md) - 开放平台路线
