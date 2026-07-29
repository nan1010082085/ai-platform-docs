# Quick Start

Get Schema Platform AI running in 5 minutes.

---

## Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **MongoDB** 8.x
- **Git**

### Optional

- **Docker** - containerized deployment
- **LLM API Key** - DeepSeek (recommended), OpenAI, or Anthropic

---

## Option 1: Local Dev Environment

### Step 1: Clone the repo

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform
```

### Step 2: Install dependencies

```bash
# Build the shared package (required)
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# Install backend
cd server && pnpm install && cd ..

# Install AI frontend
cd ai/app && pnpm install && cd ../..
```

### Step 3: Start MongoDB

```bash
cd server && pnpm db:up && cd ..
```

MongoDB 8 runs on port 27017 (user `formgrid`, password `formgrid`, database `formgrid`).

### Step 4: Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=<random 32-byte hex>
DEEPSEEK_API_KEY=<your API key>
```

### Step 5: Initialize data (optional)

```bash
cd server && pnpm db:seed && cd ..
```

### Step 6: Start the backend

```bash
cd server && pnpm dev
```

Backend runs at `http://localhost:3001`.

### Step 7: Start the frontend

```bash
cd ai/app && pnpm dev
```

Open `http://localhost:5300`.

---

## Option 2: Docker Compose

```bash
cp ai/.env.example ai/.env
# Edit ai/.env to set DEEPSEEK_API_KEY and JWT_SECRET
docker compose -f ai/docker-compose.ai.yml up -d
```

Starts MongoDB + backend + frontend; open `http://localhost:5300`.

---

## Verify

```bash
# Backend health check
curl http://localhost:3001/api/health

# Frontend page
open http://localhost:5300
```

---

## Next Steps

- [AI Chat Agent](./agent) - learn about multi-expert chat
- [Agent Workflow](./agent-workflow) - visual workflow orchestration
- [RAG Knowledge Base](./rag-tool-mcp-boundary) - vector retrieval
- [Plugin Center](./plugin) - extend AI capabilities

---

## FAQ

### Port already in use

```bash
lsof -ti:3001 | xargs kill  # backend
lsof -ti:5300 | xargs kill  # frontend
```

### MongoDB connection failed

- Confirm MongoDB is running: `docker ps | grep mongo`
- Check the connection string: `MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid`

### LLM call failed

- Confirm the API key is valid
- DeepSeek: `DEEPSEEK_API_KEY=sk-xxx`
- Custom model: see the [custom model guide](/extend/custom-models)
