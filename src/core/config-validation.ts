/**
 * Config validation — validate opensearch_dashboards.yml before applying.
 */

import { readFileSync } from 'fs';
import { ipcMain } from 'electron';

const REQUIRED_KEYS = ['server.host', 'server.port'];
const VALID_PORTS = { min: 1, max: 65535 };

interface ValidationResult { valid: boolean; errors: string[]; warnings: string[]; }

export function validateYml(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const keys = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(/^(\S+):\s*(.*)$/);
    if (!match && !line.startsWith(' ')) { errors.push(`Invalid line: ${line.slice(0, 60)}`); continue; }
    if (match) keys.set(match[1], match[2].trim());
  }

  for (const req of REQUIRED_KEYS) {
    if (!keys.has(req)) errors.push(`Missing required key: ${req}`);
  }

  const port = Number(keys.get('server.port'));
  if (keys.has('server.port') && (isNaN(port) || port < VALID_PORTS.min || port > VALID_PORTS.max)) {
    errors.push(`Invalid server.port: ${keys.get('server.port')} (must be ${VALID_PORTS.min}-${VALID_PORTS.max})`);
  }

  if (keys.get('opensearch.ssl.verificationMode') === 'none') {
    warnings.push('SSL verification disabled — not recommended for production');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function registerConfigValidationIPC(): void {
  ipcMain.handle('config:validate', (_e, content: string) => validateYml(content));

  ipcMain.handle('config:validate-file', (_e, filePath: string) => {
    try {
      return validateYml(readFileSync(filePath, 'utf-8'));
    } catch (err) { return { valid: false, errors: [`Cannot read file: ${(err as Error).message}`], warnings: [] }; }
  });
}
