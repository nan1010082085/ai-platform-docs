# 微前端集成

## 运行模式

| 模式 | 条件 | History | 鉴权 |
|------|------|---------|------|
| qiankun 子应用 | `__POWERED_BY_QIANKUN__` 且 `BASE_URL !== '/'` | MemoryHistory | 宿主处理 |
| 独立 dev | `BASE_URL === '/'` | WebHistory | 自身登录 |
| 独立 prod | `BASE_URL === '/schema-platform/editor/'` | WebHistory | 自身登录 |

## 入口文件

`src/main.ts` 双模式入口：

```ts
if (!window.__POWERED_BY_QIANKUN__) {
  // 独立模式：直接挂载
  app = createEditorApp()
  app.mount('#app')
}
// qiankun 模式：等待宿主调用 mount()
export { bootstrap, mount, unmount }
```

## qiankun 注册（Shell 侧）

Shell 通过 `APP_CONFIGS` 集中配置：

```ts
{
  name: 'editor',
  entry: isDev ? '//localhost:5100/schema-platform/editor/' : '//host/schema-platform/editor/',
  container: '#micro-container',
  activeRule: (loc) => loc.pathname.startsWith('/schema-platform/app/editor/')
                  || loc.pathname.startsWith('/schema-platform/standalone/editor/')
}
```

## 通信机制

### 全局状态（token 同步）

Shell 通过 `initGlobalState({ token })` 向所有子应用同步认证 token。

### postMessage（iframe 通信）

AI Sidebar 和 FgDialog 的微应用模式使用 `postMessage` 通信。

协议：
- `fg:set-mode` — 设置渲染模式
- `fg:set-data` — 设置表单数据
- `fg:get-data` — 获取表单数据
- `fg:validate` — 触发校验
- `fg:submit` — 触发表单提交
- `ai:datachange` — AI 数据变更

## Vite 配置

```ts
// vite.config.ts
base: isProd ? '/schema-platform/editor/' : '/',
plugins: [qiankun('editor', { useDevMode: true })],
```

`useDevMode: true` 在 dev 模式下设置 `__POWERED_BY_QIANKUN__=true`，需要 `createQiankunApp` 的 timeout 兜底机制。
