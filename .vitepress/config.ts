import { defineConfig } from 'vitepress'

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

export default defineConfig({
  base: '/schema-platform/docs/',
  title: 'Schema Platform',
  description: '表单/流程垂直场景的 AI 应用平台',
  lang: 'zh-CN',

  ignoreDeadLinks: true,

  markdown: {
    config: (md) => {
      md.use(escapeVueInterpolation)
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/schema-platform/docs/logo.svg' }],
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
          { text: 'Extend', link: '/en/extend/' },
          { text: 'Design', link: '/en/design/' },
          { text: 'Product', link: '/en/product/' },
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
                { text: 'Workflow Variables', link: '/en/extend/workflow-variables' },
              ],
            },
          ],
          '/en/design/': [
            { text: 'Design', items: [{ text: 'Model Architecture', link: '/en/design/model-architecture' }] },
          ],
          '/en/product/': [
            { text: 'Product', items: [
              { text: 'Prompt Architecture', link: '/en/product/f-p-prompt-architecture' },
              { text: 'Registry Survey', link: '/en/product/f-1-registry-survey' },
              { text: 'Plugin Write Eval', link: '/en/product/plugin-write-eval' },
            ]},
          ],
        },
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        returnToTopLabel: 'Return to top',
      },
    },
  },

  themeConfig: {
    logo: '/schema-platform/docs/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: 'AI 平台', link: '/ai/' },
      { text: '编辑器', link: '/editor/' },
      { text: '流程设计器', link: '/flow/' },
      { text: '后端服务', link: '/server/' },
      { text: '快速开始', link: '/guide/' },
      { text: '扩展开发', link: '/extend/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          items: [
            { text: '简介', link: '/guide/' },
          ],
        },
      ],
      '/editor/': [
        {
          text: '可视化编辑器',
          items: [
            { text: '概览', link: '/editor/' },
            { text: '架构设计', link: '/editor/architecture' },
            { text: 'Widget 体系', link: '/editor/widgets' },
            { text: '双画布系统', link: '/editor/canvas-system' },
            { text: '四大配置系统', link: '/editor/config-systems' },
          ],
        },
      ],
      '/ai/': [
        {
          text: 'AI 平台',
          items: [
            { text: '概览', link: '/ai/' },
            { text: 'AI 对话', link: '/ai/agent' },
            { text: 'Agent Workflow', link: '/ai/agent-workflow' },
            { text: '架构设计', link: '/ai/architecture' },
            { text: '开发指南', link: '/ai/DEVELOPMENT' },
            { text: '部署指南', link: '/ai/DEPLOYMENT' },
            { text: '事件协议', link: '/ai/events' },
            { text: '环境变量', link: '/ai/environment-variables' },
          ],
        },
        {
          text: '产品文档',
          items: [
            { text: '全链路架构', link: '/ai/product/full-chain-architecture-2026-07-24' },
            { text: 'LangGraph 优化', link: '/ai/product/langgraph-optimization-2026-07-24' },
            { text: '垂直领域分析', link: '/ai/product/vertical-domain-analysis-2026-07-24' },
            { text: '提示词优化', link: '/ai/product/prompt-optimization-2026-07-24' },
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
            { text: 'Workflow 变量', link: '/extend/workflow-variables' },
          ],
        },
      ],
      '/server/': [
        {
          text: '后端服务',
          items: [
            { text: '概览', link: '/server/' },
            { text: '能力清单', link: '/server/capabilities' },
            { text: 'API 参考', link: '/server/api' },
            { text: '数据库设计', link: '/server/database' },
            { text: '数据模型', link: '/server/models' },
            { text: 'RAG 架构', link: '/server/rag-architecture' },
            { text: '插件中心', link: '/server/plugin-center' },
            { text: '业务 API 映射', link: '/server/business-api-mapping' },
            { text: '提交流程 Webhook', link: '/server/submission-flow-webhook' },
          ],
        },
      ],
      '/flow/': [
        {
          text: '流程设计器',
          items: [
            { text: '概览', link: '/flow/' },
            { text: '架构设计', link: '/flow/architecture' },
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
      '/product/': [
        {
          text: '产品文档',
          items: [
            { text: 'Prompt 架构', link: '/product/f-p-prompt-architecture' },
            { text: 'Registry 调研', link: '/product/f-1-registry-survey' },
            { text: '插件写能力评估', link: '/product/plugin-write-eval' },
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
})
