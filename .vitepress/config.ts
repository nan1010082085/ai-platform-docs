import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

/** markdown-it 插件：代码块和行内代码里的 {{ }} 转义为 HTML 实体 */
function escapeVueInterpolation(md: { renderer: { rules: Record<string, (...args: unknown[]) => string> } }) {
  const defaultFence = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens: unknown[], idx: number, options: unknown, env: unknown, self: unknown) => {
    return defaultFence(tokens, idx, options, env, self)
      .replace(/\{\{/g, '&#123;&#123;')
      .replace(/\}\}/g, '&#125;&#125;')
  }
  const defaultCodeInline = md.renderer.rules.code_inline!.bind(md.renderer.rules)
  md.renderer.rules.code_inline = (tokens: unknown[], idx: number, options: unknown, env: unknown, self: unknown) => {
    return defaultCodeInline(tokens, idx, options, env, self)
      .replace(/\{\{/g, '&#123;&#123;')
      .replace(/\}\}/g, '&#125;&#125;')
  }
}

export default withMermaid(defineConfig({
  base: '/schema-platform/docs/',
  title: 'Schema Platform',
  description: '表单/流程垂直场景的 AI 应用平台',
  lang: 'zh-CN',

  ignoreDeadLinks: true,

  srcExclude: [
    'ai/product/**',
    'ai/migration-plan.md',
    'ai/plugin-roadmap.md',
    'ai/workflow-p2-tasks.md',
    'ai/workflow-regression.md',
    'ai/testing/**',
    'editor/iteration-evolution.md',
    'editor/iteration-plan-v2.md',
    'editor/stage-review-log.md',
    'editor/editor-review-and-roadmap.md',
    'editor/container-nesting-decision.md',
    'editor/schema-validation-testing.md',
    'editor/product-architecture-analysis-2026-07-28.md',
    'server/business-api-mapping.md',
    'server/business-platform-ops.md',
    'server/submission-flow-webhook.md',
  ],

  markdown: {
    config: (md) => {
      md.use(escapeVueInterpolation)
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'Schema Platform',
      description: 'AI application platform for form/flow scenarios',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/' },
          { text: 'AI', link: '/en/ai/' },
          { text: 'Editor', link: '/en/editor/' },
          { text: 'Flow', link: '/en/flow/' },
          { text: 'Server', link: '/en/server/' },
          { text: 'Extend', link: '/en/extend/' },
          { text: 'Design', link: '/en/design/' },
        ],
        sidebar: {
          '/en/guide/': [
            { text: 'Guide', items: [{ text: 'Introduction', link: '/en/guide/' }] },
          ],
          '/en/extend/': [
            {
              text: 'Extension Development',
              items: [
                { text: 'Overview', link: '/en/extend/' },
                { text: 'Custom Models', link: '/en/extend/custom-models' },
                { text: 'Skill Author Guide', link: '/en/extend/skill-author-guide' },
                { text: 'Workflow Template RFC', link: '/en/extend/workflow-template-rfc' },
                { text: 'Workflow Integration', link: '/en/extend/workflow-integration' },
                { text: 'Workflow Variables', link: '/en/extend/workflow-variables' },
              ],
            },
          ],
          '/en/ai/': [
        {
          text: 'AI Platform',
          items: [
            { text: 'Overview', link: '/en/ai/' },
            { text: 'Changelog', link: '/en/ai/changelog' },
            { text: 'Quick Start', link: '/en/ai/QUICK_START' },
            { text: 'Architecture', link: '/en/ai/architecture' },
          ],
        },
        {
          text: 'Core Features',
          items: [
            { text: 'Chat Agent', link: '/en/ai/agent' },
            { text: 'Agent Workflow', link: '/en/ai/agent-workflow' },
            { text: 'RAG', link: '/en/ai/rag-tool-mcp-boundary' },
            { text: 'Plugin Center', link: '/en/ai/plugin' },
            { text: 'Plugin Registry', link: '/en/ai/plugin-registry' },
            { text: 'MCP', link: '/en/ai/mcp' },
            { text: 'Tools', link: '/en/ai/tool' },
            { text: 'Expert Extension', link: '/en/ai/expert-extension-guide' },
            { text: 'SDK', link: '/en/ai/sdk' },
          ],
        },
        {
          text: 'Architecture & Design',
          items: [
            { text: 'Platform', link: '/en/ai/platform' },
            { text: 'ai-shared API', link: '/en/ai/ai-shared' },
            { text: 'Design Overview', link: '/en/ai/design/' },
            { text: 'Chat Design', link: '/en/ai/design/chat' },
            { text: 'RAG Design', link: '/en/ai/design/rag' },
            { text: 'Runtime Design', link: '/en/ai/design/runtime' },
            { text: 'Workflow Open API', link: '/en/ai/design/workflow-open-api' },
          ],
        },
        {
          text: 'Development & Deployment',
          items: [
            { text: 'Development', link: '/en/ai/DEVELOPMENT' },
            { text: 'Deployment', link: '/en/ai/DEPLOYMENT' },
            { text: 'Environment Variables', link: '/en/ai/environment-variables' },
            { text: 'Events', link: '/en/ai/events' },
            { text: 'Contributing', link: '/en/ai/CONTRIBUTING' },
            { text: 'Security', link: '/en/ai/SECURITY_BEST_PRACTICES' },
          ],
        },
        {
          text: 'Extension Development',
          items: [
            { text: 'Skill Assembly Spec', link: '/en/ai/extend/skill-assembly-spec' },
            { text: 'Pack Spec v1', link: '/en/ai/extend/pack-spec-v1' },
            { text: 'Third-party Plugin', link: '/en/ai/extend/third-party-plugin-guide' },
            { text: 'Plugin Scaffold', link: '/en/ai/extend/plugin-scaffold/' },
          ],
        },
      ],
          '/en/editor/': [
        {
          text: 'Visual Editor',
          items: [
            { text: 'Overview', link: '/en/editor/' },
            { text: 'Changelog', link: '/en/editor/changelog' },
            { text: 'Capabilities', link: '/en/editor/capabilities' },
            { text: 'Architecture', link: '/en/editor/architecture' },
          ],
        },
        {
          text: 'Core Systems',
          items: [
            { text: 'Widgets', link: '/en/editor/widgets' },
            { text: 'Widget Development', link: '/en/editor/widget-development' },
            { text: 'Third-party Widget', link: '/en/editor/third-party-widget-guide' },
            { text: 'Dual Canvas', link: '/en/editor/canvas-system' },
            { text: 'Config Systems', link: '/en/editor/config-systems' },
            { text: 'Property Panel', link: '/en/editor/property-panel' },
            { text: 'Store Design', link: '/en/editor/store-design' },
          ],
        },
        {
          text: 'Integration & Embedding',
          items: [
            { text: 'qiankun Integration', link: '/en/editor/qiankun-integration' },
            { text: 'Micro-app Container', link: '/en/editor/micro-app-container-design' },
          ],
        },
        {
          text: 'Design',
          items: [
            { text: 'Design Overview', link: '/en/editor/design/' },
            { text: 'Designer', link: '/en/editor/design/designer' },
            { text: 'Runtime', link: '/en/editor/design/runtime' },
            { text: 'Instances & Publish', link: '/en/editor/design/instances-publish' },
          ],
        },
      ],
          '/en/flow/': [
        {
          text: 'Flow Designer',
          items: [
            { text: 'Overview', link: '/en/flow/' },
            { text: 'Changelog', link: '/en/flow/changelog' },
            { text: 'Architecture', link: '/en/flow/architecture' },
            { text: 'Design Overview', link: '/en/flow/design/' },
            { text: 'Designer', link: '/en/flow/design/designer' },
            { text: 'Runtime', link: '/en/flow/design/runtime' },
            { text: 'Instances & Tasks', link: '/en/flow/design/instances-tasks' },
          ],
        },
      ],
          '/en/server/': [
        {
          text: 'Backend Service',
          items: [
            { text: 'Overview', link: '/en/server/' },
            { text: 'Changelog', link: '/en/server/changelog' },
            { text: 'Capabilities', link: '/en/server/capabilities' },
            { text: 'API Reference', link: '/en/server/api' },
            { text: 'API Details', link: '/en/server/api-reference' },
            { text: 'Database', link: '/en/server/database' },
            { text: 'Data Models', link: '/en/server/models' },
            { text: 'RAG Architecture', link: '/en/server/rag-architecture' },
            { text: 'Plugin Center', link: '/en/server/plugin-center' },
          ],
        },
      ],
          '/en/design/': [
            { text: 'Design', items: [{ text: 'Model Architecture', link: '/en/design/model-architecture' }] },
          ],
        },
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        returnToTopLabel: 'Return to top',
      },
    },
  },

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: 'AI 平台', link: '/ai/' },
      { text: '编辑器', link: '/editor/' },
      { text: '流程设计器', link: '/flow/' },
      { text: '后端服务', link: '/server/' },
      { text: '扩展开发', link: '/extend/' },
    ],

    sidebar: {
      '/editor/': [
        {
          text: '可视化编辑器',
          items: [
            { text: '概览', link: '/editor/' },
            { text: '更新日志', link: '/editor/changelog' },
            { text: '能力清单', link: '/editor/capabilities' },
            { text: '架构设计', link: '/editor/architecture' },
          ],
        },
        {
          text: '核心系统',
          items: [
            { text: 'Widget 体系', link: '/editor/widgets' },
            { text: 'Widget 开发指南', link: '/editor/widget-development' },
            { text: '第三方 Widget', link: '/editor/third-party-widget-guide' },
            { text: '双画布系统', link: '/editor/canvas-system' },
            { text: '四大配置系统', link: '/editor/config-systems' },
            { text: '属性面板', link: '/editor/property-panel' },
            { text: 'Store 设计', link: '/editor/store-design' },
          ],
        },
        {
          text: '集成与嵌入',
          items: [
            { text: 'qiankun 集成', link: '/editor/qiankun-integration' },
            { text: '微应用容器设计', link: '/editor/micro-app-container-design' },
          ],
        },
        {
          text: '设计',
          items: [
            { text: '设计概览', link: '/editor/design/' },
            { text: '设计器设计', link: '/editor/design/designer' },
            { text: '运行时设计', link: '/editor/design/runtime' },
            { text: '实例与发布', link: '/editor/design/instances-publish' },
          ],
        },
      ],
      '/ai/': [
        {
          text: 'AI 平台',
          items: [
            { text: '概览', link: '/ai/' },
            { text: '更新日志', link: '/ai/changelog' },
            { text: '快速开始', link: '/ai/QUICK_START' },
            { text: '架构设计', link: '/ai/architecture' },
          ],
        },
        {
          text: '核心功能',
          items: [
            { text: 'AI 对话 Agent', link: '/ai/agent' },
            { text: 'Agent Workflow', link: '/ai/agent-workflow' },
            { text: 'RAG 知识库', link: '/ai/rag-tool-mcp-boundary' },
            { text: '插件中心', link: '/ai/plugin' },
            { text: '插件 Registry', link: '/ai/plugin-registry' },
            { text: 'MCP 协议', link: '/ai/mcp' },
            { text: '工具系统', link: '/ai/tool' },
            { text: '专家扩展指南', link: '/ai/expert-extension-guide' },
            { text: 'SDK 指南', link: '/ai/sdk' },
          ],
        },
        {
          text: '架构与设计',
          items: [
            { text: '平台定位', link: '/ai/platform' },
            { text: 'ai-shared API', link: '/ai/ai-shared' },
            { text: '设计概览', link: '/ai/design/' },
            { text: 'Chat 设计', link: '/ai/design/chat' },
            { text: 'RAG 设计', link: '/ai/design/rag' },
            { text: 'Runtime 设计', link: '/ai/design/runtime' },
            { text: 'Workflow Open API', link: '/ai/design/workflow-open-api' },
          ],
        },
        {
          text: '开发与部署',
          items: [
            { text: '开发指南', link: '/ai/DEVELOPMENT' },
            { text: '部署指南', link: '/ai/DEPLOYMENT' },
            { text: '环境变量', link: '/ai/environment-variables' },
            { text: '事件协议', link: '/ai/events' },
            { text: '贡献指南', link: '/ai/CONTRIBUTING' },
            { text: '安全最佳实践', link: '/ai/SECURITY_BEST_PRACTICES' },
          ],
        },
        {
          text: '扩展开发',
          items: [
            { text: 'Skill 拼装规范', link: '/ai/extend/skill-assembly-spec' },
            { text: 'Pack Spec v1', link: '/ai/extend/pack-spec-v1' },
            { text: '第三方插件指南', link: '/ai/extend/third-party-plugin-guide' },
            { text: '插件脚手架', link: '/ai/extend/plugin-scaffold/' },
          ],
        },
      ],
      '/extend/': [
        {
          text: '扩展开发',
          items: [
            { text: '概览', link: '/extend/' },
            { text: '自定义模型', link: '/extend/custom-models' },
            { text: 'Skill 作者手册', link: '/extend/skill-author-guide' },
            { text: 'Workflow 模板 RFC', link: '/extend/workflow-template-rfc' },
            { text: 'Workflow 集成指南', link: '/extend/workflow-integration' },
            { text: 'Workflow 变量', link: '/extend/workflow-variables' },
          ],
        },
      ],
      '/server/': [
        {
          text: '后端服务',
          items: [
            { text: '概览', link: '/server/' },
            { text: '更新日志', link: '/server/changelog' },
            { text: '能力清单', link: '/server/capabilities' },
            { text: 'API 参考', link: '/server/api' },
            { text: 'API 详细文档', link: '/server/api-reference' },
            { text: '数据库设计', link: '/server/database' },
            { text: '数据模型', link: '/server/models' },
            { text: 'RAG 架构', link: '/server/rag-architecture' },
            { text: '插件中心', link: '/server/plugin-center' },
          ],
        },
      ],
      '/flow/': [
        {
          text: '流程设计器',
          items: [
            { text: '概览', link: '/flow/' },
            { text: '更新日志', link: '/flow/changelog' },
            { text: '架构设计', link: '/flow/architecture' },
            { text: '设计概览', link: '/flow/design/' },
            { text: '设计器设计', link: '/flow/design/designer' },
            { text: '运行时设计', link: '/flow/design/runtime' },
            { text: '实例与任务', link: '/flow/design/instances-tasks' },
          ],
        },
      ],
      '/design/': [
        {
          text: '架构设计',
          items: [
            { text: '模型架构', link: '/design/model-architecture' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nan1010082085/ai-platform' },
    ],

    footer: {
      message: 'MIT License',
      copyright: '© 2024 Schema Platform Team',
    },

    search: {
      provider: 'local',
    },

    outline: {
      label: '目录',
    },

    lastUpdated: {
      text: '最后更新',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
  },
}))
