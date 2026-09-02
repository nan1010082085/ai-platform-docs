# Backend Service Documentation

> Provides API interfaces, data storage, and business logic for the platform

## Quick Start

### Start Development

```bash
# Start MongoDB
pnpm db:up

# Start backend service
pnpm dev

# Import seed data (optional)
pnpm db:seed
```

Service starts at `http://localhost:3001`

### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file, at least set:

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=<random-string>
DEEPSEEK_API_KEY=<your-api-key>
```

## Core Features

### API Interfaces

**Schema Management**
- Get Schema list (pagination, search, filter)
- Create, update, delete Schema
- Publish Schema versions
- Get published versions

**User Authentication**
- User login/logout
- Get current user info

**Data Management**
- Business data CRUD
- Data query and filtering

**System**
- Health check
- API documentation
- Mock data generation

### Data Storage

- **MongoDB** — Main database
- **Redis** — Optional, for queues and caching

### Business Logic

- **Process Engine** — BPMN process execution
- **AI Service** — Agent conversation, workflow execution
- **File Processing** — PDF, Word, Excel parsing
- **Real-time Communication** — WebSocket message push

## Documentation Directory

- [Capabilities](./capabilities.md) — Implemented feature matrix, tech stack, architecture highlights
- [API Reference](./api-reference.md) — All 230+ endpoints with request/response examples
- [API Overview](./api.md) — REST API endpoint overview
- [Data Models](./models.md) — Mongoose model definitions
- [Database](./database.md) — MongoDB connection and configuration

## API Quick Reference

### Schema Management

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/schemas | Get Schema list |
| POST | /api/schemas | Create Schema |
| GET | /api/schemas/:id | Get Schema details |
| PUT | /api/schemas/:id | Update Schema |
| DELETE | /api/schemas/:id | Delete Schema |
| POST | /api/schemas/:id/publish | Publish Schema |

### User Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| GET | /api/auth/me | Get current user |

### Data Management

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/data/list | Data list |
| GET | /api/data/:id | Data details |

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/docs | API documentation |
| GET | /api/mock/:schemaId | Mock data |

## Data Models

### FormSchema

Form Schema definition:

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Primary key |
| name | String | Name |
| type | String | Type (form/search_list) |
| status | String | Status (draft/published) |
| json | Mixed | Schema structure |
| publishId | String | Published version ID |
| createdAt | Date | Creation time |
| updatedAt | Date | Update time |

### PublishedSchema

Published Schema version snapshot.

### User

User account (JWT authentication).

## Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | JWT signing secret |
| DEEPSEEK_API_KEY | DeepSeek API key |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | Runtime environment |
| PORT | 3001 | Service port |
| CORS_ORIGINS | * | Allowed CORS origins |
| REDIS_URL | redis://localhost:6379 | Redis address |

## Common Commands

```bash
pnpm dev              # Start dev server (hot reload)
pnpm build            # Compile TypeScript
pnpm test             # Run tests
pnpm db:up            # Start MongoDB container
pnpm db:down          # Stop MongoDB container
pnpm db:seed          # Import seed data
pnpm db:migrate-id    # Data migration (UUID → ObjectId)
```

## Health Check

Visit `http://localhost:3001/api/health` to check service status.

Response example:

```json
{
  "status": "ok",
  "timestamp": "2026-09-02T12:00:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected"
  }
}
```

## FAQ

**Q: How to connect to remote MongoDB?**
A: Modify `MONGODB_URI` in `.env` to the remote address.

**Q: How to view API documentation?**
A: Visit `http://localhost:3001/api/docs` or use the API documentation platform.

**Q: How to reset database?**
A: Run `pnpm db:down` to stop container, delete data volume, then `pnpm db:up` to restart.

**Q: Service fails to start, what should I do?**
A: Check if MongoDB is running and environment variables are configured correctly.

**Q: How to add new API endpoints?**
A: Refer to [API Reference](./api-reference.md) for endpoint specifications.

## Related Links

- [Server README](../../../server/README.md) — User guide
- [API Documentation Platform](../../../api-docs/README.md) — Online API docs
- [Deployment Guide](../../deploy/README.md) — Production deployment
