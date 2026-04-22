/**
 * Prompt templates — pre-built prompts for common OpenSearch tasks.
 * Users can select a template to start a conversation with context.
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: 'cluster' | 'index' | 'alerting' | 'security' | 'general';
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'check-cluster',
    name: 'Check Cluster Health',
    description: 'Get a quick overview of cluster status, nodes, and shards',
    prompt: 'Check my cluster health. Show me node count, shard status, and any issues that need attention.',
    category: 'cluster',
  },
  {
    id: 'create-index',
    name: 'Create an Index',
    description: 'Create a new index with mappings and settings',
    prompt: 'Help me create a new index. Ask me about the data I want to store and suggest appropriate mappings and settings.',
    category: 'index',
  },
  {
    id: 'setup-alerting',
    name: 'Set Up Alerting',
    description: 'Create monitors and alerts for cluster events',
    prompt: 'Help me set up alerting. I want to be notified when something goes wrong with my cluster. Ask me what conditions I want to monitor.',
    category: 'alerting',
  },
  {
    id: 'review-security',
    name: 'Security Review',
    description: 'Audit roles, users, and permissions',
    prompt: 'Review my cluster security configuration. List all roles and users, and flag any overly permissive settings.',
    category: 'security',
  },
  {
    id: 'optimize-indices',
    name: 'Optimize Indices',
    description: 'Find large or inefficient indices and suggest improvements',
    prompt: 'Analyze my indices for optimization opportunities. Look for large indices, missing aliases, and suggest ILM/ISM policies.',
    category: 'index',
  },
  {
    id: 'troubleshoot',
    name: 'Troubleshoot Issues',
    description: 'Diagnose cluster problems step by step',
    prompt: 'My cluster seems slow/unhealthy. Help me diagnose the issue step by step — check health, nodes, hot threads, and pending tasks.',
    category: 'cluster',
  },
  {
    id: 'explain-query',
    name: 'Explain a Query',
    description: 'Help write or understand OpenSearch DSL queries',
    prompt: 'Help me write an OpenSearch query. I\'ll describe what I want to find and you generate the DSL.',
    category: 'general',
  },
];

export function getTemplate(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}

export function listTemplates(category?: string): PromptTemplate[] {
  return category ? PROMPT_TEMPLATES.filter((t) => t.category === category) : PROMPT_TEMPLATES;
}
