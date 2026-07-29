# Server Documentation

`@server` - Koa.js + MongoDB backend service

## Quick Start

```bash
# Start local dev (requires Docker MongoDB)
pnpm db:up
pnpm dev

# Seed data
pnpm db:seed

# Data migration (UUID -> ObjectId)
pnpm db:migrate-id

# Build
pnpm build
```

## Doc Directory

- [Capabilities](./capabilities.md) - implemented feature matrix, tech stack, architecture highlights
- [API Reference](./api-reference.md) - all 230+ endpoints with request/response examples
- [API Overview](./api.md) - REST API endpoint overview
- [Data Models](./models.md) - Mongoose model definitions
- [Database](./database.md) - MongoDB connection and configuration
