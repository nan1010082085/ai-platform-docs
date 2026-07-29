# Schema 自动化校验与测试体系

> 编辑器四大配置系统（属性面板、事件引擎、联动系统、数据源）的自动化校验与测试方案

---

## 一、校验分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: 集成测试                         │
│  完整 Schema 渲染 → 交互 → 断言（Vitest + Vue Test Utils）  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: 运行时校验                       │
│  渲染过程中实时检测：死引用、类型不匹配、循环依赖             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: 引用完整性校验                   │
│  跨 Widget 引用检查：field/ID/容器/事件/暴露值               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: 静态结构校验                     │
│  单 Widget 配置校验：类型、必填、格式、范围                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、Layer 1 — 静态结构校验

### 2.1 校验时机
- 编辑器属性面板修改后即时校验
- Schema 保存前全量校验
- Schema 导入时全量校验

### 2.2 校验规则清单

#### 基础结构

| 规则 ID | severity | 校验内容 | 当前状态 |
|---------|----------|---------|---------|
| `WIDGET_TYPE_INVALID` | error | type 不在已注册类型集合中 | ✅ 已有 |
| `WIDGET_ID_DUPLICATE` | error | 同一 Schema 中 id 重复 | ❌ 缺失 |
| `WIDGET_ID_FORMAT` | warning | id 格式不符合 `${type}_${hash}` 约定 | ❌ 缺失 |
| `POSITION_MISSING` | error | 缺少 position 字段 | ❌ 缺失 |
| `POSITION_INVALID` | error | position.x/y/w/h 非数值或 w/h <= 0 | ❌ 缺失 |

#### 属性面板配置

| 规则 ID | severity | 校验内容 | 当前状态 |
|---------|----------|---------|---------|
| `FIELD_MISSING` | error | 表单组件缺少 field | ✅ 已有 |
| `FIELD_DUPLICATE` | error | 重复 field 名 | ✅ 已有 |
| `FIELD_FORMAT` | warning | field 含特殊字符或以数字开头 | ❌ 缺失 |
| `LABEL_MISSING_ON_REQUIRED` | warning | 有 required 联动但无 label | ✅ 已有 |
| `PROPS_TYPE_UNKNOWN` | error | propertyPanel.props[].type 不被 PropertyField 支持 | ❌ 缺失 |
| `STYLE_PROP_UNKNOWN` | warning | propertyPanel.style 中的属性名无标签映射 | ❌ 缺失 |
| `DEFAULT_VALUE_TYPE_MISMATCH` | warning | defaultValue 类型与控件类型不匹配 | ❌ 缺失 |
| `OPTIONS_EMPTY` | warning | select/radio/checkbox 无 options 且无 API | ✅ 已有 |
| `OPTIONS_FORMAT` | error | options 缺少 label 或 value | ❌ 缺失 |

#### 容器与嵌套

| 规则 ID | severity | 校验内容 | 当前状态 |
|---------|----------|---------|---------|
| `NESTING_VIOLATION` | error | 基础/业务组件互相嵌套 | ✅ 已有 |
| `NESTING_DEPTH` | warning | 嵌套深度超过 5 层 | ✅ 已有 |
| `CONTAINER_EMPTY` | warning | 容器组件无 children | ✅ 已有 |
| `FORM_ID_ORPHAN` | error | formId 引用的容器不存在 | ❌ 缺失 |
| `TAB_KEY_ORPHAN` | error | tabKey 引用的标签页不存在 | ❌ 缺失 |

### 2.3 实现方案

```typescript
// utils/schemaValidate.ts — 扩展现有校验器

interface ValidationRule {
  id: string
  severity: 'error' | 'warning' | 'info'
  validate: (widget: Widget, ctx: ValidationContext) => ValidationResult | null
}

interface ValidationContext {
  allWidgets: Widget[]           // 全量 Widget 列表
  registeredTypes: Set<string>   // 已注册的组件类型
  parentWidget?: Widget          // 父容器
  depth: number                  // 当前嵌套深度
}

interface ValidationResult {
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  message: string
  path: string                   // widget 在树中的路径
  widgetId: string
  fix?: () => void               // 可选的自动修复函数
}
```

