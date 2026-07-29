# 插件路线图（已迁移）

> 路线图内容已合并进独立插件文档，避免多份文档漂移。

| 内容 | 文档 |
|------|------|
| 已完成能力、生产清单、代码入口 | [plugin.md](./plugin.md) |
| 待办、进度、实现思路 | [plugin.md §八](./plugin.md#八待完成项与实现思路) · [product/backlog.md](./product/backlog.md) |
| Workflow Open API（Phase 2–5） | [design/workflow-open-api.md](./design/workflow-open-api.md) |
| 五项迭代（含 Skills 上架） | [product/ai-five-phase-iteration.md](./product/ai-five-phase-iteration.md) |

**CLI 速查**（`server/` 目录）：

```bash
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")
```
