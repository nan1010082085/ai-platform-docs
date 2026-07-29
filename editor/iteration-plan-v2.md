# 可视化编辑器 · 产品迭代详细规划 v2

> 创建日期：2026-07-23
> 基于：iteration-evolution.md 收口结论 + editor-review-and-roadmap.md 路线图
> 状态：**执行中**

---

## 一、迭代总览

### 1.1 阶段划分

| 阶段 | 名称 | 周期 | 核心目标 | 监控频率 |
|------|------|------|---------|---------|
| **Phase R** | 基础完善 | 1-2周 | 补齐基础体验短板 | 每日 |
| **Phase M** | 大屏闭环 | 3-4周 | 大屏核心能力闭环 | 每周 |
| **Phase L** | 智能与生态 | 持续 | AI增强 + 开放生态 | 每两周 |

### 1.2 阶段门禁（Gate）

每个阶段结束必须通过门禁检查才能进入下一阶段：

| 门禁条件 | 检查方式 |
|---------|---------|
| 所有 P0 任务完成 | 任务状态 = done |
| 测试通过率 100% | `pnpm test` EXIT=0 |
| build 成功 | `pnpm build:check` EXIT=0 |
| 无 P0/P1 级 bug | issue tracker 清零 |
| 文档同步 | `pnpm check:docs` EXIT=0 |

---

## 二、Phase R：基础完善（1-2周）

### R-1: i18n 覆盖率提升至 80%【P0】

**现状**：~15% 覆盖率（250 key vs 1443 行硬编码中文）

**子任务**：
| 编号 | 任务 | 文件范围 | 预估 |
|------|------|---------|------|
| R-1.1 | Widget 组件 i18n（27个 form widget） | `src/widgets/form/*/Fg*.vue` | 2天 |
| R-1.2 | Widget 组件 i18n（19个 chart widget） | `src/widgets/chart/*/Fg*.vue` | 1天 |
| R-1.3 | Widget 组件 i18n（business + table + static） | `src/widgets/{business,table,static}/*/Fg*.vue` | 1.5天 |
| R-1.4 | 编辑器 UI i18n（LeftPanel/Toolbar/Canvas） | `src/components/Editor/**/*.vue` | 1天 |
| R-1.5 | 弹窗/对话框 i18n | `src/components/Editor/**/*Dialog*.vue` | 0.5天 |
| R-1.6 | 错误提示/校验信息 i18n | `src/utils/schemaValidate.ts` + 各 widget 校验 | 0.5天 |
| R-1.7 | i18n 覆盖率检测脚本 | `scripts/check-i18n-coverage.ts` | 0.5天 |

**验收标准**：
- `pnpm check:i18n` 报告覆盖率 ≥ 80%
- 所有 widget 属性面板标签双语
- 所有错误提示双语
- 无 `t('xxx')` 引用缺失 key 的警告

**监控指标**：
```
i18n_coverage_pct    = translated_keys / total_keys * 100
hardcoded_chinese    = grep -r '[\u4e00-\u9fff]' src/ --include='*.vue' --include='*.ts' | wc -l
```

---

### R-2: Flex 插入指示线【P1】

**现状**：Flex 拖入 widget 时无视觉反馈，用户不知道 widget 会插入到哪里

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| R-2.1 | 实现 FlexDropIndicator 组件 | 0.5天 |
| R-2.2 | useFlexCanvasDrop 集成指示线位置计算 | 0.5天 |
| R-2.3 | 指示线动画（入场/退场） | 0.25天 |
| R-2.4 | 边界情况处理（空容器、首尾位置） | 0.25天 |

**验收标准**：
- 拖入 widget 时显示蓝色插入指示线
- 指示线位置准确反映插入点
- 放下后指示线消失，widget 正确插入
- 空容器显示"拖入到此处"占位

**监控指标**：
```
flex_drop_success_rate  = successful_drops / total_drops * 100
flex_drop_latency_ms    = drop_event_to_render_time
```

---

### R-3: Flex 同级重排完善【P1】

**现状**：Ctrl+↑/↓ 已有，缺拖拽重排

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| R-3.1 | Flex widget 拖拽重排（同一容器内） | 1天 |
| R-3.2 | 跨容器拖拽移动 | 0.5天 |
| R-3.3 | 重排动画过渡 | 0.25天 |
| R-3.4 | 快捷键重排与拖拽重排的一致性验证 | 0.25天 |

