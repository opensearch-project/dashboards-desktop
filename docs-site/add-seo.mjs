#!/usr/bin/env node
/**
 * Add VitePress frontmatter (title, description, head meta) to all doc pages.
 * Run: node docs-site/add-seo.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const SEO = {
  'getting-started': { title: 'Getting Started', description: 'Install OSD Desktop and set up your first connection, model, and workspace.' },
  'desktop-usage': { title: 'Desktop Usage', description: 'Homepage, workspaces, connections, settings, and theming in OSD Desktop.' },
  'ai-chat': { title: 'AI Chat Guide', description: 'Chat with your clusters using natural language. Model switching, tools, and conversation management.' },
  'cluster-management': { title: 'Cluster Management', description: 'Monitor and manage OpenSearch and Elasticsearch clusters via chat.' },
  'troubleshooting': { title: 'Troubleshooting', description: 'Diagnose and fix common issues with OSD Desktop.' },
  'faq': { title: 'FAQ', description: 'Frequently asked questions about OSD Desktop setup, models, connections, and MCP.' },
  'cloud-testing': { title: 'Cloud Testing', description: 'Test OSD Desktop on AWS EC2 instances — macOS, Windows, and Linux.' },
  'screenshots': { title: 'Screenshots', description: 'Visual guide to OSD Desktop UI flows.' },
  'api': { title: 'API Reference', description: 'All 75+ IPC channels with parameters, return types, and descriptions.' },
  'tools': { title: 'Agent Tools', description: 'Reference for all 28 built-in agent tools.' },
  'tools-by-category': { title: 'Tools by Category', description: 'Agent tools organized by category with examples.' },
  'cli': { title: 'CLI Reference', description: 'All osd subcommands: chat, mcp, skill, agent, plugin, update, doctor.' },
  'keyboard-shortcuts': { title: 'Keyboard Shortcuts', description: 'Cheat sheet for all OSD Desktop keyboard shortcuts.' },
  'architecture': { title: 'Architecture', description: 'System architecture diagrams — main process, renderer, IPC, agent runtime.' },
  'plugins': { title: 'Plugin Development', description: 'Build plugins, skills, and MCP servers for OSD Desktop.' },
  'mcp': { title: 'MCP & Extensions', description: 'Install and configure MCP servers, plugins, skills, and agent personas.' },
  'templates': { title: 'Community Templates', description: 'Ready-to-use MCP servers, skills, and agent personas.' },
  'deployment': { title: 'Enterprise Deployment', description: 'Fleet install, config management, compliance, and air-gapped environments.' },
  'security': { title: 'Security Guide', description: 'Credential storage, sandboxing, privacy, and update verification.' },
  'migration': { title: 'Migration Guide', description: 'Migrate from browser-based OSD to OSD Desktop.' },
  'benchmarks': { title: 'Benchmarks', description: 'Performance numbers: startup time, memory, build size, chat latency.' },
  'contributing': { title: 'Contributing', description: 'Dev setup, project structure, testing, and PR process.' },
  'onboarding': { title: 'First PR Guide', description: 'Your first pull request in 30 minutes.' },
  'engagement': { title: 'Community', description: 'Slack, forum, office hours, contributor recognition.' },
  'roadmap': { title: 'Roadmap', description: 'What\'s shipped, what\'s next, and what\'s planned for OSD Desktop.' },
  'introducing-v05': { title: 'Introducing OSD Desktop v0.5', description: 'An agent-first desktop app for OpenSearch and Elasticsearch.' },
};

function addFrontmatter(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { addFrontmatter(full); continue; }
    if (!entry.endsWith('.md') || entry === 'index.md') continue;
    const key = basename(entry, '.md');
    const seo = SEO[key];
    if (!seo) continue;
    const content = readFileSync(full, 'utf8');
    if (content.startsWith('---')) continue; // already has frontmatter
    const fm = `---\ntitle: "${seo.title}"\ndescription: "${seo.description}"\nhead:\n  - - meta\n    - property: og:title\n      content: "${seo.title} — OSD Desktop"\n  - - meta\n    - property: og:description\n      content: "${seo.description}"\n---\n\n`;
    writeFileSync(full, fm + content);
  }
}

addFrontmatter('docs-site');
console.log('SEO frontmatter added.');
