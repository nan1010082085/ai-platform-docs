# UA 架构设计

> 用户与租户管理台的架构设计，基于 `ua/src` 当前实现。

## 分层架构

```
┌─────────────────────────────────────────────────┐
│                   UA 前端 (5400)                  │
├─────────────────────────────────────────────────┤
│  Views (页面)  │  Components (组件)  │  Layout   │
├─────────────────────────────────────────────────┤
│  Stores (Pinia)  │  Composables (组合式 API)     │
├─────────────────────────────────────────────────┤
│  API Layer (src/api/)                            │
├─────────────────────────────────────────────────┤
│  Server REST API (3001)                          │
└─────────────────────────────────────────────────┘
```

## 目录结构

```
ua/src/
├── api/                    # API 接口层
│   ├── user.ts             # 用户 API
│   ├── role.ts             # 角色 API
│   ├── permission.ts       # 权限 API
│   ├── tenant.ts           # 租户 API
│   ├── menu.ts             # 菜单 API
│   ├── sso.ts              # SSO API
│   └── model.ts            # 模型配置 API
├── stores/                 # Pinia Store
│   ├── userStore.ts        # 用户状态
│   ├── roleStore.ts        # 角色状态
│   ├── tenantStore.ts      # 租户状态
│   └── appStore.ts         # 应用状态
├── composables/            # 组合式 API
│   ├── useUser.ts          # 用户逻辑
│   ├── useRole.ts          # 角色逻辑
│   ├── usePermission.ts    # 权限逻辑
│   └── useTenant.ts        # 租户逻辑
├── views/                  # 页面组件
│   ├── user/               # 用户管理
│   ├── role/               # 角色管理
│   ├── tenant/             # 租户管理
│   ├── menu/               # 菜单管理
│   ├── sso/                # SSO 配置
│   └── model/              # 模型配置
├── components/             # 通用组件
│   ├── UserForm.vue        # 用户表单
│   ├── RoleForm.vue        # 角色表单
│   ├── PermissionTree.vue  # 权限树
│   └── TenantForm.vue      # 租户表单
├── router/                 # 路由配置
│   └── index.ts
└── App.vue                 # 根组件
```

## 状态库设计

| Store | 职责 |
|-------|------|
| `userStore` | 用户列表、当前用户、用户 CRUD |
| `roleStore` | 角色列表、角色权限、角色 CRUD |
| `tenantStore` | 租户列表、当前租户、租户 CRUD |
| `appStore` | 应用全局状态、主题、语言 |

## API 接口

| 模块 | 端点 | 说明 |
|------|------|------|
| 用户 | `GET /api/users` | 用户列表 |
| 用户 | `POST /api/users` | 创建用户 |
| 用户 | `PUT /api/users/:id` | 更新用户 |
| 用户 | `DELETE /api/users/:id` | 删除用户 |
| 角色 | `GET /api/roles` | 角色列表 |
| 角色 | `POST /api/roles` | 创建角色 |
| 权限 | `GET /api/permissions` | 权限列表 |
| 租户 | `GET /api/tenants` | 租户列表 |
| 菜单 | `GET /api/menus` | 菜单列表 |
| SSO | `GET /api/sso/clients` | SSO 客户端列表 |
| 模型 | `GET /api/ai/model-configs` | 模型配置列表 |

## 权限模型

```
User ──┬── Role ──── Permission
       │
       └── Tenant ─── TenantConfig
```

- **用户**：属于一个或多个租户，拥有一个或多个角色
- **角色**：包含一组权限，可继承其他角色
- **权限**：50+ 权限码，覆盖菜单、操作、数据三个维度
- **租户**：数据隔离单元，用户数据自动按租户过滤

## 微前端集成

UA 作为 qiankun 子应用运行：

```typescript
// qiankun 配置
{
  name: 'ua',
  entry: '//localhost:5400',
  container: '#subapp-container',
  activeRule: '/ua',
}
```

嵌入时隐藏子应用侧栏，通过 bridge 与 Shell 通信。

## 相关文档

| 文档 | 说明 |
|------|------|
| [用户管理](./user-management) | 用户 CRUD、状态管理 |
| [角色权限](./role-permission) | 角色定义、权限分配 |
| [租户管理](./tenant-management) | 多租户隔离、配置 |
| [Server API](/server/api-reference) | 后端 API 详细文档 |
| [Server 数据模型](/server/models) | Mongoose 模型定义 |
