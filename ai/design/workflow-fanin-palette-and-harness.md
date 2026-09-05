# 工作流合流 · 面板 UX · Harness 演进 — 计划与设计

> **状态:** 已关闭（2026-09-05：merge 就绪调度 + palette 精简 + comic-storyboard + 文档/单测；余「搜索预填 toolName」为增强项）  
> **日期:** 2026-09-04  
> **优先级:** P0 合流语义 + 面板 UX；Harness **不紧急**，仅保留设计方向  
> **相关:** [agent-workflow.md](../agent-workflow.md) · [runtime.md](./runtime.md) · [workflows.md](./workflows.md) · [nav-and-kb-gaps.md](../product/nav-and-kb-gaps.md) · [plugin-architecture-principles.md](../../../ai/docs/design/plugin-architecture-principles.md)

---

## 一、问题陈述（已核实）

### 1.1 多路上游无法自然进入上下文

**用户场景（AI 漫剧类）：**

```text
角色设定 ──┐
场景描述 ──┼──► 生成分镜 / 生图
风格参考 ──┘
```

**现状证据：**

| 层 | 行为 | 代码锚点 |
|----|------|----------|
| 画布连线 | 允许多条边指向同一 `target`（Vue Flow `onConnect` 不限制入度） | `AgentWorkflowCanvas.vue` `onConnect` |
| 执行步进 | **单后继**，从当前节点 `pickNextNode` 只选一条出边 | `agentWorkflowExecutor.ts` `pickNextNode` |
| 节点上下文 | 默认注入 **`lastOutput`（单一上游）** | `runNode` / LLM `contextHint` |
| 历史输出 | `nodeOutputs[nodeId]` 保留各节点输出，须 Prompt 手写 `{{$node.id}}` | `agentWorkflowTemplateResolver.ts` |
| 并行/汇聚 | **无** `fork` / `join` / `merge` 节点类型 | `nodeTypes` 无对应 type |

**结论：** 图可「看起来」fan-in，运行时不会「多源跑完再合流」；漫剧式多材料合成 **不原生支持**。

### 1.2 节点面板过长、难选

**现状证据：**

| 来源 | 行为 | 锚点 |
|------|------|------|
| 内置类型 | ~40+ 固定项，分类默认展开 | `plugins/config/nodeTypes.ts` |
| 动态专家 | Registry 每个专家 → palette 一项 | `registry-bridge/palette.ts` `expertToPaletteItem` |
| 动态工具 | Registry 每个工具 → palette 一项（全部进「工具」） | `toolToPaletteItem` |
| 搜索 | 有关键词过滤，无收藏/最近/场景包 | `AgentWorkflowPalette.vue` |

**结论：** 选择成本随工具/专家数量线性膨胀；搜索无法替代信息架构。

### 1.3 Workflow → Harness（不紧急）

| 现状 | 说明 |
|------|------|
| 独立 `ai/harness` / DSH | **已清理，明确不做**（`product/backlog.md`） |
| Cordis 客户端容器 | 保留：导航/节点/面板/工具注册；**workflow 是数据不是插件** |
| 节点生命周期 hook | **无** `beforeNode` / `afterNode` |
| 工作流级回调 | 仅有 `webhook-trigger` + `onCompleteWebhook` |

Harness 本文件 **第三节只写设计方向**，不排期、不拆实施 Task。

---

## 二、目标与非目标

### 2.1 目标（本计划要交付）

1. **合流语义（Fan-in / Merge）**  
   - 多条入边指向同一节点时，有明确、可测的运行时语义  
   - 下游 LLM/专家/生图节点可 **自动拿到多路上游输出**（不必只靠手写 `{{$node}}`）  
   - 能支撑「漫剧分镜」类模板（角色 + 场景 + 风格 → 生成）

2. **面板 UX**  
   - 顶层 palette **短且可扫**（推荐集 + 分类折叠策略）  
   - 工具/专家改为 **节点内二级选择**，不再每个工具占一条 palette  
   - 保留搜索；增加最近使用（可选收藏）

### 2.2 非目标（本计划不做）

- 恢复 DSH / 独立 harness 运行时  
- 完整图级并行调度引擎（可先串行等待汇聚，真并行列为后续）  
- 改 Chat LangGraph 主图结构  
- 中文文案以外的产品改名大扫除（已另见 `nav-and-kb-gaps`）

### 2.3 成功标准

