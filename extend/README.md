# docs/extend/ — 扩展能力文档索引

> 平台扩展能力的规范、指南与 RFC 文档。面向需要二次开发、编写插件或集成自定义模型的开发者。

---

## 文档清单

| 文档 | 说明 | 关联 Phase | 日期 |
|------|------|-----------|------|
| [skill-author-guide.md](/extend/skill-author-guide) | Skill 作者手册：定义、打包、分发、最佳实践 | F.2 #3 | 2026-07-08 |
| [workflow-template-rfc.md](/extend/workflow-template-rfc) | Workflow 模板注册机制 RFC：插件 pack 带模板、运行时注册、迁移策略 | F.2 #7 | 2026-07-08 |
| [workflow-variables.md](/extend/workflow-variables) | Workflow LLM 节点变量文档：`$input`、`$node`、`$json`、`$conversation` 解析规则 | F.2 #6 | 2026-07-08 |
| [custom-models.md](/extend/custom-models) | 自定义模型接入指南：Ollama、vLLM、DeepSeek 私有网关配置 | G-6 | 2026-07-08 |

---

## 关联文档

| 文档 | 位置 | 说明 |
|------|------|------|
| Registry 消费链调研 | [docs/product/f-1-registry-survey.md](/product/f-1-registry-survey) | Expert/Skill/Tool/MCP 四层消费链走读 |
| Prompt 四层架构 | [docs/product/f-p-prompt-architecture.md](/product/f-p-prompt-architecture) | promptBuilder / Expert / Skill / Workflow 节点关系 |
| Plugin Center 写能力评估 | [docs/product/plugin-write-eval.md](/product/plugin-write-eval) | PUT API 安全评估与限制方案 |
| BYOK 归属模型 | [docs/design/model-architecture.md](/design/model-architecture) | 用户级/租户级/平台级三层 BYOK 设计 |
| 插件中心架构 | [ai/docs/plugin.md](/plugin) | 插件体系总览 |
| Expert 扩展指南 | [ai/docs/expert-extension-guide.md](/expert-extension-guide) | Expert 声明与扩展 |
| MCP 接入指南 | [ai/docs/mcp.md](/mcp) | MCP Server 接入与 transport |
| Skill 组装规范 | [ai/docs/skill-assembly-spec.md](/skill-assembly-spec) | Skill 拼装技术规范 |

---

**最后更新**：2026-07-08
