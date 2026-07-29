# Skill 拼装顺序与冲突规范

> 本文档定义 Skill 如何拼入 Expert system prompt 的完整规则，包括拼装顺序、分隔符、冲突处理、版本控制与最佳实践。
> 实现代码：`server/src/ai/plugins/resolveExpertPrompt.ts`、`server/src/ai/plugins/registry.ts`、`server/src/ai/plugins/loadPluginConfig.ts`

---

## 一、拼装顺序

`resolveExpertSystemPrompt` 的拼装流程分两步：先确定 base prompt，再按顺序拼接 Skill blocks。

### 1.1 Base prompt 解析（二选一，互斥）

```
if expert.dynamicPrompt 存在
    → 从 promptBuilder 动态生成（editor / flow / page / general）
else if expert.systemPrompt 非空
    → 直接使用内联字符串
else
    → base = ''（空字符串）
```

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | `dynamicPrompt` | 运行时从 metadata 生成，内容随 Widget/FlowNode 元数据变化 |
| 2 | `systemPrompt` | 静态内联字符串，适合简单场景 |
| 3 | 空 | 无 base，仅拼 Skill |

### 1.2 Skill 拼接

```typescript
const skillBlocks = (expert.skills ?? [])          // 1. 取 Expert 声明的 skills 数组
  .map((id) => registry.getSkill(id)?.content?.trim())  // 2. 按 id 从 Registry 查 content
  .filter((block): block is string => Boolean(block))   // 3. 过滤空值 / 未找到的 Skill
```

**关键点**：
- `expert.skills` 是**有序数组**，拼装顺序严格按数组下标
- `registry.getSkill(id)` 返回 `undefined` 时静默跳过（不报错）
- `content` 为空或 `enabled: false` 的 Skill 不参与拼装

### 1.3 最终拼接

```typescript
if (!skillBlocks.length) return base                    // 无 Skill → 仅 base
if (!base) return skillBlocks.join('\n\n')              // 无 base → 仅 Skill
return `${base}\n\n${skillBlocks.join('\n\n')}`         // base + Skill
```

### 1.4 完整拼装示意

以 `platform.editor` 为例：

```
┌─────────────────────────────────────────────┐
│  base prompt (dynamicPrompt: "editor")       │
│  = buildEditorSystemPrompt(metadata)         │
│    - Widget 类型体系                          │
│    - Schema 结构                              │
│    - 事件/联动/变量/数据源系统                  │
│    - 核心规则                                 │
│    - 典型示例                                 │
│    - 工具调用规范                              │
│    - 输出格式                                 │
├─────────────────────────────────────────────┤
│  \n\n                                        │
├─────────────────────────────────────────────┤
│  Skill[0]: platform.schema-quality           │
│  "生成表单 Schema 时：字段命名用 camelCase；   │
│   每个输入组件必须有 label；必填项设置 required；│
│   避免重复 field id。"                        │
├─────────────────────────────────────────────┤
│  \n\n                                        │
├─────────────────────────────────────────────┤
│  Skill[1]: platform.reply-zh                 │
│  "默认使用简体中文回复；技术术语可保留英文。"    │
└─────────────────────────────────────────────┘
```

---

## 二、分隔符

| 位置 | 分隔符 | 说明 |
|------|--------|------|
| base ↔ Skill[0] | `\n\n` | 双换行，Markdown 段落分隔 |
| Skill[n] ↔ Skill[n+1] | `\n\n` | 同上 |

- 分隔符固定为 `\n\n`，**不支持自定义**
- 各 Skill block 内部可自由使用 Markdown 格式（标题、列表、表格等）
- LLM 将 `\n\n` 视为段落边界，不会混淆不同 Skill 的指令

---

## 三、冲突处理

### 3.1 同名 Skill 覆盖规则

Skill 以 `id` 为唯一键存储在 `Map<string, SkillDeclaration>` 中。**后注册的覆盖先注册的**。

#### 配置加载顺序（`loadPluginConfig.ts`）

