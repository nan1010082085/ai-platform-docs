# 后端服务文档

> 为平台提供 API 接口、数据存储和业务逻辑

## 快速开始

### 启动开发

```bash
# 启动 MongoDB
pnpm db:up

# 启动后端服务
pnpm dev

# 导入种子数据（可选）
pnpm db:seed
```

服务启动在 `http://localhost:3001`

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少设置：

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=<随机字符串>
DEEPSEEK_API_KEY=<你的 API Key>
```

## 核心功能

### API 接口

**Schema 管理**
- 获取 Schema 列表（分页、搜索、筛选）
- 创建、更新、删除 Schema
- 发布 Schema 版本
- 获取已发布版本

**用户认证**
- 用户登录/登出
- 获取当前用户信息

**数据管理**
- 业务数据 CRUD
- 数据查询和筛选

**系统**
- 健康检查
- API 文档
- Mock 数据生成

### 数据存储

- **MongoDB** — 主数据库
- **Redis** — 可选，用于队列和缓存

### 业务逻辑

- **流程引擎** — BPMN 流程执行
- **AI 服务** — Agent 对话、工作流执行
- **文件处理** — PDF、Word、Excel 解析
- **实时通信** — WebSocket 消息推送

## 文档目录

- [更新日志](./changelog.md) — 迭代记录
- [能力总览](./capabilities.md) — 已实现功能矩阵、技术栈、架构特点
- [API 接口](./api.md) — REST API 端点概览
- [API 详细文档](./api-reference.md) — 全部 230+ 端点详细说明（含请求/响应示例）
- [数据模型](./models.md) — Mongoose 模型定义
- [数据库](./database.md) — MongoDB 连接与配置
- [RAG 架构](./rag-architecture.md) — 检索链路与向量依赖
- [插件中心](./plugin-center.md) — 插件配置与热重载
- [部署与运维](./deployment.md) — 打包、PM2、nginx、配置目录

## API 接口速查

### Schema 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/schemas | 获取 Schema 列表 |
| POST | /api/schemas | 创建 Schema |
| GET | /api/schemas/:id | 获取 Schema 详情 |
| PUT | /api/schemas/:id | 更新 Schema |
| DELETE | /api/schemas/:id | 删除 Schema |
| POST | /api/schemas/:id/publish | 发布 Schema |

### 用户认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 用户登出 |
| GET | /api/auth/me | 获取当前用户 |

### 数据管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | /api/data/list | 数据列表 |
| GET | /api/data/:id | 数据详情 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/docs | API 文档 |
| GET | /api/mock/:schemaId | Mock 数据 |

## 数据模型

### FormSchema

表单 Schema 定义：

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | ObjectId | 主键 |
| name | String | 名称 |
| type | String | 类型（form/search_list） |
| status | String | 状态（draft/published） |
| json | Mixed | Schema 结构 |
| publishId | String | 发布版本标识 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### PublishedSchema

已发布的 Schema 版本快照。

### User

用户账户（JWT 认证）。

## 环境变量

### 必需变量

| 变量 | 说明 |
|------|------|
| MONGODB_URI | MongoDB 连接字符串 |
| JWT_SECRET | JWT 签名密钥 |
| DEEPSEEK_API_KEY | DeepSeek API 密钥 |

### 可选变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| NODE_ENV | development | 运行环境 |
| PORT | 3001 | 服务端口 |
| CORS_ORIGINS | * | 允许的跨域来源 |
| REDIS_URL | redis://localhost:6379 | Redis 地址 |

## 常用命令

```bash
pnpm dev              # 启动开发服务器（热重载）
pnpm build            # 编译 TypeScript
pnpm test             # 运行测试
pnpm db:up            # 启动 MongoDB 容器
pnpm db:down          # 停止 MongoDB 容器
pnpm db:seed          # 导入种子数据
pnpm db:migrate-id    # 数据迁移（UUID → ObjectId）
```

## 健康检查

访问 `http://localhost:3001/api/health` 检查服务状态。

返回示例：

```json
{
  "status": "ok",
  "timestamp": "2026-09-02T12:00:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "connected"
  }
}
```

## 常见问题

**Q: 如何连接远程 MongoDB？**
A: 修改 `.env` 中的 `MONGODB_URI` 为远程地址。

**Q: 如何查看 API 文档？**
A: 访问 `http://localhost:3001/api/docs` 或使用 API 文档平台。

**Q: 如何重置数据库？**
A: 运行 `pnpm db:down` 停止容器，删除数据卷，再 `pnpm db:up` 重新启动。

**Q: 服务启动失败怎么办？**
A: 检查 MongoDB 是否运行，环境变量是否配置正确。

**Q: 如何添加新的 API 接口？**
A: 参考 [API 详细文档](./api-reference.md) 中的接口规范。

## 相关链接

- [Server README](../../../server/README.md) — 用户使用指南
- [API 文档平台](../../../api-docs/README.md) — 在线 API 文档
- [部署指南](../../deploy/README.md) — 生产环境部署
