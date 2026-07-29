# Development Guide

This guide covers dev environment setup, architecture, and contribution best practices.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Dev Environment](#dev-environment)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [FAQ](#faq)

---

## Architecture Overview

Schema Platform AI uses a modular architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Vue 3 SPA)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  AI Chat     │  │  Workflow    │  │  Plugin     │         │
│  │  panel       │  │  designer    │  │  Center     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
          │                    │                  │
          ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Koa.js + MongoDB)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ LangGraph │  │ Workflow │  │   RAG    │  │  Plugin  │   │
│  │  chat     │  │ executor │  │ retrieval│  │ Registry │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Frontend-Backend Communication

- **REST API**: regular requests (CRUD, execution, config)
- **WebSocket** (Socket.IO): streaming chat, real-time execution progress
- **Open API**: external systems call published workflows via API key

---

## Dev Environment

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- MongoDB 8

### Install

```bash
# Shared package
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# Backend
cd server && pnpm install && cd ..

# Frontend
cd ai/app && pnpm install && cd ../..
```

### Start Dev Servers

```bash
# Terminal 1: backend
cd server && pnpm dev

# Terminal 2: frontend
cd ai/app && pnpm dev
```

### Production Build

```bash
cd shared/platform-shared && pnpm build
cd server && npx tsc
cd ai/app && pnpm build
```

---

## Project Structure

```
ai/
├── app/                          @ai-app (Vue 3 frontend)
│   ├── src/
│   │   ├── api/                  API clients (split by domain)
│   │   ├── components/           Vue components
│   │   ├── composables/          composables (useXXX)
│   │   ├── constants/            constants (node definitions, config)
│   │   ├── stores/               Pinia state management
│   │   ├── types/                TypeScript types
│   │   └── views/                page views
│   └── package.json
├── docs/                         docs
└── README.md

server/src/ai/
├── graph/                        LangGraph StateGraph
├── models/                       Mongoose models
├── nodes/                        node executors (split by type)
├── queue/                        BullMQ queue + Worker
├── runtime/                      pure-function runtime
├── services/                     business services
└── routes/                       API routes

shared/platform-shared/
├── ai/                           AI shared types + templates
│   ├── agentWorkflow/            workflow types + template factories
│   └── index.ts
├── components/                   shared Vue components
└── utils/                        shared utilities
```

---

## Coding Standards

### TypeScript

- Strict mode (`strict: true`)
- No `any`; use `unknown` + type guards
- Use `interface` for objects, `type` for unions

### Vue Components

- `<script setup lang="ts">` composition API
- CSS Modules (`*.module.scss`); no global styles
- Components only render; business logic goes into composables or stores

### API Layer

- All API calls aggregated in `src/api/`
- Components/stores must not `fetch()` directly
- Use the `request()` wrapper (auto-injects JWT)

### State Management

- Global state in Pinia stores
- Composable logic in `useXXX` composables
- Deprecate scattered utils

### File Organization

- View files > 300 lines: consider splitting
- Composables > 200 lines: consider splitting
- One responsibility per file

---

## Testing

### Unit Tests

```bash
# Frontend
cd ai/app && pnpm test

# Backend
cd server && pnpm test
```

### Coverage

```bash
cd ai/app && pnpm test:coverage
```

### Type Check

```bash
cd ai/app && pnpm typecheck    # vue-tsc
cd server && npx tsc --noEmit  # tsc
```

---

## Debugging

### Debug Mode

Backend logs to the console; key nodes have `console.log` markers:

```bash
cd server && pnpm dev  # watch [router] [pluginExpert] [afterTools] logs
```

### Hot Reload

- Frontend: Vite HMR (refresh on save)
- Backend: ts-node-dev (restart on save)
- Shared package: needs `pnpm build` after changes; the frontend vite alias picks it up

### Database Inspection

```bash
# Connect to MongoDB
mongosh "mongodb://formgrid:formgrid@localhost:27017/formgrid"

# View collections
show collections
db.conversations.find().limit(5).pretty()
db.agentworkflows.find({status: 'published'}).pretty()
```

---

## Common Tasks

### Add a New Node Type

1. `shared/platform-shared/ai/agentWorkflow/types.ts`: add `AgentNodeType`
2. `shared/platform-shared/ai/agentWorkflow/defaults.ts`: add a `createDefaultNodeData` case
3. `server/src/ai/services/nodes/`: create `xxxNode.ts` executor
4. `server/src/ai/services/agentWorkflowExecutor.ts`: register a dispatch case
5. `ai/app/src/constants/agentNodes.ts`: add a palette entry
6. `ai/app/src/components/agent-workflow/property-panel/panels/`: create a panel component
7. `ai/app/src/composables/useAgentNodePropertyPanel.ts`: register the panel

### Add a New Expert

Create a JSON config in `server/config/plugins/local/`, or add via the Plugin Center UI.

### Add a New Template

1. `shared/platform-shared/ai/agentWorkflow/templates.ts`: add template metadata
2. `shared/platform-shared/ai/agentWorkflow/templateFactories/`: create a factory function
3. `shared/platform-shared/ai/agentWorkflow/createByTemplate.ts`: register a switch case

---

## FAQ

### Port already in use

```bash
lsof -ti:3001 | xargs kill  # backend
lsof -ti:5300 | xargs kill  # frontend
```

### MongoDB connection failed

- Confirm MongoDB is running: `docker ps | grep mongo`
- Check the connection string
- SSH tunnel: `ssh -fN -L 27018:localhost:27017 server`

### Build errors

- Clean node_modules: `rm -rf node_modules && pnpm install`
- Rebuild the shared package: `cd shared/platform-shared && pnpm build`
- Clean Vite cache: `rm -rf ai/app/node_modules/.vite`

### Test failures

- Confirm MongoDB is running (some tests need it)
- Check mocks
- Pre-existing failures: 4 tests fail due to frontend module references, not code issues
