# 第三方 Widget 开发指南

## 快速接入

1. 创建 Widget 目录：`my-widget/`（组件 `.vue` + `config.ts`）
2. 使用 `createWidgetPlugin` 注册：

```typescript
import { createWidgetPlugin, type WidgetRegistryItem } from '@editor/widgets/registry'

const myWidget: WidgetRegistryItem = {
  name: 'my-widget',
  displayName: '我的组件',
  type: 'my-widget', // 无需修改 base/types.ts
  group: 'static',
  component: MyWidgetVue,
  create: (id) => ({ /* ... */ }),
  config: myWidgetConfig,
}

createWidgetPlugin({ widgets: [myWidget] })
```

3. 在 `src/widgets/index.ts` 或运行时入口调用 `createWidgetPlugin`

## 类型系统

`SchemaType` 已改为注册式 `string`，新增类型只需 `registerWidget` / `createWidgetPlugin`，不必修改 `base/types.ts`。

## 打包

使用 `pnpm build:widgets` 可独立打包 Widget 包，供 npm 发布或 Widget 市场安装。
