# 扩展开发

平台扩展能力的规范、指南与 RFC 文档。面向需要二次开发、编写插件或集成自定义模型的开发者。

## 文档清单

| 文档 | 说明 |
|------|------|
| [自定义模型](./custom-models) | 自定义模型接入指南：Ollama、vLLM、DeepSeek 私有网关配置 |
| [Skill 作者手册](./skill-author-guide) | Skill 作者手册：定义、打包、分发、最佳实践 |
| [Workflow 模板 RFC](./workflow-template-rfc) | Workflow 模板注册机制 RFC：插件 pack 带模板、运行时注册、迁移策略 |
| [Workflow 集成指南](./workflow-integration) | Workflow Open API 集成指南：触发 / 轮询 / 回调 / 错误码 / 代码示例 |
| [Workflow 变量](./workflow-variables) | Workflow LLM 节点变量文档：`$input`、`$node`、`$json`、`$conversation` 解析规则 |

## 相关文档

| 文档 | 说明 |
|------|------|
| [模型架构](/design/model-architecture) | 用户级 / 租户级 / 平台级三层 BYOK 设计 |
| [插件中心](/ai/plugin) | 插件体系总览 |
| [Expert 扩展指南](/ai/expert-extension-guide) | Expert 声明与扩展 |
| [MCP 协议](/ai/mcp) | MCP Server 接入与 transport |
| [Skill 组装规范](/ai/extend/skill-assembly-spec) | Skill 拼装技术规范 |
