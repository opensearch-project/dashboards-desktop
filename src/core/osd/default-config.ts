/**
 * Default OSD configuration for the desktop app.
 * Only written on first install or when user changes settings via sidebar.
 */

export const DEFAULT_OSD_CONFIG = {
  'server.host': 'localhost',
  'server.port': 5601,
  'opensearch.hosts': '["https://localhost:9200"]',
  'opensearch.ssl.verificationMode': 'none',
  'opensearch.ignoreVersionMismatch': true,
  'migrations.skip': true,
  'data_source.enabled': true,
  'data_source.hideLocalCluster': true,
  'workspace.enabled': true,
  'opensearchDashboards.futureNavigation': true,
  'uiSettings.overrides.home:useNewHomePage': true,
};

/**
 * Generates opensearch_dashboards.yml content.
 */
export function generateDefaultYml(overrides?: Record<string, unknown>): string {
  const config = { ...DEFAULT_OSD_CONFIG, ...overrides };
  const lines: string[] = [];
  const uiOverrides: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('uiSettings.overrides.')) {
      uiOverrides[key.replace('uiSettings.overrides.', '')] = value;
      continue;
    }
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  if (Object.keys(uiOverrides).length) {
    lines.push('');
    lines.push('uiSettings.overrides:');
    for (const [k, v] of Object.entries(uiOverrides)) {
      lines.push(`  "${k}": ${v}`);
    }
  }

  return lines.join('\n') + '\n';
}
