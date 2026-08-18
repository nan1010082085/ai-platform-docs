# 插件中心（Server）

> 服务端视角的插件中心实现，管理 Expert / Skill / Tool / MCP 四类插件的加载、注册与热重载。

## 架构

```
server/
├── src/
│   ├── services/
│   │   └── pluginService.ts    # 插件加载、注册、热重载
│   └── routes/
│       └── ai.ts               # /api/ai/plugins 端点
├── config/
│   └── plugins/                # 插件配置目录
│       ├── experts/            # Expert 配置
│       ├── skills/             # Skill 配置
│       ├── tools/              # Tool 配置
│       ├── mcp/                # MCP Server 配置
│       └── packs/              # 打包后的插件
└── scripts/
    ├── plugin-validate.ts      # 插件验证脚本
    └── plugin-pack.ts          # 插件打包脚本
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai/plugins` | 返回插件注册表快照 |
| POST | `/api/ai/plugins/install` | 安装插件包 |
| DELETE | `/api/ai/plugins/:id` | 卸载插件 |

### GET /api/ai/plugins

```http
GET /api/ai/plugins
Authorization: Bearer <jwt>

# 响应
{
  "experts": [
    {
      "id": "form-expert",
      "name": "表单专家",
      "description": "表单设计与配置专家",
      "systemPrompt": "...",
      "tools": ["schema-create", "widget-add"]
    }
  ],
  "skills": [...],
  "tools": [...],
  "mcpServers": [...]
}
```

## 配置目录

```
server/config/plugins/
├── experts/
│   ├── form-expert.json
│   └── flow-expert.json
├── skills/
│   ├── schema-generate.json
│   └── template-apply.json
├── tools/
│   ├── schema-create.json
│   └── widget-add.json
├── mcp/
│   └── context7.json
└── packs/
    └── example.support.tgz
```

## CLI 命令

```bash
# 验证插件配置
pnpm plugin:validate

# 打包插件
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz

# 安装插件
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]

# 热重载（发送 HUP 信号）
kill -HUP $(pgrep -f "dist/index.js")
```

## 热重载机制

1. 修改 `server/config/plugins/` 下的配置文件
2. 发送 HUP 信号：`kill -HUP $(pgrep -f "dist/index.js")`
3. Plugin Loader 重新扫描配置目录
4. 增量更新注册表（添加/修改/删除）
5. WebSocket 通知前端刷新插件列表

## 相关文档

| 文档 | 说明 |
|------|------|
| [AI 插件中心总览](/ai/plugin) | 架构、配置、生产清单、运行时 |
| [插件 Registry](/ai/plugin-registry) | 注册表机制、四类插件 |
| [API 详细文档](./api-reference) | 全部 230+ 端点详细说明 |
| [部署与运维](./deployment) | 打包、PM2、nginx、配置目录 |
