---
title: AI App Frontend
---

# AI App Frontend (@ai-app)

> `ai/app/` — AI assistant frontend: conversational Schema generation, flow orchestration, version management.
> Implementation-level docs (directory structure, Store/Composable/API inventory) in [Architecture & Layers](./architecture);
> routes and pages in [Routing & Pages](./routing).

## 1. Positioning

The AI interaction layer of Schema Form Platform: natural-language dialogue drives generation of form Schema and BPMN flow diagrams. Supports multi-agent collaboration, RAG knowledge retrieval, WebSocket streaming, and can run **standalone** or be embedded into Editor / Flow as a micro-frontend (qiankun container or iframe sidebar).

Dependency direction: `app → @schema-platform/platform-shared` (including `platform-shared/ai` types/events/prompts).

## 2. Feature Modules

| Module | Route | Description |
|------|------|------|
| AI Chat | `/` | Multi-agent chat (Auto/Editor/Flow), WebSocket streaming, Markdown rendering, multimodal input, RAG citations, task chain, Schema/Flow preview cards |
| RAG Knowledge Base | `/rag` | KB list, document upload/vectorization, retrieval test |
| Memory | `/memory` | Chat / long-term memory view and cleanup |
| Integration | `/integration` | Workflow Open API key management and invocation |
| Monitor | `/monitor` | Agent execution stats, alerts, overview |
| Plugin Center | `/plugins` | Expert / Skill / Tool / MCP configuration |
| MCP Manager | `/mcp` | MCP server config and health checks |
| Agent Workflows | `/workflows` etc. | Workflow list, designer, execution history, execution detail |
| Settings | `/settings/*` | API keys, model settings, embedding settings, workflow templates |
| Evaluation | `/evaluation` | Offline workflow quality evaluation (datasets + runs + comparison) |
| Schedules | `/schedules` | Scheduled workflow triggers |
| Debug | `/debug/*` | Routing debug, workflow debug, RAG debug |
| Sidebar mode | `/sidebar` | 400px compact chat embedded in editor/flow right panel |

Full route table in [Routing & Pages](./routing).

## 3. Tech Stack

| Layer | Tech |
|---|---|
| Framework | Vue 3.5 + TypeScript 5.7 + `<script setup>` |
| UI | Element Plus 2.9 (installed via `setupElementPlus`) |
| State | Pinia (global state via stores, see [Architecture & Layers](./architecture#stores)) |
| Routing | Vue Router 4 (`createAiRouter`, qiankun route-base inference) |
| Communication | REST API (`src/api/` aggregation) + WebSocket / Socket.IO streaming |
| Streaming render | marked + DOMPurify (Markdown + code highlight) |
| Micro-frontend | qiankun (`vite-plugin-qiankun`, `renderWithQiankun`) |
| i18n | vue-i18n (`zh-CN` / `en-US`, `locales/`) |
| Workflow canvas | @vue-flow/core (`agent-workflow/` components) |
| Document parsing | pdfjs-dist, xlsx, pptxgenjs, `@google/model-viewer` (3D preview) |
| Build | Vite 6 + CSS Modules |
| Testing | Vitest (unit) + Playwright (E2E) |

## 4. Run & Embed Modes

### 4.1 Standalone

```bash
cd ai/app
pnpm dev        # http://localhost:5300
pnpm build      # vite build
pnpm preview    # preview build
```

Dev proxy: `VITE_DEV_PROXY_TARGET` (default `https://pyflow.icu`; set to `http://localhost:3001` when developing against a local server).

### 4.2 qiankun Micro-frontend

Loaded by the Shell (ua) via qiankun. `main.ts` registers `bootstrap/mount/unmount/update` lifecycles with `renderWithQiankun`:

- **Token injection**: `props.getToken()` or `props.token` stored as `sfp_access_token`
- **Route base**: `props.getRouteBase()` provides the sub-app route prefix (e.g. `/schema-platform/standalone/ai`)
- **Route sync**: `installSubAppRouteSync` keeps qiankun and vue-router in sync
- **Standalone fallback**: if qiankun does not call `mount()` within 500ms, render directly (handles dev-mode `__POWERED_BY_QIANKUN__` mis-set)

### 4.3 Sidebar Mode (iframe / qiankun)

When `props.mode === 'sidebar'`, the route base is fixed to `/sidebar`, rendering the 400px compact chat (`AiSidebarView`) embedded in the editor/flow right panel. Embed detection and context interaction go through `useShellEmbed` (postMessage bridge).

## 5. Directory Snapshot

```
ai/app/src/
├── api/          # API aggregation layer (only fetch/axios exit)
├── components/   # UI components (chat/ message/ preview/ agent-workflow/ workflow/ rag/ ...)
├── composables/  # shared logic (useXXX)
├── stores/       # Pinia stores (single exit for global state)
├── views/        # page-level views (1:1 with routes)
├── plugins/      # Cordis plugin adapter (only exit @/plugins)
├── types/        # local protocol types
├── constants/    # static constants (errorCodes, node types, model provider metadata)
├── locales/      # i18n messages
├── utils/        # utilities (telemetry etc.)
├── router.ts     # route table + guards
├── main.ts       # app bootstrap (qiankun lifecycle)
└── main-sidebar.ts
```

Layering rules and per-layer inventory in [Architecture & Layers](./architecture).

## 6. Common Commands

```bash
pnpm dev              # dev server (5300)
pnpm build            # vite build
pnpm typecheck        # vue-tsc --noEmit
pnpm test             # vitest run (unit)
pnpm test:coverage    # coverage
pnpm test:e2e         # playwright test (e2e/auth.spec.ts)
```

## 7. Related Docs

- [Architecture & Layers](./architecture) — directory structure, Store/Composable/API inventory, plugin adapter
- [Routing & Pages](./routing) — full route table and guards
- [Architecture](../architecture) — AI platform dual-engine overview
- [Design Overview](../design/overview) — information architecture wireframes
