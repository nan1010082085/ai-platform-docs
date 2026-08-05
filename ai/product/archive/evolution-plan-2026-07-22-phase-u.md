# AI 平台下一步计划：Phase U - 智能体深化与平台化

> 日期：2026-07-22
> 依据：Phase Q/R/S/T 已交付后的产品审查 + 查漏补缺
> 上游：[evolution-plan-2026-07-22-workflow-as-agent.md](./evolution-plan-2026-07-22-workflow-as-agent.md)
> 本文档定义 Q/R/S 之后的平台化方向

---

## 一、当前状态核实

### 已交付（2026-07-22）

| Phase | 内容 | 状态 |
|---|---|---|
| Q | WorkflowDebugView（草稿可测、节点轨迹） | ✅ |
| R | agent-loop 节点（LLM 自主循环，workflow 即智能体） | ✅ 含 runAgentLoop 提取 + 4 测试 |
| S | workflow 路由关键词 + chat 建议（非侵入式） | ✅ |
| T | 组件化：NodeTraceList / ExecutionHITLDialog / RagUploadDialog | ✅ 部分 |
| 审查修复 | 订阅清理、tool_call 保护、建议清除、pendingFile 清理 | ✅ |

### 审查发现的真实缺口（本计划要补）

1. **agent-loop 无子 workflow 调用**：当前只能调同图 tool 节点声明的工具，不能调已发布的其它 workflow（R 计划的待确认决策 1）
2. **Phase S 是"建议"非"自动"**：用户需手动点"使用"才切 workflow。真正的"智能体自动路由到 workflow"未实现（侵入 chat 路由核心，当时评估风险暂缓）
3. **agent-loop 无配额/限流**：迭代可能放大 token 消耗（R 计划待确认决策 3）
4. **WorkflowDebugView 无断点单步**：只能整跑看轨迹（R 计划待确认决策 2）
5. **agent-loop 无成本可见性**：用户不知道一次循环用了多少 token / 几次迭代
6. **Phase T 未完成**：aiApi.ts / ModelSettingsView / AgentWorkflowListView 仍超标

---

## 二、Phase U：智能体深化

### U-1：agent-loop 支持子 workflow 调用（3d）

**目标**：agent-loop 的可用工具不限于同图 tool，还能把已发布 workflow 作为"技能"调用。

**实现**：
- AgentLoopNodePanel 工具多选区新增"已发布 workflow"分组（与 langgraph 工具并列）
- server：agent-loop case 里，若选中的是 workflow，把 workflow 包装成 LangChain DynamicStructuredTool（invoke 时调 `startAgentWorkflowExecution` 子执行）
- 子 workflow 执行结果作为 ToolMessage content 喂回主循环

**验收**：agent-loop 能自主决定调用另一个 workflow，拿到结果继续推理。

### U-2：agent-loop 成本与迭代可见性（2d）

**目标**：让用户看到智能体循环的成本，避免失控。

**实现**：
- runAgentLoop 返回值加 `totalTokens` / `toolInvocations`（每次 dispatchTool 记录）
- AgentNodeExecutionDetail 渲染 agent-loop 节点时显示迭代数、工具调用次数、token
- WorkflowDebugView 轨迹里 agent-loop 节点展开看每轮的 LLM 输出 + 工具调用

**验收**：调试界面能看到 agent-loop 跑了几轮、调了哪些工具、花了多少 token。

### U-3：agent-loop 配额限流（2d）

**目标**：防止单次执行 token 失控。

**实现**：
- 复用 Phase D-3 的配额框架（若已实现），按租户/用户设 agent-loop 最大 token / 最大迭代
- 超限时 runAgentLoop 提前终止，返回提示文本

**验收**：超配额时循环优雅终止，不报错。

### U-4：WorkflowDebugView 断点单步（3d，可选）

**目标**：支持节点级单步执行，便于调试复杂图。

