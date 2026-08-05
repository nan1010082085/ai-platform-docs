# AI 平台迭代计划：功能补全 + 监控接入

> 日期：2026-07-23
> 依据：产品审查（对标 Dify/FastGPT/n8n）+ 现有 14 模块审查
> 目标：按批次实施，每阶段接入监控（telemetry + metrics + dashboard）

---

## 一、产品审查结论

### 已完成模块（14 个）
Chat / Workflow 设计器 / Workflow 调试 / 执行详情 / RAG 知识库 / 模型管理 / 嵌入设置 / 插件中心 / 插件市场 / 监控面板 / API Key / 路由调试 / 执行列表 / 登录认证

### 核心差距（对标 Dify/FastGPT/n8n）

| 类别 | 功能 | 优先级 | 工期 |
|---|---|---|---|
| **Workflow** | 代码节点（JS 执行） | P0 | 3d |
| **Workflow** | 变量赋值节点 | P0 | 1d |
| **Workflow** | 多路条件分支（if 节点扩展） | P1 | 2d |
| **Workflow** | 工作流导入导出（JSON DSL） | P1 | 2d |
| **Chat** | 对话分享链接 | P1 | 2d |
| **Chat** | Prompt 模板库 | P1 | 2d |
| **Chat** | 上下文轮数可配置 | P2 | 0.5d |
| **平台** | OpenAPI 文档自动生成 | P2 | 1d |
| **监控** | 每阶段 feature telemetry | P0 | 贯穿 |

---

## 二、批次计划

### 批次 1（P0：Workflow 节点补全 + 基础监控）
| 任务 | 产出 | 监控 |
|---|---|---|
| 代码节点 | `code-execute` 节点 + 面板 + 执行器 | `workflow_node_execute` telemetry |
| 变量赋值节点 | `variable-set` 节点 + 面板 + 执行器 | 同上 |
| 节点执行 metrics | 每个节点记录耗时/成功/失败 | `workflow_node_metric` event |

### 批次 2（P1：Workflow 增强 + Chat 功能）
| 任务 | 产出 | 监控 |
|---|---|---|
| 多路条件分支 | if 节点扩展为 switch-case | `workflow_branch_taken` event |
| 工作流导入导出 | JSON DSL export/import API + UI | `workflow_import` / `workflow_export` telemetry |
| 对话分享链接 | 生成公开链接 + 只读展示页 | `conversation_share` telemetry |
| Prompt 模板库 | CRUD API + 模板选择 UI | `prompt_template_use` event |

### 批次 3（P2：平台完善 + 监控深化）
| 任务 | 产出 | 监控 |
|---|---|---|
| 上下文轮数可配置 | chatSettings 加 maxHistoryTurns | `chat_config_change` event |
| OpenAPI 文档自动生成 | extract-routes 集成到 build | — |
| 监控面板增强 | 按节点类型的耗时分布图 | dashboard update |

---

## 三、监控架构

### 事件类型

```
workflow_node_execute  { workflowId, nodeType, durationMs, success, error? }
workflow_branch_taken  { workflowId, nodeId, branch }
workflow_import        { workflowId, source }
workflow_export        { workflowId, format }
conversation_share     { conversationId }
prompt_template_use    { templateId, agent }
chat_config_change     { key, oldValue, newValue }
```

### 接入方式
- 每个新功能在关键路径调 `trackAi(event, data)`
- 节点执行在 executor 里记录 metrics（复用现有 pluginMetric 体系）
- 监控面板已有 AgentMetricStats/PluginMetricStats，扩展节点级别统计
