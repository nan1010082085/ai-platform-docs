# AI 对话 — 设计稿与交互流

## 一、页面线框（AiChatView）

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 顶栏                                                                      │
│  [AI] 智能助手          ● 已连接   [🕐 历史]   [+ 新对话]                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ TaskChainBar（多步任务时显示）────────────────────────────────────┐  │
│  │ ① 生成页面 ✓  →  ② 生成表单 ●  →  ③ 汇总                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ 消息区（滚动）────────────────────────────────────────────────────┐  │
│  │  You: 帮我做一个请假审批流程                                        │  │
│  │                                                                      │  │
│  │  Flow Agent                                                          │  │
│  │  ┌─ FlowCard ─────────────────────────────────────────────────┐   │  │
│  │  │  请假审批流程  [开始] [审批] [结束]                            │   │  │
│  │  │  [发布到流程设计器]  [在编辑器中打开]                           │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  │  ▼ 思考过程（可折叠）                                                │  │
│  │  🔧 flow__search  ✓                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  输入区 AiChatPanel                                                       │
│  ┌─ RAG 已选上下文 chips ─────────────────────────────────────────────┐  │
│  │  📄 请假流程规范 ×    📄 Schema 设计指南 ×                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌─ AiMentionInput ─────────────────────────────────────────────────┐  │
│  │  @schema 引用...                                                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  [📎 文档] [🔍 RAG] [⚙ 设置]   Agent: Auto ▼   [编排: 智能助手 ▼]  [发送] │
└──────────────────────────────────────────────────────────────────────────┘
```

### 关键组件

| 组件 | 职责 |
|------|------|
| `AiChatPanel` | 消息列表 + 输入区容器 |
| `AiMessage` | 单条消息：文本、思考、工具调用、卡片 |
| `TaskChainBar` | 多 Agent 任务链进度 |
| `AiMentionInput` | @ 引用 Schema/Flow |
| `AiRagSearch` | 输入区上方 RAG 检索浮层 |
| `AgentWorkflowPicker` | 选择已发布工作流作为后端 |
| `RequirementConfirmCard` | 需求确认 HITL 卡片 |
| `ConversationDrawer` | 对话历史侧抽屉 |
| `AiChatSettings` | 设置抽屉（模型、工作流、健康检查） |

---

## 二、对话后端选择

用户可在设置或输入区选择对话引擎：

```mermaid
flowchart TD
  Send["用户点击发送"] --> CheckWF{"chatSettings.agentWorkflowId?"}

  CheckWF -->|有| WFPath["runWorkflowChatTurn"]
  CheckWF -->|无| LGPath["store.sendMessage → WebSocket"]

  WFPath --> Execute["POST /workflows/:id/execute"]
  WFPath --> Continue["或 POST .../continue"]
  WFPath --> Resume["或 POST .../resume (HITL)"]
  Execute --> WS["workflow:subscribe"]
  WS --> Parse["extractWorkflowChatResponse"]
  Parse --> ShowMsg["追加 assistant 消息"]

  LGPath --> Socket["chat:send"]
  Socket --> Events["chat:event 流式事件"]
  Events --> StreamUI["实时更新消息/卡片/工具状态"]
```

| 模式 | 传输 | 流式 | HITL |
|------|------|------|------|
| LangGraph（默认） | WebSocket | ✅ 逐字/事件 | `interrupt` + `chat:resume` |
| 已发布工作流 | WebSocket + REST 启动 | ✅ `workflow:event` | `waiting` + resume API |

---

## 三、LangGraph 对话交互流

### 3.1 标准生成流程

```mermaid
sequenceDiagram
  actor User as 用户
  participant UI as AiChatPanel
  participant Store as ai store
  participant WS as WebSocket
  participant Srv as LangGraph

  User->>UI: 输入消息 + 发送
  UI->>Store: sendMessage(msg, mentions, attachments)
  Store->>WS: chat:send { message, context, settings }
  WS->>Srv: 启动 Graph

  loop 流式事件
    Srv-->>WS: chat:event
    WS-->>Store: 分发事件
    Store-->>UI: 更新 messages / taskChain / streamStatus
  end

  Srv-->>WS: done
  WS-->>Store: 完成
  Store-->>UI: loading=false