**验收标准**：
- 同一容器内拖拽 widget 可改变顺序
- 跨容器拖拽可移动 widget
- 重排有平滑动画过渡
- Ctrl+↑/↓ 与拖拽重排结果一致

---

### R-4: 属性面板样式配置增强【P1】

**现状**：样式配置较简陋，缺少边框/阴影/圆角/背景图/渐变

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| R-4.1 | 新增 StyleSection 组件（边框/阴影/圆角） | 0.5天 |
| R-4.2 | 新增 BackgroundSection 组件（颜色/渐变/图片） | 0.5天 |
| R-4.3 | 样式 Schema 扩展（styleConfig 类型定义） | 0.25天 |
| R-4.4 | Widget 渲染器消费样式配置 | 0.5天 |
| R-4.5 | 预设样式主题（卡片阴影、圆角卡片等） | 0.25天 |

**验收标准**：
- 属性面板 style 分组新增边框/阴影/圆角/背景配置项
- 配置修改实时反映到画布
- 样式配置可序列化到 Schema JSON
- 预设样式一键应用

---

### R-5: 右键菜单【P2】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| R-5.1 | ContextMenu 组件实现 | 0.5天 |
| R-5.2 | 菜单项：复制/剪切/粘贴/删除/锁定/层级 | 0.5天 |
| R-5.3 | 样式复制功能 | 0.5天 |
| R-5.4 | 快捷键绑定显示 | 0.25天 |

**验收标准**：
- 选中 widget 右键弹出上下文菜单
- 菜单项功能与工具栏一致
- 显示对应快捷键
- 点击空白区域关闭菜单

---

### Phase R 监控仪表盘

**每日检查项**：
```bash
# 1. 测试通过率
pnpm test 2>&1 | tail -5

# 2. Build 状态
pnpm build:check 2>&1 | tail -3

# 3. i18n 覆盖率趋势
pnpm check:i18n 2>&1 | grep "coverage"

# 4. 硬编码中文数量趋势
grep -r '[\u4e00-\u9fff]' src/ --include='*.vue' --include='*.ts' -l | wc -l

# 5. Widget 注册数量
grep -r 'registerWidget' src/widgets/ | wc -l
```

**Phase R 完成门禁**：
- [ ] i18n 覆盖率 ≥ 80%
- [ ] Flex 拖入指示线可用
- [ ] Flex 拖拽重排可用
- [ ] 样式面板增强完成
- [ ] 右键菜单可用
- [ ] `pnpm test` EXIT=0
- [ ] `pnpm build:check` EXIT=0
- [ ] 文档同步检查通过

---

## 三、Phase M：大屏闭环（3-4周）

### M-1: 地图 Widget【P0】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| M-1.1 | 地图 Widget 骨架（config.ts + FgMap.vue） | 0.5天 |
| M-1.2 | 中国地图集成（ECharts map） | 1天 |
| M-1.3 | 世界地图集成 | 0.5天 |
| M-1.4 | 省市下钻交互 | 1天 |
| M-1.5 | 数据绑定（API 数据源 → 地图数据） | 0.5天 |
| M-1.6 | 属性面板（地图类型/区域/颜色/标签） | 0.5天 |
| M-1.7 | 事件支持（区域点击 → 事件引擎） | 0.5天 |
| M-1.8 | 注册 + 测试 | 0.5天 |

**验收标准**：
- 支持中国地图、世界地图两种类型
- 支持省市下钻（点击省份 → 展开城市）
- 支持 API 数据源绑定
- 支持区域点击事件
- 属性面板可配置地图类型/颜色方案/标签显示
- WidgetStateShell + ErrorBoundary 接入

---

### M-2: 图表钻取联动【P0】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| M-2.1 | useChartLinkage composable | 1天 |
| M-2.2 | ChartLinkageEditor 配置 UI | 1天 |
| M-2.3 | 钻取动作实现（filter/drilldown/highlight） | 1天 |
| M-2.4 | 参数映射配置 | 0.5天 |
| M-2.5 | 联动历史/面包屑导航 | 0.5天 |
| M-2.6 | 测试覆盖 | 0.5天 |

