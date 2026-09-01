# 中文术语对照

> 中文文档面向读者展示时统一用下表中文名；URL 路径、代码标识、类名、API 字段保持英文原样。

## 产品与能力

| 英文 | 中文 | 说明 |
|------|------|------|
| Agent | 智能体 | 对话 / 执行主体 |
| Agent Workflow | 智能体工作流 | 可视化 DAG 编排系统 |
| Chat | 对话 | 产品界面语境；引擎名仍可写 Chat LangGraph |
| Workflow | 工作流 | |
| Runtime | 运行时 | |
| Registry | 注册表 | 插件发现、加载与热重载中心 |
| Plugin Registry | 插件注册表 | |
| Skill | 技能 | |
| Expert | 专家 | |
| Tool | 工具 | |
| Pack Spec | 打包规范 | 插件包结构与 manifest |
| Widget | 控件 | 表单设计器组件单元 |
| Store | 状态库 | Pinia 等前端状态 |
| App / AI App | 应用 / AI 应用 | 前端应用 |

## 协议与技术专名（可保留英文）

以下为业界通用缩写或第三方产品名，正文可保留英文，首次出现可附中文说明：

RAG、MCP、LLM、API、SDK、DAG、JWT、HITL、Webhook、LangGraph、BullMQ、Vue Flow、qiankun

## 写法约定

1. **侧栏 / 标题 / 表格「能力」列**：优先中文（如「智能体工作流」「插件注册表」「专家 / 技能 / 工具」）
2. **代码、路径、命令、JSON 字段**：保持英文（如 `expert.json`、`skills[]`、`PluginRegistry`、`resolveExpertPrompt`）
3. **双引擎对比**：可写「对话 LangGraph」与「智能体工作流 DAG」，避免侧栏/标题继续写未翻译的 Agent Workflow
4. **英文站**（`/en/`）：全部保持英文，不套用本表

## 示例

| 场景 | 推荐写法 |
|------|----------|
| 侧栏 | 智能体工作流、插件注册表、专家扩展 |
| 正文介绍 | 「插件中心管理专家 / 技能 / 工具 / MCP 四层能力」 |
| 代码引用 | `expert.json`、`skills[]`、`resolveExpertPrompt` |
| 引擎对比 | Chat LangGraph 与智能体工作流双引擎 |
