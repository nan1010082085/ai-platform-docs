# 高级功能拓展路线图

> 创建日期：2026-07-13
> 角色：高级产品经理 + 架构师

## 一、平台现状分析

### 核心能力矩阵

| 层级 | 能力 | 成熟度 | 备注 |
|------|------|--------|------|
| **对话引擎** | 多轮对话、流式输出、RAG 检索 | ✅ 成熟 | WebSocket 实时通信 |
| **工作流编排** | n8n 风格 DAG、12 种节点类型 | ✅ 成熟 | VueFlow 画布、属性面板 |
| **文档处理** | 文档解析、OCR、摘要 | ✅ 成熟 | 支持 4 种文档来源 |
| **模型管理** | 多 Provider、默认模型、测试连接 | ✅ 成熟 | DeepSeek/OpenAI/Anthropic/Ollama/Mimo |
| **插件体系** | 专家、工具、MCP Server、技能 | ✅ 成熟 | 热加载注册表 |
| **API 开放** | 统一调用、JWT 认证、Webhook | ✅ 成熟 | slug + X-Workflow-Key |
| **监控** | 性能指标、告警、Agent 分布、节点级埋点 | ✅ 成熟 | node-stats API + TTL 自动清理 |
| **图文生成** | DALL-E 代理、图片预览卡片 | ✅ 完成 | POST /api/ai/generate-image |
| **智能建议** | LLM 驱动、上下文感知建议卡片 | ✅ 完成 | POST /api/ai/suggestions |
| **智能拟办** | LLM 提取行动项、持久化、审批流 | ✅ 完成 | POST /api/ai/action-proposals |
| **PPT 生成** | 客户端 pptxgenjs 渲染 | 🔧 前端完成 | 缺 server API（可选，前端已可生成） |

### 架构优势

1. **工作流引擎可扩展**：新增节点类型只需扩展 `AgentNodeType` + 对应 Panel + 执行器
2. **模型层解耦**：通过 `ModelConfigApi` + `useModelOptions` 实现模型热切换
3. **插件中心热加载**：MCP 协议支持外部工具无缝接入
4. **iframe 解耦**：AI 通过 postMessage 与 Editor/Flow 通信，互不侵入

---

## 二、新功能规划

### F1: 智能建议（Smart Suggestions）

**目标**：在用户操作过程中，AI 主动推荐下一步操作、优化方案、相关 Schema/Flow。

**触发时机**：
- 用户在 Editor 中设计表单时 → 推荐字段类型、校验规则
- 用户在 Flow 中设计流程时 → 推荐节点、分支逻辑
- 用户在对话中描述需求时 → 推荐已有 Schema/Flow 模板

**实现方案**：

```
[用户操作上下文] → [contextBuilder] → [LLM 推理] → [建议卡片]
```

**新增工作流模板**：`smart-suggestions`

```
手动触发 → 收集上下文(tool) → LLM 分析 → 条件判断 → 结束
                                    ↓ (有建议)
                                 HITL 确认 → 结束
```

**前端改动**：
- 新增 `SmartSuggestionCard.vue` — 建议卡片组件
- 新增 `useSmartSuggestions.ts` — 监听上下文变化，触发建议
- 在 `AiPreviewPanel` 中集成建议展示

---

### F2: 智能拟办（Smart Action Proposals）

**目标**：AI 根据文档/对话内容，自动生成待办事项、审批流程、任务分配方案。

**触发时机**：
- 上传合同文档 → 提取关键条款 + 生成审批链
- 会议纪要 → 提取行动项 + 分配负责人
- 需求文档 → 生成任务拆解 + 排期建议

**实现方案**：

```
[文档/对话] → [结构化提取] → [拟办生成] → [人工确认] → [执行]
```

**新增工作流模板**：`smart-action-proposals`

```
Webhook 触发 → 文档解析 → LLM 提取行动项 → HITL 确认 → 条件判断
                                                          ↓ (确认)
                                                      HTTP 通知外部系统
                                                          ↓ (拒绝)
                                                        结束
```

**前端改动**：
- 新增 `ActionProposalCard.vue` — 拟办卡片（可勾选、可编辑）
- 扩展 `RequirementConfirmCard.vue` — 支持拟办确认流
- 新增 API：`createActionProposal`, `approveActionProposal`

---

### F3: 图文生成（Image + Text Generation）

**目标**：根据用户描述，AI 生成配图 + 文案的组合内容（公众号文章、产品介绍、营销素材）。

**触发时机**：
- 用户输入"帮我写一篇关于 XX 的公众号文章"
- 用户上传产品图片 → 生成产品描述文案
- 用户描述营销需求 → 生成图文方案

**实现方案**：

```
[用户描述] → [LLM 文案生成] → [图片生成 API] → [图文合并] → [预览]
```

**新增节点类型**：`image-generate`

```typescript
// 扩展 AgentNodeType
type AgentNodeType = ... | 'image-generate'

// 节点数据
interface ImageGenerateNodeData {
  prompt: string           // 图片生成 prompt
  model?: string           // 图片模型（DALL-E 3 / Mimo 图片等）
  size?: '1024x1024' | '1024x1792' | '1792x1024'
  style?: 'natural' | 'vivid'
  quality?: 'standard' | 'hd'
}
```

**新增工作流模板**：`image-text-generation`

```
手动触发 → LLM 文案生成 → 图片生成 → LLM 图文合并 → 结束
```

