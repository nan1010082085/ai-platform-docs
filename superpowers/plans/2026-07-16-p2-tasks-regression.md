# P2 任务实现 + 回归测试 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 并行实现剩余 7 个 P2 任务，并对所有今日实现的功能进行回归测试

**Architecture:** 分三批实现：第一批（O-3/O-4/O-8）规范和配置化，第二批（N-3/O-7）UI 功能，第三批（O-11/O-12）高级特性。回归测试在每批完成后执行。

**Tech Stack:** Vue 3, TypeScript, Koa.js, MongoDB, Element Plus

## Global Constraints

- 遵循 CLAUDE.md 开发规则
- 前端禁止修改 server 代码
- 公共逻辑使用组合式 API
- API 接口聚合到 src/api/
- UI 组件只做渲染

---

## Task 1: O-3 Skill 拼装顺序规范

**Files:**
- Create: `ai/docs/extend/skill-assembly-spec.md`
- Test: `server/src/ai/__tests__/skillAssembly.spec.ts`

**Interfaces:**
- Produces: Skill 拼装规范文档

- [ ] **Step 1: 分析现有 Skill 拼装逻辑**

```bash
grep -A 20 "resolveExpertSystemPrompt" server/src/ai/plugins/resolveExpertPrompt.ts
```

- [ ] **Step 2: 编写规范文档**

```markdown
# Skill 拼装顺序规范

## 拼装规则

1. **基础优先**：Expert systemPrompt 或 dynamicPrompt 作为基础
2. **Skill 追加**：按 skills 数组顺序追加
3. **分隔符**：使用双换行符分隔
4. **去重**：相同内容不重复追加

## 优先级

1. Expert systemPrompt（最高）
2. dynamicPrompt（平台内置）
3. Skill content（追加）

## 冲突处理

- 同名 Skill：使用第一个
- 内容冲突：后者覆盖前者
```

- [ ] **Step 3: 创建测试文件**

```typescript
// server/src/ai/__tests__/skillAssembly.spec.ts
import { describe, it, expect } from 'vitest'
import { resolveExpertSystemPrompt } from '../plugins/resolveExpertPrompt'

describe('Skill Assembly', () => {
  it('should append skills in order', async () => {
    // 测试拼装顺序
  })

  it('should deduplicate same content', async () => {
    // 测试去重
  })
})
```

- [ ] **Step 4: 运行测试验证**

```bash
cd server && pnpm test -- skillAssembly
```

- [ ] **Step 5: 提交**

```bash
git add ai/docs/extend/skill-assembly-spec.md server/src/ai/__tests__/skillAssembly.spec.ts
git commit -m "docs: add skill assembly specification"
```

---

## Task 2: O-4 Skill 多语言支持

**Files:**
- Modify: `server/src/ai/plugins/types.ts`
- Modify: `server/src/ai/plugins/resolveExpertPrompt.ts`
- Create: `server/config/plugins/skills/reply-en.md`

**Interfaces:**
- Consumes: ExpertDeclaration.skills
- Produces: 多语言 Skill 解析

- [ ] **Step 1: 扩展 Skill 类型定义**

```typescript
// server/src/ai/plugins/types.ts
export interface SkillDeclaration {
  id: string
  label: string
  content?: string
  file?: string
  tools?: string[]
  locale?: string  // 新增：语言标识
}
```

- [ ] **Step 2: 修改 Skill 解析逻辑**

```typescript
// server/src/ai/plugins/resolveExpertPrompt.ts
function resolveSkillByLocale(
  skills: SkillDeclaration[],
  locale: string = 'zh'
): SkillDeclaration | undefined {
  return skills.find(s => s.locale === locale) 
    || skills.find(s => !s.locale)  // 无 locale 的作为默认
    || skills[0]
}
```

- [ ] **Step 3: 创建英文 Skill 示例**

```markdown
<!-- server/config/plugins/skills/reply-en.md -->
You are a helpful AI assistant. Please respond in English.
```

- [ ] **Step 4: 运行测试验证**

```bash
cd server && pnpm test
```

- [ ] **Step 5: 提交**

```bash
git add server/src/ai/plugins/types.ts server/src/ai/plugins/resolveExpertPrompt.ts server/config/plugins/skills/reply-en.md
git commit -m "feat: add locale support for skills"
```

---

## Task 3: O-8 Chat 空状态引导词配置化

**Files:**
- Create: `server/src/ai/routes/chatConfig.ts`
- Modify: `ai/app/src/views/AiChatView.vue`

**Interfaces:**
- Produces: GET /api/ai/chat-config API
- Consumes: chatConfig store

- [ ] **Step 1: 创建后端 API**

```typescript
// server/src/ai/routes/chatConfig.ts
import Router from '@koa/router'

const router = new Router({ prefix: '/api/ai/chat-config' })

router.get('/', async (ctx) => {
  ctx.body = {
    starterPrompts: [
      { text: '帮我创建一个表单', icon: 'edit' },
      { text: '设计一个审批流程', icon: 'connection' },
      { text: '搜索知识库', icon: 'search' },
    ]
  }
})

export default router
```

