# 垂直领域定位分析：表单/流程 + AI 的差异化机会

> 日期：2026-07-27
> 依据：代码全量核实（editor 89 widgets / flow 12 BPMN 节点 / ai 25 workflow 节点 / server 130+ 业务交付物 patterns / 3 行业配置 / 31 workflow 模板）
> 竞品对标：Dify（通用 AI 平台）、n8n（通用自动化）、Coze（闭源 SaaS）
> 上游：[architecture-deep-dive-2026-07-24.md](./architecture-deep-dive-2026-07-24.md) · [evolution-plan-2026-07-24-product-polish.md](./evolution-plan-2026-07-24-product-polish.md)

---

## 〇、核心判断

**schema-platform 不是通用 AI 平台，而是"表单/流程平台 + AI"的垂直融合体。**

竞品的能力边界：

| 竞品 | 能做什么 | 做不到什么 |
|---|---|---|
| **Dify** | AI 对话 / RAG / Workflow 编排 / Agent | 无表单设计器、无 BPMN 流程引擎、无审批流、无业务领域模板 |
| **n8n** | 400+ SaaS 集成 / 自动化触发 / AI Agent 节点 | 无表单设计器、无 BPMN 审批流、无表单-流程绑定、无 AI 生成表单 |
| **Coze** | Bot / 插件 / 渠道部署 / 多模态 | 闭源不可自部署、无表单/流程引擎、无业务交付物 |

**我们的独有能力三角**：

```
        表单设计器（89 widgets）
           ↗        ↖
  AI 引擎              BPMN 流程引擎
（25 节点 + RAG）    （12 节点 + 审批/驳回/委派）
           ↘        ↙
        业务交付物（130+ patterns）
```

这三者形成的闭环——**AI 生成表单 → 表单绑定流程节点 → 流程驱动审批 → 审批数据反馈 AI 决策**——是任何竞品都无法复制的。

---

## 一、独有的垂直场景（Dify/n8n 做不到的）

### 1.1 AI 原生表单-流程一体化生成

**现状已实现**：
- `generate_schema` 工具：LLM 根据自然语言生成表单 Schema（`server/src/ai/tools/flowTools.ts:35`）
- `save_and_bind_schema` 工具：生成后自动绑定到流程节点（`server/src/ai/tools/flowTools.ts:52`）
- `update_flow` 工具：HITL 确认后修改流程图（`server/src/ai/tools/editorTools.ts`）
- `bind_schema_to_flow_node` 工具：将已有 Schema 绑定到指定 BPMN 节点

**竞品做不到的原因**：
- Dify 没有 Schema 概念，AI 只能生成文本/JSON，无法产出可视化表单
- n8n 没有表单设计器，AI 只能编排触发器链，无法生成表单 UI
- 两者都没有 `formSchemaId → BPMN UserTask` 的绑定关系

**具体场景**：用户说"做一个请假审批"，AI 同时生成请假表单（姓名/假别/天数/事由/附件）和审批流程（直属领导 → 部门经理 → HR 备案），表单自动绑定到每个 UserTask 节点。

### 1.2 AI 辅助审批决策

**现状已实现**：
- `approvalSuggestionService.ts`：根据表单提交数据生成审批建议（approve/reject/review + confidence + reasoning）
- `flow-task-actions` Widget 内置 `showAiSuggestion` 开关（`editor/src/widgets/flow-task-actions/config.ts:19`）
- `POST /api/ai/runtime/approval-suggestion` 端点（`server/src/routes/aiRuntime.ts:66`）

**竞品做不到的原因**：
- Dify/n8n 的 AI 只在 workflow 执行层工作，不深入到审批节点的表单数据层
- 它们没有 `FormSubmission → TaskInstance → ApprovalLog` 的数据链路
- 审批建议需要理解表单语义（病假需要附件、超 10 天需要重点审核），这要求 AI 与表单 Schema 深度耦合

