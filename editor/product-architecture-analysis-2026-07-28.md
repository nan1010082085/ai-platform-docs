# Editor 产品与架构分析

> 2026-07-28 · 基于代码库深度审查与运行时验证

---

## 一、项目现状快照

### 1.1 核心指标（实测）

| 指标 | 实测值 | 文档值 | 状态 |
|------|--------|--------|------|
| Widget 目录 | 87 | 85 | ✅ 已更新 |
| registerWidget | 95 | 91 | ✅ 已更新 |
| Composable | 59 | 46 | ✅ 已更新 |
| Pinia Store | 12 | 12 | ✅ 一致 |
| 测试文件 | 111 | 99 | ✅ 已更新 |
| 测试用例 | 1954 | - | ✅ 全绿 |
| vue-tsc 生产错误 | 0 | 300+ | ✅ 已修复 |
| vue-tsc 总错误 | 14 | - | ⚠️ 10误报+4跨项目 |
| Build 产物 | 3.7MB JS + 500KB CSS | - | ⚠️ 需优化 |

### 1.2 技术栈

- **前端框架**: Vue 3.5 + TypeScript 5.7
- **UI 库**: Element Plus 2.14
- **图表**: ECharts 6.1（tree-shaken）
- **状态管理**: Pinia 2.3
- **构建工具**: Vite 5.4
- **测试**: Vitest 3.2 + jsdom
- **微前端**: qiankun 2.10

### 1.3 代码规模

| 类别 | 文件数 | 代码行数 |
|------|--------|----------|
| 源码总计 | 646 | 90,579 |
| Widget 组件 | 87 目录 | ~25,000 |
| Composable | 59 | ~8,000 |
| Store | 12 | ~4,500 |
| 测试 | 111 | ~35,000 |
| Locale | 4 | ~6,200 |

---

## 二、架构评估

### 2.1 核心架构优势

#### ✅ Schema 驱动设计
- 所有 Widget 通过 JSON Schema 描述，设计态与运行态完全分离
- `SchemaType = string` 注册式，无需修改类型联合即可扩展
- 四大配置系统（事件/联动/API/变量）提供强大表达能力

#### ✅ 双画布模式
- Free（绝对定位）+ Flex（流式布局）双模式并存
- 视口剔除（useViewportCulling）优化大屏性能
- 模式切换自动适配 Widget 可用性

#### ✅ 高可用 Widget 架构
- WidgetStateShell 统一 loading/empty/error 状态
- WidgetErrorBoundary 崩溃隔离，单 Widget 不拖垮画布
- useWidgetData 统一数据层（重试/SWR/去重/乐观更新）
- el-table-v2 虚拟化支持万级行数据

#### ✅ 事件引擎纯函数化
- eventEngine 无 Vue 依赖，context 注入
- 20 种动作类型，支持 confirm + condition
- 可单测，可复用

#### ✅ 类型安全
- vue-tsc 生产错误清零（从 300+ 降至 0）
- 严格模式启用（strict: true）
- 1954 测试全绿

### 2.2 待改进领域

#### ⚠️ Bundle 体积（3.7MB）
**问题**: 单一 UMD bundle，无代码分割
**影响**: 首屏加载慢，特别是弱网环境
**根因**:
- qiankun 要求 UMD 格式，限制了 code splitting
- Element Plus 全量引入（JS + CSS）
- 所有 Widget 同步注册

**建议**:
1. **短期**: 启用 CSS code splitting（当前 `cssCodeSplit: false`）
2. **中期**: Widget 按组懒加载（chart/business 等重量级组件）
3. **长期**: 评估 qiankun → Module Federation 迁移

#### ⚠️ i18n 覆盖率（16.9% 文件 / 43.6% 行）
**问题**: 2233 行硬编码中文，主要在 Widget config 和 engine
**影响**: 国际化受阻，开源准备不足
**根因**:
- Widget config 使用静态对象，无法直接调用 `t()`
- 缺少 Widget 专用 locale key 体系
- engine/eventEngine.ts 38 行硬编码

**建议**:
1. **短期**: 为高频 Widget（input/select/table/chart）添加 locale key
2. **中期**: 实现 config 翻译层（usePropertySections 已有 `t` 参数）
3. **长期**: 全量 i18n，目标 80% 覆盖

