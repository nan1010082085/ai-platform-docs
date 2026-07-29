---
outline: deep
---

# 可视化编辑器

Schema 驱动的可视化自由布局表单 / 页面 / 大屏编辑器。

## 定位

面向非开发人员的可视化搭建工具，用 Schema JSON 描述页面结构，实现设计态与运行态分离：

- **表单**：审批单、CRUD 列表、详情页（Flex 流式布局）
- **大屏 / 自由页**：图表运营看板（Free 绝对定位）
- **发布**：`/view/:schemaCode` 嵌入宿主，支持交互 / 只读模式

## 技术栈

| 技术 | 版本 |
|------|------|
| Vue | 3.5 |
| TypeScript | 5.7 |
| Element Plus | 2.9 |
| ECharts | 6.1 |
| Pinia | 2.3 |
| Vite | 5.x |

## 核心能力

| 能力 | 状态 | 说明 |
|------|------|------|
| Free / Flex 双布局 | ✅ | board.layoutMode |
| 98 Widget / 104 注册项 | ✅ | 8 分组，registry 注册 |
| 四大配置系统 | ✅ | 事件 / 联动 / API / 变量 |
| 视口剔除 | ✅ | 大屏编辑性能优化 |
| immer 撤销重做 | ✅ | 增量 patch |
| 多分辨率适配 | ✅ | 1080p / 2K / 4K |
| Widget 入场动画 | ✅ | 9 种 CSS 预设 |
| 图表钻取联动 | ✅ | filter / drilldown / highlight |
| 响应式断点 | ✅ | desktop / tablet / mobile |
| i18n | ✅ | 中英双语，43.6% 覆盖 |

## 快速开始

```bash
cd editor
pnpm install
pnpm dev          # http://localhost:5100
pnpm test         # 运行测试
pnpm build        # 构建
```
