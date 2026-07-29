---
outline: deep
---

# 四大配置系统

所有 Widget 通过 `config.ts` 声明配置，编辑器统一弹窗编辑。

## 配置系统总览

| 系统 | 类型 | 入口 | 说明 |
|------|------|------|------|
| 事件配置 | `events` | ActionListEditor | 20 种动作类型，支持 confirm + condition |
| 联动配置 | `linkages` | LinkageEditor | 6 种联动类型 |
| API 配置 | `api` | ApiConfig | 动态数据源 |
| 变量配置 | `variables` | VariableEditor | Widget 内部变量 |

## 事件配置

### 触发器

`click`, `change`, `focus`, `blur`, `submit`, `close`, `open`, `confirm`, `cancel`, `refresh`, `api-success`, `api-error`, `mounted`

### 动作类型（20 种）

| 类型 | 说明 |
|------|------|
| `show` / `hide` | 显示/隐藏目标 Widget |
| `open-dialog` / `close-dialog` | 打开/关闭弹窗 |
| `switch-tab` | 切换标签页 |
| `set-value` | 设置组件值 |
| `submit` / `reset` | 提交/重置表单 |
| `emit` | 触发自定义事件 |
| `set-variable` | 设置变量值 |
| `trigger-event` | 触发目标组件事件 |
| `api` / `fetch-data` | 调用 API |
| `navigate` | 页面跳转 |
| `post-message` | 发送 postMessage |
| `copy` | 复制到剪贴板 |
| `refresh` | 刷新数据 |
| `close-tab` | 关闭浏览器标签 |
| `startFlow` / `endFlow` | 发起/结束流程 |
| `submitSubmission` | 提交表单+启动流程 |
| `exportData` | 文件下载 |
| `chart-linkage` | 图表联动 |

### 条件表达式

`visibleOn` / `disabledOn` / `requiredOn` — 字符串表达式，编译为 `(formData, ctx) => boolean`

```javascript
// 示例
"visibleOn": "formData.amount > 1000"
"disabledOn": "formData.status === 'approved'"
```

沙箱执行：禁止访问 `constructor/__proto__/prototype`，LRU 缓存编译结果。

## 联动配置

### 6 种联动类型

| 类型 | 效果 |
|------|------|
| `visible` | 条件显隐 |
| `disabled` | 条件禁用 |
| `required` | 条件必填 |
| `options` | 动态选项切换 |
| `set-value` | 条件设值 |
| `reset-fields` | 条件重置字段 |

### 依赖图

useLinkage 按 `watchFields` 建立依赖图，DFS 检测循环依赖（循环字段降级为默认状态）。

## API 配置

### 请求配置

| 字段 | 说明 |
|------|------|
| `url` | API 地址 |
| `method` | GET / POST |
| `params` | URL 查询参数 |
| `headers` | 自定义请求头 |
| `body` | POST 请求体 |
| `timeout` | 超时时间（ms） |
| `dataPath` | 数据路径（如 `result.records`） |
| `ttl` | 缓存 TTL（ms） |
| `enableRetry` | 自动重试 |
| `retryCount` | 重试次数 |

### 测试连接

右侧面板实时请求 → 响应预览 → 解析预览 → 建议 dataPath → 一键生成 Schema。

## 变量配置

### 变量类型

`string`, `number`, `boolean`, `object`, `array`

### 作用域

- **Widget 级**：`widget.variables`，作用域限于组件内部
- **Board 级**：`board.variables`，页面级全局变量

### 暴露值

通过 `useExposeWidget` 暴露运行时值（如 `form.formData`, `table.tableData`, `dialog.visible`）。