#### ⚠️ 测试文件类型错误（10 个误报）
**问题**: PropertyPanel.spec.ts 的 stubs 被 vue-tsc 误报为未使用
**影响**: CI 误报，开发者困惑
**根因**: vue-tsc 无法追踪 `global.stubs` 中的间接引用

**建议**: 在 tsconfig 中为测试文件放宽 `noUnusedLocals`

#### ⚠️ 文档滞后
**问题**: README/CLAUDE.md 数字过时（已修复）
**影响**: 新贡献者困惑
**建议**: 添加 CI check 确保文档同步

---

## 三、产品能力矩阵

### 3.1 核心能力（已验证）

| 能力域 | 能力项 | 状态 | 验证方式 |
|--------|--------|------|----------|
| **布局** | Free 绝对定位 | ✅ | 120 widget 54+ FPS |
| **布局** | Flex 流式布局 | ✅ | 表单/列表/详情模板 |
| **布局** | 双模式切换 | ✅ | Toolbar 一键切换 |
| **Widget** | 87 类 Widget | ✅ | registry 注册 |
| **Widget** | 高可用壳 | ✅ | WidgetStateShell + ErrorBoundary |
| **Widget** | 虚拟化表格 | ✅ | el-table-v2 10000行 42ms |
| **配置** | 事件系统 | ✅ | 20 种动作类型 |
| **配置** | 联动系统 | ✅ | 6 种联动类型 |
| **配置** | API 数据源 | ✅ | 动态数据 + 缓存 |
| **配置** | 变量系统 | ✅ | Widget/Board 级变量 |
| **交互** | 拖拽编排 | ✅ | Free + Flex 双模式 |
| **交互** | 撤销重做 | ✅ | immer patches |
| **交互** | 快捷键 | ✅ | Ctrl+Z/C/V/Del 等 |
| **发布** | 多模式发布 | ✅ | interactive/readonly |
| **发布** | URL 参数切换 | ✅ | ?interaction= |
| **集成** | qiankun 子应用 | ✅ | 独立运行 + 嵌入 |
| **集成** | postMessage | ✅ | 宿主通信 |

### 3.2 扩展能力（已验证）

| 能力 | 状态 | 说明 |
|------|------|------|
| SchemaType 注册式 | ✅ | 无需改联合类型 |
| createWidgetPlugin | ✅ | 第三方 Widget 插件 |
| 大屏主题 | ✅ | 深色/科技感预设 |
| 多分辨率适配 | ✅ | contain/fit-width/fit-height/stretch |
| 图表钻取联动 | ✅ | filter/drilldown/highlight |
| Widget 入场动画 | ✅ | 9 种预设动画 |
| AI 助手集成 | ✅ | iframe + WebSocket |

---

## 四、深度打磨建议

### 4.1 P0: Bundle 优化（用户体感最大）

**目标**: 首屏 JS < 1MB (gzip)

**方案**:
```
当前: 3.7MB 单 bundle → gzip 1.24MB
目标: < 1MB gzip（通过代码分割 + 懒加载）
```

**具体措施**:
1. **启用 CSS code splitting**
   ```ts
   // vite.config.ts
   build: { cssCodeSplit: true }
   ```
   预计节省: ~200KB（按路由/组件拆分 CSS）

2. **路由级懒加载**
   ```ts
   // router/index.ts
   const routes = [
     { path: '/editor', component: () => import('@/views/EditorView.vue') },
     { path: '/instances', component: () => import('@/views/InstancesView.vue') },
     // ...
   ]
   ```
   预计节省: ~500KB（非首屏路由延迟加载）

3. **Widget 分组懒加载**
   ```ts
   // widgets/registry.ts
   const chartWidgets = () => import('./chart-widgets')
   const businessWidgets = () => import('./business-widgets')
   ```
   预计节省: ~800KB（chart/business Widget 按需加载）

4. **Element Plus 按需引入**
   ```ts
   // 当前: 全量引入
   import ElementPlus from 'element-plus'
   
   // 改为: 按需引入
   import { ElButton, ElInput, ElSelect } from 'element-plus'
   ```
   预计节省: ~600KB（只引入使用的组件）

### 4.2 P0: i18n 体系化（国际化基础）

**目标**: 覆盖率 16.9% → 60%

**方案**:
1. **建立 Widget locale key 规范**
   ```ts
   // locales/editor-zh-CN.ts
   editor: {
     widgets: {
       input: {
         displayName: '输入框',
         description: '单行文本输入框',
         placeholder: '请输入',
         // ...
       }
     }
   }
   ```

