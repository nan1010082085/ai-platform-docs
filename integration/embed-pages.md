# 页面嵌入

把已发布的表单或页面嵌入到你的系统。

## 适合场景

- 在内部管理系统中嵌入审批表单
- 在门户中嵌入数据录入页
- 在运营系统中嵌入大屏
- 给第三方系统提供一个独立业务页面

## 使用 iframe

发布页面后，平台会生成一个访问地址：

```text
https://your-host/view/{pageCode}
```

在你的系统中嵌入：

```html
<iframe
  src="https://your-host/view/{pageCode}?interaction=interactive"
  width="100%"
  height="600"
  frameborder="0"
></iframe>
```

## 控制交互模式

| 参数 | 效果 |
|---|---|
| `?interaction=interactive` | 用户可以正常填写和提交 |
| `?interaction=readonly` | 用户只能查看 |

## 和宿主系统通信

发布页支持通过 `postMessage` 和宿主系统通信。

常见用途：

| 事件方向 | 用途 |
|---|---|
| 页面 -> 宿主 | 提交成功、状态变化 |
| 宿主 -> 页面 | 传入上下文、切换显示状态 |

如果你要使用宿主通信，建议：

1. 明确允许的来源。
2. 校验消息来源。
3. 只传递必要字段。

## 安全建议

- 不要把敏感参数直接拼在 URL 中。
- 嵌入前确认页面权限。
- 生产环境建议限制可嵌入的域名。

## 下一步

- [表单与页面](../guide/forms.md)
