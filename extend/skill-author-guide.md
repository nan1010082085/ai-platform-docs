# Skill 作者手册

> 本文档面向需要编写、打包和分发 Skill 的开发者。Skill 是插件中心四层能力模型（MCP / Tool / Skill / Expert）中的指令层，负责向 Expert 的 system prompt 注入可复用的行为规范。

**相关文档**：[plugin.md](/plugin) · [Expert 扩展指南](/expert-extension-guide) · 服务端配置 `server/config/plugins/README.md`

---

## 一、Skill 概念

Skill 是一段**可复用的 Markdown 指令块**。它本身不包含运行时逻辑，而是在 Expert 被调用时，其 `content` 被拼接到 Expert 的 system prompt 尾部，从而约束 LLM 的输出行为。

```text
Expert 的 system prompt 构成：

┌──────────────────────────────┐
│  base prompt                 │  ← dynamicPrompt 生成 或 systemPrompt 字段
├──────────────────────────────┤
│  Skill 1 content             │  ← skills[0]
├──────────────────────────────┤
│  Skill 2 content             │  ← skills[1]
├──────────────────────────────┤
│  ...                         │
└──────────────────────────────┘
```

**核心特性**：

- 与 Expert 解耦 — 同一个 Skill 可以挂载到多个 Expert
- 纯声明式 — 只有 `id`、`label`、`content`（或 `file`），没有可执行代码
- 启用/禁用可控 — `enabled: false` 的 Skill 不会被加载到 Registry
- 可携带工具 — `tools` 字段声明该 Skill 需要的工具名，挂载后自动合并到 Expert 的工具集

---

## 二、定义方式

Skill 支持两种内容定义方式：内联（inline）和外部文件（file）。

### 2.1 内联方式

直接在 JSON 的 `content` 字段中写入 Markdown 指令。适合短小的、不需要版本管理的指令。

```json
{
  "id": "platform-reply-zh",
  "label": "中文回复",
  "content": "默认使用简体中文回复；技术术语可保留英文。",
  "enabled": true
}
```

**文件位置**：`server/config/plugins/skills/platform-reply-zh.json`

### 2.2 外部文件方式

通过 `file` 字段引用一个 `.md` 文件，运行时自动读取其内容填充到 `content`。适合较长的、需要独立版本管理的指令。

JSON 声明：

```json
{
  "id": "example-support-tone",
  "label": "客服语气",
  "file": "example-support-tone.md",
  "enabled": false
}
```

对应的 Markdown 文件（与 JSON 同目录）：

```markdown
请使用简洁、专业的客服语气回答；遇到不确定信息时明确说明需人工确认。
```

**解析规则**（见 `loadPluginConfig.ts` 的 `resolveSkillInline` 函数）：

1. 如果 `content` 已有值（非空），`file` 字段被忽略
2. 如果 `file` 是相对路径，基于配置文件所在目录解析
3. 如果 `file` 是绝对路径，直接使用
4. 文件不存在时记录警告，`content` 保持为空

---

## 三、打包分发

### 3.1 包结构

Skill 可以作为独立的 `.json` 文件放到 `plugins/skills/` 目录，也可以打包为可分发的插件包（Plugin Pack）。插件包的标准目录结构：

```
my-pack/
├── manifest.json          # 包元数据
├── mcp/                   # MCP Server 声明（可选）
├── tools/                 # 工具元数据（可选）
├── experts/               # Expert 声明（可选）
└── skills/                # Skill 声明 + .md 文件
    ├── my-skill.json
    └── my-skill.md
```

### 3.2 manifest.json

```json
{
  "id": "my-org-my-pack",
  "name": "My Skill Pack",
  "version": "1.0.0",
  "description": "包含自定义 Skill 的插件包"
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 包唯一标识，推荐 kebab-case 格式 |
| `name` | 是 | 人类可读名称 |
| `version` | 是 | 语义化版本号 |
| `description` | 否 | 包描述 |

### 3.3 打包命令

```bash
cd server/