| ID | 标准 | 验证方式 |
|----|------|----------|
| S1 | 存在可配置的合流节点或「多入边自动组装」策略，单测覆盖 | server Vitest |
| S2 | 漫剧样板模板：≥3 上游 → 1 生成节点，执行成功且 Prompt 含三路上游内容 | 集成/模板测试 + 手动设计器 |
| S3 | 默认 palette 顶层可见项 ≤ 约定上限（建议 **≤18** 内置核心 + 入口型节点） | 前端单测断言 list 长度策略 |
| S4 | 工具/专家通过「工具节点 / 专家节点」属性面板选择，palette 不再平铺全量工具 | UI + `shellContrib`/palette 单测 |
| S5 | 文档：`agent-workflow.md` + `runtime.md` 更新合流与面板语义 | 文档评审 |

---

## 三、Harness 演进设计（方向稿 · 不排期）

> 目的：回答「如何设计，才能把 workflow 演变成 harness」，**不是当前 Sprint 任务**。

### 3.1 概念对齐

| 概念 | 在本平台的含义 |
|------|----------------|
| **Workflow** | 可发布的 DAG 数据 + `agentWorkflowExecutor` 顺序执行 |
| **Harness（目标态）** | 包在执行器外的 **运行时契约层**：钩子、策略、工具权限、会话预算、可观测、可插拔适配器 |
| **Cordis 插件** | UI/能力注册；**不**承载 workflow 定义 |

```text
今日：
  Trigger → agentWorkflowExecutor → nodes → end
           （偶发 onCompleteWebhook）

目标：
  Trigger → WorkflowHarness.run(graph, input, session)
              ├─ hooks: beforeRun / beforeNode / afterNode / onError / afterRun
              ├─ policy: 工具白名单、配额、租户隔离
              ├─ context: 合流、记忆、附件、多模态总线
              └─ sink: WS 事件、评测、外部回调
                    │
                    ▼
              agentWorkflowExecutor（仍可作内核，或逐步内核化）
```

### 3.2 设计原则（避免重蹈 DSH）

1. **Harness 是薄适配层，不是第二套 Agent 服务**  
2. **Workflow 仍是 JSON 图数据**；Harness 不把每条流变成插件包  
3. **钩子先内置、后脚本**：先 TypeScript 注册表，再考虑用户脚本/沙箱  
4. **与 Chat 共用策略面**：工具权限、配额、专家解析尽量一套 Registry  
5. **可渐进**：先 hook 空实现打点，再接合流/评测/外部系统  

### 3.3 建议分阶段（仅路线图）

| 阶段 | 内容 | 依赖 |
|------|------|------|
| H0 | 定义 `WorkflowHarness` 接口 + 默认透传 executor（零行为变化） | 无 |
| H1 | `beforeNode` / `afterNode` / `onError` 钩子 + 指标/日志消费者 | H0 |
| H2 | 策略：工具白名单、日配额、租户 | H1 + 现有 keys/quota |
| H3 | 上下文总线：合流结果、多模态附件统一挂到 `RuntimeContext` | **本计划合流交付后** |
| H4 | 外部适配器（可选）：HTTP hook URL、脚本、评测探针 | H1 |

### 3.4 与本计划的关系

- **合流 + 面板** 是 H3 的前置能力（上下文要能汇、节点要好选）  
- Harness **等合流稳定后再开 H0**，避免同时改执行语义与外壳  

---

## 四、方案设计：合流语义（P0）

### 4.1 推荐方案：显式 `merge` 节点 + 入边等待（Join）

**为什么不选「任意节点自动 fan-in」：**  
隐式合流会破坏现有「单路径 + lastOutput」心智，且与 `if` / 多出边路由冲突难推理。

**推荐语义：**

```text
A ──┐
B ──┼──► [merge] ──► LLM / 生图
C ──┘
```

1. 上游 A/B/C **均可到达 merge**（见 4.2 调度）  
2. `merge` 在所有 **已连接的入边源节点** 成功后触发（可配置：`wait: all | any`）  
3. `merge` 输出结构固定，供下游模板与自动注入：

```typescript
/**
 * merge 节点标准输出
 */
interface MergeNodeOutput {
  /** 按上游 nodeId 索引的输出 */
  sources: Record<string, unknown>
  /** 按连线顺序的数组（便于 Prompt 拼接） */
  items: Array<{ nodeId: string; label?: string; output: unknown }>
  /** 可选：拼接后的纯文本，供 LLM 直接用 */
  text?: string
}
```

