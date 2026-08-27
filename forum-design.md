# 论坛功能设计文档

## 1. 项目概述

### 1.1 背景
在门户（Portal）项目中增加论坛功能，每个项目作为论坛的一个板块，支持用户注册登录、发帖、评论、点赞。

### 1.2 技术栈
- **后端**: Koa.js + MongoDB + Mongoose（复用 schema-platform server）
- **认证**: JWT + SSO 会话（复用现有认证系统）
- **前端**: Vue 3 + Vite + Element Plus
- **管理后台**: qiankun 微前端子应用（集成到 UA 管理台）

### 1.3 核心功能
- 用户注册/登录（邮箱+密码）
- 板块管理（每个项目对应一个板块）
- 帖子发布（Markdown 格式，支持图片）
- 评论系统（一级嵌套回复）
- 点赞功能
- 敏感词过滤（本地词库）
- 管理后台（板块、帖子、评论管理）

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          pyflow.icu                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │    Portal    │    │   Forum UI   │    │   UA 管理台   │              │
│  │  (门户首页)   │    │  (论坛前端)   │    │  (后台管理)   │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         └───────────────────┼───────────────────┘                       │
│                             │                                           │
│                    ┌────────▼────────┐                                  │
│                    │  Schema-Platform │                                  │
│                    │    Server       │                                  │
│                    │  (Koa + MongoDB)│                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│         ┌───────────────────┼───────────────────┐                       │
│         │                   │                   │                       │
│  ┌──────▼───────┐   ┌──────▼───────┐   ┌──────▼───────┐              │
│  │ Auth Module  │   │ Forum Module │   │ Other Modules│              │
│  │ (认证模块)    │   │ (论坛模块)    │   │ (其他模块)   │              │
│  └──────────────┘   └──────────────┘   └──────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 微前端架构

```
schema-platform/
├── shell (主应用/UA管理台)     # port: 5050
├── editor (表单设计器)         # port: 5100
├── flow (流程设计器)           # port: 5200
├── ai (智能体平台)             # port: 5300
└── forum-admin (论坛管理)      # port: 5400 (新增)
```

---

## 3. 数据模型设计

### 3.1 Forum（论坛板块）

```typescript
interface Forum {
  _id: string
  projectId: string        // 关联门户项目 ID
  name: string             // 板块名称（如 "灵感ing"）
  description: string      // 板块描述
  icon: string             // 板块图标
  sortOrder: number        // 排序权重
  postCount: number        // 帖子数量（冗余字段）
  status: 'active' | 'archived'
  createdAt: Date
  updatedAt: Date
}
```

### 3.2 ForumPost（帖子）

```typescript
interface ForumPost {
  _id: string
  forumId: string          // 所属板块
  authorId: string         // 作者（关联 User._id）
  title: string            // 帖子标题
  content: string          // 帖子内容（Markdown 格式）
  images?: string[]        // 图片附件（OSS 地址）

  // 统计字段（冗余，避免实时查询）
  viewCount: number        // 浏览次数
  likeCount: number        // 点赞数
  commentCount: number     // 评论数

  // 状态管理
  isPinned: boolean        // 是否置顶
  isLocked: boolean        // 是否锁定（禁止评论）
  status: 'published' | 'hidden' | 'deleted'

  createdAt: Date
  updatedAt: Date
}
```

### 3.3 ForumComment（评论）

```typescript
interface ForumComment {
  _id: string
  postId: string           // 所属帖子
  authorId: string         // 评论作者
  content: string          // 评论内容

  // 支持嵌套回复（一级嵌套）
  parentCommentId?: string // 父评论 ID（可选）
  replyToUserId?: string   // 回复的目标用户（可选）

  likeCount: number        // 点赞数
  status: 'published' | 'hidden' | 'deleted'

  createdAt: Date
  updatedAt: Date
}
```

### 3.4 ForumLike（点赞记录）

```typescript
interface ForumLike {
  _id: string
  userId: string
  targetId: string         // 帖子或评论 ID
  targetType: 'post' | 'comment'
  createdAt: Date
}
```

---

## 4. API 设计

### 4.1 板块 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/forum/boards | 获取板块列表 |
| GET | /api/forum/boards/:id | 获取板块详情 |
| POST | /api/forum/boards | 创建板块（管理员） |
| PUT | /api/forum/boards/:id | 更新板块（管理员） |
| DELETE | /api/forum/boards/:id | 删除板块（管理员） |

### 4.2 帖子 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/forum/posts | 获取帖子列表（支持分页、筛选） |
| GET | /api/forum/posts/:id | 获取帖子详情 |
| POST | /api/forum/posts | 发布帖子 |
| PUT | /api/forum/posts/:id | 更新帖子（作者或管理员） |
| DELETE | /api/forum/posts/:id | 删除帖子（作者或管理员） |
| POST | /api/forum/posts/:id/like | 点赞帖子 |
| DELETE | /api/forum/posts/:id/like | 取消点赞 |

### 4.3 评论 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/forum/posts/:postId/comments | 获取评论列表 |
| POST | /api/forum/posts/:postId/comments | 发表评论 |
| PUT | /api/forum/comments/:id | 更新评论（作者） |
| DELETE | /api/forum/comments/:id | 删除评论（作者或管理员） |
| POST | /api/forum/comments/:id/like | 点赞评论 |
| DELETE | /api/forum/comments/:id/like | 取消点赞 |

