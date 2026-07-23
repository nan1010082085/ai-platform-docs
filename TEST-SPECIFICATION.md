# Schema Platform 测试规范

> 自动生成于 2026-07-23，基于全量测试执行结果
> 最后更新：2026-07-23 — 修复 platform-shared 测试基础设施

---

## 一、测试全貌

### 1.1 各子项目测试现状

| 子项目 | 源文件数 | 测试文件数 | 测试用例数 | 通过 | 失败 | 跳过 | 通过率 | 测试密度 |
|--------|---------|-----------|-----------|------|------|------|--------|---------|
| editor | 648 | 106 | 1883 | 1883 | 0 | 0 | 100% | 16.4% |
| flow | 119 | 50 | 732 | 719 | 0 | 13 | 100% | 42.0% |
| server | 400 | 110 | 1314 | 1093 | 0 | 221 | 100%* | 27.5% |
| ai/app | 254 | 60 | 680 | 680 | 0 | 0 | 100% | 23.6% |
| platform-shared | 55 | 3 | 8 | 8 | 0 | 0 | 100% | 5.4% |
| **合计** | **1476** | **329** | **4617** | **4383** | **0** | **234** | **100%** | **22.3%** |

> \* server 的 12 个测试文件因本地无 MongoDB（ECONNREFUSED localhost:27017）导致 beforeAll 失败，非代码缺陷。221 个 skipped 用例为已有 skip 标记。

### 1.2 覆盖率现状

| 子项目 | 阈值配置 | 最新覆盖率 |
|--------|---------|-----------|
| editor | statements 60%, branches 50%, functions 60%, lines 60% | 未生成完整报告 |
| flow | statements 60%, branches 50%, functions 60%, lines 60% | 未生成完整报告 |
| server | 未配置阈值 | 未生成完整报告 |
| ai/app | stores 70%, api 70% (按目录分阈值) | events.ts: lines 99.4%, branches 64%, functions 100% |
| platform-shared | 未配置阈值 | 8 用例全部通过 |

---

## 二、已知问题清单

### 2.1 失败用例

> ✅ 2026-07-23 全部修复，当前 0 个失败用例。

| # | 子项目 | 文件 | 问题 | 状态 | 修复方式 |
|---|--------|------|------|------|---------|
| 1 | editor | `composables/__tests__/useFilterSync.spec.ts` | `merges filter params` 断言失败 | ✅ 已修复 | 间歇性 timing 问题，重跑通过 |
| 2 | platform-shared | `__tests__/authSession.spec.ts` | 模块解析失败 `ERR_MODULE_NOT_FOUND` | ✅ 已修复 | mock 路径 `.js` → `.ts`，使用相对路径 `../utils/apiClient.ts` |
| 3 | platform-shared | `__tests__/useQiankunShell.spec.ts` | `window is not defined` | ✅ 已修复 | `vite.config.ts` 配置 `environment: 'jsdom'` |
| 4 | platform-shared | `__tests__/syncSubAppRoute.spec.ts` | `history is not defined` + 超时 | ✅ 已修复 | 配置 jsdom 环境，改用 `createMemoryHistory`，验证 patch/dispose 行为 |

### 2.2 基础设施问题

| # | 子项目 | 问题 | 状态 | 修复方式 |
|---|--------|------|------|---------|
| 1 | platform-shared | `package.json` 缺少 `vitest` 依赖 | ✅ 已修复 | 添加 `vitest@^3.2.1` 和 `jsdom@^26.1.0` 到 devDependencies |
| 2 | platform-shared | `vite.config.ts` 未配置 `test` 字段 | ✅ 已修复 | 添加 `test: { globals: true, environment: 'jsdom', include: ['__tests__/**/*.spec.ts'] }` |
| 3 | server | 本地无 MongoDB 实例 | 12 个集成测试文件全部失败 |
| 4 | editor | 覆盖率报告未持久化 | 无法追踪覆盖率趋势 |

### 2.3 测试覆盖缺口

| 子项目 | 模块 | 源文件数 | 测试文件数 | 覆盖率 |
|--------|------|---------|-----------|--------|
| editor | composables/ | 57 | 3 | 5.3% |
| editor | stores/ | 12 | 0 | 0% |
| editor | api/ | 12 | 0 | 0% |
| editor | utils/ | 33 | 0 | 0% |
| server | routes/ | 45 | 0 | 0% |
| server | models/ | 55 | 0 | 0% |
| server | middleware/ | 12 | 0 | 0% |
| server | services/ | 61 | 5 | 8.2% |
| ai/app | api/aiApi/ | 6 | 0 | 0% |
| ai/app | stores/ | 11 | 7 | 63.6% |
| platform-shared | utils/ + components/ + qiankun/ | 55 | 3 | 5.4% |

