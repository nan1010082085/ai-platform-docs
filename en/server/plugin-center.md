# Plugin Center (Server)

> Server-side index page. For details see the AI docs.

| Topic | Doc |
|------|------|
| Architecture, production checklist, CLI, todos & implementation | [Plugin Center](/ai/plugin) |
| Unfinished task progress | [Backlog](/ai/product/backlog) (internal) |
| Local config directory | `config/plugins/README.md` |

**API**: `GET /api/ai/plugins` - returns a `{ experts, skills, tools, mcpServers }` snapshot (see [api-reference.md](./api-reference.md)).

**CLI** (in the `server/` directory):

```bash
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")
```
