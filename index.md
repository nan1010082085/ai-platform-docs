---
layout: home

hero:
  name: Schema Platform
  text: 表单/流程垂直场景的 AI 应用平台
  tagline: 对话 Agent · 可视化工作流编排 · RAG 知识库 · 评测体系 · 插件中心
  image:
    src: /logo.svg
    alt: Schema Platform
  actions:
    - theme: brand
      text: 快速开始
      link: /ai/QUICK_START
    - theme: alt
      text: GitHub
      link: https://github.com/nan1010082085/ai-platform

features:
  - icon: 🤖
    title: AI 对话 Agent
    details: LangGraph StateGraph 多专家对话，支持需求分析、任务规划、工具调用、HITL 中断恢复。
  - icon: 🔧
    title: 32 种节点类型
    details: 可视化 DAG 工作流编辑器，含 LLM、agent-loop、agent-team、代码执行、定时触发、7 个垂直场景节点（审批/合规/异常检测等）。
  - icon: 📚
    title: RAG + Rerank
    details: 向量检索 + 关键词 fallback + BGE-Reranker 重排 + 混合加权融合。检索调试三路对比视图。
  - icon: 📊
    title: 评测体系
    details: 离线评测 workflow 质量，数据集管理 + 评测运行 + 版本对比（通过率/耗时/token/LLM 评分）。
  - icon: 🔌
    title: 插件中心
    details: JSON 配置 Expert/Skill/Tool/MCP，热重载，CLI 打包，插件市场。
  - icon: 🏭
    title: 32 个行业模板
    details: 覆盖 10 个分类：HR、财务、运营、客服、法务、文档处理、审计等，DB 存储 + UI 管理。
  - icon: ⚡
    title: BullMQ 执行引擎
    details: 持久化队列 + Worker + 自动重试 + 死信队列，进程崩溃不丢执行。
  - icon: 📡
    title: 渠道部署
    details: ChannelAdapter 抽象层，一个 workflow 部署到 Web/飞书/钉钉。
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #3eaf7c 30%, #41d1ff);
}

.VPFeatures .VPFeature {
  text-align: left;
}
</style>