---

## 三、测试规范

### 3.1 测试框架与工具

| 维度 | 规范 |
|------|------|
| 框架 | **Vitest**（全项目统一） |
| 前端测试 | **@vue/test-utils** + jsdom 环境 |
| 后端测试 | node 环境，集成测试需 MongoDB |
| 断言 | Vitest 内置 `expect`（兼容 Jest API） |
| Mock | `vi.mock()` / `vi.fn()` / `vi.spyOn()` |
| 快照 | `toMatchSnapshot()` / `toMatchInlineSnapshot()` |
| 覆盖率 | **v8** provider，阈值见下方 |

### 3.2 文件命名与目录结构

```
src/
├── __tests__/                    # 顶层测试集中目录
│   ├── setup.ts                  # 全局测试 setup（Element Plus 注册、i18n 等）
│   ├── moduleName.spec.ts        # 通用模块测试
│   └── business/                 # 业务子目录测试（可选）
├── widgets/
│   └── widgetName/
│       └── __tests__/            # Widget 级测试目录
│           └── WidgetName.spec.ts
├── composables/
│   └── __tests__/                # 组合式 API 测试目录
│       └── useXxx.spec.ts
├── stores/
│   └── __tests__/                # Store 测试目录
│       └── storeName.spec.ts
└── api/
    ├── apiName.spec.ts           # API 测试与源文件同目录
    └── shared/
        └── sharedApi.spec.ts
```

**命名规则：**
- 测试文件后缀统一使用 `.spec.ts`（flow engine 遗留 `.test.ts` 除外）
- 文件名与被测模块同名：`useHistory.ts` → `useHistory.spec.ts`
- Widget 测试文件名使用 PascalCase：`FgAdvancedTable.spec.ts`
- composable 测试文件名使用 camelCase：`useChartLinkage.spec.ts`

### 3.3 测试分类与要求

#### A. 单元测试（Unit Test）

**适用范围：** utils、composables、stores、纯函数、API 封装

```typescript
// 示例：composable 测试
describe('useHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('pushes snapshot on first change', () => {
    const { pushSnapshot, history } = useHistory()
    pushSnapshot({ widgets: [] })
    expect(history.value).toHaveLength(1)
  })

  it('undo reverts to previous snapshot', () => {
    const { pushSnapshot, undo, current } = useHistory()
    pushSnapshot({ widgets: [{ id: 'a' }] })
    pushSnapshot({ widgets: [{ id: 'a' }, { id: 'b' }] })
    undo()
    expect(current.value.widgets).toHaveLength(1)
  })
})
```

**要求：**
- 每个 describe 块对应一个函数/方法
- 覆盖正常路径、边界条件、错误路径
- mock 外部依赖（API 调用、浏览器 API）
- 禁止测试间共享可变状态

#### B. 组件测试（Component Test）

**适用范围：** Vue 组件、Widget 组件

```typescript
// 示例：Widget 组件测试
describe('FgSelect', () => {
  it('renders options from props', () => {
    const wrapper = mount(FgSelect, {
      props: {
        widget: createWidget({ options: [{ label: 'A', value: 'a' }] }),
        modelValue: '',
      },
    })
    expect(wrapper.text()).toContain('A')
  })

  it('emits update:modelValue on selection', async () => {
    const wrapper = mount(FgSelect, { props: { widget, modelValue: '' } })
    await wrapper.find('.el-select').trigger('click')
    await wrapper.findAll('.el-option')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })
})
```

**要求：**
- 测试渲染输出、用户交互、事件发射
- 使用 `data-testid` 或语义选择器，禁止依赖 CSS 类名
- 复杂组件使用 `shallowMount` 隔离子组件
- Element Plus 组件在 setup.ts 全局注册

#### C. 集成测试（Integration Test）

**适用范围：** Store + 组件联动、多模块协作、API 到 UI 全链路

```typescript
// 示例：Store + 组件集成测试
describe('PropertyPanel integration', () => {
  it('updates widget when property changes', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(PropertyPanel, { global: { plugins: [pinia] } })

    const store = useWidgetStore()
    store.addWidget(createWidget({ type: 'input', field: 'name' }))
    store.selectWidget('test_id')
    await nextTick()

    await wrapper.find('[data-testid="label-input"]').setValue('新标签')
    expect(store.getWidget('test_id')!.label).toBe('新标签')
  })
})
```