```

### 3.2 v2 需求确认（HITL）

```mermaid
stateDiagram-v2
  [*] --> Streaming: 用户发送
  Streaming --> ReqAnalysis: requirement_analysis_start
  ReqAnalysis --> ConfirmCard: requirement_confirm_request
  ConfirmCard --> WaitingInput: 展示 RequirementConfirmCard
  WaitingInput --> UserAnswers: 逐题回答 / 跳过
  UserAnswers --> Resume: confirmRequirement()
  Resume --> TaskPlan: task_plan_start
  TaskPlan --> AgentExec: 路由到 editor/flow/page
  AgentExec --> Done: done 事件
  ConfirmCard --> Skip: skipRequirement()
  Skip --> TaskPlan
```

**RequirementConfirmCard 交互**：

```
┌─ 需求确认 ─────────────────────────────────────────┐
│  问题 1/3：审批需要几级？                            │
│  ○ 一级   ● 二级   ○ 三级                          │
│  [上一题]  [下一题]  [跳过全部]  [确认并继续]         │
└────────────────────────────────────────────────────┘
```

确认后输入框 placeholder 变为 `requirementInputPlaceholder` 提示。

### 3.3 任务链（多 Agent 协作）

```mermaid
flowchart LR
  subgraph chain [TaskChainBar]
    S1["① Page 生成列表页"]
    S2["② Editor 生成表单"]
    S3["③ Summarizer 汇总"]
  end

  S1 -->|完成| S2
  S2 -->|request_collaboration| S2b["插入 Flow 协作步骤"]
  S2b --> S3
```

`CollaborationBar` 在 Agent 切换时短暂显示协作来源。

### 3.4 Schema / Flow 卡片操作

```mermaid
flowchart TD
  Card["消息内嵌 SchemaCard / FlowCard"]
  Card --> Primary["主按钮：发布"]
  Card --> Secondary["次按钮：在编辑器中打开"]

  Primary --> Publish["store.publishCurrent()"]
  Publish --> Qiankun{"嵌入模式?"}
  Qiankun -->|是| Bridge["bridge: ai:open-in-editor"]
  Qiankun -->|否| NewWin["window.open /editor 或 /flow"]

  Secondary --> OpenEditor["同上，跳过发布提示"]
```

---

## 四、工作流模式对话交互流

```mermaid
sequenceDiagram
  actor User as 用户
  participant UI as AiChatPanel
  participant Hook as useWorkflowChatExecution
  participant API as agentWorkflowApi

  User->>UI: 发送消息（已选工作流）
  UI->>Hook: runWorkflowChatTurn()

  alt 首次对话
    Hook->>API: executeWorkflow(workflowId, input)
  else 多轮继续
    Hook->>API: continueExecution(lastExecutionId, input)
  else HITL 恢复
    Hook->>API: resumeExecution(pendingExecutionId, { approved, comment })
  end

  API-->>Hook: executionId
  Hook->>WS: workflow:subscribe
  loop workflow:event
    WS-->>Hook: execution 快照
    Hook-->>UI: 更新时间线 / 流式文本
  end

  Hook-->>UI: responseText + execution

  alt waiting
    UI->>User: 展示 HITL 确认（同 RequirementConfirmCard 或文本回复）
  else success
    UI->>User: 展示 assistant 回复
  end
```

**输入 payload 映射**（含文档附件时）：

```
input.message          ← 用户文本
input.documentId       ← 首个附件 ID
input.documentIds      ← 全部附件 ID
input.documentAttachments
input.file             ← 工作流文件引用
```

---

## 五、输入区功能交互

### 5.1 文档附件

```mermaid
flowchart TD
  Click["点击 📎"] --> Pick["选择文件"]
  Pick --> Validate{"允许格式?"}
  Validate -->|否| Err["提示不支持格式"]
  Validate -->|是| Upload["uploadFile API"]
  Upload --> Card["DocumentAttachmentCard 显示在输入区上方"]
  Card --> Send["发送时带入 attachments"]
  Send --> LG["LangGraph: 随 context 发送"]
  Send --> WF["Workflow: 写入 input.documentId"]
```

支持格式见 `@schema-platform/ai-shared/document` 的 `DOCUMENT_UPLOAD_ACCEPT`。

### 5.2 内联 RAG 检索

```
点击 [🔍 RAG]
    ↓
