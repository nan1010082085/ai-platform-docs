# Micro-frontend Integration

## Run Modes

| Mode | Condition | History | Auth |
|------|------|---------|------|
| qiankun sub-app | `__POWERED_BY_QIANKUN__` and `BASE_URL !== '/'` | MemoryHistory | Host handles |
| Standalone dev | `BASE_URL === '/'` | WebHistory | Self login |
| Standalone prod | `BASE_URL === '/schema-platform/editor/'` | WebHistory | Self login |

## Entry File

`src/main.ts` dual-mode entry:

```ts
if (!window.__POWERED_BY_QIANKUN__) {
  // standalone mode: mount directly
  app = createEditorApp()
  app.mount('#app')
}
// qiankun mode: wait for host to call mount()
export { bootstrap, mount, unmount }
```

## qiankun Registration (Shell side)

The shell configures centrally via `APP_CONFIGS`:

```ts
{
  name: 'editor',
  entry: isDev ? '//localhost:5100/schema-platform/editor/' : '//host/schema-platform/editor/',
  container: '#micro-container',
  activeRule: (loc) => loc.pathname.startsWith('/schema-platform/app/editor/')
                  || loc.pathname.startsWith('/schema-platform/standalone/editor/')
}
```

## Communication Mechanisms

### Global State (token sync)

The shell syncs the auth token to all sub-apps via `initGlobalState({ token })`.

### postMessage (iframe communication)

The AI sidebar and FgDialog's micro-app mode use `postMessage` to communicate.

Protocol:
- `fg:set-mode` - set render mode
- `fg:set-data` - set form data
- `fg:get-data` - get form data
- `fg:validate` - trigger validation
- `fg:submit` - trigger form submit
- `ai:datachange` - AI data change

## Vite Config

```ts
// vite.config.ts
base: isProd ? '/schema-platform/editor/' : '/',
plugins: [qiankun('editor', { useDevMode: true })],
```

`useDevMode: true` sets `__POWERED_BY_QIANKUN__=true` in dev mode; needs the `createQiankunApp` timeout fallback.
