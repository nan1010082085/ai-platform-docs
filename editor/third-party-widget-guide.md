# 第三方 控件开发指南

> 面向外部开发者的 Widget 扩展指南，涵盖从创建到发布的完整流程。

## 概述

Schema Platform Editor 支持**第三方控件 扩展**，开发者可以：

- 创建自定义表单组件
- 打包为独立 Widget 包
- 通过 Widget 市场或手动安装

## 快速开始

### 1. 创建 Widget 目录

```bash
mkdir my-widget
cd my-widget

# 创建组件文件
cat > MyWidget.vue << 'EOF'
<template>
  <div class="my-widget">
    <input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
EOF

# 创建配置文件
cat > config.ts << 'EOF'
import type { WidgetConfig } from '@schema-platform/platform-shared'

export const config: WidgetConfig = {
  name: 'my-widget',
  displayName: '我的组件',
  icon: 'edit',
  group: 'basic',
  properties: [
    {
      key: 'placeholder',
      label: '占位提示',
      type: 'string',
      default: '请输入',
    },
  ],
}
EOF
```

### 2. 注册 Widget

```typescript
import { createWidgetPlugin, type WidgetRegistryItem } from '@editor/widgets/registry'
import MyWidgetVue from './MyWidget.vue'
import { config } from './config'

const myWidget: WidgetRegistryItem = {
  name: 'my-widget',
  displayName: '我的组件',
  type: 'my-widget',  // 无需修改 base/types.ts
  group: 'static',
  component: MyWidgetVue,
  create: (id) => ({
    id,
    type: 'my-widget',
    props: {
      placeholder: '请输入',
    },
  }),
  config,
}

createWidgetPlugin({ widgets: [myWidget] })
```

### 3. 集成到 Editor

在 `src/widgets/index.ts` 或运行时入口调用 `createWidgetPlugin`：

```typescript
// src/widgets/index.ts
import { createWidgetPlugin } from '@editor/widgets/registry'
import { myWidget } from './my-widget'

// 注册所有自定义 Widget
createWidgetPlugin({
  widgets: [myWidget],
})
```

## 类型系统

`SchemaType` 已改为**注册式 string**，新增类型只需 `registerWidget` / `createWidgetPlugin`，不必修改 `base/types.ts`。

```typescript
// 注册新类型
registerWidget('my-widget', {
  // 类型定义
})

// 或使用 createWidgetPlugin 批量注册
createWidgetPlugin({
  widgets: [myWidget],
})
```

## Widget 配置

### 基础属性

```typescript
interface WidgetConfig {
  name: string           // 唯一标识符
  displayName: string    // 显示名称
  icon: string           // 图标名称（iconRegistry 中注册的）
  group: string          // 分组：basic | layout | data | chart | custom
  properties: Property[] // 可配置属性列表
}
```

### 属性定义

```typescript
interface Property {
  key: string            // 属性名
  label: string          // 显示标签
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'json'
  default?: any          // 默认值
  options?: Option[]     // select 类型的选项列表
  required?: boolean     // 是否必填
  description?: string   // 描述
}
```

## 打包与发布

### 独立打包

```bash
# 打包 Widget 包
pnpm build:widgets

# 产物：dist/widgets/my-widget.js
```

### npm 发布

```bash
# 发布到 npm
npm publish

# 或发布到私有 registry
npm publish --registry https://your-registry.com
```

### Widget 市场安装

```bash
# 从 npm 安装
npm install @your-scope/my-widget

# 在 Editor 中使用
import { createWidgetPlugin } from '@editor/widgets/registry'
import { myWidget } from '@your-scope/my-widget'

createWidgetPlugin({ widgets: [myWidget] })
```

## 最佳实践

1. **组件设计**：Widget 组件应只做渲染，不写复杂业务逻辑
2. **属性暴露**：通过 `props` 暴露可配置属性，通过 `emits` 暴露事件
3. **样式隔离**：使用 scoped 样式或 CSS Modules，避免全局污染
4. **类型安全**：使用 TypeScript 定义 props 和 emits 类型
5. **文档完善**：提供清晰的属性说明和使用示例

## 相关文档

| 文档 | 说明 |
|------|------|
| [控件体系](/editor/widgets) | 控件架构、注册机制 |
| [控件开发指南](/editor/widget-development) | 内置 控件开发规范 |
| [属性面板](/editor/property-panel) | Widget 属性配置 UI |
| [状态库设计](/editor/store-design) | 控件数据存储 |
| [能力清单](/editor/capabilities) | Editor 可用能力 |
