---
title: 公共包
---

# 公共包

Schema Platform 的公共包，为各子项目提供共享的组件、工具和类型定义。

## 包列表

| 包 | 目录 | 说明 |
|---|---|---|
| `@schema-platform/platform-shared` | `shared/platform-shared/` | 平台公共组件/工具 |
| `@schema-platform/flow-shared` | `shared/flow-shared/` | 流程引擎共享层 |
| `@schema-platform/ai-shared` | `ai/shared/` | AI 共享层 |

## 依赖方向

```
editor / flow / ai / ua ──→ shared/{platform-shared, flow-shared}
server 独立，通过 API 通信
docs 独立，汇聚全平台文档
```

**严格单向依赖**：shared 包不得反向依赖上层应用包。

## 同仓开发（推荐）

各子项目 `package.json` 用 `file:` 指向 sibling 公共包目录：

```json
{
  "dependencies": {
    "@schema-platform/platform-shared": "file:../shared/platform-shared"
  }
}
```

运行 `scripts/link-shared-local.mjs` 一键同步。

## 前端源码直连

各前端子项目 Vite 配置通过 `scripts/vite-shared-source.mjs` 将 `@schema-platform/*` alias 到 sibling 源码目录：

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

改公共包后 dev/build 自动生效，无需先 build dist 或 npm 发版。

## 统一部署

```bash
# 独立打包
deploy/pack.sh --target {editor|flow|ai|ua|server|all}

# 产物命名
{target}-{VERSION}.tar.gz  # 独立
platform-{VERSION}.tar.gz  # 全量

# 增量部署
deploy/deploy.sh --target {target} {VERSION}
```

## 关键能力摘录

| 能力 | 说明 |
|------|------|
| `AppIcon` + `iconRegistry` | 全端统一图标；禁止直连 Element Plus icons |
| `deviceId` / `X-Device-Id` | `apiClient` 统一注入；UA 共用 `sfp_device_id` |
| AI 类型（1.3.0+） | 工作流模板 id 以 string 为主路径，兼容 Registry |

## 公共包改动必须部署

修改 `shared/platform-shared/`、`shared/flow-shared/`、`ai/shared/` 后，必须重新打包部署依赖该公共包的所有子项目：

| 公共包 | 依赖的子项目 |
|--------|-------------|
| `platform-shared` | editor、flow、ai、ua |
| `flow-shared` | flow、server |
| `ai-shared` | ai、server |

## 相关文档

| 文档 | 说明 |
|------|------|
| [platform-shared](./platform-shared) | 平台公共组件/工具 |
| [flow-shared](./flow-shared) | 流程引擎共享层 |
| [ai-shared](/ai/ai-shared) | AI 共享层 API |
| [扩展开发](/extend/) | 自定义模型、技能、模板 |
