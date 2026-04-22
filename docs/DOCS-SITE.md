# Documentation Site

OSD Desktop docs are published to GitHub Pages using VitePress.

## Setup

```bash
cd docs-site
npm install
npm run dev        # Local preview at localhost:5173
npm run build      # Build static site to dist/
npm run preview    # Preview built site
```

## Structure

```
docs-site/
├── .vitepress/
│   └── config.ts       # Site config, nav, sidebar
├── index.md            # Landing page
├── guide/
│   ├── getting-started.md
│   ├── ai-chat.md
│   ├── cluster-management.md
│   ├── desktop-usage.md
│   └── troubleshooting.md
├── reference/
│   ├── api.md
│   ├── tools.md
│   ├── cli.md
│   └── keyboard-shortcuts.md
├── extend/
│   ├── plugins.md
│   ├── mcp-servers.md
│   ├── skills.md
│   └── community-templates.md
├── enterprise/
│   ├── deployment.md
│   ├── security.md
│   └── migration.md
├── community/
│   ├── contributing.md
│   ├── onboarding.md
│   └── engagement.md
└── blog/
    └── introducing-v05.md
```

## Deployment

GitHub Actions deploys to GitHub Pages on push to `main`:

```yaml
# .github/workflows/docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ['docs-site/**', 'docs/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd docs-site && npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs-site/.vitepress/dist
```

## Content Source

All content is sourced from `docs/*.md` files in the main repo. The doc site imports them — single source of truth, no duplication.
