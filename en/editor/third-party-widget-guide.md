# Third-party Widget Development Guide

## Quick Start

1. Create a widget directory: `my-widget/` (component `.vue` + `config.ts`)
2. Register with `createWidgetPlugin`:

```typescript
import { createWidgetPlugin, type WidgetRegistryItem } from '@editor/widgets/registry'

const myWidget: WidgetRegistryItem = {
  name: 'my-widget',
  displayName: 'My Widget',
  type: 'my-widget', // no need to modify base/types.ts
  group: 'static',
  component: MyWidgetVue,
  create: (id) => ({ /* ... */ }),
  config: myWidgetConfig,
}

createWidgetPlugin({ widgets: [myWidget] })
```

3. Call `createWidgetPlugin` in `src/widgets/index.ts` or a runtime entry

## Type System

`SchemaType` is now a registry-based `string`; adding a type only requires `registerWidget` / `createWidgetPlugin`, no need to modify `base/types.ts`.

## Packaging

Use `pnpm build:widgets` to independently build a widget package for npm publishing or marketplace installation.