### 1.3 行业合规模板生成

**现状已实现**：
- 3 个行业配置（医疗/金融/教育），每个包含 editorPromptAddon + flowPromptAddon + thinkerPromptAddon + 行业模板 + 验证规则（`server/src/ai/config/industryAgents.ts`）
- 医疗：ICD-10 编码选择器、药品字典关联、电子病历合规
- 金融：年化利率展示、风险评级、投资者适当性管理
- 教育：学号格式校验、学期格式、成绩等级制

**竞品做不到的原因**：
- Dify/n8n 的模板是 workflow 模板（触发器 + 节点编排），不是行业合规格板
- 它们没有行业特定的字段设计规范（如医疗诊断用 ICD-10、金融金额保留 2 位小数）
- 没有行业特定的流程合规要求（如医疗手术需双人确认、金融贷款需多级审批）

### 1.4 业务模块快速交付

**现状已实现**：130+ 预置业务交付物 patterns（`server/src/utils/business-deliverables/patterns/`），覆盖：

| 领域 | 交付物数量 | 典型场景 |
|---|---|---|
| OA 办公 | 22 | 通知/出差/会议/用印/收发文/资产/知识库 |
| HR 人力资源 | 16 | 加班/入职/离职/员工档案/组织架构/考勤/合同/招聘 |
| 财务管理 | 24 | 报销/采购/合同/预算/付款/发票/银行对账/月结/资金计划 |
| 审计合规 | 13 | 审计计划/项目/问题/整改/合规检查/报告/统计 |
| 计量设备 | 10 | 设备登记/校准计划/证书/到期预警/统计 |
| 政务管理 | 12 | 案件/许可/监管/政策/大屏看板 |
| 报表中心 | 22 | 通用看板/导出中心/执行大屏/文档模板/各领域汇总 |
| 系统管理 | 9 | 菜单/字典/配置/审计日志/登录日志/岗位/在线用户/租户 |

每个 pattern 都是完整的"表单 + 列表 + 详情 + 流程"组合，AI 可以基于这些 pattern 快速生成定制化业务模块。

**竞品做不到的原因**：
- Dify/n8n 没有业务领域知识，它们的"模板"是 workflow 编排模板，不是业务页面模板
- 它们没有表单+列表+详情+流程的完整页面组合概念
- 130+ patterns 积累的是行业 know-how，不是技术能力，无法短期复制

### 1.5 表单数据驱动的 AI 工作流

**现状已实现的数据链路**：
```
FormSchema（表单定义）
  → FormSubmission（表单提交，含 data + flowInstanceId）
    → TaskInstance（流程任务，含 formData）
      → ApprovalLog（审批日志）
        → AI 工作流（通过 webhook-trigger 接收表单数据）
```

**具体场景**：
- 报销单提交 → AI 自动审核金额合规性 → 不合规触发人工复核
- 客户工单提交 → AI 分类分流（cs-ticket-triage 模板）→ 按优先级路由
- 合同上传 → AI 提取条款 + 风险标注（contract-risk-tag 模板）→ 高风险进入人工确认

**竞品做不到的原因**：
- Dify/n8n 的数据来源是外部 API 调用，不与表单提交数据原生耦合
- 它们没有 `FormSubmission.flowInstanceId` 这样的表单-流程关联字段
- AI 工作流无法直接读取流程上下文中的表单数据

---

## 二、三个最值得深耕的垂直方向（按 ROI 排序）

### ROI 评估模型

```
ROI = (市场刚需度 × 技术复用度 × 竞争壁垒) / (研发投入 × 时间窗口)
```

| 方向 | 市场刚需 | 技术复用 | 竞争壁垒 | 研发投入 | 时间窗口 | ROI |
|---|---|---|---|---|---|---|
| ① 智能审批流 | 9 | 9 | 9 | 4 | 8 | **18.3** |
| ② 行业合规模块工厂 | 8 | 8 | 10 | 6 | 6 | **8.9** |
| ③ 表单数据洞察流 | 7 | 7 | 7 | 5 | 7 | **6.9** |