**验收标准**：
- 点击图表 A 的数据点，图表 B 自动筛选
- 支持 filter（筛选）、drilldown（下钻）、highlight（高亮）三种联动动作
- 参数映射可配置
- 钻取有面包屑导航可返回上级

---

### M-3: filter-bar 接入全局数据源【P0】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| M-3.1 | filter-bar 输出筛选参数到 BoardStore | 0.5天 |
| M-3.2 | DataSourceStore 消费筛选参数 | 0.5天 |
| M-3.3 | 图表/表格 widget 自动响应筛选变化 | 0.5天 |
| M-3.4 | 筛选参数 URL 同步（分享链接） | 0.5天 |

**验收标准**：
- filter-bar 筛选后，所有绑定数据源的 widget 自动刷新
- 筛选参数可通过 URL 分享
- 筛选状态在页面切换后保持

---

### M-4: Widget 入场动画【P1】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| M-4.1 | 动画配置 Schema 设计 | 0.25天 |
| M-4.2 | 预设动画库（fadeIn/slideUp/scaleIn/bounce 等） | 0.5天 |
| M-4.3 | 属性面板动画配置 UI | 0.5天 |
| M-4.4 | 运行时动画执行 | 0.5天 |
| M-4.5 | 动画延迟/顺序配置 | 0.25天 |

**验收标准**：
- Widget 支持配置入场动画类型
- 支持动画延迟（stagger 效果）
- 预设 ≥ 8 种动画
- 发布态/预览态播放，编辑态不播放

---

### M-5: 多分辨率适配【P1】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| M-5.1 | scaleMode 配置（fit-width/fit-height/contain/stretch） | 0.5天 |
| M-5.2 | 画布缩放适配逻辑 | 0.5天 |
| M-5.3 | 预设分辨率（1080p/2K/4K/自定义） | 0.25天 |
| M-5.4 | 发布态自适应渲染 | 0.5天 |

**验收标准**：
- 支持 4 种缩放模式
- 预设 1080p/2K/4K 分辨率
- 发布态根据浏览器窗口自适应
- 无内容溢出/裁剪

---

### Phase M 监控仪表盘

**每周检查项**：
```bash
# 1. 新增 Widget 数量
grep -r 'registerWidget' src/widgets/ | wc -l

# 2. 新增 Composable 数量
ls src/composables/use*.ts | wc -l

# 3. 测试覆盖率
pnpm test:coverage 2>&1 | tail -10

# 4. 地图 Widget 测试
pnpm test -- --grep "map"

# 5. 图表联动测试
pnpm test -- --grep "chart-linkage"

# 6. Build 产物大小
du -sh dist/
```

**Phase M 完成门禁**：
- [ ] 地图 Widget 可用（中国/世界/下钻）
- [ ] 图表钻取联动可用
- [ ] filter-bar 数据源联动可用
- [ ] Widget 入场动画可用
- [ ] 多分辨率适配可用
- [ ] 新增 Widget 均接入 WidgetStateShell + ErrorBoundary
- [ ] 新增功能均有测试覆盖
- [ ] `pnpm test` EXIT=0
- [ ] `pnpm build:check` EXIT=0
- [ ] 文档同步检查通过

---

## 四、Phase L：智能与生态（持续）

### L-1: AI 页面生成增强【P0】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| L-1.1 | 扩展 page agent prompt（大屏模板） | 1天 |
| L-1.2 | 数据源配置自动推荐 | 1天 |
| L-1.3 | 图表类型智能选择 | 0.5天 |
| L-1.4 | 布局自动排列 | 1天 |
| L-1.5 | 生成结果预览 + 微调 | 1天 |

### L-2: 响应式断点【P1】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| L-2.1 | 断点定义（desktop/tablet/mobile） | 0.25天 |
| L-2.2 | Widget 位置/尺寸 per 断点配置 | 1天 |
| L-2.3 | 编辑器断点切换预览 | 0.5天 |
| L-2.4 | 运行态自适应渲染 | 0.5天 |

### L-3: Widget 脚手架 + 市场【P2】

**子任务**：
| 编号 | 任务 | 预估 |
|------|------|------|
| L-3.1 | `create-widget` CLI 脚本 | 1天 |
| L-3.2 | Widget 模板生成 | 0.5天 |
| L-3.3 | Widget 市场 UI（浏览/安装） | 2天 |
| L-3.4 | Widget 版本管理 | 1天 |