2. **实现 Widget config 翻译层**
   ```ts
   // composables/useWidgetConfig.ts
   export function useWidgetConfig(type: string) {
     const { t } = useI18n()
     const config = getWidget(type)?.config
     
     return computed(() => ({
       ...config,
       displayName: t(`editor.widgets.${type}.displayName`, config.displayName),
       description: t(`editor.widgets.${type}.description`, config.description),
     }))
   }
   ```

3. **优先翻译高频 Widget**
   - input, select, table, button（表单核心）
   - bar-chart, line-chart, pie-chart（图表核心）
   - crud-list-page, advanced-table（业务核心）

### 4.3 P1: 测试类型完善（开发者体验）

**目标**: vue-tsc 错误 14 → 0

**方案**:
1. **PropertyPanel.spec.ts**: 为 stubs 添加 `@ts-ignore` 或放宽测试文件的 `noUnusedLocals`
2. **node_modules 错误**: 在 tsconfig 中添加 `skipLibCheck: true`（已有）
3. **vite.config.ts**: 为 `.mjs` 文件添加类型声明

### 4.4 P1: 文档自动化（维护效率）

**目标**: 文档永远不过时

**方案**:
1. **CI 检查**: `pnpm check:docs` 纳入 CI 门禁
2. **自动生成**: Widget 列表、Composable 列表从代码自动生成
3. **版本同步**: README 版本号与 package.json 自动同步

---

## 五、拓展方向

### 5.1 短期拓展（1-2 周）

1. **Widget 市场 UI**
   - 浏览/搜索/安装第三方 Widget
   - 基于 `createWidgetPlugin` 机制
   - 预计工作量: 3-5 天

2. **AI 页面生成增强**
   - 自然语言 → Schema JSON
   - 基于现有 page agent
   - 预计工作量: 2-3 天

3. **响应式断点**
   - desktop/tablet/mobile 三套布局
   - 基于 `useResponsivePosition`
   - 预计工作量: 3-4 天

### 5.2 中期拓展（1-2 月）

1. **实时协作**
   - WebSocket 多人编辑
   - 基于现有 socket 基础设施
   - 预计工作量: 2-3 周

2. **版本控制增强**
   - Git-like 分支/合并
   - 基于现有 schemaVersion store
   - 预计工作量: 2-3 周

3. **性能监控 Dashboard**
   - 实时 FPS/内存/加载时间
   - 基于现有 telemetry
   - 预计工作量: 1-2 周

### 5.3 长期愿景（3-6 月）

1. **可视化编程**
   - 连线式逻辑编排
   - 类似 Node-RED / n8n
   - 预计工作量: 2-3 月

2. **多框架支持**
   - React / Svelte 运行时
   - 基于 Schema 驱动设计
   - 预计工作量: 3-4 月

3. **云端 IDE**
   - 浏览器内完整开发环境
   - 基于现有架构
   - 预计工作量: 4-6 月

---

## 六、实施路线图

### Phase 1: 性能优化（本周）
- [ ] 启用 CSS code splitting
- [ ] 路由级懒加载
- [ ] Widget 分组懒加载
- [ ] 验证首屏加载时间

### Phase 2: i18n 基础（下周）
- [ ] 建立 Widget locale key 规范
- [ ] 翻译 10 个高频 Widget
- [ ] 实现 config 翻译层
- [ ] 覆盖率提升到 40%

### Phase 3: 质量提升（第 3 周）
- [ ] vue-tsc 错误清零
- [ ] 文档自动化 CI
- [ ] 测试覆盖率提升
- [ ] 性能基准测试

### Phase 4: 功能拓展（第 4 周+）
- [ ] Widget 市场 MVP
- [ ] AI 生成增强
- [ ] 响应式断点
- [ ] 实时协作 PoC

---

## 七、风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Bundle 优化引入回归 | 功能异常 | 中 | 充分测试 + 灰度发布 |
| i18n 工作量超预期 | 进度延迟 | 高 | 分批实施，优先高频 |
| qiankun 限制 code split | 性能瓶颈 | 高 | 评估 Module Federation 替代 |
| 第三方 Widget 兼容性 | 生态碎片 | 中 | 严格 Plugin API + 版本管理 |