---

### 方向一：智能审批流（ROI 最高）

#### 2.1.1 定位

将"AI 辅助审批"从当前的规则版（`approvalSuggestionService.ts` 只有请假表单规则）升级为**全场景 AI 审批助手**，覆盖所有 BPMN UserTask 节点，成为表单/流程平台的核心差异化能力。

#### 2.1.2 为什么 ROI 最高

- **市场刚需**：企业审批是最高频的流程场景，每个组织每天产生大量审批任务，审批效率直接影响组织运转
- **技术复用**：已有 `approvalSuggestionService` + `flow-task-actions` Widget + `FormSubmission` 数据链路，增量投入小
- **竞争壁垒**：Dify/n8n 没有表单-流程-审批三位一体架构，无法复制
- **时间窗口**：当前 AI 审批产品（如分贝通、汇联易）都是垂直领域封闭方案，平台化方案空白

#### 2.1.3 产品形态

**形态一：审批节点内置 AI 建议（增强现有能力）**

在每个 BPMN UserTask 节点的表单渲染区域，自动展示 AI 审批建议卡片：

```
┌─ 审批操作区 ─────────────────────────────────────────────┐
│                                                           │
│  ┌─ AI 审批建议 ──────────────────────────────────────┐  │
│  │  💡 建议通过 | 置信度 87%                          │  │
│  │                                                     │  │
│  │  理由：                                             │  │
│  │  • 请假类型：年假，3 天                             │  │
│  │  • 申请人剩余年假余额：12 天（充足）                │  │
│  │  • 已完成工作交接（交接人：张三）                   │  │
│  │  • 同期部门请假人数：1 人（无冲突）                 │  │
│  │                                                     │  │
│  │  ⚠ 需关注：申请人本月已请假 2 次                    │  │
│  │                                                     │  │
│  │  [采纳建议] [查看详情] [不采纳]                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  审批意见：[____________________________________]          │
│                                                           │
│  [通过]  [驳回]  [委派]  [转办]                            │
└───────────────────────────────────────────────────────────┘
```

**形态二：AI 审批工作流（Workflow 模板）**

新增 workflow 模板 `ai-approval-assist`：

```
webhook-trigger（接收表单提交事件）
  → document-parse（解析表单数据 + 附件）
  → llm（结合 RAG 知识库：审批制度/报销标准/请假政策）
  → switch（按建议类型分支）
    ├─ approve → 自动通过（低风险 + 高置信度）
    ├─ review → 转人工审批（中风险）
    └─ reject → 自动驳回（明确违规）
  → end
```

**形态三：批量审批助手**

对审批人的待办列表进行批量分析，按优先级和紧急程度排序，提供批量处理建议。

#### 2.1.4 节点设计

**新增 Workflow 节点：`approval-analyze`**

```typescript
{
  type: 'approval-analyze',
  label: '审批分析',
  icon: 'checked',
  category: 'ai',
  description: '分析表单提交数据，结合审批制度知识库，输出审批建议',
  defaultData: {
    label: '审批分析',
    // 数据来源
    dataSource: 'auto',  // 'auto' | 'submission' | 'task' | 'custom'
    submissionIdField: '{{$input.submissionId}}',
    taskIdField: '{{$input.taskId}}',
    // 分析维度
    analyzeDimensions: ['compliance', 'policy', 'risk', 'history'],
    // 知识库关联
    knowledgeBaseIds: [],  // 审批制度/政策文档
    // 历史数据参考
    referenceHistory: true,
    historyLimit: 50,
    // 输出格式
    outputFormat: 'structured',  // 'structured' | 'narrative'
    // 阈值
    autoApproveThreshold: 0.9,   // 置信度 > 90% 可自动通过
    autoRejectThreshold: 0.85,   // 违规置信度 > 85% 可自动驳回
  }
}
```

