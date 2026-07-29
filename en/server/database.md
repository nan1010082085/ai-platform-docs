# Database Configuration

## Connection

MongoDB 8, connected via Mongoose ODM.

The connection string is controlled by the `MONGODB_URI` environment variable:

| Environment | Connection |
|------|----------|
| Local dev | `mongodb://localhost:27017/schema-form` |
| Production | specified by the `MONGODB_URI` env var |

**Note**: configure the actual connection string in `.env`; do not hardcode it. See `.env.example`.

## Docker Local Dev

```bash
pnpm db:up      # Start MongoDB 8 container
pnpm db:down    # Stop
pnpm db:seed    # Seed data (users/roles/permissions/menus/templates/sample forms)
pnpm db:migrate-id  # Data migration: UUID _id -> ObjectId
```

Docker Compose config: `deploy/docker-compose.yml`

## Seed Data

`pnpm db:seed` runs `scripts/seed.ts`:

1. Create permissions (50+ permission codes)
2. Create roles (admin / flow_designer / flow_approver)
3. Create users (admin / zhangsan / lisi / wangwu / zhaoliu)
4. Create SSO clients
5. Create model configs (DeepSeek / GPT / Claude)
6. Create built-in templates (7: 4 forms + 3 tables)
7. Create sample forms
8. Create micro-apps (shell / admin / editor)
9. Create sample menus (home / system management / form designer / flow designer / AI app)

Built-in templates are force-updated on every startup (delete old data, re-insert).

## Data Migration

Migration scripts are in the `scripts/` directory:

| Script | Purpose |
|------|------|
| `scripts/migrate-to-objectid.ts` | Convert all UUID string `_id` to MongoDB ObjectId |
| `scripts/migrate-flow-roles.ts` | Flow role data migration |

## Primary Key

All models use MongoDB native ObjectId as the `_id` primary key. Mongoose `toJSON` auto-converts `_id` to a string `id` field and removes `_id` and `__v`.

## Multi-tenancy

Implemented via the `tenantPlugin` Mongoose plugin, which auto-injects a `tenantId` filter into queries.
