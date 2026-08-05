# AI 应用 · 开发执行计划

> 视角：资深架构师 + 开发负责人。把 [iteration-evolution.md](./iteration-evolution.md) 的产品演进路线，转化为可分配、可排期、可验收的开发执行计划。
> 本文聚焦技术方案选型、任务拆解（WBS）、排期里程碑、预研项、测试策略、跨项目协同与风险。
> 日期：2026-07-20 · 工时单位：人日（d）· 排期单位：周（W）

---

## 一、技术方案选型

> 基于真实依赖现状：ai-app 未装 i18n / 虚拟滚动 / 监控库；用 axios + fetch；platform-shared 仅有 logger / apiClient / authSession / socket。

| 问题 | 选定方案 | 新增依赖 | 关键文件 | 风险 |
|------|----------|----------|----------|------|
| 长对话虚拟列表（A1.3） | vue-virtual-scroller（DynamicScroller，适配动态高度） | vue-virtual-scroller | `AiChatPanel.vue` / `components/message/` | 流式追加 + 自动滚底 + 虚拟滚动组合 |
| i18n（A1.2） | 复用 platform-shared i18n 模块（与 editor 共建） | vue-i18n（platform-shared 引入） | `main.ts` / 各组件 | 文案抽取量大，渐进 |
| 文件上传下载抽取（A1.4） | 抽 useBlobRequest composable | 无 | `api/aiApi.ts` | 无 |
| 测试 setup 清理（A1.5） | 删除 TDesign stub | 无 | `__tests__/setup.ts` | 全量回归 |
| coverage（A1.6） | vitest --coverage + thresholds | @vitest/coverage-v8（dev） | `vitest.config` / `package.json` | 无 |
| 前端埋点/监控（A2.1/A2.2） | 复用 platform-shared telemetry（与 editor 共建） | 无前端库 | `platform-shared/utils/telemetry.ts` | 依赖 server 端点 |
| 大文件拆分（A2.3） | 按职责拆子组件/子模块 | 无 | `ai.ts` / `AiPreviewPanel` / `AiChatPanel` | 回归 |
| 预留事件清理（A2.4） | 评估后实现或移除 | 无 | `constants/events.ts` / 协议文档 | 协议变更 |

### 1.1 长对话虚拟列表技术要点

AI 对话是**列表向 + 动态高度**（消息长度不一 + 流式追加），与 editor 的绝对定位画布不同，**可用现成虚拟滚动库**。

```
AiChatPanel
  └── <DynamicScroller>（vue-virtual-scroller）
        ├── 动态高度：消息渲染后 measure 高度，缓存估算值
        ├── 流式追加：新消息 append，触发 resize；自动滚底用 scrollToBottom
        └── 滚动定位：用户上滑浏览历史时不强制滚底（检测 scroll 位置）
```

关键挑战：
1. 流式输出时消息内容动态变化 → DynamicScroller 的 `minItemSize` + 实际 measure
2. 自动滚底与用户手动上滑的冲突 → 检测 `isNearBottom`，仅靠近底部时自动滚
3. @提及/RAG 引用的消息渲染（renderers 注册表）需在虚拟项内正常工作

### 1.2 i18n 复用 platform-shared（与 editor 共建）

决策：**与 editor 共建 platform-shared i18n 模块**，一次引入三项目复用。

```typescript
// platform-shared/utils/i18n.ts（新建，editor 主导 ai 复用）
export function createI18n(messages) { /* vue-i18n 实例 */ }
// ai/app/src/main.ts
import { createI18n } from '@schema-platform/platform-shared'
const i18n = createI18n({ 'zh-CN': aiZhCN, 'en-US': aiEnUS })
```

AI 项目文案集中在 AiLayout（侧栏导航）、AiChatPanel/AiPreviewPanel（对话与预览）、AgentWorkflowDesigner（设计器）、PluginCenter、RagKnowledgeBase、ModelSettings。

### 1.3 文件上传下载抽取

```typescript
// 现状：aiApi.ts 4 处重复 fetch + buildHeaders + blob
// 目标：抽 useBlobRequest
async function requestBlob(url, { method, body, headers }): Promise<Blob> {
  const res = await fetch(...)
  if (!res.ok) throw new ApiError(...)
  return res.blob()
}
// aiApi.ts 的 uploadFile/uploadRagDocument/downloadDocumentFile/downloadConversation 全部调用
```

### 1.4 预留事件类型决策（A2.4）

`thinker_*` / `quality_check_*` 已在 events.ts 定义但图节点未实现。决策树：