**新增 Workflow 节点：`flow-interact`**

```typescript
{
  type: 'flow-interact',
  label: '流程交互',
  icon: 'connection',
  category: 'action',
  description: '与 BPMN 流程引擎交互：启动流程/完成任务/查询流程状态',
  defaultData: {
    label: '流程交互',
    action: 'complete-task',  // 'start-flow' | 'complete-task' | 'reject-task' | 'query-status' | 'delegate'
    flowDefinitionId: '',
    taskIdField: '{{$input.taskId}}',
    outcomeField: '{{$node.approval-analyze.recommendedAction}}',
    commentField: '{{$node.approval-analyze.reasoning}}',
    variables: {},
  }
}
```

**增强现有节点：`hitl`**

在 hitl 节点增加审批专用配置：

```typescript
// hitl 节点 defaultData 扩展
{
  // ... 现有字段
  approvalMode: true,  // 启用审批模式
  approvalContextFields: ['submissionId', 'taskId', 'flowInstanceId'],
  showAiSuggestion: true,
  aiSuggestionSource: 'upstream',  // 'upstream' | 'auto-generate'
}
```

#### 2.1.5 实施路径

| 阶段 | 内容 | 预估工作量 |
|---|---|---|
| P1 | `approvalSuggestionService` 从规则版升级为 LLM 版（通用表单支持） | 3d |
| P2 | `approval-analyze` workflow 节点（server executor + 前端面板） | 4d |
| P3 | `flow-interact` workflow 节点（打通 AI workflow ↔ BPMN FlowEngine） | 3d |
| P4 | `ai-approval-assist` workflow 模板（含 RAG 知识库配置） | 2d |
| P5 | 批量审批助手界面（复用现有 FlowMonitorDashboard） | 3d |
| P6 | 审批建议置信度模型优化（历史数据训练） | 持续 |

---

### 方向二：行业合规模块工厂（壁垒最高）

#### 2.2.1 定位

将当前的 3 个行业配置（医疗/金融/教育）+ 130+ 业务交付物 patterns 升级为**可配置的行业模块生成工厂**，让企业通过自然语言描述业务需求，AI 自动生成符合行业合规要求的完整业务模块（表单 + 流程 + 列表 + 详情 + 报表）。

#### 2.2.2 为什么壁垒最高

- **130+ patterns 是核心资产**：这些是行业 know-how 的代码化，竞品无法短期积累
- **行业合规要求天然护城河**：医疗电子病历规范、金融投资者适当性管理、教育未成年人保护法——这些合规要求需要深度行业理解
- **网络效应**：更多行业模板 → 更多行业用户 → 更多行业反馈 → 更精准的合规模板

#### 2.2.3 产品形态

**形态一：行业模块生成器**

用户选择行业 + 业务场景，AI 生成完整业务模块：

