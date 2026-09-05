# Capability Platform & AI App Positioning

> **Three capabilities in one**: the visual editor (editor), flow designer (flow), and AI app (ai) share the same identity and session; they are not three unrelated tools.
> **AI app small goal**: build an independently deployable, open-source **application-capability platform** (agent orchestration, RAG, plugins, chat, external integration).

---

## 1. How the Three Capabilities Fit Together

```text
                    ┌─────────────────────────────────────┐
                    │  platform-shared/authSession        │
                    │  JWT · refresh · SSO · auto-refresh │
                    └─────────────────────────────────────┘
                           ▲           ▲           ▲
                           │           │           │
              ┌────────────┴───┐ ┌─────┴─────┐ ┌──┴────────────┐
              │  editor        │ │  flow     │ │  ai           │
              │  form/page     │ │  BPMN     │ │  capability   │
              │  design        │ │  flow     │ │  platform     │
              └────────────┬───┘ └─────┬─────┘ └──┬────────────┘
                           │           │          │
                           └───── iframe Sidebar ──┘
                                 (AiSidebarView)
```

| Project | Role | Relationship with AI |
|------|------|----------------|
| **editor** | Schema / page visual design | Embeds the **AI Sidebar** on the right; passes the current Schema/node context |
| **flow** | BPMN flow design | Embeds the **AI Sidebar** on the right; passes the current Flow/node context |
| **ai** | The capability platform itself | Full app + supplies the Sidebar to editor/flow; **not** just an附属 library for the sidebar |

**Shared JWT**: all three sub-apps use `authSession` / `authStore` from `@schema-platform/platform-shared`:

- Same `sfp_access_token` / `sfp_refresh_token` (localStorage)
- Login, SSO callback, `/auth/refresh` auto-renewal
- 401 uniformly redirects to login (handled by Shell or each app's `/login` inside the container)

Log in on **any of editor / flow / ai**, and all three send the same Bearer JWT in API requests - **no need to build separate account systems**.

**Unified init** (call after `createPinia()`):

```ts
import { initCapabilityPlatformAuth } from '@schema-platform/platform-shared/utils/authSession'

initCapabilityPlatformAuth({
  registerTokenProvider: (getToken) => { /* inject the sub-app's own fetch client */ },
})
```

Done in one call: `apiClient` Bearer, `Socket.IO` auth, `/auth/refresh` scheduling, 401 refresh retry.
The sidebar iframe (`main-sidebar.ts`) and the full AI app both go through the same logic.

---

## 2. AI App: Full Platform vs Sidebar

| Form | Entry | Audience |
|------|------|--------|
| **Full AI app** | `main.ts` -> `AiLayout` | Standalone access or Shell `/app/ai/*`: chat, agent orchestration, RAG, plugin center, monitoring |
| **Sidebar** | `index-sidebar.html` -> `AiSidebarView` | Only the **400px assistant bar** embedded inside the editor/flow designer |

The sidebar is an **integration form**, not the whole AI app. The open-source small platform delivers the **full ai app + server AI module**; editor/flow optionally connect via the Sidebar.

Bridge events (`ai/app/src/utils/bridge.ts`):

- Host -> AI: `ai:set-context`, `ai:current-schema`, `ai:current-flow`
- AI -> Host: `ai:open-in-editor`, `ai:published`, `ai:preview-*`

---

## 3. Credential Model (re-organized)

Three credential types with clear responsibilities, **not interchangeable**:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. JWT (access + refresh)                                   │
│    Who: any logged-in user                                  │
│    Use: all UI and WebSocket for editor / flow / ai         │
│    Traits: short-lived, auto-refresh, multi-account SSO     │
├─────────────────────────────────────────────────────────────┤
│ 2. User platform key (sk-...)                               │
│    Who: each logged-in user creates their own (not admin-only)│
│    Use: scripts / external systems **instead of stuffing JWT in code**│
│    Scope: all published workflows the user has permission to in the tenant│
│    Manage: AI app "My Integration Keys" (`ApiKeyManagerView`; backend `/api/keys`)│
├─────────────────────────────────────────────────────────────┤
│ 3. Workflow key (wf-...)                                    │
│    Who: auto-generated on workflow publish (not manual)     │
│    Use: expose only a **single** published flow externally without giving a personal platform key│
│    Manage: workflow designer "Unified Invoke Entry"; can be rotated│
└─────────────────────────────────────────────────────────────┘
```

### Unified Invoke Entry (target form)

Externally we promote only **one HTTP entry**, with one of two auth methods:

```http
POST /api/ai/workflows/invoke/{slug}
X-Tenant-Id: 000000

# Option A: user platform key (covers all workflows this user can execute)
X-API-Key: sk_...

# Option B: single-workflow key (only this slug)
X-Workflow-Key: wf_...
```

In-platform (human interaction) still uses **JWT**:

```http
Authorization: Bearer <accessToken>
POST /api/ai/workflows/:id/execute   # includes draft testing (owner)
WebSocket chat:* / workflow:*
```

### Relationship with the "open-source small platform"

- **JWT**: in self-hosted deployment, build your own user system + SSO; the three capability sub-apps share it.
- **User platform key**: open-source integrators use a **long-term key** to call workflows without putting a refresh token in cron.
- **Workflow key**: fine-grained single-flow sharing, suitable for "least privilege" in SaaS multi-tenant.

---

## 4. Multi-account & Permissions (product conventions)

| Convention | Description |
|------|------|
| Multi-account | Designed for multi-user overall; `createdBy` and tenant `tenantId` run through workflows and keys |
| Platform key ownership | **Whoever creates it owns it**; list/delete/update defaults to self only |
| Platform key permissions | Select capabilities on creation (e.g. `workflow:execute`); execution represents the **creator's user identity** |
| Role permissions | Regular logged-in users manage **their own** keys (`apikey:*`) |

Invoke accepts both `X-API-Key` (user platform key) and `X-Workflow-Key` (workflow key). Manage keys in the AI app UI.

---

## 5. AI Open-source App Small Platform - Capability Boundary

**Included (ai repo + server `/api/ai`)**:

| Capability | Description |
|------|------|
| AI chat | LangGraph multi-expert + WebSocket |
| Agent workflow | visual orchestration, publish, execute, monitor |
| Plugin center | Expert / Skill / Tool / MCP config |
| RAG | knowledge base indexing and retrieval |
| External integration | invoke + user platform key / workflow key (call REST API directly) |

**Not included**:

- Form/page designer (the editor project)
- BPMN approval flow engine UI (the flow project)
- Shell host and business menus (optional composition, not core to the ai small platform)

**Optional combined deployment**:

```text
Minimal: server + ai (standalone chat & orchestration platform)
Full: server + shell + editor + flow + ai (three capabilities + host)
Embedded: editor/flow + ai Sidebar (assistant bar only)
```

---

## 6. Doc Index (by role)

| Reader | Doc |
|------|------|
| Architecture overview | [architecture.md](./architecture.md) |
| Credentials & SDK | [sdk.md](./sdk.md) |
| Workflow terminology | [workflow-terminology.md](./workflow-terminology.md) |
| Plugin center | [plugin.md](./plugin.md) |
| UI / embedding | [design/overview.md](./design/overview.md) |
