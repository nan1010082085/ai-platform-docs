# platform-shared

`@schema-platform/platform-shared` — 平台公共组件/工具，为 Editor、Flow、AI、UA 提供共享能力。

## 目录结构

```
shared/platform-shared/
├── src/
│   ├── components/         # 公共组件
│   │   ├── AppIcon.vue     # 图标组件
│   │   ├── AppTable.vue    # 表格组件
│   │   └── AppForm.vue     # 表单组件
│   ├── composables/        # 组合式 API
│   │   ├── useAuth.ts      # 认证逻辑
│   │   ├── usePermission.ts # 权限逻辑
│   │   └── useTheme.ts     # 主题逻辑
│   ├── utils/              # 工具函数
│   │   ├── iconRegistry.ts # 图标注册表
│   │   ├── iconResolver.ts # 图标解析器
│   │   └── format.ts       # 格式化工具
│   ├── types/              # 类型定义
│   │   ├── schema.ts       # Schema 类型
│   │   ├── widget.ts       # Widget 类型
│   │   └── api.ts          # API 类型
│   └── styles/             # 样式
│       ├── variables.css   # CSS 变量
│       └── common.css      # 通用样式
├── package.json
└── tsconfig.json
```

## 核心模块

### AppIcon 组件

统一图标组件，禁止直接 `import @element-plus/icons-vue`：

```vue
<template>
  <AppIcon name="edit" />
</template>

<script setup lang="ts">
import { AppIcon } from '@schema-platform/platform-shared'
</script>
```

图标名必须是 `iconRegistry.ts` 中注册的 kebab-case 名称。

### useAuth 组合式 API

```typescript
import { useAuth } from '@schema-platform/platform-shared'

const { user, isLoggedIn, login, logout } = useAuth()
```

### usePermission 组合式 API

```typescript
import { usePermission } from '@schema-platform/platform-shared'

const { hasPermission, hasRole } = usePermission()

if (hasPermission('user:create')) {
  // 有创建用户权限
}
```

### Schema 类型

```typescript
import type { Schema, WidgetSchema } from '@schema-platform/platform-shared'

interface Schema {
  widgets: WidgetSchema[]
  board: {
    canvas: CanvasConfig
    variables: Variable[]
    events: Event[]
  }
}
```

## 消费方式

### 同仓开发（推荐）

```json
{
  "dependencies": {
    "@schema-platform/platform-shared": "file:../shared/platform-shared"
  }
}
```

### npm 发布

```bash
# 发布到 GitHub Packages
cd shared/platform-shared
npm publish
```

### Vite 源码直连

```typescript
// vite.config.ts
import { createSharedSourceAlias } from './scripts/vite-shared-source.mjs'

export default defineConfig({
  resolve: {
    alias: {
      ...createSharedSourceAlias(),
    },
  },
})
```

## 消费者

| 子项目 | 用途 |
|--------|------|
| Editor | 图标、Schema 类型、Widget 工具 |
| Flow | 图标、认证、权限 |
| AI | 图标、认证、权限、主题 |
| UA | 图标、认证、权限、用户管理 |

## 相关文档

| 文档 | 说明 |
|------|------|
| [flow-shared](./flow-shared) | 流程引擎共享层 |
| [ai-shared](/ai/ai-shared) | AI 共享层 API |
| [图标规则](/editor/widgets#图标规则) | 图标使用规范 |
| [扩展开发](/extend/) | 自定义模型、技能、模板 |