**实现**：
- server：executeAgentWorkflow 加 `breakAtNodeId` 参数，执行到该节点后暂停（status=paused）
- 前端：轨迹里每个节点加"运行到此"按钮，触发单步
- 暂停后可"继续"或"修改输入重跑"

**验收**：能在指定节点暂停，查看中间状态后继续。

---

## 三、Phase V：真正的智能体自动路由（深入 chat 核心）

**目标**：让 chat 路由能自动识别"该走某个 workflow"，无需用户手动点建议。

**为什么现在做**：Phase S 的"建议"是折中。Phase R 的 agent-loop 已验证 LLM 自主循环可行，现在可以把"workflow 作为 expert"接入 chat 路由。

**实现路径**（侵入式，需谨慎）：

| 子任务 | 说明 |
|---|---|
| V-1 workflow 注册为 expert | 发布时注册到 plugin registry，id=`workflow:${workflowId}`，routing.keywords 来自 workflow 元数据 |
| V-2 chat 路由识别 workflow-expert | resolveIntent 匹配到 workflow-expert 时返回特殊标记；graph 路由节点识别后走 workflow 执行分支 |
| V-3 graph 加 workflow 执行节点 | 新增 `workflow-exec` 节点：调用 startAgentWorkflowExecution，把结果回灌 graph 消息流 |
| V-4 前端 chatSettings 自动切换 | 路由结果含 workflowId 时，前端自动设 agentWorkflowId（或直接走 workflow-exec 节点） |

**风险**：workflow 执行是异步长流程（HITL/轮询），塞进 langgraph 单节点需要处理状态同步。建议先做 V-1/V-2（路由识别 + 前端自动切 workflowId），V-3（graph 内执行）作为进阶。

**验收**：chat 里说"帮我请假"，自动路由到带"请假"关键词的已发布 workflow 执行。

---

## 四、Phase T 收尾（组件化）

| 子任务 | 文件 | 行数 | 风险 |
|---|---|---|---|
| T-2 | aiApi.ts 拆域文件 + barrel | 681 | 高（60+ import） |
| T-5 | AgentWorkflowListView 拆模板/卡片 | 572 | 中（耦合模板常量） |
| T-6 | ModelSettingsView 抽 useModelCenter | 593 | 中（交叉状态） |

T-2 策略：先建域文件，aiApi.ts 改为 `export * from './aiApi/xxx'` barrel，零 import 迁移。

---

## 五、批次执行计划

| 批次 | 内容 | 工期 | 优先级 |
|---|---|---|---|
| 批次 1 | U-2（成本可见）+ U-3（配额） | 4d | 高（agent-loop 上线必备） |
| 批次 2 | U-1（子 workflow 调用） | 3d | 高 |
| 批次 3 | V-1 + V-2（路由自动识别 workflow） | 3d | 中 |
| 批次 4 | T-2/T-5/T-6 组件化收尾 | 穿插 | 低 |
| 批次 5 | U-4（断点单步）+ V-3（graph 内执行） | 6d | 可选 |

---

## 六、成功度量

- agent-loop 调试时可见迭代数/工具调用/token
- agent-loop 能调用子 workflow（U-1 demo 跑通）
- chat 说关键词自动路由到 workflow（V-1/V-2 demo 跑通）
- aiApi.ts / AgentWorkflowListView / ModelSettingsView 降到 <350 行
- 现有测试不退化，新增 U/V 测试

---

## 七、真机验证清单（待用户起 dev 服务）

以下需真机验证（typecheck + 单测无法覆盖运行期）：

1. WorkflowDebugView：调试一个草稿 workflow，看节点轨迹实时更新
2. agent-loop 节点：配 2 个工具，输入多步任务，验证 LLM 自主循环到完成
3. workflow 路由建议：发布带关键词的 workflow，chat 输入匹配词，看建议条出现
4. ExecutionHITLDialog：触发 HITL 节点，验证弹窗确认/拒绝
5. 403 权限修复：重新登录 admin，验证 apikey:view 等 403 消失

验证报错贴给 AI，按 [[no-skip-issues]] 找根因修复。