### 4.4 上传 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/forum/upload/image | 上传图片 |

---

## 5. 安全设计

### 5.1 输入验证
- 使用 Zod 进行请求参数验证
- 帖子/评论内容长度限制
- 图片文件类型和大小限制

### 5.2 敏感词过滤
- 本地敏感词库（JSON 文件）
- 发布前自动过滤
- 管理后台可配置敏感词

### 5.3 频率限制
- 发帖频率：同一用户 5 分钟内只能发 1 帖
- 评论频率：同一用户 1 分钟内只能发 3 条评论
- 注册频率：同一 IP 每小时最多注册 3 个账号

### 5.4 内容安全
- XSS 防护：前端使用 DOMPurify 清理 HTML
- CSRF 防护：使用 CSRF Token
- SQL 注入：Mongoose 参数化查询（已有）

### 5.5 图片上传限制
- 文件类型：仅允许 jpg、png、gif、webp
- 文件大小：单文件最大 5MB
- 数量限制：单帖最多 9 张图片
- 存储：阿里云 OSS

---

## 6. 前端设计

### 6.1 论坛前端（独立应用）

```
forum-app/
├── src/
│   ├── views/
│   │   ├── ForumHome.vue      # 论坛首页（板块列表）
│   │   ├── BoardDetail.vue    # 板块详情（帖子列表）
│   │   ├── PostDetail.vue     # 帖子详情（评论列表）
│   │   └── UserCenter.vue     # 用户中心
│   ├── components/
│   │   ├── PostCard.vue       # 帖子卡片
│   │   ├── CommentList.vue    # 评论列表
│   │   ├── PostEditor.vue     # 帖子编辑器
│   │   ├── CommentEditor.vue  # 评论编辑器
│   │   ├── ImageUploader.vue  # 图片上传组件
│   │   └── LoginDialog.vue    # 登录弹窗
│   ├── api/
│   ├── stores/
│   ├── router.ts
│   ├── main.ts
│   └── App.vue
├── vite.config.ts
└── package.json
```

### 6.2 论坛管理子应用（forum-admin）

```
forum-admin/
├── src/
│   ├── views/
│   │   ├── BoardListView.vue       # 板块管理
│   │   ├── PostListView.vue        # 帖子管理
│   │   ├── CommentListView.vue     # 评论管理
│   │   ├── ContentReviewView.vue   # 内容审核
│   │   └── SensitiveWordView.vue   # 敏感词管理
│   ├── components/
│   │   ├── BoardForm.vue           # 板块表单
│   │   ├── PostDetail.vue          # 帖子详情
│   │   └── SensitiveWordConfig.vue # 敏感词配置
│   ├── api/
│   ├── router.ts
│   ├── main.ts
│   └── App.vue
├── vite.config.ts
└── package.json
```

### 6.3 门户入口

```typescript
// portal/src/data/plugins.ts
export const plugins: PluginItem[] = [
  {
    id: 'forum',
    name: '社区论坛',
    description: '项目交流、问题讨论、经验分享',
    icon: '💬',
    url: `${BASE}/forum/`,
    status: 'online',
  },
]
```

---

## 7. 实现阶段

### 阶段 1：后端 API（2-3 天）
- 1.1 论坛数据模型（Forum, Post, Comment, Like）
- 1.2 论坛 CRUD API
- 1.3 敏感词过滤服务
- 1.4 图片上传服务（OSS + 限制）
- 1.5 频率限制中间件

### 阶段 2：论坛前端（2-3 天）
- 2.1 论坛首页（板块列表）
- 2.2 板块详情（帖子列表）
- 2.3 帖子详情（评论列表）
- 2.4 发帖/评论组件
- 2.5 登录/注册弹窗

### 阶段 3：论坛管理子应用（2-3 天）
- 3.1 创建 forum-admin 子应用
- 3.2 板块管理页面
- 3.3 帖子管理页面
- 3.4 评论管理页面
- 3.5 内容审核页面
- 3.6 注册到 UA 管理台

### 阶段 4：门户集成（0.5 天）
- 4.1 插件区域添加论坛图标
- 4.2 部署配置

---

## 8. 待确认事项

1. **图片存储**: 是否使用阿里云 OSS？需要配置 AccessKey
2. **敏感词库**: 是否需要预置敏感词列表？
3. **用户头像**: 是否支持用户上传头像？
4. **邮件验证**: 注册是否需要邮箱验证？
5. **管理权限**: 论坛管理员权限如何分配？

---

## 9. 验收标准

### 9.1 功能验收
- [ ] 用户可以注册、登录
- [ ] 用户可以浏览板块列表
- [ ] 用户可以在板块中发帖
- [ ] 用户可以评论帖子
- [ ] 用户可以点赞帖子和评论
- [ ] 管理员可以管理板块、帖子、评论
- [ ] 敏感词过滤正常工作
- [ ] 图片上传正常工作

### 9.2 安全验收
- [ ] 频率限制生效
- [ ] XSS 防护生效
- [ ] 敏感词过滤生效
- [ ] 权限控制生效

### 9.3 性能验收
- [ ] 帖子列表加载时间 < 2s
- [ ] 图片上传成功率 > 99%
- [ ] 系统并发支持 > 100 用户
