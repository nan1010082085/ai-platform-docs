---
title: AI App Architecture & Layers
---

# AI App Architecture & Layers

> Implementation-level structure of the `ai/app/` frontend: directory rules, Store / Composable / API inventory, plugin adapter and Harness client.

## 1. Layering Rules

AI App follows the platform-wide layering (same as editor / flow / ua):

| Layer | Location | Responsibility | Constraint |
|------|------|------|------|
| Views | `views/` | Route-level page assembly | Page orchestration only; no complex business logic |
| UI components | `components/` | Reusable render components | Render only; business logic moves to composables/stores |
| Global state | `stores/` | Pinia stores | Single exit for global state; no bare cross-page state in components |
| Shared logic | `composables/` | `useXXX` composables | Shared logic uses composables, not scattered utils |
| API aggregation | `api/` | All backend requests | Components/stores/composables must not call `fetch()` directly |
| Plugin adapter | `plugins/` | Cordis plugin container | Business code only imports from `@/plugins` |
| Constants | `constants/` | Static enums/metadata | errorCodes, node types, model provider metadata |
| Types | `types/` | Local protocol types | Cross-project shared types live in `platform-shared/ai` |

## 2. API Layer (src/api/)

All backend requests go through `src/api/`; `api/shared/request.ts` provides the unified request wrapper (token injection, tenant header `X-Tenant-Id`, error handling), `api/shared/blobRequest.ts` for binary streams.

| Module | File | Responsibility |
|------|------|------|
| `aiApi/` | `base.ts` | AI API base class and generic requests |
| | `conversation.ts` | Conversation CRUD, messages, streaming (WebSocket) |
| | `document.ts` | Document upload/parse |
| | `evaluation.ts` | Evaluation datasets and runs |
| | `llm.ts` | LLM calls and config |
| | `mcp.ts` | MCP server management |
| | `memory.ts` | Memory management |
| | `monitor.ts` | Agent monitoring stats |
| | `rag.ts` | Knowledge base / retrieval |
| | `workflowTemplate.ts` | Workflow templates |
| `agentWorkflowApi.ts` | Workflow CRUD, publish, execute, HITL resume, invoke |
| `workflowInvokeApi.ts` | External integration invoke calls |
| `apiKeyApi.ts` / `tenantApi.ts` | API keys / tenants |
| `modelApi.ts` / `modelConfigApi.ts` / `providerApi.ts` | Models / model config / providers |
| `pluginApi.ts` / `tenantPluginApi.ts` | Plugin center / tenant plugins |

> API integration follows existing server contracts (the frontend never modifies `server/`); new endpoints are aggregated in `api/` first.

## 3. Pinia Stores (src/stores/)

| Store | File | Responsibility |
|------|------|------|
| `useAiStore` | `ai.ts` | Compatibility main store (entry before `stores/ai/` split) |
| | `ai/actions.ts` | AI action dispatch (generation/tool calls) |
| | `ai/events.ts` | Streaming event handling (v1/v2 events → state) |
| | `ai/requirement.ts` | Requirement analysis/confirmation state |
| | `ai/workflow.ts` | Workflow-related state |
| `useConversationStore` | `conversation.ts` | Conversation list / current session |
| `useStreamStore` | `stream.ts` | WebSocket stream buffering and event queue |
| `useSchemaStore` | `schema.ts` | Current schema and version comparison |
| `useRAGStore` | `rag.ts` | RAG retrieval state |
| `useChatSettingsStore` | `chatSettings.ts` | Chat settings (model/params) |
| `useChatConfigStore` | `chatConfig.ts` | Chat configuration |
| `useHITLStore` | `hitl.ts` | HITL interrupt/resume state |
| `useAgentWorkflowDesignerStore` | `agentWorkflowDesigner.ts` | Designer canvas/node/edge state |
| `usePublishedAgentWorkflowsStore` | `publishedAgentWorkflows.ts` | Published workflow cache |

Unified exports in `stores/index.ts` (`useAiStore` kept for backward compatibility).

## 4. Composables (src/composables/)

