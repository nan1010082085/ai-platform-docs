---
outline: deep
---

# Visual Editor

Schema-driven visual editor for forms, pages, and dashboards with free-layout. Detail pages are currently in Chinese.

## Positioning

A visual building tool for non-developers. Describe page structure with Schema JSON, separating design-time from run-time:

- **Forms**: approval forms, CRUD lists, detail pages (Flex flow layout)
- **Dashboards / Free pages**: chart dashboards (Free absolute positioning)
- **Publish**: embed via `/view/:schemaCode`, supports interactive / read-only modes

## Tech Stack

| Tech | Version |
|------|---------|
| Vue | 3.5 |
| TypeScript | 5.7 |
| Element Plus | 2.9 |
| ECharts | 6.1 |
| Pinia | 2.3 |
| Vite | 5.x |

## Quick Start

```bash
cd editor
pnpm install
pnpm dev          # http://localhost:5100
pnpm test
pnpm build
```
