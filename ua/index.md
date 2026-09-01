---
title: 用户与租户管理
---

# 用户与租户管理（UA）

`@ua` — 用户与租户管理台，提供用户管理、角色权限、租户管理等运营面能力。

## 快速开始

```bash
# 安装依赖
cd ua && pnpm install

# 启动开发服务器
pnpm dev    # 端口 5400

# 构建
pnpm build
```

## 核心能力

| 能力 | 说明 |
|------|------|
| 用户管理 | 用户列表、创建、编辑、删除、状态管理 |
| 角色管理 | 角色定义、权限分配、角色继承 |
| 权限管理 | 50+ 权限码、菜单权限、数据权限 |
| 租户管理 | 多租户隔离、租户配置、租户切换 |
| 菜单管理 | 动态菜单、权限菜单、菜单排序 |
| SSO 配置 | SSO 客户端管理、单点登录配置 |
| 模型配置 | AI 模型管理、Provider 配置、API Key 管理 |

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3 + TypeScript |
| UI 组件 | Element Plus |
| 状态管理 | Pinia |
| 构建工具 | Vite |
| 微前端 | qiankun（子应用名 `ua`） |

## 文档目录

| 文档 | 说明 |
|------|------|
| [架构设计](./architecture) | 分层、状态库设计、API 清单 |
| [用户管理](./user-management) | 用户 CRUD、状态管理、批量操作 |
| [角色权限](./role-permission) | 角色定义、权限分配、继承机制 |
| [租户管理](./tenant-management) | 多租户隔离、租户配置 |
| [菜单管理](./menu-management) | 动态菜单、权限菜单 |
| [SSO 配置](./sso-config) | SSO 客户端、单点登录 |
| [模型配置](./model-config) | AI 模型管理、Provider 配置 |
| [更新日志](./changelog) | 迭代记录 |

## 页面地图

```
AppLayout (侧栏)
├── /users              UserListView           用户列表
├── /users/:id          UserDetailView         用户详情
├── /roles              RoleListView           角色列表
├── /roles/:id          RoleDetailView         角色详情
├── /permissions        PermissionListView     权限列表
├── /tenants            TenantListView         租户列表
├── /tenants/:id        TenantDetailView       租户详情
├── /menus              MenuListView           菜单管理
├── /sso                SSOConfigView          SSO 配置
├── /models             ModelConfigView        模型配置
└── /settings           SettingsView           系统设置
```

## 与其他模块的关系

| 模块 | 关系 |
|------|------|
| Server | UA 通过 REST API 调用 Server 的用户/角色/权限接口 |
| Editor | Editor 读取 UA 的用户/角色信息进行权限控制 |
| Flow | Flow 读取 UA 的用户信息进行任务分配 |
| AI | AI 读取 UA 的模型配置进行 LLM 调用 |

## 相关文档

- [Server API 参考](/server/api-reference) — 用户/角色/权限 API 端点
- [Server 数据模型](/server/models) — User/Role/Permission 模型定义
- [扩展开发](/extend/) — 自定义模型、技能、模板