```
┌─ 行业模块生成器 ─────────────────────────────────────────┐
│                                                           │
│  行业：[医疗 ▼]  场景：[门诊病历 ▼]                      │
│                                                           │
│  ┌─ AI 生成预览 ─────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📋 表单：门诊病历（12 个字段）                     │   │
│  │     ├── 患者基本信息（姓名/性别/年龄/身份证号*）    │   │
│  │     ├── 就诊信息（科室/医生/就诊日期）              │   │
│  │     ├── 主诉与现病史                                │   │
│  │     ├── 体格检查                                     │   │
│  │     ├── 诊断（ICD-10 编码选择器）                   │   │
│  │     └── 处方（药品字典关联）                        │   │
│  │                                                     │   │
│  │  🔄 流程：就诊流程（5 个节点）                      │   │
│  │     挂号 → 分诊 → 就诊 → 检查/取药 → 结诊           │   │
│  │                                                     │   │
│  │  📊 报表：门诊统计（日/周/月）                      │   │
│  │     ├── 科室就诊量统计                               │   │
│  │     ├── 疾病分布统计                                 │   │
│  │     └── 处方费用统计                                 │   │
│  │                                                     │   │
│  │  ✅ 合规检查：4 项通过                               │   │
│  │     • 电子病历格式符合《电子病历基本规范》           │   │
│  │     • 处方包含药品通用名/剂量/用法用量               │   │
│  │     • 患者隐私字段已标注敏感                         │   │
│  │     • 诊断字段关联 ICD-10 编码                       │   │
│  │                                                     │   │
│  │  [生成模块]  [自定义调整]  [导出]                    │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**形态二：行业合规知识库**

每个行业建立专属 RAG 知识库，包含：
- 法规文档（电子病历规范、个人信息保护法、医疗机构管理条例）
- 行业标准（ICD-10、药品编码、诊疗规范）
- 表单字段规范（字段名/类型/校验规则/脱敏要求）
- 流程合规要求（双人确认/知情同意/审批权限）

**形态三：行业模块市场**

开源社区贡献行业模板，形成 UGC 生态。

#### 2.2.4 节点设计

**新增 Workflow 节点：`compliance-check`**

```typescript
{
  type: 'compliance-check',
  label: '合规检查',
  icon: 'warning',
  category: 'ai',
  description: '根据行业合规规则检查表单 Schema / 流程图 / 提交数据',
  defaultData: {
    label: '合规检查',
    // 检查目标
    checkTarget: 'schema',  // 'schema' | 'flow' | 'submission' | 'all'
    schemaField: '{{$node.generate-schema.widgets}}',
    flowField: '{{$node.generate-flow.graph}}',
    // 行业标准
    industry: 'medical',  // 'medical' | 'finance' | 'education' | 'government' | 'custom'
    customRules: [],
    // 检查维度
    checkDimensions: ['field-naming', 'data-type', 'validation', 'privacy', 'workflow', 'documentation'],
    // 输出
    outputFormat: 'report',  // 'report' | 'pass-fail' | 'detailed'
    severity: 'error',  // 'error' | 'warning' | 'info'
  }
}
```

**新增 Workflow 节点：`module-assemble`**

```typescript
{
  type: 'module-assemble',
  label: '模块组装',
  icon: 'files',
  category: 'action',
  description: '将表单+流程+列表+详情+报表组装为完整业务模块',
  defaultData: {
    label: '模块组装',
    // 模块名称
    moduleName: '{{$input.moduleName}}',
    moduleCode: '{{$input.moduleCode}}',
    // 组件来源
    formSchemaField: '{{$node.generate-schema.schemaId}}',
    flowGraphField: '{{$node.generate-flow.flowId}}',
    listSchemaField: '{{$node.generate-list.schemaId}}',
    detailSchemaField: '{{$node.generate-detail.schemaId}}',
    reportSchemaField: '{{$node.generate-report.schemaId}}',
    // 模块配置
    moduleConfig: {
      category: '',
      icon: '',
      permissions: {},
      navigation: 'sidebar',  // 'sidebar' | 'tab' | 'standalone'
    },
  }
}
```

**增强现有 `industry__search_templates` 工具**：

```typescript
// 扩展 industry__search_templates 返回值
{
  templates: IndustryTemplate[],
  // 新增：合规规则
  complianceRules: ComplianceRule[],
  // 新增：字段规范
  fieldSpecs: FieldSpec[],
  // 新增：流程规范
  flowSpecs: FlowSpec[],
}
```

#### 2.2.5 实施路径

| 阶段 | 内容 | 预估工作量 |
|---|---|---|
| P1 | 行业配置扩展：从 3 个扩展到 8 个（+政务/法律/制造/零售/建筑） | 5d |
| P2 | `compliance-check` workflow 节点 | 4d |
| P3 | `module-assemble` workflow 节点 | 3d |
| P4 | 行业模块生成器 UI（复用 AgentWorkflowTemplatePreviewDialog） | 4d |
| P5 | 行业合规 RAG 知识库（每个行业 10-20 份核心法规文档） | 持续 |
| P6 | 行业模块市场（开源社区贡献机制） | 长期 |

---

### 方向三：表单数据洞察流（增长空间最大）

#### 2.3.1 定位

将表单提交数据（`FormSubmission`）作为 AI 工作流的一等数据源，构建"数据采集 → AI 分析 → 洞察输出 → 行动触发"的闭环，让表单不仅是数据录入工具，更是业务洞察的起点。

#### 2.3.2 为什么增长空间最大

- **每个表单都是数据入口**：89 种 Widget 覆盖几乎所有数据采集场景，每个 FormSubmission 都是 AI 分析的原料
- **现有 130+ 业务模块天然产生数据**：OA/HR/财务/审计模块每天都在产生提交数据，这些数据目前只用于流程审批，未被 AI 消费
- **从工具到平台的跃迁**：表单数据洞察让 schema-platform 从"表单/流程工具"升级为"业务智能平台"

#### 2.3.3 产品形态

**形态一：表单数据 AI 分析工作流**

```
schedule-trigger（每日 9:00）
  → form-query（查询昨日所有报销提交）
  → llm（分析报销数据：异常检测/趋势识别/合规预警）
  → switch（按分析结果分支）
    ├─ anomaly → webhook 通知财务负责人
    ├─ trend → 生成周报 Artifacts
    └─ normal → 存入洞察库
  → end
