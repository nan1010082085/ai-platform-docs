# 插件注册表

插件中心的**注册表**机制，管理专家 / 技能 / 工具 / MCP 四类插件的发现、加载与热重载。

## 架构

```
┌─────────────────────────────────────────────────┐
│                 插件注册表                  │
├──────────┬──────────┬──────────┬─────────────────┤
│   专家   │   技能   │   工具   │   MCP Server    │
├──────────┴──────────┴──────────┴─────────────────┤
│              Plugin Loader (热重载)               │
├─────────────────────────────────────────────────┤
│         server/config/plugins/ (配置目录)         │
└─────────────────────────────────────────────────┘
```

## 四类插件

| 类型 | 说明 | 配置方式 |
|------|------|----------|
| **专家** | 专家人设、系统提示词、工具绑定 | `expert.json` |
| **技能** | 可复用技能片段、多步编排 | `skill.json` |
| **工具** | 工具函数、API 调用 | `tool.json` |
| **MCP Server** | Model Context Protocol 服务 | `mcp.json` |

## 注册流程

1. **声明**：在 `server/config/plugins/` 下创建配置文件
2. **加载**：服务启动时 Plugin Loader 扫描并注册
3. **热重载**：发送 HUP 信号（`kill -HUP <pid>`）触发热重载
4. **API 暴露**：`GET /api/ai/plugins` 返回完整注册表快照

## API

```http
GET /api/ai/plugins
Authorization: Bearer <jwt>

# 响应
{
  "experts": [...],
  "skills": [...],
  "tools": [...],
  "mcpServers": [...]
}
```

## CLI

```bash
# 验证插件配置
pnpm plugin:validate

# 打包插件
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz

# 安装插件
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]

# 热重载
kill -HUP $(pgrep -f "dist/index.js")
```

## 相关文档

| 文档 | 说明 |
|------|------|
| [插件中心总览](./plugin.md) | 架构、配置、生产清单、运行时、CLI |
| [技能拼装规范](./extend/skill-assembly-spec) | 技能组装技术规范 |
| [打包规范 v1](./extend/pack-spec-v1) | 插件打包规范 |
| [第三方插件指南](./extend/third-party-plugin-guide) | 外部开发者接入 |
| [MCP 协议](./mcp) | Model Context Protocol Server 接入 |
| [工作流开放 API](./design/workflow-open-api) | 工作流对外开放 API |
