# 配置

管理运行环境需要的配置。

## 必需配置

| 变量 | 说明 |
|---|---|
| `MONGODB_URI` | 数据库连接地址 |
| `JWT_SECRET` | 登录态签名密钥 |
| `DEEPSEEK_API_KEY` | 默认模型服务密钥 |

如果你使用其他模型服务，可以查看 [自定义模型](../extension/custom-models.md)。

## 常用可选配置

| 变量 | 说明 |
|---|---|
| `PORT` | 后端服务端口 |
| `CORS_ORIGINS` | 允许跨域访问的前端来源 |
| `CREDENTIAL_SECRET` | 凭证加密密钥 |
| `EMBEDDING_API_KEY` | 知识库向量化服务密钥 |
| `EMBEDDING_MODEL` | 向量模型名称 |
| `REDIS_URL` | 缓存或队列服务地址 |

## 生成安全密钥

```bash
openssl rand -hex 32
```

建议分别生成：

- `JWT_SECRET`
- `CREDENTIAL_SECRET`

## 配置原则

- 生产环境使用环境变量或密钥管理系统。
- 不要把真实密钥提交到 Git。
- 修改配置后确认是否需要重启服务。
- 不同环境使用不同密钥。

## 环境区分

| 环境 | 建议 |
|---|---|
| 开发 | 使用本地默认配置 |
| 测试 | 使用独立数据库和测试密钥 |
| 生产 | 使用正式域名、 HTTPS 和独立密钥 |

## 下一步

- [安全](./security.md)