```

**形态二：表单驱动的智能报表**

AI 根据表单 Schema 自动推断有意义的统计维度和图表类型：

```
表单 Schema（报销单）
  → AI 推断分析维度（部门/费用类型/金额区间/时间趋势）
  → AI 选择图表类型（饼图/柱状图/折线图/异常散点图）
  → AI 生成报表 Schema（复用 editor 的 chart widgets）
  → 定时刷新 + 异常告警
```

**形态三：表单数据异常检测**

对表单提交数据进行实时/离线异常检测：
- 金额异常（超出历史均值 3 倍标准差）
- 频率异常（同一提交人短时间内大量提交）
- 内容异常（AI 识别虚假/矛盾信息）
- 合规异常（违反行业或组织制度）

#### 2.3.4 节点设计

**新增 Workflow 节点：`form-query`**

```typescript
{
  type: 'form-query',
  label: '表单查询',
  icon: 'search',
  category: 'tools',
  description: '查询表单提交数据，支持按 Schema/时间/状态/字段值筛选',
  defaultData: {
    label: '表单查询',
    // 查询条件
    schemaId: '',  // 表单 Schema ID（可选，不填则查所有）
    timeRange: {
      type: 'relative',  // 'relative' | 'absolute'
      start: '-1d',      // 相对时间（-1d = 昨天）
      end: 'now',
    },
    // 筛选条件
    filters: [
      { field: 'status', operator: 'eq', value: 'submitted' },
      { field: 'amount', operator: 'gt', value: 10000 },
    ],
    // 聚合
    aggregation: 'none',  // 'none' | 'count' | 'sum' | 'avg' | 'group-by'
    groupByField: '',
    valueField: '',
    // 分页
    limit: 100,
    sort: { field: 'createdAt', order: 'desc' },
  }
}
```

**新增 Workflow 节点：`anomaly-detect`**

```typescript
{
  type: 'anomaly-detect',
  label: '异常检测',
  icon: 'warning',
  category: 'ai',
  description: '对表单数据进行异常检测，支持统计方法 + AI 语义分析',
  defaultData: {
    label: '异常检测',
    // 数据来源
    dataField: '{{$node.form-query.records}}',
    // 检测方法
    methods: ['statistical', 'frequency', 'semantic'],
    // 统计方法参数
    statisticalConfig: {
      algorithm: 'zscore',  // 'zscore' | 'iqr' | 'isolation-forest'
      threshold: 3,         // Z-score 阈值
      fields: ['amount', 'days'],
    },
    // 频率方法参数
    frequencyConfig: {
      windowMinutes: 60,
      maxCount: 5,
      groupByField: 'submitterId',
    },
    // 语义方法参数
    semanticConfig: {
      checkDimensions: ['contradiction', 'plagiarism', 'fabrication'],
      model: 'default',
    },
    // 输出
    outputFormat: 'list',  // 'list' | 'summary' | 'alert'
  }
}
```

**新增 Workflow 节点：`chart-generate`**

```typescript
{
  type: 'chart-generate',
  label: '图表生成',
  icon: 'data-line',
  category: 'ai',
  description: '根据数据自动推断图表类型并生成可视化配置',
  defaultData: {
    label: '图表生成',
    // 数据来源
    dataField: '{{$node.form-query.records}}',
    // 生成模式
    mode: 'auto',  // 'auto' | 'manual'
    // 手动模式配置
    chartType: 'bar',  // 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'radar' | 'funnel'
    xAxisField: '',
    yAxisField: '',
    aggregation: 'sum',
    // 自动模式：AI 推断
    autoConfig: {
      maxCharts: 5,
      preferDimensions: ['time', 'category', 'amount'],
    },
    // 输出格式
    outputFormat: 'schema',  // 'schema' | 'image' | 'both'
  }
}
```

#### 2.3.5 实施路径

| 阶段 | 内容 | 预估工作量 |
|---|---|---|
| P1 | `form-query` workflow 节点（封装 FormSubmission 查询） | 3d |
| P2 | `anomaly-detect` workflow 节点（统计方法 + LLM 语义） | 5d |
| P3 | `chart-generate` workflow 节点（AI 推断图表 + Schema 输出） | 4d |
| P4 | 表单数据洞察模板（3 个：报销洞察/招聘分析/客户反馈） | 3d |
| P5 | 智能报表界面（复用 editor chart widgets 渲染） | 4d |
| P6 | 实时异常告警（webhook + 渠道推送） | 2d |

---

## 三、三方向协同关系

三个方向不是孤立的，而是形成递进增强的飞轮：

```
方向二：行业合规模块工厂
  ↓ 生成业务模块（表单+流程+列表+详情+报表）