4. 下游 LLM：默认 `lastOutput` = merge 输出；Prompt 仍可用 `{{$node.merge-1.sources.role}}` 等  

### 4.2 调度策略（分两档）

**档 A（本计划必须交付）— 串行汇聚（Sequential Join）**

- 不引入真并行线程  
- 图校验：merge 的每个入边源必须能从 `entry` **唯一路径**到达，或提供显式「分支汇合」结构  
- 更务实的实现：**从 entry 做拓扑展开**，对 merge 的前驱按拓扑序依次执行，执行完再跑 merge  
  - 若当前 executor 仍是「当前节点 → 单后继」循环：需改为 **就绪队列 / 前驱计数**（见 Task）

**档 B（后续可选）— 真并行**

- 无依赖的前驱 `Promise.all`  
- streaming 推送需按 nodeId 隔离（executor 已有 agent-team parallel 防覆盖经验）

**本计划锁定档 A**；档 B 单独立项。

### 4.3 画布与校验

| 规则 | 级别 |
|------|------|
| 非 merge 节点：建议入度 ≤ 1（warning）；多入边提示「请用合流节点」 | warning |
| merge 节点：入度 ≥ 2（warning 若 <2） | warning |
| merge → 必须有出边或为 end 前一跳 | warning |
| 环检测：沿用 visited / MAX_VISITS | error |

### 4.4 漫剧样板模板（交付物）

模板 ID 建议：`comic-storyboard`（中文名：**漫剧分镜**）

```text
manual-trigger
  → llm「角色设定」
  → llm「场景描述」   （串行写出三个 nodeOutputs；或三角并行仅档 B）
  → llm「风格参考」
  → merge（sources=上述三节点）
  → llm / image-generate「分镜生成」
  → end
```

**档 A 落地形态：** 三角串行再 merge（merge 仍演示多源组装 API）；或 trigger 后三条链在拓扑上汇入 merge（执行器用前驱计数）。优先 **前驱计数 + 多入边**，否则漫剧叙事不完整。

### 4.5 涉及文件地图（合流）

| 区域 | 路径 | 职责 |
|------|------|------|
| 类型 | `shared/platform-shared/ai/agentWorkflow*`（或现类型源） | `AgentNodeType` 增加 `merge`；节点 data：`mergeWait` / `mergeTextTemplate` |
| 校验 | `validateAgentWorkflowGraph` | 入度规则、merge 配置 |
| 执行 | `server/src/ai/services/agentWorkflowExecutor.ts` | 就绪调度 + `runMergeNode` |
| 模板解析 | `agentWorkflowTemplateResolver.ts` | 支持 `sources` / `items` |
| 前端常量 | `ai/app/src/plugins/config/nodeTypes.ts` | palette 项「合流」 |
| 面板 | `.../panels/MergeNodePanel.vue` + `node-panels` 注册 | 等待策略、文本模板 |
| 节点 UI | `AgentFlowNode.vue` | merge 可多 target 入边视觉 |
| 模板工厂 | platform-shared templateFactories | `comic-storyboard` |
| 单测 | `server/.../agentWorkflowExecutor*.spec.ts` | 多前驱汇合 |
| 文档 | `docs/ai/agent-workflow.md` · `runtime.md` | 语义说明 |

> **隔离规则：** 合流必须改 `server/` + `shared/` + `ai/`。实施时按仓分别开 PR，接口契约先冻结再并行前端。

---

## 五、方案设计：面板 UX（P0）

### 5.1 信息架构

```text
Palette 顶层（短）：
  触发器（2–3）
  智能（LLM / 文档 / 视觉 / 记忆 / 智能团队 / 智能体循环 … 精选）
  逻辑（if / 合流 / HITL / end）
  动作（HTTP / 图文 / PPT … 精选）
  ── 入口型 ──
  专家（单个 palette 项 → 面板内选 expertId）
  工具（单个 palette 项 → 面板内选 toolName）

不再：每个 MCP 工具、每个专家占一行 palette
```

### 5.2 交互细节

1. **默认折叠**：非「触发器 / 智能 / 逻辑」分类默认折叠；或只展开「智能」  
2. **搜索**：继续搜 label/description；搜索命中工具/专家时，结果展示为「工具 · xxx」「专家 · xxx」，拖入仍落到通用 `tool` / `expert` 节点并预填 id  
3. **最近使用**：`localStorage` 键 `ai.workflow.palette.recent`（最多 8），置顶「最近」分组  
4. **属性面板**：`ExpertPluginNodePanel` / Tool 面板强化为可搜索 Select（已有基础则补齐空态与来源标记）  
5. **中文**：分类与项遵循 `nav-and-kb-gaps`（无 Agent/RAG/MCP 字样）

