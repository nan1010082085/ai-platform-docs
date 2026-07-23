import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Schema Platform',
  description: 'Open-source AI application platform with visual workflow orchestration',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Schema Platform' }],
    ['meta', { property: 'og:description', content: 'Open-source AI application platform' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'AI Platform', link: '/ai/' },
      { text: 'Editor', link: '/editor/' },
      { text: 'Flow Designer', link: '/flow/' },
      { text: 'Guide', link: '/guide/' },
      {
        text: 'v1.0',
        items: [
          { text: 'Changelog', link: '/ai/changelog' },
          { text: 'Contributing', link: '/contributing' },
        ]
      }
    ],

    sidebar: {
      '/ai/': [
        {
          text: 'AI Platform',
          items: [
            { text: 'Introduction', link: '/ai/' },
            { text: 'Quick Start', link: '/ai/quick-start' },
            { text: 'Architecture', link: '/ai/architecture' },
          ]
        },
        {
          text: 'Core Features',
          items: [
            { text: 'AI Chat', link: '/ai/chat' },
            { text: 'Agent Workflow', link: '/ai/workflow' },
            { text: 'RAG Knowledge Base', link: '/ai/rag' },
            { text: 'Plugin Center', link: '/ai/plugin' },
            { text: 'Model Management', link: '/ai/models' },
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Development Guide', link: '/ai/development' },
            { text: 'API Reference', link: '/ai/api' },
            { text: 'Testing', link: '/ai/testing' },
            { text: 'Deployment', link: '/ai/deployment' },
          ]
        },
        {
          text: 'Resources',
          items: [
            { text: 'Changelog', link: '/ai/changelog' },
            { text: 'Security', link: '/ai/security' },
            { text: 'FAQ', link: '/ai/faq' },
          ]
        }
      ],
      
      '/editor/': [
        {
          text: 'Form Editor',
          items: [
            { text: 'Introduction', link: '/editor/' },
            { text: 'Quick Start', link: '/editor/quick-start' },
            { text: 'Architecture', link: '/editor/architecture' },
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Schema Design', link: '/editor/schema' },
            { text: 'Widget System', link: '/editor/widgets' },
            { text: 'Property Panel', link: '/editor/property-panel' },
            { text: 'Validation', link: '/editor/validation' },
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Widget Development', link: '/editor/widget-development' },
            { text: 'Third-party Widgets', link: '/editor/third-party-widgets' },
            { text: 'API Reference', link: '/editor/api' },
          ]
        }
      ],
      
      '/flow/': [
        {
          text: 'Flow Designer',
          items: [
            { text: 'Introduction', link: '/flow/' },
            { text: 'Quick Start', link: '/flow/quick-start' },
          ]
        },
        {
          text: 'Features',
          items: [
            { text: 'Node Types', link: '/flow/nodes' },
            { text: 'Flow Execution', link: '/flow/execution' },
            { text: 'Integration', link: '/flow/integration' },
          ]
        }
      ],
      
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Architecture', link: '/guide/architecture' },
            { text: 'Deployment', link: '/guide/deployment' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nan1010082085/ai-platform' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Schema Platform Team'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/nan1010082085/ai-platform/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Last updated',
    },
  }
})