---

## 三、Layer 2 — 引用完整性校验

### 3.1 校验时机
- Schema 保存前全量校验
- 联动/事件配置修改后增量校验

### 3.2 引用关系图

```
Widget A (field: "name")
  ├── linkages[].watchFields ──► Widget B (field: "type")     [字段引用]
  ├── events[].actions[].target ──► Widget C (id: "xxx")      [ID 引用]
  ├── events[].eventTarget ──► config.eventTargets[]          [事件目标引用]
  ├── formId ──► Form Container (id: "form_xxx")              [容器引用]
  ├── tabKey ──► Tabs (props.tabs[].key)                       [标签页引用]
  └── condition 表达式 ──► formData.field / variables.name / exposed.id.key  [表达式引用]
```

### 3.3 校验规则清单

| 规则 ID | severity | 校验内容 | 当前状态 |
|---------|----------|---------|---------|
| `WATCH_FIELD_ORPHAN` | error | linkages.watchFields 引用的 field 不存在 | ❌ 缺失 |
| `EVENT_TARGET_ORPHAN` | error | events.actions[].target 引用的 widget ID 不存在 | ❌ 缺失 |
| `EVENT_TARGET_MISSING` | error | 需要 target 的动作（show/hide/set-value）缺少 target | ❌ 缺失 |
| `TRIGGER_EVENT_ORPHAN` | error | trigger-event 动作的 event 不在目标的 receivableEvents 中 | ❌ 缺失 |
| `FORM_ID_ORPHAN` | error | formId 引用的 form 容器不存在 | ❌ 缺失 |
| `TAB_KEY_ORPHAN` | error | tabKey 引用的标签页不存在 | ❌ 缺失 |
| `DIALOG_TARGET_INVALID` | error | open-dialog/close-dialog 的 target 不是 dialog 类型 | ❌ 缺失 |
| `EXPOSED_REF_INVALID` | warning | 条件表达式中 exposed.widgetId.key 引用不存在 | ❌ 缺失 |
| `VARIABLE_NAME_CONFLICT` | warning | 画布变量与组件变量同名 | ❌ 缺失 |
| `API_DICT_CODE_INVALID` | warning | api.dictCode 在字典中不存在（需运行时） | ❌ 缺失 |

### 3.4 实现方案

```typescript
// utils/schemaReferenceCheck.ts

interface ReferenceIndex {
  fields: Map<string, Widget>           // field → widget 映射
  ids: Map<string, Widget>              // id → widget 映射
  formContainers: Map<string, Widget>   // formId → form widget 映射
  tabKeys: Map<string, string[]>        // widgetId → tabKey[] 映射
  eventTargets: Map<string, Set<string>> // widgetId → eventTarget 集合
  receivableEvents: Map<string, Set<string>> // widgetId → receivableEvents 集合
}

function buildReferenceIndex(widgets: Widget[]): ReferenceIndex { ... }
function checkReferences(widgets: Widget[], index: ReferenceIndex): ValidationResult[] { ... }
```

---

## 四、Layer 3 — 运行时校验

### 4.1 校验时机
- Widget 渲染时（开发模式）
- 事件引擎执行时
- 联动系统求值时

### 4.2 校验规则

| 规则 ID | severity | 校验内容 |
|---------|----------|---------|
| `LINKAGE_CYCLE_DETECTED` | error | 联动依赖图存在循环（已有运行时检测） |
| `LINKAGE_EVAL_ERROR` | error | 联动条件表达式执行报错 |
| `EVENT_ACTION_FAILED` | error | 事件动作执行失败（target 找不到等） |
| `LIFECYCLE_STRING_IGNORED` | warning | Widget lifecycle 配置了字符串但引擎不支持 |
| `EXPRESSION_EVAL_ERROR` | error | 条件表达式执行报错 |
| `API_LOAD_FAILED` | error | 数据源加载失败 |
| `FORM_COLLECT_MISSING_FIELD` | warning | 表单值收集时发现 field 未被任何控件注册 |

### 4.3 实现方案