# 打包为 .tgz
pnpm plugin:pack --dir config/plugins/packs/my-pack --out dist/my-pack.tgz

# 安装到本地覆盖层
pnpm plugin:install --file dist/my-pack.tgz

# 安装到租户覆盖层
pnpm plugin:install --file dist/my-pack.tgz --tenant acme
```

安装后，Skill 文件会被复制到 `plugins/local/` 或 `plugins/tenants/{id}/` 目录。由于加载顺序中后者覆盖同 id，本地覆盖层的 Skill 会替换 `plugins/` 中的同名 Skill。

### 3.4 分发方式

| 方式 | 适用场景 |
|------|----------|
| 直接复制 JSON/MD 到 `plugins/skills/` | 本机开发、单项目使用 |
| 打包为 `.tgz` + `plugin:install` | 跨团队分发、多租户部署 |
| `AI_PLUGIN_CONFIG_PATH` 环境变量 | 临时加载外部 Skill 目录 |

---

## 四、最小示例：从零创建一个 Skill

本节演示创建一个"输出格式约束"Skill，并挂载到 Expert 上。

### 4.1 编写 Skill 声明

创建文件 `server/config/plugins/skills/my-org-output-format.json`：

```json
{
  "id": "my-org-output-format",
  "label": "输出格式约束",
  "content": "回复时使用 Markdown 格式；代码块标注语言类型；列表项使用有序列表；关键结论用粗体标注。",
  "enabled": true
}
```

### 4.2 验证配置

```bash
cd server/
pnpm plugin:validate
```

确认输出中出现 `skills: 5`（原 4 个 + 新增 1 个），无冲突警告。

### 4.3 挂载到 Expert

编辑目标 Expert 的 JSON（例如 `platform.general.json`），在 `skills` 数组中添加新 Skill 的 id：

```json
{
  "id": "platform.general",
  "skills": ["platform-reply-zh", "my-org-output-format"],
  ...
}
```

### 4.4 生效

- 开发态：设置 `AI_PLUGIN_WATCH=1` 启动 server，或发送 `kill -HUP $(pgrep -f "dist/index.js")` 热重载
- 生产态：重启 server 或 SIGHUP

### 4.5 验证

打开 AI Chat，向 General 助手提问，确认回复遵循了 Markdown 格式、有序列表和粗体标注的约束。

---

## 五、与 Expert 的关系

### 5.1 挂载方式

Expert 通过 `skills` 数组引用 Skill 的 id：

```json
{
  "id": "platform.editor",
  "label": "Editor 专家",
  "dynamicPrompt": "editor",
  "skills": ["platform-schema-quality", "platform-reply-zh"],
  "tools": ["schema__search", "generate_schema"]
}
```

运行时，`resolveExpertSystemPrompt` 函数按以下逻辑拼装：

```typescript
// server/src/ai/plugins/resolveExpertPrompt.ts（简化）
const skillBlocks = expert.skills
  .map(id => registry.getSkill(id)?.content?.trim())
  .filter(Boolean)

let base = /* dynamicPrompt 生成 或 systemPrompt 字段 */

