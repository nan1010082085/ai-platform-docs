# micro-app-container Dynamic Sub-app Loading Design

> The widget property panel dynamically configures sub-apps; at runtime they are loaded via qiankun `loadMicroApp`

---

## 1. Core Change

**Current**: sub-apps are hardcoded to editor/flow/ai options

**Goal**: users enter sub-app config (name + entry URL) in the property panel; at runtime any sub-app can be loaded

```
Property panel config:
  App name: approval-flow
  Entry URL: http://localhost:6000
  Params:    { orderId: "123" }

Runtime:
  qiankun loadMicroApp({ name: 'approval-flow', entry: 'http://localhost:6000' }, container)
```

---

## 2. Config Structure

```typescript
// Widget props
{
  microappName: string       // sub-app name (unique identifier)
  microappEntry: string      // sub-app entry URL
  height: string             // container height
  variables: Record<string, unknown>  // params passed to the sub-app
}
```

### Property Panel

| Property | Type | Description |
|------|------|------|
| `microappName` | input | Sub-app name (e.g. `approval-flow`), the qiankun registration id |
| `microappEntry` | input | Entry URL (e.g. `http://localhost:6000`), supports `${variable}` templates |
| `height` | input | Container height, default `100%` |
| `variables` | key-value editor | Params passed to the sub-app via qiankun props |

---

## 3. Component Implementation

```vue
<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'

const widgetData = inject(widgetDataKey)!

const appName = computed(() => widgetData.value.props?.microappName as string ?? '')
const appEntry = computed(() => {
  const template = widgetData.value.props?.microappEntry as string ?? ''
  // resolve template variables
  return template.replace(/\$\{(\w+)\}/g, (_, key) => variables.value[key] ?? '')
})
const height = computed(() => widgetData.value.props?.height as string ?? '100%')
const variables = computed(() => widgetData.value.props?.variables as Record<string, unknown> ?? {})

const containerRef = ref<HTMLDivElement>()
let microApp: MicroApp | null = null

// dynamically load the sub-app
async function loadApp() {
  if (!appName.value || !appEntry.value || !containerRef.value) return

  // unmount existing instance
  if (microApp) {
    await microApp.unmount()
    microApp = null
  }

  microApp = loadMicroApp(
    { name: appName.value, entry: appEntry.value, container: containerRef.value },
    { sandbox: { experimentalStyleIsolation: true } }
  )

  microApp.mount().catch(console.error)
}

// load after container is ready
watch([appName, appEntry], () => loadApp(), { immediate: true })
onUnmounted(() => microApp?.unmount())
</script>

<template>
  <div :style="{ height }">
    <div v-if="!appName || !appEntry" class="placeholder">Configure the sub-app name and entry URL</div>
    <div v-else ref="containerRef" style="height: 100%;" />
  </div>
</template>
```

---

## 4. qiankun loadMicroApp Dynamic Loading

qiankun's `loadMicroApp` accepts `{ name, entry, container }` directly, **no need to pre-registerMicroApps**:

```ts
// load directly, no registration needed
const app = loadMicroApp(
  { name: 'my-app', entry: 'http://localhost:6000', container: document.getElementById('sub') },
  { sandbox: true }
)
```

This is the basis for dynamic loading. The user-configured name + entry are passed directly.

---

## 5. Difference from registerMicroApps

| | registerMicroApps | loadMicroApp |
|---|---|---|
| **Timing** | Static registration at app startup | Dynamic load at runtime |
| **Config** | Hardcoded in host code | User-configured in the widget property panel |
| **Scenario** | shell loads editor/flow/ai | Embed any sub-app in a schema |
| **Lifecycle** | Managed by the qiankun framework | Managed by the widget component (mount/unmount) |

The two coexist without conflict:
- `registerMicroApps`: host-level fixed sub-apps
- `loadMicroApp`: widget-level dynamic sub-apps

---

## 6. Property Panel Config UI

```
┌─────────────────────────────────────┐
│ Micro-app Container                 │
├─────────────────────────────────────┤
│ App name    [ approval-flow        ]│
│ Entry URL   [ http://localhost:6000 ]│
│ Height      [ 100%                  ]│
├─────────────────────────────────────┤
│ Params (variables)                  │
│ ┌─────────┬──────────┐              │
│ │ Key     │ Value    │              │
│ ├─────────┼──────────┤              │
│ │ orderId │ 123      │              │
│ │ userId  │ u001     │              │
│ └─────────┴──────────┘              │
│ [+ Add param]                       │
└─────────────────────────────────────┘
```

---

## 7. Variable Passing Mechanism

variables are passed to the sub-app via qiankun's props mechanism:

```ts
// when the widget loads the sub-app
loadMicroApp(
  { name, entry, container },
  {
    sandbox: true,
    props: {
      ...variables,  // user-configured params spread to sub-app props
    },
  }
)

// sub-app receives
export async function mount(props) {
  console.log(props.orderId)  // '123'
  console.log(props.userId)   // 'u001'
}
```

---

## 8. Implementation Steps

1. **Modify `config.ts`** - remove the hardcoded select, switch to dynamic input
2. **Modify `FgMicroAppContainer.vue`** - use loadMicroApp for dynamic loading
3. **Remove the `@schema-form/shared-qiankun` MicroAppContainer dependency** - use the qiankun API directly
4. **Test** - configure different sub-app URLs, verify loading and communication
