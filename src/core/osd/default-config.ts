/**
 * Default OSD configuration for the desktop app.
 * Written to opensearch_dashboards.yml before first spawn.
 */

export const DEFAULT_OSD_CONFIG: Record<string, string | boolean | number | string[]> = {
  'server.host': 'localhost',
  'server.port': 5601,

  'opensearch.hosts': '["https://localhost:9200"]',
  'opensearch.ssl.verificationMode': 'none',
  'opensearch.ignoreVersionMismatch': true,
  'opensearch.requestHeadersWhitelist': '["authorization", "securitytenant", "x-tenant-id", "x-tenant-role"]',

  'data_source.enabled': true,
  'data_source_management.manageableBy': 'all',
  'data_source.hideLocalCluster': true,

  'workspace.enabled': true,
  'migrations.skip': true,

  'home.disableWelcomeScreen': false,
  'opensearchDashboards.futureNavigation': true,
  'uiSettings.overrides.home:useNewHomePage': true,
};

/**
 * Generates opensearch_dashboards.yml content from defaults + user overrides.
 */
export function generateDefaultYml(overrides?: Record<string, unknown>): string {
  const config = { ...DEFAULT_OSD_CONFIG, ...overrides };
  const lines: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (key === 'uiSettings.overrides.home:useNewHomePage') {
      // Nested YAML
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

  // Add uiSettings overrides block
  lines.push('');
  lines.push('uiSettings.overrides:');
  lines.push('  "home:useNewHomePage": true');

  return lines.join('\n') + '\n';
}