---

## 八、总结

Editor 已是一个**功能完整、架构成熟**的可视化搭建平台：

**核心优势**:
- Schema 驱动 + 双画布模式 + 高可用 Widget 架构
- 1954 测试全绿，vue-tsc 生产错误清零
- 87 类 Widget + 四大配置系统 + 事件引擎

**主要瓶颈**:
- Bundle 体积（3.7MB）影响首屏体验
- i18n 覆盖率（16.9%）阻碍国际化
- 文档滞后影响维护效率

**建议优先级**:
1. **P0**: Bundle 优化（用户体感最大）
2. **P0**: i18n 体系化（国际化基础）
3. **P1**: 测试类型完善（开发者体验）
4. **P1**: 文档自动化（维护效率）
5. **P2**: 功能拓展（Widget 市场/AI 生成）

通过系统性的深度打磨，Editor 有潜力成为**企业级可视化搭建平台**的标杆产品。

---

## 九、本次改进记录（2026-07-28）

### 9.1 文档更新

**已完成**:
- [x] 更新 README.md 中的 Widget/Composable/测试数量（85→87, 91→95, 46→59, 99→111）
- [x] 更新 CLAUDE.md 中的架构数据
- [x] 更新 docs/architecture.md 中的统计数据
- [x] 安装 tsx 依赖，启用 CI 脚本（check:i18n, check:docs）

### 9.2 vue-tsc 错误修复

**已完成**:
- [x] 修复 PropertyPanel.vue 未使用的组件导入（10 个 stubs）
- [x] 修复 PropertyPanel.vue 缺失的 copyWidgetId 函数
- [x] 修复 EditorView.vue 未使用的 reportError/router 导入
- [x] 修复 EditorView.vue rules→linkages 配置对话框映射
- [x] 修复 dataSource.ts fetch 遮蔽问题（globalThis.fetch）
- [x] 修复 user-management/role-management pageSize 响应式问题
- [x] 修复 FgKanban.vue 完全重写（23 个类型错误）
- [x] 修复 SchemaRules 类型扩展（watches/condition/actions）
- [x] 修复 DictItem 类型添加 type/color 字段
- [x] 修复 AdvancedTableColumn.render 添加 tooltip/expiryAlert
- [x] 修复 ActionButton.type 添加空字符串选项
- [x] 修复 useConstant.ts 函数返回类型（ComputedRef）
- [x] 修复 WidgetRenderer/types.ts DictItem/FormFieldValue 导入
- [x] 修复 10+ widget config factories 添加 name 字段
- [x] 修复 approval-* schema 添加 name/position 字段

**结果**: vue-tsc 生产错误从 300+ 降至 0

### 9.3 i18n 改进

**已完成**:
- [x] 添加 205 个 Widget 属性标签翻译（中英文）
- [x] 添加 80+ 个 Widget 组件名称/描述翻译（中英文）
- [x] 实现属性面板翻译层（translateWidgetPropLabel/translateWidgetPropDesc）
- [x] 修复 locale 文件重复属性名问题

**结果**: Locale key 从 2780 增加到 2985

### 9.4 测试验证

**验证结果**:
- 测试通过: 1954/1954 (100%)
- 测试文件: 111/111 (100%)
- Build 成功: ✓
- vue-tsc 生产错误: 0

### 9.5 已知限制

**Bundle 体积**:
- qiankun UMD 格式限制了代码分割
- Element Plus 全量引入（JS + CSS）
- 所有 Widget 同步注册
- 需要跨项目协调（shared/platform-shared）才能优化

**i18n 覆盖率**:
- Widget config 文件使用静态对象，无法直接调用 t()
- 翻译层在消费点（属性面板）实现，而非定义点
- 覆盖率指标未反映翻译层改进

---

## 十、下一步行动

### 立即可做（无需跨项目协调）
1. **Widget config i18n**: 将高频 Widget 的 config 改为函数模式，直接使用 t()
2. **测试覆盖率**: 为新增的翻译层添加单元测试
3. **文档完善**: 为 Widget 开发指南添加 i18n 章节

### 需要跨项目协调
1. **Element Plus 按需引入**: 修改 shared/platform-shared/config/element.ts
2. **Bundle 优化**: 评估 qiankun → Module Federation 迁移
3. **类型定义完善**: 修复 platform-shared 中的 socket.io-client/axios 类型声明