| Domain | Composables |
|------|-------------|
| Chat | `useChatAttachments` (multimodal attachments), `useChatScroll`, `useSmartSuggestions`, `useActionProposals` |
| Workflow execution | `useWorkflowChatExecution`, `useWorkflowExecutionStream`, `useWorkflowInvoke`, `useWorkflowInvokeInfo`, `useWorkflowSelfTest`, `useWorkflowSuggestion`, `useWorkflowTemplates`, `usePublishedAgentWorkflows` |
| Designer | `useAgentNodePropertyPanel` (property panel registration), `useEdgePath`, `useFlowPreview`, `useWorkflowActions` |
| Models | `useModelCenter`, `useModelOptions`, `useModelPresets` |
| Plugins | `usePluginRegistry` (registry snapshot), `usePluginRuntime`, `useMcpHealth` |
| Preview | `usePreviewCompare`, `usePreviewInteraction` |
| Shell embed | `useShellEmbed` (qiankun/iframe embed detection and context bridge) |
| Monitor / i18n | `useAiMonitor`, `useAiLocale` |

## 5. Cordis Plugin Adapter (src/plugins/)

Cordis-inspired plugin container (principles: `ai/docs/design/plugin-architecture-principles.md`). Standalone harness was removed; the client adapter remains. **Business code only imports from `@/plugins`**; direct imports of `@deepseek-ai/cordis` are forbidden — API changes only affect the adapter internals. Extension points (tools / node types / renderers / skills) register via Services — do not stack constants or ad-hoc registries in business code.

| File | Responsibility |
|------|------|
| `index.ts` | Single exit (host lifecycle, serviceState, builtin tools, layers, adapter conversions, palette items) |
| `host.ts` | Plugin host lifecycle: `startPluginHost` / `ensurePluginHost` / `stopPluginHost` |
| `bridge.ts` | Bridge service state (`serviceState`) |
| `config/builtin.ts` | Builtin tool definitions and categories (`BUILT_IN_TOOLS`) |
| `config/layers.ts` | Config layering: `builtin < registry overlay < local patch` (`mergeLayers`) |
| `config/nodeTypes.ts` | Agent canvas palette items and node colors (`AGENT_PALETTE_ITEMS`) |
| `config/renderers.ts` | Message renderer registration |
| `registry-adapter.ts` | Server registry tools → adapter tool definitions (`registryToolToDef`) |
| `skill-adapter.ts` | Platform skills → adapter skill definitions (`platformSkillToDef`) |
| `plugins/chat-tools` | Tool definition types and categories (`ToolDef` / `ToolCategory`) |
| `plugins/node-types` / `plugins/renderers` | Node type / renderer plugins |

**Iron rules** (see `ai/CLAUDE.md`):

- Plugins (code) load statically; tools / workflows / skills are data, registered dynamically by plugin runtime (`chatTools.setOverlay` / `ctx.tools.register`)
- A workflow is always data, never a plugin; no runtime dynamic import of loaders in the browser
- Version lock: `@deepseek-ai/cordis` exact version; upgrades require changelog review

## 6. i18n & Telemetry

- **i18n**: `locales/zh-CN.ts` / `locales/en-US.ts`; `useAiLocale` reads/writes local language preference
- **Telemetry**: `utils/telemetry.ts` (`initAiTelemetry` / `disposeAiTelemetry`) for AI interaction events
- **Theme**: `styles/ai-theme-bridge.scss`, `graphEdgeStates.scss` bridge platform-shared theme variables and canvas edge states

## 8. Testing

| Type | Location | Description |
|------|------|------|
| Unit (Vitest) | `src/__tests__/`, `stores/__tests__/`, `stores/ai/__tests__/`, `api/*.spec.ts`, `plugins/__tests__/` | Store behavior, API wrappers, adapter conversions, message components |
| E2E (Playwright) | `e2e/auth.spec.ts` | Auth flow (`pnpm test:e2e`) |
| Type check | — | `pnpm typecheck` (vue-tsc --noEmit) |

## 9. Related Docs

- [App Overview](./index) — positioning, features, run & embed modes
- [Routing & Pages](./routing) — full route table and guards
- [ai-shared API](../ai-shared) — shared types/events/prompts
- [Design Overview](../design/overview) — information architecture wireframes
