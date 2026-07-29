# micro-app-container 动态子应用加载设计

> Widget 属性面板动态配置子应用，运行时通过 qiankun loadMicroApp 加载

---

## 一、核心变更

**现状**：子应用写死为 editor/flow/ai 三个选项

**目标**：用户在属性面板动态录入子应用配置（name + entry URL），运行时加载任意子应用

```
属性面板配置：
  app 名称: approval-flow
  入口地址: http://localhost:6000
  传参:     { orderId: "123" }

运行时：
  qiankun loadMicroApp({ name: 'approval-flow', entry: 'http://localhost:6000' }, container)
```

---

## 二、配置结构

```typescript
// Widget props
{
  microappName: string       // 子应用名称（唯一标识）
  microappEntry: string      // 子应用入口 URL
  height: string             // 容器高度
  variables: Record<string, unknown>  // 传递给子应用的参数
}
```

### 属性面板

| 属性 | 类型 | 说明 |
|------|------|------|
| `microappName` | input | 子应用名称（如 `approval-flow`），qiankun 注册标识 |
| `microappEntry` | input | 入口地址（如 `http://localhost:6000`），支持 `${variable}` 模板 |
| `height` | input | 容器高度，默认 `100%` |
| `variables` | key-value 编辑器 | 传递给子应用的参数，通过 qiankun props 传递 |

---

## 三、组件实现

```vue
<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { loadMicroApp } from 'qiankun'
import type { MicroApp } from 'qiankun'

const widgetData = inject(widgetDataKey)!

const appName = computed(() => widgetData.value.props?.microappName as string ?? '')
const appEntry = computed(() => {
  const template = widgetData.value.props?.microappEntry as string ?? ''
  // 解析模板变量
  return template.replace(/\$\{(\w+)\}/g, (_, key) => variables.value[key] ?? '')
})
const height = computed(() => widgetData.value.props?.height as string ?? '100%')
const variables = computed(() => widgetData.value.props?.variables as Record<string, unknown> ?? {})

const containerRef = ref<HTMLDivElement>()
let microApp: MicroApp | null = null

// 动态加载子应用
async function loadApp() {
  if (!appName.value || !appEntry.value || !containerRef.value) return

  // 卸载已有实例
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

// 容器就绪后加载
watch([appName, appEntry], () => loadApp(), { immediate: true })
onUnmounted(() => microApp?.unmount())
</script>

<template>
  <div :style="{ height }">
    <div v-if="!appName || !appEntry" class="placeholder">请配置子应用名称和入口地址</div>
    <div v-else ref="containerRef" style="height: 100%;" />
  </div>
</template>
```

---

## 四、qiankun loadMicroApp 动态加载

qiankun 的 `loadMicroApp` 支持直接传入 `{ name, entry, container }`，**不需要预先 registerMicroApps**：

```ts
// 直接加载，无需注册
const app = loadMicroApp(
  { name: 'my-app', entry: 'http://localhost:6000', container: document.getElementById('sub') },
  { sandbox: true }
)
```

这正是动态加载的依据。用户配置的 name + entry 直接传入即可。

---

## 五、与 registerMicroApps 的区别

| | registerMicroApps | loadMicroApp |
|---|---|---|
| **时机** | 应用启动时静态注册 | 运行时动态加载 |
| **配置** | 宿主代码中写死 | Widget 属性面板用户配置 |
| **场景** | shell 加载 editor/flow/ai | Schema 中嵌入任意子应用 |
| **生命周期** | 由 qiankun 框架管理 | 由 Widget 组件管理（mount/unmount） |

两者共存，不冲突：
- `registerMicroApps`：宿主级别的固定子应用
- `loadMicroApp`：Widget 级别的动态子应用

---

## 六、属性面板配置 UI

```
┌─────────────────────────────────────┐
│ 微应用容器                           │
├─────────────────────────────────────┤
│ 子应用名称  [ approval-flow        ] │
│ 入口地址    [ http://localhost:6000 ] │
│ 容器高度    [ 100%                  ] │
├─────────────────────────────────────┤
│ 传参（variables）                    │
│ ┌─────────┬──────────┐              │
│ │ Key     │ Value    │              │
│ ├─────────┼──────────┤              │
│ │ orderId │ 123      │              │
│ │ userId  │ u001     │              │
│ └─────────┴──────────┘              │
│ [+ 添加参数]                         │
└─────────────────────────────────────┘
```

---

## 七、变量传递机制

variables 通过 qiankun 的 props 机制传递给子应用：

```ts
// Widget 加载子应用时
loadMicroApp(
  { name, entry, container },
  {
    sandbox: true,
    props: {
      ...variables,  // 用户配置的参数展开到子应用 props
    },
  }
)

// 子应用接收
export async function mount(props) {
  console.log(props.orderId)  // '123'
  console.log(props.userId)   // 'u001'
}
```

---

## 八、实施步骤

1. **修改 `config.ts`** — 移除 hardcoded select，改为动态 input
2. **修改 `FgMicroAppContainer.vue`** — 用 loadMicroApp 动态加载
3. **移除 `@schema-form/shared-qiankun` 的 MicroAppContainer 依赖** — 直接用 qiankun API
4. **测试** — 配置不同子应用地址，验证加载和通信
