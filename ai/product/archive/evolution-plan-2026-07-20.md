# AI 平台演进计划(2026-07-20)

> 依据:产品级审查 + 代码核实 + 用户决策。本文为可执行规划,loop 按「批次 -> 任务 -> 验收」推进。
> 日期:2026-07-20

---

## 一、核实结论(规划前提)

核实代码后,原以为的技术债**多数已完成**,真实待办大幅缩减:

| 原以为的债 | 核实结果 | 处置 |
|---|---|---|
| httpToolExecutor SSRF 防护 | ✅ 已完成(SSRF block + 超时 + 大小限制 + 白名单 + 禁重定向 + 测试) | F 文档过时,更新即可 |
| createdBy 多租户过滤 | ✅ 已完成(apiKey `buildOwnershipFilter` + workflow `getUserId`) | A2.5 关闭 |
| thinker/quality_check 事件 | ✅ 已实现(chatStreamRunner 4 处发事件) | D4 关闭,补文档说明 |
| Model 能力类型(capabilities) | ❌ schema 无字段 | 可选补,服务于图像/视频节点选模型 |
| Model 体系(供应商+模型) | ✅ 已具备(Provider+Model 两级 + 用户自配 + ModelOptionSelect 动态选) | **不新增体系** |
| coverage 配置 | ✅ 已配置(v8 + stores 70% 门槛) | 1B 缩减:补 api 门槛 + CI 接入 |

**关键认知**:
1. 模型中心已有用户自配能力(ProviderDialog: name/type/baseUrl/apiKey + QuickAddPresets),**不需要额外增加供应商+模型体系**
2. LLM/图像/视频分析节点已通过 `ModelOptionSelect` + `useModelOptions` 从模型中心选模型
3. `image-generate`/`ppt-generate` 节点**定义有,工作流执行器未实现**(走 default 不跑)
4. 图像生成 API 硬编码 OpenAI(`advancedFeatureRoutes.ts:285`),绕过模型中心
5. qiankun `app` 模式下导航本就隐藏(`shouldHideSubAppMenu`),顶导重构**只影响独立站模式**

---

## 二、用户决策

| 决策 | 结论 |
|---|---|
| 导航方向 | **顶部导航**(独立站模式;app 模式不变,shell 提供菜单) |
| 模型体系 | **不额外增加**;现有 Provider+Model 已是"分类+实际值",够用 |
| 模型 API 配置 | 模型中心让用户自配,节点链路里选对应模型即可 |
| 视频生成 | 按建议:节点内置异步轮询,用户自配 endpoint |
| 能力存储 | 按建议:数组 `capabilities`(一个模型可多能力) |
| capabilities 标注 | **做**(让图像/视频节点只列对应能力模型) |

---

## 三、五条线路

### 线路 1:开源收尾(独立穿插)

| ID | 任务 | 范围 | 工作量 | 状态 |
|---|---|---|---|---|
| 1A | 文档路径 CI 校验脚本 | ai/ scripts + 校验脚本 | 0.5d | 待做 |
| 1B | coverage api 门槛 + CI 接入 | ai/app vitest.config + .github | 0.5d | stores 门槛已有,补 api |
| 1C | thinker/quality_check 事件文档说明 | docs | 0.5d | 事件已实现,补文档 |

### 线路 5:顶导重构(独立站模式)

| ID | 任务 | 范围 | 工作量 |
|---|---|---|---|
| 5A | AiLayout 改顶导:功能项平铺 + 设置类右上角下拉 | ai/app AiLayout.vue | 1.5d |

**顶导信息架构**:
```
[AI logo]  对话 | 工作流 | 知识库 | 插件 | 监控        ⚙设置▾(模型中心/Embedding/密钥/路由调试)  🌐语言
```
- 功能项(chat/workflows/rag/plugins/monitor)平铺顶导
- 设置类(models/embedding/keys/routingDebug)收进右上角 ⚙ 下拉
- app 模式(`shouldHideSubAppMenu`)不变,顶导不渲染

### 线路 3:预置模板扩充

| ID | 任务 | 范围 | 工作量 | 依赖 |
|---|---|---|---|---|
| 3A | 通用模板扩充(数据/集成/审核类) | ai-shared AGENT_WORKFLOW_TEMPLATES | 1d | 无 |
| 3B | 多模态模板(图文/批量配图) | ai-shared | 0.5d | 2a |

**3A 扩充方向**(基于现有节点组合):
- 数据处理:Excel 解析+报表、多文档对比、结构化提取
- 集成:HTTP 回调通知增强、批量 webhook 分发
- 审核:内容合规审查、合同风险标注、FAQ 质检

