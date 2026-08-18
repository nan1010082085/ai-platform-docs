# Plugin Scaffold

最小 Expert 插件模板，用于快速创建自定义专家插件。

## 目录结构

```
my-expert-plugin/
├── expert.json          # Expert 定义（必需）
├── package.json         # 包描述（可选）
├── README.md            # 说明文档（可选）
└── prompts/             # 提示词模板（可选）
    └── system.md
```

## expert.json 示例

```json
{
  "id": "my-expert",
  "name": "我的专家",
  "description": "自定义专家描述",
  "version": "1.0.0",
  "author": "Your Name",
  "systemPrompt": "你是一个专业的表单设计专家...",
  "tools": [
    "schema-create",
    "widget-add",
    "template-apply"
  ],
  "model": "deepseek-chat",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

## 快速开始

### 1. 创建插件

```bash
# 创建目录
mkdir my-expert-plugin
cd my-expert-plugin

# 创建 expert.json
cat > expert.json << 'EOF'
{
  "id": "my-expert",
  "name": "我的专家",
  "description": "自定义专家描述",
  "systemPrompt": "你是一个专业的表单设计专家，擅长...",
  "tools": ["schema-create", "widget-add"]
}
EOF
```

### 2. 安装插件

**方式一：UI 导入**

1. 打开 AI 应用
2. 进入插件中心
3. 点击「导入插件」
4. 选择 `expert.json` 文件或粘贴 JSON 内容
5. 启用专家并在对话中选择

**方式二：CLI 安装**

```bash
# 打包
pnpm plugin:pack --dir ./my-expert-plugin --out dist/my-expert.tgz

# 安装
pnpm plugin:install --file dist/my-expert.tgz

# 热重载
kill -HUP $(pgrep -f "dist/index.js")
```

### 3. 验证安装

```bash
# 查看已安装插件
curl http://localhost:3001/api/ai/plugins | jq '.experts[] | select(.id == "my-expert")'
```

## 配置字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识符 |
| `name` | string | ✅ | 显示名称 |
| `description` | string | ✅ | 描述 |
| `systemPrompt` | string | ✅ | 系统提示词 |
| `tools` | string[] | ❌ | 绑定的工具列表 |
| `model` | string | ❌ | 默认模型（默认 deepseek-chat） |
| `temperature` | number | ❌ | 温度参数（默认 0.7） |
| `maxTokens` | number | ❌ | 最大 token 数（默认 4096） |
| `version` | string | ❌ | 版本号 |
| `author` | string | ❌ | 作者 |

## 最佳实践

1. **提示词工程**：系统提示词应清晰定义专家角色、能力边界和输出格式
2. **工具绑定**：只绑定专家需要的工具，避免权限过大
3. **版本管理**：使用语义化版本号，便于升级和回滚
4. **测试验证**：安装后在对话中测试专家响应是否符合预期

## 相关文档

| 文档 | 说明 |
|------|------|
| [第三方插件指南](../third-party-plugin-guide) | Tool / Skill / MCP 详细开发指南 |
| [Skill 拼装规范](../skill-assembly-spec) | Skill 组装技术规范 |
| [Pack Spec v1](../pack-spec-v1) | 插件打包规范 |
| [插件中心](/ai/plugin) | 插件体系总览 |