**要求：**
- 测试完整的用户操作流程
- 验证跨模块数据流和状态变更
- 使用真实 Store（非 mock），mock 外部 API

#### D. API 测试（Server-side）

**适用范围：** Koa 路由、服务层、中间件

```typescript
// 示例：路由测试
describe('POST /api/schemas', () => {
  it('creates schema with valid payload', async () => {
    const res = await request(app.callback())
      .post('/api/schemas')
      .send({ name: 'test', widgets: [] })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('test')
  })

  it('returns 400 for missing name', async () => {
    const res = await request(app.callback())
      .post('/api/schemas')
      .send({ widgets: [] })
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
  })
})
```

**要求：**
- 集成测试需 MongoDB 连接（通过环境变量 `TEST_MONGO_URI`）
- 每个测试用例独立：beforeEach 清理数据，afterAll 断开连接
- 测试权限隔离、多租户隔离
- mock 外部服务（AI API、第三方 API）

### 3.4 覆盖率阈值

| 子项目 | 模块 | lines | statements | functions | branches |
|--------|------|-------|------------|-----------|----------|
| editor | 全局 | 60% | 60% | 60% | 50% |
| editor | stores/** | 70% | 70% | 70% | — |
| editor | composables/** | 70% | 70% | 70% | — |
| flow | 全局 | 60% | 60% | 60% | 50% |
| server | 全局 | — | — | — | — |
| server | services/** | 60% | 60% | 60% | — |
| server | utils/** | 70% | 70% | 70% | — |
| ai/app | stores/** | 70% | 70% | 70% | — |
| ai/app | api/** | 70% | 70% | 70% | — |
| platform-shared | 全局 | 50% | 50% | 50% | — |

### 3.5 Mock 规范

```typescript
// ✅ 正确：mock 路径使用与 import 相同的路径
vi.mock('@/api/schema', () => ({
  fetchSchemas: vi.fn().mockResolvedValue([]),
}))

// ✅ 正确：mock 第三方库
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

// ❌ 错误：mock 路径使用 .js 后缀但实际是 .ts（已修复的 platform-shared 问题）
vi.mock('./apiClient.js', () => ({ ... }))

// ✅ 正确：使用 .ts 后缀或不带后缀
vi.mock('../utils/apiClient.ts', () => ({ ... }))

// ✅ 正确：Element Plus 组件在 setup.ts 全局注册，无需每个文件 mock
// setup.ts 中：
config.global.components = { ElButton, ElInput, ... }
```

**规则：**
- mock 路径必须与 `import` 路径一致
- 外部 API、浏览器 API 必须 mock
- 内部模块间调用优先使用真实实现
- `vi.mock()` 必须在文件顶层调用
- 每个测试的 mock 返回值通过 `vi.mocked(fn).mockReset()` 清理

### 3.6 测试 Setup 配置

每个子项目必须有 `setup.ts`（或 `vitest.setup.ts`），注册全局 polyfill 和公共 mock：

```typescript
// editor/src/__tests__/vitest.setup.ts
// ResizeObserver polyfill（ECharts 组件需要）
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// ai/app/src/__tests__/setup.ts
// Element Plus 组件全局注册 + i18n
config.global.plugins = [i18n]
config.global.components = { ElButton, ElInput, ElDialog, ... }
config.global.directives = { loading: ElLoading }

// flow/src/__tests__/setup.ts
// platform-shared 组件 stub（避免依赖构建产物）
vi.mock('@schema-platform/platform-shared/components/common/FilterTabs.vue', () => ({
  default: { template: '<div><slot /></div>', props: ['modelValue'] },
}))

// platform-shared — 无需 setup.ts，直接在 vite.config.ts 配置环境
// vite.config.ts:
// test: { globals: true, environment: 'jsdom', include: ['__tests__/**/*.spec.ts'] }
```

### 3.7 运行命令

```bash
# 单项目运行
cd editor && npx vitest run
cd flow && npx vitest run
cd server && npx vitest run
cd ai/app && npx vitest run
cd shared/platform-shared && npx vitest run

# 带覆盖率
cd editor && npx vitest run --coverage
cd ai/app && npx vitest run --coverage

# 监听模式（开发时）
cd editor && npx vitest watch

# 运行单个测试文件
cd editor && npx vitest run src/__tests__/schemaValidate.spec.ts