**前端改动**：
- 新增 `ImageGenerateNodePanel.vue` — 图片生成节点属性面板 ✅
- 新增 `ImagePreviewCard.vue` — 图片预览卡片 ✅
- 扩展 `AiMessage` 支持图片渲染 ✅
- Server: `POST /api/ai/generate-image` ✅

---

### F4: PPT 生成

**目标**：根据用户描述或文档内容，AI 自动生成演示文稿（结构 + 内容 + 配图）。

**触发时机**：
- 用户输入"帮我做一个关于 XX 的 PPT"
- 用户上传文档 → 自动生成汇报 PPT
- 用户上传会议纪要 → 生成会议总结 PPT

**实现方案**：

```
[输入] → [大纲生成] → [逐页内容] → [模板渲染] → [PPT 文件] → [下载]
```

**技术选型**：
- **PPT 渲染引擎**：使用 `pptxgenjs` 在浏览器端生成 .pptx 文件
- **模板系统**：预定义布局模板（标题页、内容页、图表页、对比页、总结页）
- **图片素材**：集成图片生成 API 或使用占位图

**新增节点类型**：`ppt-generate`

```typescript
interface PptGenerateNodeData {
  template?: 'business' | 'tech' | 'education' | 'creative'
  maxSlides?: number       // 最大页数，默认 10
  style?: 'professional' | 'casual' | 'academic'
  includeImages?: boolean  // 是否生成配图
}
```

**新增工作流模板**：`ppt-generation`

```
手动触发 → LLM 大纲生成 → LLM 逐页内容 → PPT 渲染(tool) → 结束
```

**前端改动**：
- 新增 `PptGenerateNodePanel.vue` — PPT 生成节点属性面板 ✅
- 新增 `PptPreviewCard.vue` — PPT 预览卡片（缩略图 + 下载按钮） ✅
- 新增 `pptRenderer.ts` — 浏览器端 PPT 生成工具 ✅
- Server API: 可选（前端已可独立生成 PPT）

---

## 三、实施优先级

| 阶段 | 功能 | 工作量 | 价值 | 优先级 | 实现状态 |
|------|------|--------|------|--------|---------|
| **P0** | Mimo 模型接入 | 0.5d | ⭐⭐⭐ | 🔴 立即 | ✅ 完成（ModelSettingsView + useModelPresets） |
| **P1** | 智能建议 | 3d | ⭐⭐⭐⭐⭐ | 🟠 高 | ✅ 全栈完成（前端 + POST /api/ai/suggestions） |
| **P1** | 智能拟办 | 3d | ⭐⭐⭐⭐⭐ | 🟠 高 | ✅ 全栈完成（前端 + MongoDB 持久化 + 审批 API） |
| **P2** | 图文生成 | 5d | ⭐⭐⭐⭐ | 🟡 中 | ✅ 全栈完成（前端 + POST /api/ai/generate-image） |
| **P2** | PPT 生成 | 5d | ⭐⭐⭐⭐ | 🟡 中 | 🔧 前端完成（pptRenderer + PptPreviewCard），server API 可选 |

---

## 四、技术依赖

### 新增 npm 包

| 包 | 用途 | 阶段 |
|---|---|---|
| `pptxgenjs` | 浏览器端 PPT 生成 | P2 |
| `mimo-sdk`（可选） | Mimo API 封装 | P0 |

### API 端点（server 侧）

| 端点 | 方法 | 用途 | 状态 |
|------|------|------|------|
| `/api/ai/suggestions` | POST | 获取智能建议 | ✅ |
| `/api/ai/action-proposals` | POST | 创建拟办（MongoDB 持久化） | ✅ |
| `/api/ai/action-proposals/:id/approve` | PUT | 审批拟办 | ✅ |
| `/api/ai/generate-image` | POST | 图片生成（代理 OpenAI DALL-E） | ✅ |
| `/api/ai/generate-ppt` | POST | PPT 生成 | ⬜ 可选（前端 pptRenderer 已可生成） |

### MCP 工具（规划中，未实现）

| 工具名 | 类别 | 用途 | 状态 |
|--------|------|------|------|
| `smart__suggest` | langgraph | 智能建议 | ⬜ 规划 |
| `action__propose` | langgraph | 拟办生成 | ⬜ 规划 |
| `image__generate` | langgraph | 图片生成 | ⬜ 规划 |
| `ppt__generate` | langgraph | PPT 生成 | ⬜ 规划 |

---

## 五、Mimo 模型接入详情

### API 兼容性

Mimo v2.5 兼容 OpenAI Chat Completions API：

```bash
curl https://api.mimo.ai/v1/chat/completions \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mimo-v2.5",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 前端接入点

1. **ModelProvider 类型** — 已添加 `'mimo'`
2. **ModelSettingsView** — 已添加 Mimo 选项、占位符、颜色标签
3. **useModelOptions** — 无需改动，已支持任意 Provider
4. **usePluginRegistry** — 无需改动
5. **LLM Node** — 无需改动，通过 model config 选择即可

### 默认配置

```json
{
  "name": "Mimo v2.5",
  "provider": "mimo",
  "model": "mimo-v2.5",
  "baseUrl": "https://token-plan-cn.xiaomimimo.com/v1",
  "parameters": { "temperature": 0.7, "maxTokens": 4096 }
}
```

### 环境变量

```bash
# 在 .env 中配置（不要明文写入代码）
MIMO_API_KEY=your-mimo-api-key
MIMO_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5
```