┌─ AiRagSearch 浮层 ─────────────────────┐
│  搜索: [请假流程____________] [搜索]     │
│  ─────────────────────────────────────  │
│  ○ 请假审批规范 (score 0.92)            │
│  ○ 流程节点说明 (score 0.85)            │
└─────────────────────────────────────────┘
    ↓ 选择
RAG chip 出现在输入区上方 → 发送时作为 ragContext 注入
```

### 5.3 @ Mention 引用

`AiMentionInput` 输入 `@` 触发 Schema/Flow 搜索，选中后作为 `mentions` 随消息发送，供 Agent 精确定位上下文。

### 5.4 设置抽屉

```
┌─ 对话设置 (320px Drawer) ──────────────┐
│ ▼ 连接状态                              │
│   ● API Key 已配置                      │
│   DeepSeek deepseek-chat [默认]         │
│ ▼ 模型                                  │
│   对话模型: [DeepSeek Chat ▼]           │
│ ▼ Agent 编排                            │
│   [选择已发布工作流 ▼]                   │
│   留空则使用 LangGraph 对话引擎          │
│ [取消]  [保存]                          │
└─────────────────────────────────────────┘
```

---

## 六、消息组件状态

### 6.1 Assistant 消息结构

```mermaid
flowchart TB
  Msg["AiMessage (assistant)"]
  Msg --> Label["Agent 标签 + 颜色"]
  Msg --> Think["thinking 折叠区"]
  Msg --> Tools["工具调用列表 AiStepCard"]
  Msg --> Content["Markdown 正文"]
  Msg --> Cards["嵌入卡片"]
  Msg --> Docs["DocumentSummaryCard"]
  Msg --> Actions["复制 / 重新生成 / 反馈"]

  Cards --> SchemaCard
  Cards --> FlowCard
  Cards --> RequirementConfirmCard
```

### 6.2 流式连接状态

| streamStatus | UI 表现 |
|--------------|---------|
| `idle` | 正常 |
| `connecting` | 发送按钮禁用，显示连接中 |
| `streaming` | 显示停止按钮，消息逐字更新 |
| `reconnecting` | 显示重试计数 `retryCount / MAX_AUTO_RETRIES` |
| `error` | 显示重试按钮 |

顶栏 WS 指示灯：`isConnected()` 每秒轮询，绿点=已连接。

---

## 七、对话历史

```mermaid
flowchart LR
  Click["顶栏 🕐"] --> Drawer["ConversationDrawer 打开"]
  Drawer --> Load["loadConversations()"]
  Load --> List["对话列表（标题 + 时间）"]
  List --> Select["点击条目"]
  Select --> LoadOne["loadConversation(id)"]
  LoadOne --> Close["关闭 Drawer，恢复消息"]
  List --> Delete["删除条目"]
  Delete --> Remove["removeConversation(id)"]
```

---

## 八、空状态与错误

| 场景 | 表现 |
|------|------|
| 新对话 | 空消息区 + 欢迎提示 |
| WS 断开 | 顶栏红点「未连接」，发送可能失败 |
| 对话 404 | Toast「对话不存在或已被删除」，刷新列表 |
| 工作流执行失败 | assistant 消息展示 error 文本 |
| 工具调用失败 | AiStepCard 红色状态 + 重试按钮 |

---

## 九、运行时架构

> 完整运行时图见 [runtime.md](./runtime.md)

### LangGraph 请求链路

```mermaid
sequenceDiagram
  participant UI as AiChatPanel
  participant WS as Socket.IO
  participant R as chatStreamRunner
  participant G as LangGraph
  participant CP as Checkpointer

  UI->>WS: chat:send
  WS->>R: executeChatStream
  R->>G: streamEvents(thread_id)
  loop 流式
    G-->>R: on_chain / on_chat_model_stream / on_tool_end
    R-->>UI: chat:event
  end
  G->>CP: 持久化 thread 状态
  R-->>UI: done
```

### 双后端运行时分支

```mermaid
flowchart TD
  Send["用户发送"] --> Mode{agentWorkflowId?}
  Mode -->|无| LG["chatStreamRunner → LangGraph\nWebSocket 流式"]
  Mode -->|有| WF["agentWorkflowExecutor\nREST 启动 + workflow:event WS"]
  LG --> MCP["tools/registry → MCP Bridge"]
  WF --> MCP
  MCP --> DB["MongoDB"]
  LG --> LLM["LLM API"]
  WF --> LLM
```

