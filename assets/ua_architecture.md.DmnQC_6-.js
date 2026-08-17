import{_ as a,o as n,c as t,a2 as e}from"./chunks/framework.CLq81i8L.js";const u=JSON.parse('{"title":"UA 架构设计","description":"","frontmatter":{},"headers":[],"relativePath":"ua/architecture.md","filePath":"ua/architecture.md","lastUpdated":null}'),p={name:"ua/architecture.md"};function i(l,s,d,r,o,c){return n(),t("div",null,[...s[0]||(s[0]=[e(`<h1 id="ua-架构设计" tabindex="-1">UA 架构设计 <a class="header-anchor" href="#ua-架构设计" aria-label="Permalink to &quot;UA 架构设计&quot;">​</a></h1><blockquote><p>用户与租户管理台的架构设计，基于 <code>ua/src</code> 当前实现。</p></blockquote><h2 id="分层架构" tabindex="-1">分层架构 <a class="header-anchor" href="#分层架构" aria-label="Permalink to &quot;分层架构&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>┌─────────────────────────────────────────────────┐</span></span>
<span class="line"><span>│                   UA 前端 (5400)                  │</span></span>
<span class="line"><span>├─────────────────────────────────────────────────┤</span></span>
<span class="line"><span>│  Views (页面)  │  Components (组件)  │  Layout   │</span></span>
<span class="line"><span>├─────────────────────────────────────────────────┤</span></span>
<span class="line"><span>│  Stores (Pinia)  │  Composables (组合式 API)     │</span></span>
<span class="line"><span>├─────────────────────────────────────────────────┤</span></span>
<span class="line"><span>│  API Layer (src/api/)                            │</span></span>
<span class="line"><span>├─────────────────────────────────────────────────┤</span></span>
<span class="line"><span>│  Server REST API (3001)                          │</span></span>
<span class="line"><span>└─────────────────────────────────────────────────┘</span></span></code></pre></div><h2 id="目录结构" tabindex="-1">目录结构 <a class="header-anchor" href="#目录结构" aria-label="Permalink to &quot;目录结构&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ua/src/</span></span>
<span class="line"><span>├── api/                    # API 接口层</span></span>
<span class="line"><span>│   ├── user.ts             # 用户 API</span></span>
<span class="line"><span>│   ├── role.ts             # 角色 API</span></span>
<span class="line"><span>│   ├── permission.ts       # 权限 API</span></span>
<span class="line"><span>│   ├── tenant.ts           # 租户 API</span></span>
<span class="line"><span>│   ├── menu.ts             # 菜单 API</span></span>
<span class="line"><span>│   ├── sso.ts              # SSO API</span></span>
<span class="line"><span>│   └── model.ts            # 模型配置 API</span></span>
<span class="line"><span>├── stores/                 # Pinia Store</span></span>
<span class="line"><span>│   ├── userStore.ts        # 用户状态</span></span>
<span class="line"><span>│   ├── roleStore.ts        # 角色状态</span></span>
<span class="line"><span>│   ├── tenantStore.ts      # 租户状态</span></span>
<span class="line"><span>│   └── appStore.ts         # 应用状态</span></span>
<span class="line"><span>├── composables/            # 组合式 API</span></span>
<span class="line"><span>│   ├── useUser.ts          # 用户逻辑</span></span>
<span class="line"><span>│   ├── useRole.ts          # 角色逻辑</span></span>
<span class="line"><span>│   ├── usePermission.ts    # 权限逻辑</span></span>
<span class="line"><span>│   └── useTenant.ts        # 租户逻辑</span></span>
<span class="line"><span>├── views/                  # 页面组件</span></span>
<span class="line"><span>│   ├── user/               # 用户管理</span></span>
<span class="line"><span>│   ├── role/               # 角色管理</span></span>
<span class="line"><span>│   ├── tenant/             # 租户管理</span></span>
<span class="line"><span>│   ├── menu/               # 菜单管理</span></span>
<span class="line"><span>│   ├── sso/                # SSO 配置</span></span>
<span class="line"><span>│   └── model/              # 模型配置</span></span>
<span class="line"><span>├── components/             # 通用组件</span></span>
<span class="line"><span>│   ├── UserForm.vue        # 用户表单</span></span>
<span class="line"><span>│   ├── RoleForm.vue        # 角色表单</span></span>
<span class="line"><span>│   ├── PermissionTree.vue  # 权限树</span></span>
<span class="line"><span>│   └── TenantForm.vue      # 租户表单</span></span>
<span class="line"><span>├── router/                 # 路由配置</span></span>
<span class="line"><span>│   └── index.ts</span></span>
<span class="line"><span>└── App.vue                 # 根组件</span></span></code></pre></div><h2 id="store-设计" tabindex="-1">Store 设计 <a class="header-anchor" href="#store-设计" aria-label="Permalink to &quot;Store 设计&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Store</th><th>职责</th></tr></thead><tbody><tr><td><code>userStore</code></td><td>用户列表、当前用户、用户 CRUD</td></tr><tr><td><code>roleStore</code></td><td>角色列表、角色权限、角色 CRUD</td></tr><tr><td><code>tenantStore</code></td><td>租户列表、当前租户、租户 CRUD</td></tr><tr><td><code>appStore</code></td><td>应用全局状态、主题、语言</td></tr></tbody></table><h2 id="api-接口" tabindex="-1">API 接口 <a class="header-anchor" href="#api-接口" aria-label="Permalink to &quot;API 接口&quot;">​</a></h2><table tabindex="0"><thead><tr><th>模块</th><th>端点</th><th>说明</th></tr></thead><tbody><tr><td>用户</td><td><code>GET /api/users</code></td><td>用户列表</td></tr><tr><td>用户</td><td><code>POST /api/users</code></td><td>创建用户</td></tr><tr><td>用户</td><td><code>PUT /api/users/:id</code></td><td>更新用户</td></tr><tr><td>用户</td><td><code>DELETE /api/users/:id</code></td><td>删除用户</td></tr><tr><td>角色</td><td><code>GET /api/roles</code></td><td>角色列表</td></tr><tr><td>角色</td><td><code>POST /api/roles</code></td><td>创建角色</td></tr><tr><td>权限</td><td><code>GET /api/permissions</code></td><td>权限列表</td></tr><tr><td>租户</td><td><code>GET /api/tenants</code></td><td>租户列表</td></tr><tr><td>菜单</td><td><code>GET /api/menus</code></td><td>菜单列表</td></tr><tr><td>SSO</td><td><code>GET /api/sso/clients</code></td><td>SSO 客户端列表</td></tr><tr><td>模型</td><td><code>GET /api/ai/model-configs</code></td><td>模型配置列表</td></tr></tbody></table><h2 id="权限模型" tabindex="-1">权限模型 <a class="header-anchor" href="#权限模型" aria-label="Permalink to &quot;权限模型&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>User ──┬── Role ──── Permission</span></span>
<span class="line"><span>       │</span></span>
<span class="line"><span>       └── Tenant ─── TenantConfig</span></span></code></pre></div><ul><li><strong>用户</strong>：属于一个或多个租户，拥有一个或多个角色</li><li><strong>角色</strong>：包含一组权限，可继承其他角色</li><li><strong>权限</strong>：50+ 权限码，覆盖菜单、操作、数据三个维度</li><li><strong>租户</strong>：数据隔离单元，用户数据自动按租户过滤</li></ul><h2 id="微前端集成" tabindex="-1">微前端集成 <a class="header-anchor" href="#微前端集成" aria-label="Permalink to &quot;微前端集成&quot;">​</a></h2><p>UA 作为 qiankun 子应用运行：</p><div class="language-typescript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// qiankun 配置</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  name</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;ua&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  entry</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;//localhost:5400&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  container</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;#subapp-container&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">  activeRule</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&#39;/ua&#39;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>嵌入时隐藏子应用侧栏，通过 bridge 与 Shell 通信。</p><h2 id="相关文档" tabindex="-1">相关文档 <a class="header-anchor" href="#相关文档" aria-label="Permalink to &quot;相关文档&quot;">​</a></h2><table tabindex="0"><thead><tr><th>文档</th><th>说明</th></tr></thead><tbody><tr><td><a href="./user-management.html">用户管理</a></td><td>用户 CRUD、状态管理</td></tr><tr><td><a href="./role-permission.html">角色权限</a></td><td>角色定义、权限分配</td></tr><tr><td><a href="./tenant-management.html">租户管理</a></td><td>多租户隔离、配置</td></tr><tr><td><a href="/schema-platform/docs/server/api-reference.html">Server API</a></td><td>后端 API 详细文档</td></tr><tr><td><a href="/schema-platform/docs/server/models.html">Server 数据模型</a></td><td>Mongoose 模型定义</td></tr></tbody></table>`,19)])])}const k=a(p,[["render",i]]);export{u as __pageData,k as default};