```
① config/plugins/           ← 基础层
② config/plugins/local/     ← 本机覆盖（gitignore）
③ config/plugins/tenants/{AI_PLUGIN_TENANT_ID}/  ← 租户覆盖（可选）
④ AI_PLUGIN_CONFIG_PATH     ← 外部配置（环境变量）
```

每层调用 `mergeManifests`，对 `skills` 数组按 `id` 合并：

```typescript
// mergeManifests 内部
const mergeById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
  const map = new Map<string, T>()
  for (const item of a) map.set(item.id, item)
  for (const item of b) map.set(item.id, { ...map.get(item.id), ...item })
  return [...map.values()]
}
```

**结果**：同 `id` 的 Skill，后层的字段**浅合并覆盖**前层。

#### 示例

```
# ① config/plugins/skills/platform.reply-zh.json
{ "id": "platform.reply-zh", "content": "默认使用简体中文回复；技术术语可保留英文。" }

# ② config/plugins/local/skills/platform.reply-zh.json
{ "id": "platform.reply-zh", "content": "请用繁體中文回覆。" }

# 最终 Registry 中 content = "请用繁體中文回覆。"
```

### 3.2 同一 Expert 引用重复 Skill

如果 `expert.skills` 数组中出现重复 id：

```json
{ "skills": ["platform.reply-zh", "platform.reply-zh"] }
```

**行为**：`registry.getSkill(id)` 返回同一个对象，content 被拼接两次。这是配置错误，应避免。

### 3.3 Skill 指令冲突（语义层面）

当多个 Skill 的 content 存在语义矛盾时（如一个说"用中文"，另一个说"用英文"），**LLM 以后出现的指令为准**（recency bias）。

**拼装顺序决定优先级**：`expert.skills` 数组中靠后的 Skill 优先级更高。

```
skills: ["platform.reply-zh", "custom.reply-en"]
→ 先拼中文指令，再拼英文指令
→ LLM 倾向于遵循英文指令（后出现）
```

### 3.4 Skill 与 base prompt 冲突

Skill 拼接在 base prompt **之后**，因此 Skill 指令优先级高于 base prompt。

```
base: "请用中文回复"（来自 dynamicPrompt 生成的 prompt）
Skill: "Please reply in English"
→ LLM 倾向于用英文回复
```

**设计原则**：Skill 应补充而非覆盖 base prompt 的核心行为。需要覆盖 base 行为时，应确认这是有意为之。

---

## 四、版本控制

### 4.1 热重载机制

Skill 配置变更后，需要触发 Registry 重载才能生效：

| 方式 | 触发 | 适用场景 |
|------|------|----------|
| SIGHUP | `kill -HUP $(pgrep -f "dist/index.js")` | 生产环境 |
| `AI_PLUGIN_WATCH=1` | 文件变更自动重载 | 开发环境 |
| 重启进程 | 重启 server | 兜底 |

### 4.2 Skill 更新后的行为

1. **Skill content 变更**：重载后，所有引用该 Skill 的 Expert 下次调用时使用新 content
2. **Skill `enabled` 变为 `false`**：重载后该 Skill 从 Registry 移除，不再拼入任何 Expert
3. **新增 Skill**：重载后可被 Expert 的 `skills` 数组引用
4. **删除 Skill 文件**：重载后该 Skill 消失，引用它的 Expert 对应位置变为空（被 filter 过滤）

### 4.3 无版本号设计

当前 Skill 没有 `version` 字段。变更以**文件内容为准**，重载即生效。如需灰度或回滚，通过 `tenants/{id}/` 或 `local/` 目录的文件切换实现。

---

## 五、最佳实践

### 5.1 Skill 编写原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **单一职责** | 每个 Skill 只管一件事 | `platform.reply-zh` 只管语言，`platform.schema-quality` 只管 Schema 质量 |
| **补充不覆盖** | Skill 应补充 base prompt 缺失的约束，而非重复或矛盾 | base 已有"字段命名用 camelCase"，Skill 不再重复 |
| **具体不模糊** | 指令应明确可执行 | "字段命名用 camelCase" 而非 "注意命名规范" |
| **简短不冗长** | Skill 是附加指令，不是完整 prompt | 控制在 3-5 条规则内 |

