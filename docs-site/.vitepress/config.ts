import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'OSD Desktop',
  description: 'Agent-first desktop app for OpenSearch and Elasticsearch',
  base: '/dashboards-desktop/',
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/api' },
      { text: 'Extend', link: '/extend/plugins' },
      { text: 'Enterprise', link: '/enterprise/deployment' },
      { text: 'Community', link: '/community/contributing' },
      { text: 'Blog', link: '/blog/introducing-v05' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/guide/getting-started' },
            { text: 'Desktop Usage', link: '/guide/desktop-usage' },
            { text: 'AI Chat', link: '/guide/ai-chat' },
            { text: 'Cluster Management', link: '/guide/cluster-management' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' },
            { text: 'FAQ', link: '/guide/faq' },
            { text: 'Cloud Testing', link: '/guide/cloud-testing' },
            { text: 'Screenshots', link: '/guide/screenshots' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'API (IPC Channels)', link: '/reference/api' },
            { text: 'API Versioning', link: '/reference/api-versioning' },
            { text: 'Agent Tools', link: '/reference/tools' },
            { text: 'Tools by Category', link: '/reference/tools-by-category' },
            { text: 'CLI', link: '/reference/cli' },
            { text: 'Keyboard Shortcuts', link: '/reference/keyboard-shortcuts' },
            { text: 'Architecture', link: '/reference/architecture' },
          ],
        },
      ],
      '/extend/': [
        {
          text: 'Extend',
          items: [
            { text: 'Plugins & Skills', link: '/extend/plugins' },
            { text: 'MCP Servers', link: '/extend/mcp' },
            { text: 'Community Templates', link: '/extend/templates' },
          ],
        },
      ],
      '/enterprise/': [
        {
          text: 'Enterprise',
          items: [
            { text: 'Deployment', link: '/enterprise/deployment' },
            { text: 'Security', link: '/enterprise/security' },
            { text: 'Migration', link: '/enterprise/migration' },
            { text: 'Benchmarks', link: '/enterprise/benchmarks' },
          ],
        },
      ],
      '/community/': [
        {
          text: 'Community',
          items: [
            { text: 'Contributing', link: '/community/contributing' },
            { text: 'First PR Guide', link: '/community/onboarding' },
            { text: 'Engagement', link: '/community/engagement' },
            { text: 'Roadmap', link: '/community/roadmap' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/opensearch-project/dashboards-desktop' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/opensearch-project/dashboards-desktop/edit/main/docs-site/:path',
    },
  },
});
