# 自定义模型接入指南

> 本文档介绍如何将 Ollama、vLLM、DeepSeek 私有网关等自部署模型服务接入 Schema Form AI 平台。平台支持所有 OpenAI Chat Completions 兼容的 API 端点。

**相关文档**：[环境变量参考](/environment-variables) · [模型配置 API](https://github.com/nan1010082085/ai-platform)

---

## 一、配置方式概览

平台提供两种配置方式，可按需选择或混合使用：

| 方式 | 适用场景 | 优先级 | 生效范围 |
|---|---|---|---|
| UI 方式（模型与连接页面） | 运维/产品人员日常管理 | 高（DB 优先） | 按租户隔离 |
| 环境变量方式 | CI/CD、容器化部署 | 低（env 兜底） | 全局 |

**优先级规则**：当同一 provider 同时存在 DB 配置和环境变量时，DB 配置优先。设置 `PLATFORM_LLM_ENABLED=false` 可禁用环境变量方式，仅使用 DB 配置。

---

## 二、Ollama 本地部署

Ollama 是最简单的本地模型运行方案，支持 macOS / Linux / Windows。

### 2.1 安装 Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS (Homebrew)
brew install ollama

# Windows
# 从 https://ollama.com/download 下载安装包
```

验证安装：

```bash
ollama --version
```

### 2.2 拉取并运行模型

```bash
# 拉取模型（首次会下载模型文件）
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
ollama pull deepseek-r1:7b

# 启动服务（默认监听 http://localhost:11434）
ollama serve

# 或直接运行模型（自动启动服务）
ollama run qwen2.5:7b
```

验证服务可用：

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 2.3 在平台配置

**UI 方式**：

1. 进入 AI 平台 -> 设置 -> 模型与连接
2. 点击「新增配置」
3. 填写：

| 字段 | 值 |
|---|---|
| 配置名称 | Ollama 本地 Qwen |
| Provider | `Ollama` |
| 模型名称 | `qwen2.5:7b` |
| API Key | 留空（Ollama 默认无需认证） |
| Base URL | `http://localhost:11434` |

4. 点击「测试连接」验证
5. 设为默认模型（可选）

**环境变量方式**：

在 `.env` 中添加：

```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=qwen2.5:7b
```

> Ollama 兼容 OpenAI API 格式，因此使用 `OPENAI_*` 环境变量即可接入。

### 2.4 远程访问 Ollama

如果 Ollama 运行在其他机器上，需要设置监听地址：

```bash
# 设置 Ollama 监听所有网卡
OLLAMA_HOST=0.0.0.0 ollama serve
```

然后在平台中配置 Base URL 为 `http://<ollama-ip>:11434`。

---

## 三、vLLM 部署

vLLM 是高性能推理引擎，适合 GPU 服务器部署大模型。

### 3.1 安装 vLLM

```bash
pip install vllm
```

### 3.2 启动 vLLM Server

```bash
# 基础启动（自动提供 OpenAI 兼容 API）
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000

# 指定 GPU 和参数
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.9
```

验证服务：

```bash
curl http://localhost:8000/v1/models
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-7B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 3.3 在平台配置

**UI 方式**：

| 字段 | 值 |
|---|---|
| 配置名称 | vLLM Qwen2.5 7B |
| Provider | `OpenAI` |
| 模型名称 | `Qwen/Qwen2.5-7B-Instruct` |
| API Key | 留空或填 `vllm`（占位） |
| Base URL | `http://<vllm-ip>:8000/v1` |

> vLLM 提供 OpenAI 兼容端点，因此 Provider 选择 `OpenAI`。

**环境变量方式**：

```env
OPENAI_API_KEY=vllm
OPENAI_BASE_URL=http://<vllm-ip>:8000/v1
OPENAI_MODEL=Qwen/Qwen2.5-7B-Instruct
```

### 3.4 启用 API Key 认证（可选）

```bash
# 启动时设置 API Key
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --api-key your-secret-key
```

---

## 四、DeepSeek 私有网关

如果企业通过私有网关代理 DeepSeek API（如统一鉴权、流量管控、审计），只需修改 Base URL。

### 4.1 UI 方式

1. 进入 AI 平台 -> 设置 -> 模型与连接
2. 新增或编辑 DeepSeek 配置
3. 将 Base URL 修改为私有网关地址：

| 字段 | 值 |
|---|---|
| Provider | `DeepSeek` |
| Base URL | `https://your-gateway.internal/deepseek` |
| API Key | 私有网关下发的 key |

### 4.2 环境变量方式

```env
DEEPSEEK_API_KEY=your-gateway-key
DEEPSEEK_BASE_URL=https://your-gateway.internal/deepseek
DEEPSEEK_MODEL=deepseek-chat
```

---

## 五、环境变量 vs UI 方式对比

| 维度 | 环境变量 | UI（模型与连接） |
|---|---|---|
| 配置位置 | `.env` 文件 / Docker env / K8s ConfigMap | AI 平台 Web 界面 |
| 存储位置 | 进程环境变量 | MongoDB `modelconfigs` 集合 |
| 多租户 | 全局共享 | 按 `tenantId` 隔离 |
| 热更新 | 需重启 server | 即时生效 |
| 适合角色 | DevOps / 运维 | 产品 / 运维 / 开发 |
| API Key 安全 | 文件权限控制 | 加密存储（`credentialService`） |
| 优先级 | 低（兜底） | 高（DB 优先） |
| 禁用方式 | `PLATFORM_LLM_ENABLED=false` | 删除对应配置 |

**推荐做法**：

- 生产环境优先使用 UI 方式管理，便于运维和审计
- CI/CD 场景（如自动化测试）使用环境变量
- 两者可共存：UI 配置的模型会覆盖同 provider 的环境变量配置

---

## 六、常见问题排查

### 6.1 连接测试失败：Connection refused

**原因**：目标服务未启动或网络不可达。

**排查步骤**：

```bash
# 1. 确认服务在运行
curl http://localhost:11434/api/tags        # Ollama
curl http://localhost:8000/v1/models        # vLLM

# 2. 检查端口监听
lsof -i :11434   # Ollama
lsof -i :8000    # vLLM

# 3. Docker 环境检查网络
docker ps | grep ollama
docker network ls
```

### 6.2 连接测试成功但对话报错

**原因**：模型名称不匹配。

**排查**：确认 Base URL、模型名称与服务端一致。

```bash
# Ollama 查看已拉取模型
ollama list

# vLLM 查看已加载模型
curl http://localhost:8000/v1/models
```

### 6.3 Ollama 报错 "model not found"

**原因**：模型未拉取。

```bash
ollama pull qwen2.5:7b
```

### 6.4 vLLM 启动报 CUDA / 显存不足

**原因**：GPU 显存不够加载模型。

**解决方案**：

- 使用更小的量化模型（如 AWQ / GPTQ）
- 减小 `--max-model-len`
- 增加 `--gpu-memory-utilization`（如 `0.95`）
- 使用 `--quantization awq` 加载量化模型

### 6.5 Base URL 尾部斜杠问题

**现象**：请求 404。

**原因**：Base URL 末尾多了 `/`，拼接后变成 `http://host:port//v1/...`。

**解决**：确保 Base URL 不以 `/` 结尾。正确示例：

- `http://localhost:11434`（Ollama，不要加 `/v1`）
- `http://localhost:8000/v1`（vLLM，末尾无 `/`）

### 6.6 环境变量修改后不生效

**原因**：环境变量在进程启动时加载，修改 `.env` 后需要重启 server。

```bash
# 重启 server
pm2 restart schema-platform-server
# 或
docker compose restart server
```

### 6.7 私有网关 SSL 证书问题

**现象**：`self-signed certificate` 或 `UNABLE_TO_VERIFY_LEAF_SIGNATURE` 错误。

**解决方案**（二选一）：

- 将网关 CA 证书加入系统信任链
- 环境变量跳过验证（仅限开发环境）：

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 6.8 平台找不到自定义 Provider

**说明**：平台内置 Provider 类型为 `deepseek`、`openai`、`anthropic`、`ollama`。vLLM 等 OpenAI 兼容服务选择 `OpenAI` 作为 Provider 即可。如果需要新增 Provider 类型，需修改 `ModelConfig` 模型的 `provider` 枚举值。
