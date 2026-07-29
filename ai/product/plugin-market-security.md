# 插件市场安全说明（A3.3）

> 外部插件加载的安全边界。配套 UI：`PluginMarketView` 外部 URL 安装入口。

## 已落地的前端护栏

1. **协议限制**：仅允许 `http:` / `https:` URL
2. **用户确认**：安装前二次确认，提示仅信任源 / 审核白名单
3. **服务端安装**：前端只提交 URL，实际拉取与解析由 `/plugins/market/install-from-url` 完成（需 server 实现沙箱与来源校验）

## 服务端已落地

| 控制 | 说明 |
|------|------|
| 来源白名单 | `PLUGIN_INSTALL_URL_ALLOWLIST`；空名单拒绝安装 |
| SSRF | `redirect:error` + DNS 解析后拒绝保留/私网 IP |
| 体积限制 | 流式读取，超 `PLUGIN_INSTALL_MAX_BYTES` 中止 |
| 沙箱隔离 | 禁止 `command` / `factory*`；仅声明式 expert JSON |
| 租户隔离 | 写入 `UserPlugin` 清单，**禁止**写全局 `plugins/local` / 热重载 |
| 保留 ID | 拒绝覆盖 `platform.*` 与已有 registry expert/skill |

## 仍需运维 / 后续

| 控制 | 说明 |
|------|------|
| 权限声明校验 | expert/tool 声明的 tools、network 必须显式列出 |
| 运行时挂载 | URL 安装的 manifest 按用户/租户注入对话路由（尚未全局生效） |
| 审核制 | 社区包需人工或自动化审计后方可公开 |

## 参考

- [third-party-plugin-guide.md](../extend/third-party-plugin-guide.md)
- expert-manager 安全检查流程（插件中心已有启用前校验）