### 线路 4:技术债(降级,可选)

| ID | 任务 | 范围 | 工作量 |
|---|---|---|---|
| 4A | Model `capabilities` 标注 + ModelOptionSelect 能力过滤 | server Model + ai/app + ai-shared | 1d |

**4A 设计**:
- server `Model.ts`:加 `capabilities: ['chat','image','video','audio'][]`,默认 `['chat']`
- seed:DeepSeek/Mimo 标 `['chat']`,OpenAI dall-e-3 标 `['chat','image']`
- ai/app `ModelOptionSelect`:加可选 `capability` prop 过滤
- ai/app `ModelDialog`:加能力配置(多选)
- 图像节点 `ImageGenerateNodePanel` 传 `capability="image"`,视频节点传 `capability="video"`

### 线路 2:多模态生成(依赖 4A 的能力过滤,但无 4A 也能跑)

| ID | 任务 | 范围 | 工作量 | 依赖 |
|---|---|---|---|---|
| 2a-1 | `image-generate` 工作流执行器实现 | server agentWorkflowExecutor | 1d | 无 |
| 2a-2 | 图像生成走模型中心(从 Model->Provider 解析 key/baseUrl) | server advancedFeatureRoutes + service | 1d | 无 |
| 2a-3 | 多张生成(`n` 参数) | server + ai/app 节点 | 0.5d | 2a-1 |
| 2a-4 | 图像节点面板接能力过滤 | ai/app(依赖 4A) | 0.5d | 4A |
| 2b-1 | `video-generate` 节点定义 + 面板 | ai-shared + ai/app | 1d | 2a |
| 2b-2 | 视频生成 service(异步轮询,用户自配 endpoint) | server | 2d | 2b-1 |

**2a-2 关键设计**(用户决策落地):
- 图像生成不再硬编码 OpenAI,改为:节点选中 Model -> 找其 Provider -> 用 Provider 的 baseUrl/apiKey
- 复用 401 修复的 `resolveStoredProviderApiKey` 链路(密文解不开走 env fallback)
- 用户在模型中心配好"我的 OpenAI provider + dall-e-3 model",图像节点选这个 model,执行器自动用对应 provider 调用
- endpoint 路径默认 `/images/generations`(OpenAI 兼容),视频默认 `/videos/generations`

**2b-2 视频轮询设计**:
- `video-generate` 节点内置轮询:提交任务 -> 轮询状态 -> 完成取结果
- 对工作流执行器透明(节点自己等到完成才返回 output)
- 失败可重试(工作流执行器的标准失败处理)

---

## 四、批次执行计划

### 批次 1(立即,三线并行,约 2 天)

| 线路 | 任务 | 并行依据 |
|---|---|---|
| 线路 1 | 1A 文档CI + 1B coverage api 门槛 + 1C 事件文档 | 改 CI/docs,不碰代码主路径 |
| 线路 5 | 5A 顶导重构 | 改 AiLayout(独立站模式),不碰 server |
| 线路 3 | 3A 通用模板扩充 | 改 ai-shared 模板元数据,不依赖新节点 |

**验收**:
- 1A: CI 跑文档路径校验,过时引用失败
- 1B: `pnpm test:coverage` 生成报告,api 门槛生效
- 1C: docs 有 thinker/quality_check 事件说明
- 5A: 独立站访问显示顶导,设置类在下拉;app 模式不变;全量测试过
- 3A: 新增 ≥ 5 个通用模板,模板 Tab 可见

**批次 1 完成情况(2026-07-20)**:
- ✅ 5A 顶导重构:`AiLayout.vue` 改为顶部导航(功能项平铺 + 设置类右上角 ⚙ 下拉),app 模式不变;移除直接 `@element-plus/icons-vue` 引用(改用 AppIcon);414 测试过 + vue-tsc 干净 + 构建成功
- ✅ 3A 通用模板:新增 7 个模板(excel-report / multi-doc-compare / structured-extract / webhook-batch-dispatch / content-compliance / contract-risk-tag / faq-quality-check),新增 `audit` 分类;416 测试过(+2 新测试)
- ✅ 1A 文档 CI:`ai/scripts/check-doc-paths.mjs` 已存在(48 文件通过);新建 `.github/workflows/ai-app-ci.yml`(typecheck + test + doc-paths 三道 gate)
- ✅ 1B coverage 门槛:stores + api 70% 门槛**已配置**(vitest.config.ts),`typecheck` 脚本已加
- ✅ 1C 事件文档:`events.md` 新增"九、思考与质检事件"详细说明(thinker_start/complete + quality_check_start/complete 含 payload/触发时机),后续章节重编号
- ⚠️ **coverage 缺口(技术债)**:门槛已配但当前未达标 — stores 68.67%(差 1.33%)、api 36.6%(差 33.4%)。**未降门槛掩盖,未将 coverage 加入 CI gate**。api 未覆盖文件:agentWorkflowApi / apiKeyApi / modelApi / pluginApi / providerApi / tenantApi / request.ts(仅 aiApi / modelConfigApi / blobRequest 有测试)。已纳入线路 4 技术债,达标后再 gating。

