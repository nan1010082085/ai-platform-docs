# 属性面板

右侧属性配置面板，Schema 驱动。

## 配置结构

每个 Widget 的 `config.ts` 中定义 `propertyPanel`：

```ts
propertyPanel: {
  basic: ['label'],        // 基础属性（从公共面板继承）
  style: [],               // 样式属性（从公共面板继承）
  props: [                 // 组件特有属性
    {
      key: 'placeholder',       // 属性路径（支持 'a.b.c' 嵌套）
      label: '占位文本',         // 面板显示标签
      type: 'input',            // 控件类型
      default: '请输入',        // 默认值
      placeholder: '提示文本',   // 控件占位文本
      visibleOn: "props.clearable === true",  // 条件可见表达式
    },
  ],
}
```

## 支持的控件类型

| type | 说明 | 额外配置 |
|------|------|----------|
| `input` | 文本输入 | placeholder |
| `number` | 数字输入 | min、max、step |
| `switch` | 开关 | — |
| `select` | 下拉选择 | options: `{ label, value }[]` |
| `color` | 颜色选择 | — |
| `slider` | 滑块 | min、max、step |
| `columns` | 表格列配置 | — |
| `remote-select` | 远程下拉 | remoteUrl、labelField、valueField |
| `json` | JSON 编辑器 | — |

## 公共属性面板

所有 Widget 共享的属性（`publicStylePanel`）：

- margin、padding
- backgroundColor、border、borderRadius
- fontSize、fontWeight、color、textAlign

## 条件可见

`visibleOn` 支持表达式字符串，基于当前 widget 的 props 计算：

```ts
visibleOn: "props.contentMode === 'microapp'"
visibleOn: "props.pagination.enabled === true"
```

## 位置属性

所有 Widget 都有位置属性面板（由 PropertyPanel 自动生成）：

- X / Y — 水平/垂直位置
- 宽度 / 高度
- 层级（zIndex）