```
1 个版本内有明确落地场景？
  ├─ 是 → 实现图节点（工时 3-5d）
  └─ 否 → 从协议移除 + 文档说明「未来以 X 方式回归」+ 评估存量引用
```

倾向：先评估产品价值，无明确场景则移除，避免架构债误导。

---

## 二、任务拆解（WBS）

> 工时为估算区间（人日），假设 2-3 人前端团队。角色：FE-A/B、ARCH、QA。

### Phase A1：开源就绪

#### Epic A1.0 文档与债务快修

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A1.0.1 | README 路径修复（ai/sdk、ai/shared 等） | 0.5d | FE-A | - | 文档内路径真实存在 |
| A1.0.2 | 测试 setup 清理 TDesign stub | 0.5d | FE-B | - | 全量测试通过 |
| A1.0.3 | coverage 接入 + thresholds | 0.5d | FE-B | - | 报告生成，stores/api ≥ 70% |
| A1.0.4 | CONTRIBUTING 加「改代码必改文档」 | 0.5d | FE-A | A1.0.1 | CI 校验文档路径 |

#### Epic A1.1 文件逻辑抽取

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A1.1.1 | useBlobRequest composable | 1d | FE-A | - | 通用函数 + 单测 |
| A1.1.2 | aiApi.ts 4 处替换 | 0.5d | FE-A | A1.1.1 | 无重复逻辑 |

#### Epic A1.2 i18n 框架

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A1.2.1 | platform-shared i18n 模块（与 editor 共建） | 1d | ARCH | - | createI18n 可用 |
| A1.2.2 | ai 接入 i18n + zh-CN 完整语言包骨架 | 1.5d | FE-A | A1.2.1 | 可切换语言 |
| A1.2.3 | 核心交互文案抽取（AiLayout/AiChatPanel） | 2-3d | FE-B | A1.2.2 | 核心交互接入 |
| A1.2.4 | 剩余组件文案抽取 + en-US | 2d | FE-A | A1.2.3 | 覆盖率 ≥ 80% |

#### Epic A1.3 长对话虚拟列表

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A1.3.1 | 引入 vue-virtual-scroller | 0.5d | FE-B | - | 依赖安装 |
| A1.3.2 | AiChatPanel 接入 DynamicScroller | 2-3d | FE-B | A1.3.1 | 消息虚拟渲染 |
| A1.3.3 | 流式追加 + 自动滚底 + 上滑检测 | 1-2d | FE-B | A1.3.2 | 流式正常，不强制滚 |
| A1.3.4 | renderers 在虚拟项内回归 | 1d | FE-A | A1.3.3 | @提及/RAG 渲染正常 |
| A1.3.5 | 性能测试（1000 消息 FPS） | 0.5d | QA | A1.3.4 | FPS ≥ 30 |

#### Epic A1.4 集成密钥 UI

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A1.4.1 | ApiKeyManagerView 完善 | 2-3d | FE-A | 后端接口 | 密钥 CRUD + 列表过滤 |
| A1.4.2 | 工作流 Key（wf-...）管理 | 1d | FE-A | A1.4.1 | 单流密钥可用 |
| A1.4.3 | platform.md「待建」项清零 | 0.5d | FE-A | A1.4.1 | 文档更新 |

### Phase A2：体验与增长

#### Epic A2.1 可观测性

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A2.1.1 | platform-shared telemetry 模块（与 editor 共建） | 2d | ARCH | server 端点 | track/reportError API |
| A2.1.2 | ai 接入埋点（5 关键路径） | 1.5d | FE-A | A2.1.1 | 发对话/选模板/发布/执行失败/插件启用 |
| A2.1.3 | 错误上报（全局 + WebSocket 断连） | 1d | FE-B | A2.1.1 | 不再仅 console |
| A2.1.4 | 监控 dashboard 对接 | 1d | FE-B | A2.1.2 | 漏斗可见 |

#### Epic A2.2 大文件拆分

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A2.2.1 | ai.ts 拆分（编排逻辑分散子模块） | 2-3d | FE-A | - | 单文件 < 15KB |
| A2.2.2 | AiPreviewPanel 拆子组件 | 2d | FE-B | - | 单文件 < 15KB |
| A2.2.3 | AiChatPanel 拆子组件 | 2d | FE-B | A1.3.4 | 单文件 < 15KB |
| A2.2.4 | AiMonitorView 拆子组件 | 1.5d | FE-A | - | 单文件 < 15KB |