### 5.3 Registry 桥接调整

| 现状 | 目标 |
|------|------|
| `toolToPaletteItem` → 每工具一项 | **停止**向 palette 批量 `setDynamic` 工具项；改为工具面板数据源 |
| `expertToPaletteItem` → 每专家一项 | 仅保留 **一个**「专家」入口；或「常用专家」≤3 可配置白名单 |

动态列表 API 可保留给面板 Select，不进左侧长列表。

### 5.4 涉及文件地图（面板）

| 路径 | 职责 |
|------|------|
| `registry-bridge/palette.ts` | 拆分：`toolsForPanel()` / `expertsForPanel()` vs palette 精简 |
| `registry-bridge` 装载处 | 不再 `setDynamic` 全量工具 |
| `AgentWorkflowPalette.vue` | 最近使用、默认折叠、搜索映射 |
| `ExpertPluginNodePanel.vue` / Tool 面板 | 可搜索、分组、来源 hint |
| `plugins/__tests__/…` | 断言 palette 不含全量 toolName 列表 |
| `docs/ai/design/workflows.md` | 线框更新 |

> 面板 UX **主要在 `ai/`**，可不改 server。

---

## 六、实施计划（可勾选 Task）

> **For agentic workers:** 建议 `subagent-driven-development` 或按 Task 顺序执行。Steps 用 `- [ ]`。  
> **Harness 不在下列 Task 中。**

**Goal:** 交付合流节点（串行汇聚）+ 精简 palette，使漫剧类多源上下文与节点选择可用。

**Architecture:** Executor 改为「前驱就绪」调度以支持 merge join；Palette 改为精选 + 节点内选工具/专家；类型与校验落在 shared + server + ai。

**Tech Stack:** Vue 3 · Vue Flow · Koa · Vitest · platform-shared 类型

**Spec:** 本文档第二～五节

### Global Constraints

- 中文用户可见文案无 Agent / RAG / MCP 字样（`nav-and-kb-gaps`）  
- 禁止空 `catch`；错误及时暴露  
- 图标只用 `AppIcon` 已注册名  
- workflow 仍是数据，不做成 Cordis 插件  
- 用户未要求勿 `git commit`  
- 跨仓改动：`shared` → `server` → `ai`/`docs` 契约先冻结  

---

### Wave 0 — 契约冻结（0.5d）

#### Task W0.1：冻结 Merge 输出类型与调度伪代码

- [x] 在 `docs/ai/design/` 或 shared 类型草案中确认 `MergeNodeOutput` 字段名  
- [x] 写清「前驱计数」伪代码进本文附录 A（或独立 ADR 一段）  
- [x] 评审通过后再动代码  

**验收:** 前后端对 `sources` / `items` / `mergeWait` 无歧义  

---

### Wave 1 — 面板 UX（可与 Wave 2 前期并行）（1.5–2d）

#### Task P1：停止工具平铺进 palette

- [x] 改 `registry-bridge`：全量工具只供给面板，不 `setDynamic` 进 palette  
- [x] 保留单个 `type: 'tool'` 内置 palette 项  
- [x] 单测：`host.nodeTypes.list()` 中 `category==='tools'` 且带 `toolName` 的动态项为 0（或仅白名单）  

**验收:** 打开设计器，左侧工具区不再刷屏  

#### Task P2：专家平铺改为入口 + 面板选择

- [x] 动态专家默认不进 palette（或最多 N 个常用）  
- [x] 强化专家面板 Select（搜索、description）  
- [x] 单测 + 手动：拖「专家」→ 面板选 `platform.editor`  

#### Task P3：Palette 交互打磨

- [x] 默认折叠策略  
- [x] 「最近」分组 + localStorage  
- [ ] 搜索命中工具/专家时拖入预填  
- [x] 更新 `workflows.md` 线框  

**验收:** S3、S4  

---

### Wave 2 — 合流语义（2–4d）

#### Task M1：shared 类型 + 校验

- [x] `AgentNodeType` 增加 `merge`  
- [x] `AgentWorkflowNodeData`：`mergeWait?: 'all' | 'any'`，`mergeTextTemplate?: string`  
- [x] `validateAgentWorkflowGraph`：入度 warning、merge 配置  
- [x] shared 单测  

