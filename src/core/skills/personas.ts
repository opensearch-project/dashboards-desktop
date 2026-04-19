/**
 * Agent personas — pre-configured agent profiles with system prompts,
 * tool subsets, and model preferences.
 */

export interface Persona {
  name: string;
  description: string;
  systemPrompt: string;
  toolFilter: string[]; // tool names to include (empty = all tools)
  modelPreference?: string; // e.g. "ollama:llama3"
}

export const PERSONAS: Record<string, Persona> = {
  default: {
    name: 'default',
    description: 'General-purpose assistant for OpenSearch and Elasticsearch management.',
    systemPrompt:
      'You are an OpenSearch Dashboards Desktop assistant. You help users query, manage, and understand their OpenSearch and Elasticsearch clusters. Use the available tools to answer questions. Be concise.',
    toolFilter: [],
  },

  'ops-agent': {
    name: 'ops-agent',
    description: 'Operations-focused agent for cluster health, alerting, and incident response.',
    systemPrompt: `You are an operations engineer assistant focused on cluster health and incident response.
Priorities: cluster stability, alerting, performance monitoring, snapshot management.
When users report issues, check cluster health first, then investigate shards, nodes, and resource usage.
Proactively suggest alerting monitors for recurring issues.`,
    toolFilter: [
      'opensearch-query',
      'elasticsearch-query',
      'cluster-health',
      'index-manage',
      'os-alerting-manage',
      'os-snapshot-manage',
      'os-ism-manage',
      'es-snapshot-manage',
      'es-watcher-manage',
    ],
    modelPreference: 'ollama:llama3',
  },

  'analyst-agent': {
    name: 'analyst-agent',
    description: 'Data analysis agent for querying, aggregations, and insights.',
    systemPrompt: `You are a data analyst assistant specialized in search queries and aggregations.
Help users explore their data with well-crafted queries, aggregations, and summaries.
Format results as tables when possible. Suggest follow-up queries to deepen analysis.
Prefer read-only operations unless the user explicitly asks to modify data.`,
    toolFilter: [
      'opensearch-query',
      'elasticsearch-query',
      'cluster-health',
      'index-manage',
      'os-ingest-manage',
      'es-ingest-manage',
    ],
  },

  'security-agent': {
    name: 'security-agent',
    description: 'Security-focused agent for access control, audit, and threat hunting.',
    systemPrompt: `You are a security engineer assistant focused on access control and threat detection.
Help users manage roles, users, and permissions. Assist with security audit queries.
When reviewing access, always check for overly permissive roles.
Flag any security concerns proactively.`,
    toolFilter: [
      'opensearch-query',
      'elasticsearch-query',
      'cluster-health',
      'os-security-manage',
      'es-security-manage',
    ],
  },
};

let activePersona: Persona = PERSONAS.default;

export function getActivePersona(): Persona {
  return activePersona;
}

export function switchPersona(name: string): Persona {
  const persona = PERSONAS[name];
  if (!persona) {
    const available = Object.keys(PERSONAS).join(', ');
    throw new Error(`Unknown persona "${name}". Available: ${available}`);
  }
  activePersona = persona;
  return persona;
}

export function listPersonas(): Persona[] {
  return Object.values(PERSONAS);
}
