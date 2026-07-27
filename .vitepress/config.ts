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
    logo: '/logo.svg',

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
            { text: '容器嵌套决策', link: '/editor/container-nesting-decision' },
          ],
        },
        {
          text: '校验与测试',
          items: [
            { text: 'Schema 校验测试', link: '/editor/schema-validation-testing' },
          ],
        },
        {
          text: '设计与迭代',
          items: [
            { text: '设计概览', link: '/editor/design/' },
            { text: '设计器设计', link: '/editor/design/designer' },
            { text: '运行时设计', link: '/editor/design/runtime' },
            { text: '实例与发布', link: '/editor/design/instances-publish' },
            { text: '迭代演进', link: '/editor/iteration-evolution' },
            { text: '迭代计划 v2', link: '/editor/iteration-plan-v2' },
            { text: '阶段评审日志', link: '/editor/stage-review-log' },
            { text: '审查与路线图', link: '/editor/editor-review-and-roadmap' },
          ],
        },
      ],
      '/ai/': [
        {
          text: 'AI 平台',
          items: [
            { text: '概览', link: '/ai/' },
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
            { text: '插件路线图', link: '/ai/plugin-roadmap' },
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
            { text: '迁移计划', link: '/ai/migration-plan' },
            { text: '测试验证指南', link: '/ai/testing/verification-guide-2026-07-23' },
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
        {
          text: '产品文档',
          items: [
            { text: '全链路架构', link: '/ai/product/full-chain-architecture-2026-07-24' },
            { text: 'LangGraph 优化', link: '/ai/product/langgraph-optimization-2026-07-24' },
            { text: '垂直领域分析', link: '/ai/product/vertical-domain-analysis-2026-07-24' },
            { text: '提示词优化', link: '/ai/product/prompt-optimization-2026-07-24' },
            { text: '架构深度分析', link: '/ai/product/architecture-deep-dive-2026-07-24' },
            { text: '产品打磨计划', link: '/ai/product/evolution-plan-2026-07-24-product-polish' },
            { text: 'Workflow-as-Agent', link: '/ai/product/evolution-plan-2026-07-22-workflow-as-agent' },
            { text: 'Phase U 规划', link: '/ai/product/evolution-plan-2026-07-22-phase-u' },
            { text: '高级功能路线图', link: '/ai/product/advanced-features-roadmap' },
            { text: 'LangGraph 节点路线图', link: '/ai/product/langgraph-workflow-nodes-roadmap' },
            { text: '开放平台路线图', link: '/ai/product/open-platform-roadmap' },
            { text: '五阶段迭代', link: '/ai/product/ai-five-phase-iteration' },
            { text: '迭代演进', link: '/ai/product/iteration-evolution' },
            { text: '迭代计划 0723', link: '/ai/product/iteration-plan-2026-07-23' },
            { text: 'Backlog', link: '/ai/product/backlog' },
            { text: 'Prompt 架构', link: '/ai/product/f-p-prompt-architecture' },
            { text: 'Registry 调研', link: '/ai/product/f-1-registry-survey' },
            { text: '剩余调研', link: '/ai/product/f2-survey-remaining' },
            { text: '行业模板-客服', link: '/ai/product/industry-templates-cs' },
            { text: '插件市场安全', link: '/ai/product/plugin-market-security' },
            { text: '保留事件决策', link: '/ai/product/reserved-events-decision' },
            { text: '工作流术语', link: '/ai/product/workflow-terminology' },
            { text: '开源迭代', link: '/ai/product/open-source-iteration' },
            { text: '开发执行计划', link: '/ai/product/dev-execution-plan' },
            { text: '演进计划 0720', link: '/ai/product/evolution-plan-2026-07-20' },
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
            { text: 'API 详细文档', link: '/server/api-reference' },
            { text: '数据库设计', link: '/server/database' },
            { text: '数据模型', link: '/server/models' },
            { text: 'RAG 架构', link: '/server/rag-architecture' },
            { text: '插件中心', link: '/server/plugin-center' },
            { text: '业务 API 映射', link: '/server/business-api-mapping' },
            { text: '业务平台运维', link: '/server/business-platform-ops' },
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