---

## 五、监控机制

### 5.1 产品指标体系

| 指标类别 | 指标名 | 采集方式 | 监控频率 | 告警阈值 |
|---------|--------|---------|---------|---------|
| **质量** | 测试通过率 | `pnpm test` | 每次提交 | < 100% |
| **质量** | Build 成功率 | `pnpm build:check` | 每次提交 | < 100% |
| **质量** | i18n 覆盖率 | `pnpm check:i18n` | 每日 | < 目标值 |
| **性能** | 120 Widget FPS | `/perf` 路由 | 每周 | < 50 FPS |
| **性能** | Build 产物大小 | `du -sh dist/` | 每周 | > 5MB |
| **规模** | Widget 数量 | `registerWidget` 计数 | 每周 | - |
| **规模** | Composable 数量 | 文件计数 | 每周 | - |
| **规模** | 测试规格数量 | `vitest` 计数 | 每周 | - |
| **体验** | 硬编码中文数量 | grep 计数 | 每日 | 趋势上升 |
| **体验** | 编辑器加载时间 | telemetry | 持续 | > 3s |

### 5.2 阶段评审节奏

| 阶段 | 评审频率 | 评审内容 | 参与者 |
|------|---------|---------|--------|
| Phase R | 每日站会 | 任务进度、阻塞项、质量指标 | 开发 |
| Phase M | 每周评审 | 功能演示、指标趋势、风险评估 | 开发 + 产品 |
| Phase L | 双周评审 | 里程碑达成、用户反馈、方向调整 | 全员 |

### 5.3 自动化监控脚本

```bash
# scripts/monitor.sh — 一键生成监控报告
#!/bin/bash
echo "=== Editor 监控报告 $(date) ==="
echo ""
echo "--- 质量指标 ---"
echo "测试通过率: $(pnpm test 2>&1 | grep -o '[0-9]* passed' || echo 'N/A')"
echo "Build 状态: $(pnpm build:check > /dev/null 2>&1 && echo '✅ PASS' || echo '❌ FAIL')"
echo ""
echo "--- 规模指标 ---"
echo "Widget 注册数: $(grep -r 'registerWidget' src/widgets/ | wc -l | tr -d ' ')"
echo "Composable 数: $(ls src/composables/use*.ts 2>/dev/null | wc -l | tr -d ' ')"
echo "测试规格数: $(find src -name '*.test.ts' -exec grep -l 'it\|test' {} \; | wc -l | tr -d ' ')"
echo ""
echo "--- 体验指标 ---"
echo "硬编码中文文件数: $(grep -rl '[\u4e00-\u9fff]' src/ --include='*.vue' --include='*.ts' 2>/dev/null | wc -l | tr -d ' ')"
echo "Build 产物大小: $(du -sh dist/ 2>/dev/null | cut -f1 || echo 'N/A')"
```

---

## 六、风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| i18n 工作量超预期 | Phase R 延期 | 中 | 优先覆盖高频 widget，低频 widget 后续补充 |
| 地图 ECharts 包体积过大 | Build 产物膨胀 | 高 | 地图 Widget 懒加载 + ECharts 按需引入 |
| 图表联动逻辑复杂 | Bug 率上升 | 中 | 联动引擎独立纯逻辑层，充分单测覆盖 |
| Flex 交互与 Free 不一致 | 用户困惑 | 低 | 统一 composable 抽象，共享交互逻辑 |
| 新 Widget 未接入高可用 | 画布崩溃 | 低 | 新 Widget 模板强制包含 WidgetStateShell |

---

## 七、文档同步清单

每次迭代必须同步更新：

| 文档 | 更新内容 |
|------|---------|
| `README.md` | Widget 数量、能力矩阵、统计基准 |
| `CLAUDE.md` | Widget 数量、Store 数量、Composable 数量 |
| `docs/architecture.md` | 架构变化、新增 Store/Composable |
| `docs/capabilities.md` | 能力状态、缺口清单 |
| `docs/iteration-plan-v2.md` | 任务状态、监控指标 |
| `docs/widget-development.md` | 新增 Widget 开发指南 |
