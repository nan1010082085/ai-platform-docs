# 仓库迁移计划

**创建时间**：2026-07-13
**完成时间**：2026-07-14
**状态**：✅ 已完成

---

## 1. 仓库清单

| 本地目录 | GitHub 仓库 | 状态 |
|---|---|---|
| `shared/platform-shared/` | [platform-shared](https://github.com/nan1010082085/platform-shared) | ✅ 推送成功 |
| `ai/` | [ai-platform](https://github.com/nan1010082085/ai-platform) | ✅ 推送成功 |
| `editor/` | [form-editor](https://github.com/nan1010082085/form-editor) | ✅ 推送成功 |
| `flow/` | [flow-designer](https://github.com/nan1010082085/flow-designer) | ✅ 推送成功 |
| `server/` | [api-server](https://github.com/nan1010082085/api-server) | ✅ 推送成功 |

## 2. 已完成的融合

| 原始包 | 融入目标 | 引用替换 |
|---|---|---|
| `shared/flow-shared/` | `flow/src/shared/flow/` + `server/src/shared/flow/` | 73 处 |
| `ai/shared/` | `shared/platform-shared/ai/` | 27 处 |

## 3. 清理结果

- ✅ `shared/flow-shared/` 已删除
- ✅ `ai/shared/` 已删除
- ✅ `shared/` 目录仅保留 `platform-shared/`

## 4. 依赖关系（最终状态）

```
┌─────────────────────────────────────────────────────────┐
│              platform-shared (独立仓库)                   │
│  auth组件 · 通用UI · apiClient · 图标 · qiankun · ai/   │
└──────┬──────────────┬──────────────┬──────────────┬─────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
  ai-platform    form-editor   flow-designer   api-server
```