- [ ] **Step 2: 注册路由**

```typescript
// server/src/ai/index.ts
export { default as chatConfigRouter } from './routes/chatConfig.js'
```

- [ ] **Step 3: 创建前端 Store**

```typescript
// ai/app/src/stores/chatConfig.ts
import { defineStore } from 'pinia'
import { request } from '@/api/shared/request'

export const useChatConfigStore = defineStore('chatConfig', {
  state: () => ({
    starterPrompts: [] as Array<{ text: string; icon: string }>
  }),
  actions: {
    async load() {
      const data = await request<{ starterPrompts: typeof this.starterPrompts }>('/ai/chat-config')
      this.starterPrompts = data.starterPrompts
    }
  }
})
```

- [ ] **Step 4: 修改 Chat 视图**

```typescript
// ai/app/src/views/AiChatView.vue
import { useChatConfigStore } from '@/stores/chatConfig'

const chatConfig = useChatConfigStore()
onMounted(() => chatConfig.load())

// 使用 chatConfig.starterPrompts 替代硬编码
```

- [ ] **Step 5: 运行测试验证**

```bash
cd server && pnpm test
cd ai/app && pnpm test
```

- [ ] **Step 6: 提交**

```bash
git add server/src/ai/routes/chatConfig.ts ai/app/src/stores/chatConfig.ts ai/app/src/views/AiChatView.vue
git commit -m "feat: configurable chat starter prompts"
```

---

## Task 4: 回归测试 - 第一批

**Files:**
- Test: `ai/app/src/__tests__/regression-batch1.spec.ts`

- [ ] **Step 1: 运行单元测试**

```bash
cd server && pnpm test
cd ai/app && pnpm test
```

- [ ] **Step 2: 运行配置校验**

```bash
cd server && pnpm validate:tools
```

- [ ] **Step 3: 启动服务手动测试**

```bash
# 终端 1
cd server && pnpm dev

# 终端 2
cd ai/app && pnpm dev
```

- [ ] **Step 4: 测试路由调试 UI**

- 访问 http://localhost:5300/debug/routing
- 输入测试消息："帮我创建一个表单"
- 点击测试路由
- 验证返回结果

- [ ] **Step 5: 测试插件市场**

- 访问 http://localhost:5300/plugins
- 切换分类标签
- 搜索插件

- [ ] **Step 6: 记录测试结果**

```markdown
## 回归测试结果 - 第一批

| 测试项 | 结果 | 备注 |
|--------|------|------|
| 单元测试 | ✅ | 全部通过 |
| 配置校验 | ✅ | 全部通过 |
| 路由调试 UI | ✅ | 正常工作 |
| 插件市场 | ✅ | 正常工作 |
```

---

## Task 5: N-3 插件在线编辑

**Files:**
- Create: `ai/app/src/components/plugins/PluginEditor.vue`
- Modify: `ai/app/src/views/PluginCenterView.vue`

**Interfaces:**
- Produces: 插件编辑组件
- Consumes: pluginApi

- [ ] **Step 1: 创建 JSON 编辑器组件**

```vue
<!-- ai/app/src/components/plugins/PluginEditor.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: [value: string]
}>()

const editorValue = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  editorValue.value = val
})

function handleSave() {
  try {
    JSON.parse(editorValue.value)
    emit('save', editorValue.value)
  } catch {
    ElMessage.error('JSON 格式错误')
  }
}
</script>

<template>
  <div class="plugin-editor">
    <el-input
      v-model="editorValue"
      type="textarea"
      :rows="20"
      placeholder="输入 JSON 配置"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div class="editor-actions">
      <el-button type="primary" @click="handleSave">保存</el-button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 添加编辑对话框到 PluginCenterView**

```vue
<!-- ai/app/src/views/PluginCenterView.vue -->
<script setup lang="ts">
import PluginEditor from '@/components/plugins/PluginEditor.vue'

const showEditor = ref(false)
const editingPlugin = ref<any>(null)
const editorValue = ref('')

function openEditor(plugin: any) {
  editingPlugin.value = plugin
  editorValue.value = JSON.stringify(plugin, null, 2)
  showEditor.value = true
}

async function handleSave(value: string) {
  // 保存到后端
  showEditor.value = false
}
</script>
```

- [ ] **Step 3: 运行测试验证**

```bash
cd ai/app && pnpm test
```

- [ ] **Step 4: 手动测试**

- 访问插件中心
- 点击编辑按钮
- 修改 JSON
- 保存验证

- [ ] **Step 5: 提交**

```bash
git add ai/app/src/components/plugins/PluginEditor.vue ai/app/src/views/PluginCenterView.vue
git commit -m "feat: plugin online editor"
```

---

## Task 6: O-7 MCP 租户隔离 UI

**Files:**
- Modify: `ai/app/src/views/PluginCenterView.vue`
- Modify: `server/src/ai/mcp/registry.ts`

**Interfaces:**
- Consumes: tenantId from auth store
- Produces: 租户过滤的 MCP 列表

- [ ] **Step 1: 添加租户选择器**

```vue
<!-- ai/app/src/views/PluginCenterView.vue -->
<script setup lang="ts">
const selectedTenant = ref('default')
const tenants = ref([{ id: 'default', name: '默认租户' }])
</script>

