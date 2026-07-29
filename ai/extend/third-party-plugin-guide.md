# 第三方插件开发指南

> Expert / Skill / Tool / MCP 扩展入口。配套脚手架见仓库 `ai/docs/extend/plugin-scaffold/`。

## 一、插件类型

| 类型 | 用途 | 配置位置 |
|------|------|----------|
| Expert | 领域专家（系统提示、工具白名单、动态 Prompt） | 插件中心 → Experts |
| Skill | 可复用能力片段，被 Expert 引用 | 插件中心 → Skills |
| Tool | 可调用函数（本地或 MCP） | 插件中心 → Tools |
| MCP | 外部 Model Context Protocol 服务 | 插件中心 → MCP |

## 二、最小 Expert 示例

```json
{
  "id": "my-expert",
  "name": "我的专家",
  "description": "示例专家",
  "systemPrompt": "你是一个专注于 XXX 的助手。",
  "tools": ["rag__search"],
  "enabled": true
}
```

通过插件中心「导入」或热重载目录加载。启用后可在对话 Agent 选择器中出现。

## 三、Tool 命名规范

工具名遵循 MCP 规范：`{domain}__{action}`（双下划线）。

权威定义与显示名：`shared/platform-shared/ai/toolNames.ts`（`@schema-platform/platform-shared/ai/toolNames`）。

新增工具时：

1. 在服务端注册执行器
2. 在 `toolNames.ts` 增加常量与显示标签
3. 在 Expert / Skill 白名单中引用

## 四、Skill 组装

Skill 可声明依赖的 Tools 与 Prompt 片段，由 Expert 组装。详见 [skill-assembly-spec.md](../extend/skill-assembly-spec.md)。

## 五、MCP 接入

1. 插件中心添加 MCP Server（URL / transport）
2. 连通性测试通过后，工具列表自动同步
3. Expert 勾选需要的 MCP 工具

## 六、安全要求

- 外部插件包必须声明权限（tools / network / filesystem）
- 来源校验：仅允许信任源或审核白名单（见开放平台路线图）
- 禁止在插件中硬编码租户密钥；使用运行时注入的凭证

## 七、本地验证清单

- [ ] `pnpm test` 在 `ai/app` 通过
- [ ] 插件中心可启用/禁用
- [ ] 对话中能调用新工具并看到事件流
- [ ] 工作流 Tool 节点可选到新工具名

## 八、脚手架

```bash
# 从示例复制
cp -R ai/docs/extend/plugin-scaffold my-plugin
cd my-plugin
# 按 README 填写 expert.json / tools，再导入插件中心
```
