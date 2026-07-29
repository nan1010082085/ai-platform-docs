# Plugin Pack Specification v1

> 本文档定义插件包（Plugin Pack）的文件结构、manifest 规范、签名机制与分发流程。

---

## 一、包文件结构

插件包是一个 `.tgz` 归档，内部必须包含一个顶层目录，目录内包含 `manifest.json` 和至少一个资源层目录。

```
my-plugin-1.0.0.tgz
└── my-plugin/
    ├── manifest.json          # 必需 — 包元数据
    ├── mcp/                   # 可选 — MCP Server 声明
    │   └── *.json
    ├── tools/                 # 可选 — 工具声明
    │   └── *.json
    ├── experts/               # 可选 — Expert 声明
    │   └── *.json
    └── skills/                # 可选 — Skill 声明
        ├── *.json
        └── *.md               # Skill 外部 Markdown 文件
```

**约束**：
- 归档必须恰好包含一个顶层目录
- `manifest.json` 必须位于顶层目录根部
- 至少一个资源层目录（mcp / tools / experts / skills）必须包含至少一个 `.json` 文件
- `skills/` 目录额外允许 `.md` 文件（作为 Skill 的外部 content 文件）

---

## 二、manifest.json 规范

### 2.1 字段定义

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | `string` | 是 | 插件唯一标识，使用 `{scope}.{name}` 格式，如 `acme.support` |
| `name` | `string` | 是 | 人类可读名称 |
| `version` | `string` | 是 | 语义化版本号，遵循 semver |
| `description` | `string` | 否 | 插件描述 |
| `author` | `string` | 否 | 作者名称 |
| `signature` | `string` | 否 | HMAC-SHA256 签名（base64），由打包工具自动生成 |
| `signedAt` | `string` | 否 | 签名时间（ISO 8601），由打包工具自动生成 |

### 2.2 示例

```json
{
  "id": "acme.support",
  "name": "ACME Support Plugin",
  "version": "1.0.0",
  "description": "Customer support expert and tools for ACME Corp",
  "author": "ACME Engineering",
  "experts": [
    {
      "id": "acme.support-agent",
      "label": "Support Agent",
      "description": "Handles customer support queries",
      "tools": ["acme-ticket-lookup", "acme-create-ticket"],
      "skills": ["acme.reply-tone"]
    }
  ],
  "skills": [
    {
      "id": "acme.reply-tone",
      "label": "Reply Tone",
      "content": "使用友好、专业的语气回复客户。"
    }
  ],
  "tools": [
    {
      "name": "acme-ticket-lookup",
      "kind": "http",
      "label": "Ticket Lookup",
      "category": "mcp-industry",
      "description": "Search ACME support tickets"
    }
  ],
  "mcp": [
    {
      "id": "acme-mcp",
      "transport": "sse",
      "url": "https://mcp.acme.example.com/sse"
    }
  ]
}
```

---

## 三、签名机制

### 3.1 算法

使用 **HMAC-SHA256** 对包内容进行签名。

### 3.2 签名流程

1. 遍历插件目录中所有文件，按相对路径字典序排序
2. 对每个文件，将 `相对路径\0文件内容` 拼接后输入 HMAC
3. 如果文件是 `manifest.json`，先移除 `signature` / `signedAt` 字段再计算
4. 使用 HMAC-SHA256 和签名密钥计算最终摘要（base64 编码）
5. 将摘要和签名时间写入 `manifest.json` 的 `signature` 和 `signedAt` 字段
6. 将目录打包为 `.tgz`

**设计决策**：签名基于文件内容而非 tgz 字节，因为 gzip 压缩非确定性（依赖时间戳、平台），相同内容在不同环境会产生不同字节。文件内容签名保证跨平台可复现。

### 3.3 密钥管理

| 环境 | 密钥来源 | 说明 |
|------|----------|------|
| 开发环境 | `PLUGIN_SIGN_KEY` 环境变量 | 本地开发测试用 |
| CI/CD | CI Secret | 自动化打包流水线 |
| 生产环境 | 密钥管理服务 | 正式发布签名 |

**密钥格式**：任意 UTF-8 字符串，建议 32 字节以上随机字符串。

### 3.4 验证流程

1. 解压 `.tgz` 归档
2. 读取 `manifest.json` 中的 `signature` 和 `signedAt` 字段
3. 基于目录文件内容重新计算 HMAC（自动排除 manifest 中的 signature / signedAt）
4. 比较计算结果与 `signature` 字段
5. 检查 `signedAt` 是否在可接受时间窗口内（默认 90 天）

### 3.5 安全约束

- 签名验证失败时，安装流程必须中止并报错
- 缺少 `signature` 字段的包可以安装，但会输出警告（允许未签名包用于开发环境）
- `signedAt` 超过 90 天的包需要明确 `--force` 标志才能安装

---

## 四、打包命令

### 4.1 基本用法

```bash
pnpm plugin:pack --dir <pack-directory> [--out <file.tgz>]
```

### 4.2 带签名打包

```bash
PLUGIN_SIGN_KEY=<secret> pnpm plugin:pack --dir <pack-directory> [--out <file.tgz>]
```

当 `PLUGIN_SIGN_KEY` 环境变量存在时，打包工具自动签名。

### 4.3 参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--dir` | 是 | — | 插件包目录路径 |
| `--out` | 否 | `dist/<name>-<timestamp>.tgz` | 输出文件路径 |

---

## 五、安装命令

### 5.1 基本用法

```bash
pnpm plugin:install --file <pack.tgz> [--tenant <tenantId>]
```

### 5.2 验证签名安装

```bash
PLUGIN_SIGN_KEY=<secret> pnpm plugin:install --file <pack.tgz>
```

当 `PLUGIN_SIGN_KEY` 存在时，安装工具验证签名。

### 5.3 强制安装（跳过时间检查）

```bash
pnpm plugin:install --file <pack.tgz> --force
```

### 5.4 参数说明

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `--file` | 是 | — | `.tgz` 归档路径 |
| `--tenant` | 否 | `local` | 安装目标租户 ID |
| `--force` | 否 | `false` | 跳过签名时间窗口检查 |

---

## 六、版本兼容性

| Pack Spec 版本 | manifest.version | 说明 |
|----------------|------------------|------|
| v1 | `1` | 当前版本，支持签名 |

---

## 七、相关代码索引

| 文件 | 职责 |
|------|------|
| `server/src/ai/plugins/pluginPack.ts` | 打包 / 解压 / 安装核心逻辑 |
| `server/src/ai/plugins/types.ts` | `PluginPackManifest` 类型定义 |
| `server/scripts/plugin-pack.ts` | 打包 CLI 入口 |
| `server/scripts/plugin-install.ts` | 安装 CLI 入口 |
| `server/scripts/plugin-validate.ts` | 插件配置校验 |
