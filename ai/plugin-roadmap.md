# 插件路线图（已迁移）

> 路线图内容已合并进独立插件文档，避免多份文档漂移。历史 Phase 迭代文档已清理。

| 内容 | 文档 |
|------|------|
| 已完成能力、生产清单、代码入口 | [plugin.md](./plugin.md) |
| 待办与进度 | [plugin.md §八](./plugin.md#八待办项) · [product/backlog.md](./product/backlog.md) |
| 工作流开放 API | [design/workflow-open-api.md](./design/workflow-open-api.md) |
| 客户端插件化原则 | `ai/docs/design/plugin-architecture-principles.md` |

**CLI 速查**（`server/` 目录）：

```bash
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")
```