<template>
  <el-select v-model="selectedTenant" placeholder="选择租户">
    <el-option
      v-for="tenant in tenants"
      :key="tenant.id"
      :label="tenant.name"
      :value="tenant.id"
    />
  </el-select>
</template>
```

- [ ] **Step 2: 按租户过滤 MCP 列表**

```typescript
// server/src/ai/mcp/registry.ts
export function getMcpServersByTenant(tenantId: string): McpServerConfig[] {
  return mcpServers.filter(s => 
    !s.tenantId || s.tenantId === tenantId
  )
}
```

- [ ] **Step 3: 运行测试验证**

```bash
cd server && pnpm test
cd ai/app && pnpm test
```

- [ ] **Step 4: 提交**

```bash
git add ai/app/src/views/PluginCenterView.vue server/src/ai/mcp/registry.ts
git commit -m "feat: MCP tenant isolation UI"
```

---

## Task 7: 回归测试 - 第二批

- [ ] **Step 1: 运行全量测试**

```bash
cd server && pnpm test
cd ai/app && pnpm test
```

- [ ] **Step 2: 测试插件编辑功能**

- 打开插件中心
- 点击编辑
- 修改并保存

- [ ] **Step 3: 测试租户隔离**

- 切换租户
- 验证 MCP 列表过滤

- [ ] **Step 4: 记录测试结果**

---

## Task 8: O-11 Pack spec v1

**Files:**
- Create: `ai/docs/extend/pack-spec-v1.md`
- Modify: `server/scripts/plugin-pack.ts`

**Interfaces:**
- Produces: Pack 规范文档

- [ ] **Step 1: 定义 Pack 规范**

```markdown
# Plugin Pack Specification v1

## manifest.json

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": "Author Name",
  "experts": [...],
  "skills": [...],
  "tools": [...],
  "mcp": [...]
}
```

## 签名

使用 HMAC-SHA256 对 manifest.json 签名
```

- [ ] **Step 2: 实现打包脚本**

```typescript
// server/scripts/plugin-pack.ts
function packPlugin(dir: string): Buffer {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf-8'))
  // 验证 manifest
  // 打包文件
  // 生成签名
  return zipBuffer
}
```

- [ ] **Step 3: 运行测试验证**

```bash
cd server && pnpm plugin:pack --dir config/plugins/local.example
```

- [ ] **Step 4: 提交**

```bash
git add ai/docs/extend/pack-spec-v1.md server/scripts/plugin-pack.ts
git commit -m "feat: plugin pack spec v1"
```

---

## Task 9: O-12 插件级 metrics

**Files:**
- Create: `server/src/ai/models/pluginMetric.ts`
- Modify: `ai/app/src/views/AiMonitorView.vue`

**Interfaces:**
- Produces: 插件指标收集

- [ ] **Step 1: 定义指标模型**

```typescript
// server/src/ai/models/pluginMetric.ts
interface PluginMetric {
  pluginId: string
  pluginType: 'expert' | 'tool' | 'mcp' | 'skill'
  calls: number
  errors: number
  avgDuration: number
  timestamp: Date
}
```

- [ ] **Step 2: 实现指标收集器**

```typescript
// server/src/ai/services/pluginMetrics.ts
export function recordPluginMetric(metric: PluginMetric): void {
  // 写入数据库
}
```

- [ ] **Step 3: 在监控页面展示**

```vue
<!-- ai/app/src/views/AiMonitorView.vue -->
<script setup>
// 添加插件指标 tab
</script>
```

- [ ] **Step 4: 运行测试验证**

```bash
cd server && pnpm test
```

- [ ] **Step 5: 提交**

```bash
git add server/src/ai/models/pluginMetric.ts server/src/ai/services/pluginMetrics.ts ai/app/src/views/AiMonitorView.vue
git commit -m "feat: plugin metrics collection"
```

---

## Task 10: 回归测试 - 最终

- [ ] **Step 1: 运行全量测试**

```bash
cd server && pnpm test
cd ai/app && pnpm test
```

- [ ] **Step 2: 运行配置校验**

```bash
cd server && pnpm validate:tools
```

- [ ] **Step 3: 手动功能测试**

- 测试所有新功能
- 验证无回归问题

- [ ] **Step 4: 更新文档**

```bash
git add ai/docs/product/backlog.md
git commit -m "docs: update backlog with P2 completion"
```

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: complete all P2 tasks with regression tests"
```

---

## 预计工作量

| 批次 | 任务 | 预计时间 |
|------|------|----------|
| 第一批 | O-3, O-4, O-8 | 2d |
| 回归测试 1 | 测试 | 0.5d |
| 第二批 | N-3, O-7 | 3d |
| 回归测试 2 | 测试 | 0.5d |
| 第三批 | O-11, O-12 | 2d |
| 回归测试 3 | 测试 | 0.5d |
| **总计** | | **8.5d** |