```typescript
// composables/useRuntimeValidator.ts

// 开发模式下的运行时校验器，挂在 WidgetRenderer 上
export function useRuntimeValidator() {
  const issues = ref<RuntimeIssue[]>([])

  function reportIssue(issue: RuntimeIssue) {
    issues.value.push(issue)
    if (import.meta.env.DEV) {
      console.warn(`[SchemaValidator] ${issue.ruleId}: ${issue.message}`, issue)
    }
  }

  // 包装事件引擎，捕获执行异常
  function wrapEventEngine(trigger: Function) {
    return (...args: unknown[]) => {
      try {
        return trigger(...args)
      } catch (e) {
        reportIssue({ ruleId: 'EVENT_ACTION_FAILED', ... })
      }
    }
  }

  return { issues, reportIssue }
}
```

---

## 五、Layer 4 — 自动化测试

### 5.1 测试分类

| 测试类型 | 覆盖范围 | 工具 |
|---------|---------|------|
| **单元测试** | 单个校验规则、单个 Widget config | Vitest |
| **快照测试** | Widget create() 输出、schema 序列化 | Vitest snapshot |
| **渲染测试** | Widget 组件挂载、props 传入 | Vue Test Utils |
| **集成测试** | 完整 Schema 渲染 → 交互 → 断言 | Vue Test Utils + jsdom |
| **配置一致性测试** | config 声明 vs 实际渲染 vs 注册表 | Vitest |

### 5.2 测试套件设计

#### 套件一：Widget Config 一致性测试

```typescript
// __tests__/widget-config-consistency.spec.ts

describe('Widget Config 一致性', () => {
  for (const [type, item] of getWidgetRegistry()) {
    describe(type, () => {
      it('config.type 与注册 type 一致', () => {
        expect(item.config.type ?? item.type).toBe(type)
      })

      it('create() 返回的 widget.type 与注册 type 一致', () => {
        const widget = item.create('test_id')
        expect(widget.type).toBe(type)
      })

      it('propertyPanel.props 的 type 都被 PropertyField 支持', () => {
        const supportedTypes = ['input', 'number', 'switch', 'color', 'select', 'json']
        for (const prop of item.config.propertyPanel?.props ?? []) {
          if (typeof prop === 'object') {
            expect(supportedTypes).toContain(prop.type)
          }
        }
      })

      it('exposedValues 都有对应 useExposeWidget 调用', () => {
        // 通过 source code analysis 或运行时检测
      })

      it('configPanels 声明的面板都有对应组件', () => {
        // 检查 events/rules/api/variables 面板组件是否存在
      })
    })
  }
})
```

#### 套件二：Schema 校验规则测试

```typescript
// __tests__/schema-validate.spec.ts

describe('Schema 校验', () => {
  describe('引用完整性', () => {
    it('检测 watchFields 引用不存在的 field', () => {
      const schema = [
        makeWidget({ type: 'input', field: 'name' }),
        makeWidget({
          type: 'select',
          field: 'city',
          linkages: [{ type: 'visible', watchFields: ['nonexistent'], ... }],
        }),
      ]
      const results = validateSchema(schema)
      expect(results).toContainEqual(
        expect.objectContaining({ ruleId: 'WATCH_FIELD_ORPHAN' })
      )
    })

    it('检测 events.target 引用不存在的 widget', () => {
      const schema = [
        makeWidget({
          type: 'button',
          events: [{
            trigger: 'click',
            actions: [{ type: 'show', target: 'nonexistent_id' }],
          }],
        }),
      ]
      const results = validateSchema(schema)
      expect(results).toContainEqual(
        expect.objectContaining({ ruleId: 'EVENT_TARGET_ORPHAN' })
      )
    })

    it('检测 formId 引用不存在的容器', () => {
      const schema = [
        makeWidget({ type: 'input', field: 'name', formId: 'nonexistent_form' }),
      ]
      const results = validateSchema(schema)
      expect(results).toContainEqual(
        expect.objectContaining({ ruleId: 'FORM_ID_ORPHAN' })
      )
    })
  })

  describe('类型安全', () => {
    it('number 组件的 defaultValue 应为数值类型', () => {
      const schema = [
        makeWidget({ type: 'number', field: 'age', defaultValue: 'abc' }),
      ]
      const results = validateSchema(schema)
      expect(results).toContainEqual(
        expect.objectContaining({ ruleId: 'DEFAULT_VALUE_TYPE_MISMATCH' })
      )
    })

    it('options 缺少 label 或 value 时报错', () => {
      const schema = [
        makeWidget({ type: 'select', field: 'city', options: [{ label: 'A' }] }),
      ]
      const results = validateSchema(schema)
      expect(results).toContainEqual(
        expect.objectContaining({ ruleId: 'OPTIONS_FORMAT' })
      )
    })
  })
})
```

