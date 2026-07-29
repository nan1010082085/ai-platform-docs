---
title: 更新日志
---

# 可视化编辑器 · 更新日志

> 记录编辑器（表单 / 页面 / 大屏设计器）的主要功能迭代。
> 内部规划文档归档于 `editor/iteration-evolution.md`，不在此展示。

## 2026-07-20 · E1–E3 收口

### E1 大屏地基

- 文档统计对齐、视口剔除、immer 撤销、大屏 Demo
- 主题/动画骨架、deprecated 别名清理

### E2 体验深化

- 发布态模式、快捷键、埋点客户端 + dashboard
- PropertyPanel 29KB -> 10.1KB（拆分 6 个 composable/util）
- 嵌套对齐、i18n 覆盖率 ~15%

### E3 开放生态

- SchemaType 注册式 + createWidgetPlugin + 第三方 Widget 指南
- 脚手架/市场因无外部消费者从 backlog 移除

## 度量基线

| 指标 | 数量 |
|---|---|
| Widget 目录 | 86 |
| registerWidget | 97 |
| Pinia Store | 12 |
| Composable | 46 |
| Vitest 测试 | ~1941 |

## 更早 · 能力地基

- **双画布系统**：Free 绝对定位 + Flex 流式布局
- **四大配置系统**：事件 / 联动 / API / 变量
- **条件表达式**：visibleOn / disabledOn / requiredOn，沙箱执行
- **事件引擎**：18 种动作类型
- **qiankun 微前端**：子应用集成