方向三：表单数据洞察流
  ↓ 消费表单数据，产出洞察
方向一：智能审批流
  ← 洞察反馈到审批决策（如异常报销自动标记高风险）
```

**协同场景示例**：

1. **方向二生成**：AI 生成"报销审批"业务模块（合规表单 + 多级审批流程）
2. **方向三消费**：表单提交数据自动进入异常检测工作流，发现某员工连续 3 天报销金额异常
3. **方向一决策**：该员工的下一次报销审批中，AI 审批建议自动标注"历史异常，建议人工审核"

---

## 四、竞品防御分析

### 4.1 Dify 可能的追赶路径及我们的防御

| Dify 可能的动作 | 我们的防御 |
|---|---|
| 增加表单组件 | 89 widgets + 89 widget composables 的深度不是短期可追；表单-流程绑定关系是架构级优势 |
| 增加审批流 | BPMN 2.0 引擎 + 12 节点 + 驳回/委派/会签/并行网关，审批流深度远超 workflow 编排 |
| 增加行业模板 | 130+ 业务交付物 patterns + 3 行业合规配置，know-how 积累无法跳过 |
| 增加审批 AI | 缺乏 FormSubmission → TaskInstance → ApprovalLog 数据链路，AI 只能做表面分析 |

### 4.2 n8n 可能的追赶路径及我们的防御

| n8n 可能的动作 | 我们的防御 |
|---|---|
| 增加 AI 表单生成 | n8n 是自动化平台不是表单平台，没有 Schema 设计器和 Widget 体系 |
| 增加审批节点 | n8n 的触发器链模型不适合复杂审批流（驳回/会签/并行审批） |
| 增加行业方案 | n8n 的 400+ 集成是 SaaS 连接器，不是业务领域模板 |

### 4.3 不可复制的核心壁垒

1. **表单-流程-AI 三位一体架构**：三者深度耦合（formSchemaId 绑定 UserTask、AI 工具生成并绑定 Schema、审批建议读取表单数据），竞品需要从头设计这个架构
2. **130+ 业务交付物 patterns**：这是行业 know-how 的代码化，需要长期积累
3. **89 widgets 的表单设计器**：从基础输入到图表、从审批组件到流程时间线，这是多年迭代的结果
4. **BPMN 2.0 流程引擎**：完整的审批/驳回/委派/会签/并行/子流程，不是简单的状态机

---

## 五、优先级建议

### 立即启动（本季度）

1. **方向一 P1-P2**：`approvalSuggestionService` 升级为 LLM 版 + `approval-analyze` 节点
   - 投入小（7d），见效快，直接提升现有审批体验
   - 对外可宣传"AI 审批助手"差异化能力

2. **方向三 P1**：`form-query` 节点
   - 投入小（3d），打通表单数据 → AI 工作流的数据管道
   - 为后续洞察流和异常检测奠定基础

### 下季度启动

3. **方向一 P3-P4**：`flow-interact` 节点 + `ai-approval-assist` 模板
   - 打通 AI workflow ↔ BPMN FlowEngine 双向交互
   - 形成"AI 分析 → 自动审批 → 人工兜底"闭环

4. **方向二 P1-P2**：行业配置扩展到 8 个 + `compliance-check` 节点
   - 扩大行业覆盖面
   - 合规检查成为行业模块工厂的差异化卖点

### 长期建设

5. **方向二 P3-P6**：`module-assemble` + 行业模块生成器 + 模块市场
   - 建设行业生态，形成网络效应

6. **方向三 P2-P6**：`anomaly-detect` + `chart-generate` + 智能报表
   - 从工具升级为业务智能平台

---

## 六、新增节点汇总

| 节点 | 方向 | 类型 | 核心价值 |
|---|---|---|---|
| `approval-analyze` | 智能审批 | AI | 通用表单审批建议（替代规则版） |
| `flow-interact` | 智能审批 | Action | AI workflow ↔ BPMN FlowEngine 交互 |
| `compliance-check` | 行业合规 | AI | 行业合规规则检查 |
| `module-assemble` | 行业合规 | Action | 组装完整业务模块 |
| `form-query` | 数据洞察 | Tools | 查询表单提交数据 |
| `anomaly-detect` | 数据洞察 | AI | 统计 + 语义异常检测 |
| `chart-generate` | 数据洞察 | AI | AI 推断图表并生成可视化配置 |

加上现有 25 个节点，共计 **32 个 workflow 节点**，覆盖触发/AI/逻辑/工具/行动五大类，形成"表单/流程 + AI"垂直场景的完整节点体系。

---

## 七、总结

schema-platform 的垂直定位不是"又一个 AI 平台"，而是**企业业务系统的 AI 原生构建平台**。

核心差异化：**表单设计器（数据采集）+ BPMN 流程引擎（流程驱动）+ AI 工作流（智能决策）的三位一体**，加上 130+ 行业业务交付物 patterns 的 know-how 积累，形成竞品无法短期复制的壁垒。

三个深耕方向的递进关系：
- **智能审批流**：让 AI 深入到每个审批节点，提升高频场景效率（短期 ROI 最高）
- **行业合规模块工厂**：让 AI 生成符合行业合规的完整业务模块（中期壁垒最高）
- **表单数据洞察流**：让 AI 消费表单数据产出业务洞察（长期增长空间最大）

三者形成飞轮：模块工厂产出业务模块 → 业务模块产生表单数据 → 数据洞察产出智能 → 智能反馈到审批决策。