#### 套件三：Widget 渲染测试

```typescript
// __tests__/widget-render.spec.ts

describe('Widget 渲染', () => {
  it('input 组件渲染正确', () => {
    const widget = createInputWidget('test')
    widget.props.placeholder = '请输入姓名'
    const wrapper = mount(WidgetRenderer, {
      props: { widget, formData: {} },
    })
    expect(wrapper.find('input').attributes('placeholder')).toBe('请输入姓名')
  })

  it('联动 visible=false 时组件隐藏', () => {
    const schema = [
      makeWidget({ type: 'input', field: 'name' }),
      makeWidget({
        type: 'input',
        field: 'city',
        linkages: [{
          type: 'visible',
          watchFields: ['name'],
          condition: (formData) => !!formData.name,
        }],
      }),
    ]
    const wrapper = mount(BoardRenderer, { props: { schema, formData: { name: '' } } })
    expect(wrapper.find('[data-field="city"]').isVisible()).toBe(false)
  })
})
```

#### 套件四：事件引擎测试

```typescript
// __tests__/event-engine.spec.ts

describe('事件引擎', () => {
  it('click 触发 set-value 动作', async () => {
    const schema = [
      makeWidget({ type: 'input', field: 'name' }),
      makeWidget({
        type: 'button',
        events: [{
          trigger: 'click',
          actions: [{ type: 'set-value', target: 'name', value: '张三' }],
        }],
      }),
    ]
    const { formData, triggerEvent } = renderSchema(schema)
    await triggerEvent('button', 'click')
    expect(formData.name).toBe('张三')
  })

  it('target 不存在时静默跳过不报错', async () => {
    const schema = [
      makeWidget({
        type: 'button',
        events: [{
          trigger: 'click',
          actions: [{ type: 'show', target: 'nonexistent' }],
        }],
      }),
    ]
    const { triggerEvent } = renderSchema(schema)
    await expect(triggerEvent('button', 'click')).resolves.not.toThrow()
  })
})
```

---

## 六、校验报告格式

```typescript
interface ValidationReport {
  timestamp: number
  schemaId: string
  summary: {
    total: number
    errors: number
    warnings: number
    infos: number
  }
  issues: ValidationIssue[]
}

interface ValidationIssue {
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  message: string
  path: string            // 如 "widgets[2].linkages[0].watchFields[1]"
  widgetId: string
  widgetType: string
  suggestion?: string     // 修复建议
  autoFixable: boolean    // 是否可自动修复
}
```

---

## 七、实施路线

### Phase 1 — 扩展现有校验器（2h）
- 扩展 `schemaValidate.ts`，补充 Layer 1 缺失的 10 条规则
- 添加 `ValidationReport` 类型定义

### Phase 2 — 引用完整性校验（3h）
- 新建 `schemaReferenceCheck.ts`
- 实现 `buildReferenceIndex` + `checkReferences`
- 覆盖 Layer 2 的 10 条引用规则

### Phase 3 — 校验集成到编辑器流程（2h）
- 保存前全量校验（阻断 error，提示 warning）
- 属性面板修改后增量校验
- 校验面板 UI（底部抽屉展示 issues）

### Phase 4 — 自动化测试套件（3h）
- Widget Config 一致性测试（覆盖 50+ 组件）
- Schema 校验规则测试（覆盖所有规则 ID）
- 事件引擎 + 联动系统测试
- 集成测试骨架

### Phase 5 — 运行时校验（2h）
- 开发模式下的运行时检测器
- 控制台 warning 输出
- 联动循环检测增强
