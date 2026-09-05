import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

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
  description: '表单、流程与智能体的一体化工作台',
  lang: 'zh-CN',

  ignoreDeadLinks: false,

  srcExclude: [
    'README.md',
    'ai/**',
    'editor/**',
    'flow/**',
    'extend/**',
    'design/**',
    'en/**',
    'server/**',
    'shared/**',
    'ua/**',
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

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' },
      { text: '集成', link: '/integration/' },
      { text: '扩展', link: '/extension/' },
      { text: '部署', link: '/deploy/' },
      { text: '参考', link: '/reference/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '使用指南',
          items: [
            { text: '能力总览', link: '/guide/' },
            { text: '快速开始', link: '/guide/quickstart' },
            { text: '表单与页面', link: '/guide/forms' },
            { text: '流程设计', link: '/guide/flows' },
            { text: '业务数据', link: '/guide/data' },
            { text: '用户与租户', link: '/guide/users' },
            { text: 'AI 助手', link: '/guide/ai-assistant' },
            { text: '智能体工作流', link: '/guide/workflows' },
            { text: '知识库', link: '/guide/knowledge-base' },
            { text: '评测', link: '/guide/evaluation' },
            { text: '插件', link: '/guide/plugins' },
            { text: '术语对照', link: '/guide/terminology' },
          ],
        },
      ],
      '/integration/': [
        {
          text: '外部集成',
          items: [
            { text: '集成总览', link: '/integration/' },
            { text: '认证方式', link: '/integration/authentication' },
            { text: '工作流 API', link: '/integration/workflow-api' },
            { text: '页面嵌入', link: '/integration/embed-pages' },
            { text: 'MCP 工具', link: '/integration/mcp' },
          ],
        },
      ],
      '/extension/': [
        {
          text: '扩展开发',
          items: [
            { text: '扩展总览', link: '/extension/' },
            { text: '自定义控件', link: '/extension/widgets' },
            { text: '插件开发', link: '/extension/plugins' },
            { text: '技能开发', link: '/extension/skills' },
            { text: '自定义模型', link: '/extension/custom-models' },
          ],
        },
      ],
      '/deploy/': [
        {
          text: '部署',
          items: [
            { text: '部署总览', link: '/deploy/' },
            { text: '安装', link: '/deploy/install' },
            { text: '配置', link: '/deploy/configuration' },
            { text: '安全', link: '/deploy/security' },
            { text: '运维', link: '/deploy/operations' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '参考总览', link: '/reference/' },
            { text: '工作流节点', link: '/reference/workflow-nodes' },
            { text: '流程节点', link: '/reference/flow-nodes' },
            { text: '控件', link: '/reference/widgets' },
            { text: '事件', link: '/reference/events' },
            { text: 'API', link: '/reference/api' },
            { text: '错误码', link: '/reference/errors' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nan1010082085/ai-platform' },
    ],

    footer: {
      message: 'MIT License',
      copyright: '© 2026 Schema Platform Team',
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