### 批次 2(批次 1 后,约 2 天)

| 线路 | 任务 |
|---|---|
| 线路 4 | 4A Model capabilities 标注 + 能力过滤 |
| 线路 2a | 2a-1 图像执行器 + 2a-2 走模型中心 + 2a-3 多张 + 2a-4 节点能力过滤 |

**验收**:
- 4A: Model 有 capabilities 字段;ModelOptionSelect 传 capability 过滤生效
- 2a: 工作流里 image-generate 节点能跑;从模型中心选模型;支持多张;走选中 Model 的 Provider

**批次 2 完成情况(2026-07-21)**:
- ✅ 4A Model capabilities 全栈:
  - server: `Model.ts` 加 `capabilities` 字段(默认 `['chat']`)+ zod schema + route handler + seed 回填
  - platform-shared: `ModelCapability` 类型 + `Model.capabilities`
  - ai/app: `ModelOptionSelect` 加 `capability` prop 过滤 + `ModelDialog` 能力配置 UI + `ModelList` 能力列 + `useModelOptions` 过滤 helper
  - GET /api/models 支持 `?capability=` 过滤
- ✅ 2a-1 图像执行器: `agentWorkflowExecutor.ts` 加 `image-generate` case(prompt 模板解析 + modelId 解析 + 调用服务)
- ✅ 2a-2 走模型中心: 新建 `imageGenerationService.ts`(Model->Provider 解析 key/baseUrl,复用 401 修复的 `resolveStoredProviderApiKey` 链路);`advancedFeatureRoutes.ts` generate-image 端点解耦 OpenAI,改用服务
- ✅ 2a-3 多张: `n` 参数(1-10),返回 `images[]` 数组
- ✅ 2a-4 节点能力过滤: `ImageGenerateNodePanel` 传 `capability="image"`
- 修复 2 处既有过期测试: seedModelConfigs mimo baseUrl 断言 + llmCachePriority mock 缺 `resolveStoredProviderApiKey`

### 批次 3(批次 2 后,约 3 天)

| 线路 | 任务 |
|---|---|
| 线路 2b | 2b-1 video-generate 节点 + 2b-2 视频 service(轮询) |
| 线路 3B | 多模态模板 |

**批次 3 完成情况(2026-07-21)**:
- ✅ 2b-1 video-generate 节点:
  - platform-shared: `AgentNodeType` 加 `video-generate` + `VideoGenerateNodeData` 接口 + `createDefaultNodeData` 默认值
  - ai/app: 节点目录注册 + `VideoGenerateNodePanel.vue`(prompt/model/duration/resolution/轮询设置/预览)+ panel registry
- ✅ 2b-2 视频 service: 新建 `videoGenerationService.ts`(提交任务 -> 轮询状态 -> 超时失败,OpenAI 兼容 `/videos/generations` 约定);`agentWorkflowExecutor.ts` 加 `video-generate` case
- ✅ 3B 多模态模板: `multimodal-image-text`(LLM 文案+配图 prompt -> image-generate 多张)+ `multimodal-video-promo`(LLM 视频脚本 -> video-generate);417 测试过(+1)

---

## 五、loop 执行规则

1. **按批次推进**:批次内任务可并行,批次间严格串行(后批依赖前批)
2. **每任务完成即验证**:跑测试 + 类型检查,过才进下一个
3. **遇阻即报**:某任务卡住,记录原因,不跳过(遵循 CLAUDE.md 禁止跳过问题)
4. **跨项目边界**:线路 2/4 涉及 server,按项目隔离规则,需明确告知用户后推进(用户已授权"启动 loop 按目标实现")
5. **每批次结束汇总**:列出完成项、验证结果、下一批次计划

---

## 六、成功度量

- 批次 1 完成:顶导上线 + 开源收尾 + 模板扩充
- 批次 2 完成:图像生成全链路走通(模型中心 -> 节点 -> 执行 -> 多张)
- 批次 3 完成:视频生成走通(节点 -> 轮询 -> 用户自配 endpoint)
- 全程:全量测试通过,类型检查无新错误