### 5.2 命名规范

| 规则 | 说明 | 示例 |
|------|------|------|
| 使用 `{scope}.{功能}` 格式 | scope 区分来源，功能描述作用 | `platform.reply-zh`、`acme.compliance` |
| 避免与 base prompt 中已有的指令重复 | 重复指令浪费 token 且可能引起混淆 | — |
| 使用 kebab-case | 与平台其他 id 命名一致 | `platform.schema-quality` 而非 `platform.schemaQuality` |

### 5.3 避免冲突的编写方式

#### 5.3.1 不要在 Skill 中重复 base prompt 已有的内容

```json
// BAD — base prompt (editor) 已有完整的 Widget Schema 结构说明
{
  "id": "custom.schema-format",
  "content": "每个 Widget 必须包含 id、name、type、field、label、props、position 字段。"
}

// GOOD — 只补充 base prompt 未覆盖的约束
{
  "id": "custom.schema-constraints",
  "content": "表单中 email 字段必须配置 validateRule 为 email 格式校验。"
}
```

#### 5.3.2 不要在不同 Skill 中给出矛盾的指令

```json
// BAD — 两个 Skill 对语言要求矛盾
{ "id": "a.reply-zh", "content": "使用简体中文回复。" }
{ "id": "b.reply-en", "content": "Reply in English." }

// GOOD — 语言统一由一个 Skill 管理
{ "id": "platform.reply-zh", "content": "默认使用简体中文回复；技术术语可保留英文。" }
```

#### 5.3.3 通过 `expert.skills` 数组顺序控制优先级

```json
// 需要合规约束优先于通用质量约束时
{
  "skills": ["platform.schema-quality", "acme.compliance"]
}
// acme.compliance 拼在后面，优先级更高
```

#### 5.3.4 利用 `local/` 目录做临时覆盖，不改基础配置

```bash
# 需要临时修改 platform.reply-zh 的行为
# 创建 local/skills/platform.reply-zh.json 覆盖即可
# 基础配置保持不变，便于回滚
```

#### 5.3.5 避免在 Skill 中使用绝对化指令

```json
// BAD — 与 base prompt 的示例可能冲突
{ "id": "custom.no-table", "content": "绝对禁止使用 table 组件。" }

// GOOD — 给出倾向性建议
{ "id": "custom.prefer-list", "content": "优先使用 search-list 替代 table，除非需要复杂的列排序和分页。" }
```

### 5.4 Skill content 格式建议

```markdown
## 简短标题（可选）

规则 1：具体约束描述。
规则 2：具体约束描述。
规则 3：具体约束描述。
```

- 使用 Markdown 格式，LLM 解析效果好
- 以规则列表为主，避免长段落
- 不需要包含"你是 XXX 专家"之类的角色设定（那是 base prompt 的事）

---

## 六、完整流程图

```
Expert 配置
  ├── dynamicPrompt / systemPrompt  →  base prompt
  └── skills: [id1, id2, ...]
        │
        ▼
PluginRegistry.getSkill(id)
  ├── 找到且 enabled=true  →  skill.content
  └── 未找到 / disabled    →  null（跳过）
        │
        ▼
过滤空值，保留有效 content
        │
        ▼
拼装: base + "\n\n" + skill1.content + "\n\n" + skill2.content + ...
        │
        ▼
最终 system prompt → 发送给 LLM
```

---

## 七、相关代码索引

| 文件 | 职责 |
|------|------|
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Skill 拼装核心逻辑 |
| `server/src/ai/plugins/registry.ts` | Skill 注册表（Map 存储、按 id 查找） |
| `server/src/ai/plugins/loadPluginConfig.ts` | 配置加载、分层合并、热重载 |
| `server/src/ai/plugins/types.ts` | `SkillDeclaration` 类型定义 |
| `shared/platform-shared/ai/promptBuilder.ts` | base prompt 动态生成（editor/flow/page） |
| `server/config/plugins/skills/` | 生产 Skill 配置文件 |
