# Schema Platform Documentation

This directory contains the documentation for Schema Platform, built with [VitePress](https://vitepress.dev/).

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Structure

```
docs/
├── .vitepress/          # VitePress configuration
│   └── config.ts        # Site configuration
├── ai/                  # AI Platform documentation
├── editor/              # Form Editor documentation
├── flow/                # Flow Designer documentation
├── guide/               # Getting started guides
├── public/              # Static assets
├── index.md             # Homepage
└── package.json
```

## 📝 Writing Documentation

### Adding a New Page

1. Create a markdown file in the appropriate directory
2. Add the page to the sidebar in `.vitepress/config.ts`

### Markdown Extensions

VitePress supports enhanced markdown:

- **Code blocks** with syntax highlighting
- **Custom containers** (tip, warning, danger)
- **Emoji support** :tada:
- **Table of contents** generation

### Example

```markdown
# My Page

::: tip
This is a tip container.
:::

::: warning
This is a warning container.
:::

::: danger
This is a danger container.
:::
```

## 🚀 Deployment

### GitHub Pages (Recommended)

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

**Live URL**: https://nan1010082085.github.io/ai-platform/

### Manual Deployment

```bash
# Build and deploy
npm run deploy
```

This will:
1. Build the documentation
2. Deploy to GitHub Pages using `gh-pages`

### Other Platforms

The built documentation can be deployed to any static hosting:

- **Vercel**: `vercel --prod`
- **Netlify**: Connect to GitHub repository
- **AWS S3**: Upload `docs/.vitepress/dist` to S3 bucket

## 🔧 Configuration

### Site Configuration

Edit `.vitepress/config.ts` to customize:

- Site title and description
- Navigation menu
- Sidebar structure
- Social links
- Footer content

### Environment Variables

No environment variables required for documentation.

## 📚 Resources

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Vue.js Documentation](https://vuejs.org/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please follow the existing documentation style and structure.

## 📄 License

This documentation is part of Schema Platform and is licensed under the MIT License.