#### Epic A2.3 预留事件清理

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A2.3.1 | 产品价值评估 + 决策 | 0.5d | ARCH | - | 决策文档 |
| A2.3.2 | 实现（若决策为是） | 3-5d | FE-A | A2.3.1 | 图节点可用 |
| A2.3.3 | 移除（若决策为否） | 1d | FE-A | A2.3.1 | 协议 + 文档更新 |

#### Epic A2.4 后端过滤与对话管理

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A2.4.1 | 后端 createdBy 过滤回归（前端测试覆盖） | 1d | FE-B | server 配合 | 多租户隔离测试 |
| A2.4.2 | 对话搜索/标签/批量导出 | 3-4d | FE-A | - | 长会话可管理 |

### Phase A3：开放平台

#### Epic A3.1 行业模板包

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A3.1.1 | 行业方向调研 + 选定 | 1d | ARCH | - | 决策 1 个垂直 |
| A3.1.2 | 模板包开发（≥ 3 工作流） | 4-5d | FE-A/B | A3.1.1 | 开箱即用 |

#### Epic A3.2 第三方插件文档

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A3.2.1 | Expert/Skill/Tool/MCP 开发指南 | 2d | FE-B | - | 含 API + 示例 |
| A3.2.2 | 插件脚手架 | 2d | FE-B | A3.2.1 | 可运行 |

#### Epic A3.3 市场与分享

| 编号 | 任务 | 工时 | 角色 | 依赖 | 验收 |
|------|------|------|------|------|------|
| A3.3.1 | PluginMarketView 升级（可安装外部包） | 2-3d | FE-A | A3.2.2 | 外部包可加载 |
| A3.3.2 | 安全审计（沙箱/权限/来源） | 2d | ARCH | A3.3.1 | 审计报告 |
| A3.3.3 | 工作流社区分享机制 | 3-4d | FE-B | A3.1.2 | 一键安装 |

---

## 三、排期与里程碑

> 假设 2-3 人并行，W1 起。i18n 与 telemetry 与 editor 共建，错峰避免 platform-shared 冲突。

| 周次 | A1 | A2 | A3 | 里程碑 |
|------|-----|-----|-----|--------|
| W1 | A1.0 快修 + A1.1 文件抽取 | - | - | M1: 文档路径修复 + setup 清理 + coverage |
| W2 | A1.2 i18n 框架 + A1.4 密钥 UI | - | - | - |
| W3 | A1.3 虚拟列表 + A1.2 文案 | - | - | M2: i18n 框架可用 |
| W4 | A1.3 虚拟列表回归 + A1.4 完成 | - | - | **M3: A1 开源就绪（30 分钟跑通 + 切英文）** |
| W5 | - | A2.1 可观测性 + A2.3 预留事件决策 | - | M4: 埋点上线 |
| W6 | - | A2.2 大文件拆分 | - | - |
| W7 | - | A2.2 拆分 + A2.4 对话管理 | - | M5: 大文件 < 15KB |
| W8 | - | A2.4 完成 | - | **M6: A2 体验与增长完成** |
| W9 | - | - | A3.1 行业调研 + 模板 | - |
| W10 | - | - | A3.1 模板 + A3.2 文档 | - |
| W11 | - | - | A3.3 市场 + 审计 | **M7: A3 开放平台 V1** |

关键依赖链：
```
A1.2.1 i18n 框架（与 editor 共建）→ A1.2.2/3 文案 → M3
A1.3 虚拟列表 → A2.2.3 AiChatPanel 拆分（先虚拟化再拆，避免返工）
A2.1.1 telemetry（依赖 server 端点 + 与 editor 共建）→ A2.1.2 埋点 → M4
A2.3.1 预留事件决策 → A2.3.2/3 实现/移除
A3.2.2 脚手架 → A3.3.1 市场 → A3.3.3 分享
```

---

## 四、技术预研（Spike）

| Spike | 问题 | 产出 | 工时 | 阻塞 |
|-------|------|------|------|------|
| S1 长对话虚拟化 PoC | DynamicScroller + 流式追加 + 自动滚底可行性 | 原型 + 1000 消息 FPS | 1-2d | A1.3 全部 |
| S2 i18n 共建边界 | platform-shared i18n 对 editor/flow 现有 ElConfigProvider 影响 | 评估 + 接入方案 | 0.5d | A1.2.1 |
| S3 预留事件价值评估 | thinker/quality_check 产品价值 | 决策文档 | 0.5d | A2.3 |
| S4 插件沙箱方案 | 外部插件加载安全隔离 | 沙箱方案选型 | 1d | A3.3.2 |

