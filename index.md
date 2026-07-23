---
layout: home

hero:
  name: Schema Platform
  text: Open-source AI Application Platform
  tagline: Conversational Agent, Visual Workflow Orchestration, RAG Knowledge Base, Plugin Center
  image:
    src: /logo.svg
    alt: Schema Platform
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/nan1010082085/ai-platform

features:
  - icon: 🤖
    title: AI Chat
    details: LangGraph-based multi-expert conversational Agent with WebSocket streaming, multi-modal input, and RAG integration.
  - icon: 🔄
    title: Agent Workflow
    details: n8n-style visual DAG editor with 16+ built-in templates, drag-and-drop nodes, and REST API/Webhook invocation.
  - icon: 📚
    title: RAG Knowledge Base
    details: Document vectorization and retrieval-augmented generation. Support for PDF, Word, Excel, and text files.
  - icon: 🔌
    title: Plugin Center
    details: Expert/Skill/Tool/MCP configuration with hot-reload. Extend AI capabilities without code changes.
  - icon: 🔗
    title: External Integration
    details: Publish workflows as REST APIs with API key authentication. Integrate with any external system.
  - icon: 📊
    title: Monitoring
    details: Agent execution metrics, plugin performance tracking, and real-time workflow debugging.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
}

.VPFeatures .VPFeature {
  text-align: left;
}
</style>