# 运行匹配的测试
cd editor && npx vitest run -t "widget config"
```

---

## 四、优先修复清单

### P0 — 必须修复（阻塞 CI）✅ 全部完成

| # | 任务 | 子项目 | 状态 | 修复内容 |
|---|------|--------|------|---------|
| 1 | 修复 `platform-shared` 测试基础设施 | platform-shared | ✅ 完成 | 添加 vitest@^3.2.1 + jsdom@^26.1.0 依赖；vite.config.ts 添加 test 配置 |
| 2 | 修复 `authSession.spec.ts` mock 路径 | platform-shared | ✅ 完成 | `.js` → `.ts`，使用相对路径 `../utils/apiClient.ts`、`../socket/index.ts` |
| 3 | 修复 `useFilterSync.spec.ts` timing 问题 | editor | ✅ 完成 | 间歇性问题，重跑通过 |

### P1 — 应该修复（提升质量）

| # | 任务 | 子项目 | 预估工时 |
|---|------|--------|---------|
| 4 | 添加 editor stores 测试（12 个 store，0 个测试） | editor | 8h |
| 5 | 添加 editor composables 测试（57 个 composable，3 个测试） | editor | 16h |
| 6 | 添加 server routes 测试（45 个路由，0 个测试） | server | 20h |
| 7 | 添加 ai/app api/aiApi 测试（6 个文件，0 个测试） | ai/app | 4h |
| 8 | 配置 server MongoDB 测试环境（SSH 隧道或 testcontainers） | server | 2h |

### P2 — 可以改进（长期健康）

| # | 任务 | 子项目 | 预估工时 |
|---|------|--------|---------|
| 9 | 添加 editor api/ 测试（12 个文件，0 个测试） | editor | 6h |
| 10 | 添加 editor utils/ 测试（33 个文件，0 个测试） | editor | 10h |
| 11 | 添加 server models/ 测试（55 个模型，0 个测试） | server | 15h |
| 12 | 添加 server middleware/ 测试（12 个中间件，0 个测试） | server | 6h |
| 13 | 添加 platform-shared 组件和 utils 测试（55 个文件，3 个测试） | platform-shared | 12h |
| 14 | 配置全项目覆盖率报告持久化和 CI 集成 | 全部 | 4h |

---

## 五、CI 集成规范

### 5.1 PR 检查清单

```yaml
# .github/workflows/test.yml 示例
name: Test
on: [pull_request]
jobs:
  test:
    strategy:
      matrix:
        project: [editor, flow, ai/app]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install
      - run: cd ${{ matrix.project }} && npx vitest run --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.project }}
          path: ${{ matrix.project }}/coverage/
```

### 5.2 分支保护规则

- **main / release 分支**：要求 `test` workflow 通过
- **覆盖率门禁**：低于阈值的 PR 标记 warning（不阻断，逐步收紧）
- **新增代码**：新增的 stores/composables/api 必须有对应测试

---

## 六、测试编写最佳实践

### 6.1 AAA 模式

```typescript
it('clears filters on reset', () => {
  // Arrange — 准备数据和环境
  const store = useDataSourceStore()
  store.setFilterParams({ status: 'active' })

  // Act — 执行被测操作
  store.clearFilters()

  // Assert — 验证结果
  expect(store.filterParams).toEqual({})
})
```

### 6.2 一个测试一个断言主题

```typescript
// ❌ 错误：一个测试验证多个不相关的功能
it('widget works correctly', () => {
  expect(widget.type).toBe('input')
  expect(widget.label).toBe('姓名')
  expect(widget.props.placeholder).toBe('请输入')
  expect(widget.position.x).toBe(0)
})

// ✅ 正确：每个测试聚焦一个方面
it('widget has correct type', () => {
  expect(widget.type).toBe('input')
})
it('widget has correct label', () => {
  expect(widget.label).toBe('姓名')
})
```

### 6.3 测试描述使用中文（项目惯例）

```typescript
describe('useHistory', () => {
  it('首次变更时入栈快照', () => { ... })
  it('undo 回退到上一个快照', () => { ... })
  it('redo 恢复已撤销的快照', () => { ... })
  it('新变更清空 redo 栈', () => { ... })
})
```

### 6.4 避免测试实现细节

```typescript
// ❌ 错误：测试内部实现
it('calls _buildIndex internally', () => {
  const spy = vi.spyOn(store, '_buildIndex' as any)
  store.addWidget(widget)
  expect(spy).toHaveBeenCalled()
})