---

## 五、测试策略

| 层级 | 范围 | 工具 | 门槛 |
|------|------|------|------|
| 单元测试 | useBlobRequest、telemetry、i18n、虚拟列表组件 | vitest | 新增代码覆盖率 ≥ 70% |
| 集成测试 | 虚拟列表 + 流式、密钥 UI、对话管理 | vitest | 核心场景全过 |
| 性能测试 | 1000 消息滚动 FPS、流式追加延迟 | 专项 | FPS ≥ 30 |
| 回归测试 | 现有 38 个单测 + 流式/工作流/HITL | vitest 全量 | 0 失败 |
| E2E | 对话发起到工作流执行全流程 | Playwright（已有 auth.spec） | 扩展覆盖 |

**重点回归项**：虚拟列表下流式输出 + 自动滚底、renderers 注册表在虚拟项内、i18n 切换后布局、ai.ts 拆分后 Store 编排、密钥 UI 多租户过滤。

---

## 六、跨项目依赖与协同

| 依赖项 | 依赖方 | 协同方 | 阻塞任务 | 处理 |
|--------|--------|--------|----------|------|
| server 新增 /api/telemetry 端点 | ai + editor | server 团队 | A2.1.1 | W1 提接口契约 |
| platform-shared i18n 模块 | ai | editor（共建主导） | A1.2.1 | ai 复用，editor 主导开发 |
| platform-shared telemetry 模块 | ai | editor（共建主导） | A2.1.1 | 同上 |
| server 后端 createdBy 过滤收紧 | ai | server 团队 | A2.4.1 | 前端测试覆盖 |
| server 集成密钥接口 | ai | server 团队 | A1.4.1 | 接口对齐 |

**红线**（CLAUDE.md）：前端禁止改 server。所有 server 侧工作走协同。

**与 editor 的协同**：i18n 与 telemetry 在 platform-shared 共建，建议 ai 侧需求先提，editor 主导实现（因 editor 文案量更大、场景更复杂），ai 复用。避免两边重复造轮子。

---

## 七、风险登记（技术维度）

| 风险 | 等级 | 影响 | 应对 |
|------|------|------|------|
| 虚拟列表 + 流式追加自动滚底冲突 | 高 | 对话体验坏 | S1 PoC 先验证；保留非虚拟分支灰度切换 |
| i18n 文案抽取遗漏 | 中 | 英文残留中文 | CI 扫描硬编码中文 |
| server /api/telemetry 排期滞后 | 中 | 埋点阻塞 | console + 本地存储过渡 |
| ai.ts 拆分破坏 Store 编排 | 中 | 对话/工作流坏 | 拆分前补 aiStore.spec 覆盖，拆后全量回归 |
| 预留事件移除影响存量协议 | 中 | 兼容性 | 评估存量引用，提供迁移说明 |
| 插件市场外部代码安全 | 高 | 恶意插件 | S4 沙箱方案 + 审核制 + 来源校验 |

---

## 八、交付物清单

| 里程碑 | 交付物 | 验收人 |
|--------|--------|--------|
| M1 | 文档路径修复 + setup 清理 + coverage | 架构师 |
| M2 | i18n 框架可用 | 架构师 |
| M3 | **外部开发者 30 分钟跑通 + 可切英文** | 产品 + 架构师 |
| M4 | 埋点 dashboard 可见用户漏斗 | 产品 |
| M5 | 核心大文件单文件 < 15KB | 架构师 |
| M6 | 预留事件决策落地 + 对话管理增强 | 架构师 |
| M7 | 行业模板包 + 第三方插件指南 + 市场雏形 | 架构师 + 产品 |

---

## 九、执行建议

1. **W1 先做快修 + Spike**：A1.0 零风险立即清；S1 虚拟化 PoC 不通过则 A1.3 方案调整。
2. **A1 是开源前置**：M3「30 分钟跑通 + 切英文」是开源推广的硬门槛，A1 未完成不大范围推广。
3. **i18n/telemetry 与 editor 共建**：ai 侧提需求，editor 主导实现，避免重复。W1 对齐共建分工。
4. **A1.3 虚拟化先于 A2.2.3 拆分**：AiChatPanel 先虚拟化稳定，再拆子组件，避免返工。
5. **每周回归**：现有 38 单测 + 流式/工作流/HITL 是安全网，每周全量跑。
6. **A2.3 预留事件快决策**：W5 评估，无明确场景则移除，不拖延成永久架构债。