if (!skillBlocks.length) return base
if (!base) return skillBlocks.join('\n\n')
return `${base}\n\n${skillBlocks.join('\n\n')}`
```

### 5.2 拼装顺序

1. **base prompt 优先** — 如果 Expert 配置了 `dynamicPrompt`，先通过 `promptBuilder` 生成基础 prompt；否则使用 `systemPrompt` 字段
2. **Skill 按数组顺序追加** — `skills` 数组中的 id 按声明顺序依次解析，每个 Skill 的 `content` 以空行分隔拼接到 base prompt 尾部
3. **缺失的 Skill 被静默跳过** — 如果某个 id 在 Registry 中找不到（未注册或已禁用），该条目被过滤，不影响其他 Skill

### 5.3 工具合并

Skill 可以声明 `tools` 字段，指定该 Skill 所需的工具名。挂载到 Expert 后，这些工具会自动合并到 Expert 的工具集中（去重保序）：

```json
{
  "id": "my-org-rag-skill",
  "label": "RAG 检索指令",
  "content": "回答问题前先使用知识库检索相关信息。",
  "tools": ["rag__search"],
  "enabled": true
}
```

合并逻辑（`PluginRegistry.mergeToolNames`）：先收集 `expert.tools`，再遍历每个 Skill 的 `tools`，去重后返回完整列表。

### 5.4 多 Expert 共享

同一个 Skill 可以被多个 Expert 引用：

```text
platform-reply-zh ──┬── platform.editor
                    ├── platform.flow
                    ├── platform.page
                    └── platform.general
```

修改 `platform-reply-zh` 的内容后，所有引用它的 Expert 在下次加载时都会使用新内容。

---

## 六、最佳实践

### 6.1 命名规范

- **id**：使用纯 kebab-case 格式，如 `platform-schema-quality`、`my-org-output-format`
- **label**：简短的中文描述，用于前端 Plugin Center 展示
- **文件名**：与 id 保持一致，如 `platform-schema-quality.json`

### 6.2 内容编写

- **指令明确** — 使用祈使句，避免模糊表述。好："字段命名用 camelCase"，差："字段命名建议考虑使用驼峰"
- **粒度适中** — 一个 Skill 聚焦一个关注点。如果指令超过 500 字，考虑拆分为多个 Skill
- **避免冲突** — 同一 Expert 挂载的多个 Skill 之间不应有矛盾指令（如一个要求详细、一个要求简洁）
- **Markdown 格式** — `content` 使用 Markdown 编写，LLM 对结构化文本的理解优于纯文本段落

### 6.3 何时用内联 vs 文件

| 场景 | 推荐方式 |
|------|----------|
| 指令不超过 5 行 | 内联 `content` |
| 指令较长或需要独立 diff 追踪 | 外部 `file` |
| 打包分发给外部团队 | 外部 `file`（便于审查） |
| 运行时动态生成 | 不适用 Skill，应使用 `dynamicPrompt` |

### 6.4 测试流程

1. 编写 Skill JSON
2. `pnpm plugin:validate` 检查语法和 id 冲突
3. 将 Skill id 添加到目标 Expert 的 `skills` 数组
4. 热重载或重启 server
5. 在 Chat 中测试：确认 LLM 输出符合 Skill 约束
6. 测试边界情况：Skill 内容为空、Skill 被禁用、多个 Skill 同时挂载

### 6.5 常见陷阱

| 问题 | 原因 | 解决 |
|------|------|------|
| Skill 未生效 | `enabled: false` 或 id 拼写错误 | 检查 JSON 配置和 `pnpm plugin:validate` 输出 |
| 外部文件内容未加载 | `file` 路径错误或文件不存在 | 查看 server 启动日志中的 `[pluginRegistry] skill file not found` 警告 |
| Skill 之间指令冲突 | 两个 Skill 对同一行为有相反要求 | 拆分关注点，或在 Expert 中调整 Skill 顺序（后者覆盖前者语义） |
| 工具未出现在 Expert 中 | Skill 的 `tools` 引用了未注册的工具名 | 确保工具在 `plugins/tools/` 中有对应声明 |

### 6.6 Skill 与 systemPrompt 的选择

| 需求 | 使用方式 |
|------|----------|
| 固定的专家身份和基础行为 | Expert 的 `systemPrompt` 或 `dynamicPrompt` |
| 可复用的行为约束，需挂载到多个 Expert | Skill |
| 需要运行时动态生成的内容 | `dynamicPrompt` + `promptBuilder` |
| 简单的全局偏好（如语言） | 独立 Skill，挂载到所有需要的 Expert |