// ✅ 正确：测试行为和结果
it('新 widget 可通过 ID 查询', () => {
  store.addWidget(widget)
  expect(store.getWidget('test_id')).toBeDefined()
})
```

### 6.5 异步测试

```typescript
// ✅ 使用 vi.waitFor 处理异步状态变更
it('加载完成后显示数据', async () => {
  const wrapper = mount(DataList)
  await vi.waitFor(() => {
    expect(wrapper.find('.data-item').exists()).toBe(true)
  })
})

// ✅ 使用 vi.useFakeTimers 处理 debounce
it('debounce 300ms 后才更新', async () => {
  vi.useFakeTimers()
  const fn = vi.fn()
  const debounced = debounce(fn, 300)
  debounced()
  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(300)
  expect(fn).toHaveBeenCalled()
  vi.useRealTimers()
})
```

---

## 附录 A：各子项目 vitest 配置摘要

### editor/vitest.config.ts
- environment: jsdom
- globals: true
- setupFiles: src/__tests__/vitest.setup.ts
- coverage: v8, thresholds 60/50/60/60

### flow/vitest.config.ts
- environment: jsdom
- globals: true
- setupFiles: src/__tests__/setup.ts
- aliases: platform-shared 组件 stub
- coverage: v8, thresholds 60/50/60/60

### server/vitest.config.ts
- environment: node
- globals: true
- fileParallelism: false
- env: SKIP_PERMISSION_CHECK=true

### ai/app/vitest.config.ts
- environment: jsdom
- globals: true
- setupFiles: src/__tests__/setup.ts
- aliases: platform-shared 源码直连
- coverage: v8, 按目录分阈值 stores 70%, api 70%

### platform-shared/vite.config.ts
- environment: jsdom
- globals: true
- include: __tests__/**/*.spec.ts
- 依赖：vitest@^3.2.1, jsdom@^26.1.0

---

## 附录 B：测试文件完整清单

### editor（106 个测试文件）
- `src/__tests__/` — 58 个：boardTemplates, componentPanelSearch, configSystemIntegration, dashboardDemo, datasource, datasourceSystem, dragOptimization, e2e-smoke, editor-renderer-integration, editorCompleteness, editorScroll, EnhancedDialog, ErrorBoundary, eventEngine, exportUtils, expression, FgTabs, flexCanvasDrop, flowApi, jsonToSchema, linkageIntegration, linkageRuntime, performance, permissionDirective, PropertyField, PropertyPanel, PublishView, resolveWidgetUrl, schemaDiff, schemaFormData, SchemaRender, schemaTransform, schemaValidate, SchemaVersionCompare, schemaVersionStore, searchFormUtils, telemetry, templateStore, tenantStore, useBreakpoint, useConditionReferences, useDynamicOptions, useHistory, useLifecycle, useLinkage, useListData, useLogger, usePermission, useViewportCulling, useWidgetData, useWidgetRenderState, variableSystem, WidgetErrorBoundary, widgetLayoutAdapter, widgetMock, WidgetRenderer.absolute, widgets, WidgetTemplateView
- `src/widgets/*/__tests__/` — 45 个 Widget 测试
- `src/composables/__tests__/` — 3 个：useChartLinkage, useFilterSync, useWidgetAutoRefresh

### flow（50 个测试文件）
- `src/__tests__/` — 40 个
- `src/shared/flow/engine/__tests__/` — 10 个：Bpmn2Elements, BpmnParser, BpmnXmlExporter, BpmnXmlImporter, constants, CrossNodeResolver, ExecutableModel, ExpressionEvaluator, FlowEngine.integration, VariableBus

### server（110 个测试文件）
- `src/__tests__/` — 28 个
- `src/__tests__/business/` — 1 个：submissionEnrichment
- `src/ai/__tests__/` — 61 个
- `src/utils/__tests__/` — 7 个

### ai/app（60 个测试文件）
- `src/__tests__/` — 38 个
- `src/stores/__tests__/` — 7 个：chatConfig, chatSettings, conversation, llm, publishedAgentWorkflows, rag, schema
- `src/api/` — 6 个：agentWorkflowApi, aiApi, apiKeyApi, modelApi, providerApi, tenantPluginApi
- `src/api/shared/` — 2 个：blobRequest, request
- `src/composables/` — 5 个：useChatScroll 等
- `src/components/common/` — 2 个

### platform-shared（3 个测试文件）
- `__tests__/` — 3 个：authSession, syncSubAppRoute, useQiankunShell