#### Task M2：Executor 就绪调度（档 A）

- [x] 引入前驱映射：`incoming[target] = sources[]`  
- [x] 节点完成后：对每个后继 `remainingPreds[succ]--`；为 0 则入队  
- [x] `merge`：`wait=all` 时等全部前驱 success；组装 `MergeNodeOutput`  
- [x] 兼容旧图：入度 1 的链行为与今日一致（回归单测）  
- [x] 环与 MAX_VISITS 仍有效  

**验收:** 新单测「A,B → merge → end」输出含 A、B；旧模板冒烟绿  

#### Task M3：前端 merge 节点

- [x] `nodeTypes` 注册「合流」  
- [x] `MergeNodePanel.vue` + `node-panels`  
- [x] 画布：非 merge 多入边 warning（保存时 toast / 校验面板）  

#### Task M4：漫剧模板 + 文档

- [x] 模板 `comic-storyboard`（或中文 id 映射表）  
- [x] `agent-workflow.md` / `runtime.md` / `workflows.md` 更新  
- [x] 手动：从模板创建 → 执行 → 下游可见三路内容  

**验收:** S1、S2、S5  

---

### Wave 3 — 收尾

#### Task R1：回归与发布说明

- [x] 跑 server + ai 相关 Vitest  
- [x] changelog / 产品说明短段落  
- [x] backlog 链到本文，勾选完成项  

---

## 七、风险与决策表

| 风险 | 影响 | 缓解 |
|------|------|------|
| 改调度破坏旧线性图 | 高 | 入度 1 路径保持 `pickNextNode` 等价；大量旧模板回归 |
| 前驱永远等不齐（上游 error） | 中 | merge 失败策略：`fail-fast`（默认）记录 error |
| 面板去掉平铺后「发现性」下降 | 中 | 搜索仍索引全量工具/专家；文档+空态引导 |
| 真并行被误认为已交付 | 低 | 文档写明档 A；档 B 另开 |

### 已拍板（本计划内）

| 决策 | 选择 |
|------|------|
| 合流形态 | 显式 `merge` 节点，非隐式任意 fan-in |
| 调度 | 档 A 串行/就绪汇聚，不做真并行 |
| 面板 | 工具/专家二级选择，palette 精简 |
| Harness | 仅设计方向，不排期 |

### 待产品确认（不阻塞 Wave 1）

| 问题 | 选项 |
|------|------|
| 非 merge 多入边 | 仅 warning vs 保存 error |
| 常用专家白名单 | 0 vs ≤3 仍显示在 palette |
| 漫剧模板是否进默认 `AGENT_WORKFLOW_TEMPLATES` | 是 / 实验标记 |

---

## 八、附录 A — 就绪调度伪代码（档 A）

```typescript
// 启动
const remaining = new Map<string, number>() // nodeId → 未完成前驱数
for (const n of nodes) remaining.set(n.id, incoming[n.id]?.length ?? 0)
const queue = [entryNodeId]
const done = new Set<string>()

while (queue.length) {
  const id = queue.shift()!
  if (done.has(id)) continue
  const node = getNode(id)
  if (node.type === 'merge' && node.data.mergeWait !== 'any') {
    // 前驱计数已为 0 才入队，此处直接组装 sources
  }
  const result = await runNode(node, ctx)
  // 写 nodeOutputs / lastOutput
  done.add(id)
  for (const edge of outgoing[id]) {
    const t = edge.target
    remaining.set(t, (remaining.get(t) ?? 1) - 1)
    if (remaining.get(t) === 0) queue.push(t)
  }
}
```

> 与今日「只跟一条出边」的差异：一个节点可激活 **多个** 后继（fork 扇出）；merge 靠前驱计数实现 join。

---

## 九、附录 B — 验收清单（发布前）

- [x] S1 合流单测绿  
- [x] S2 漫剧模板可跑通  
- [x] S3 palette 顶层可控  
- [x] S4 工具/专家二级选择  
- [x] S5 文档已更新  
- [x] 旧模板回归通过  
- [x] 中文 UI 无 Agent/RAG/MCP 产品词（合流/面板新增文案）  

---

## 十、修订记录

| 日期 | 说明 |
|------|------|
| 2026-09-04 | 初稿：合流 + 面板实施计划；Harness 仅设计方向 |
| 2026-09-05 | 关单：merge 节点/就绪调度、palette 去平铺、comic-storyboard、文档与单测 |
