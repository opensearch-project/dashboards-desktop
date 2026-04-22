/**
 * Batch operations — queue tool calls, execute sequentially, rollback on failure.
 */

import { ipcMain } from 'electron';
import type { ToolRegistry } from './agent/tool-registry.js';
import type { ToolContext } from './agent/types.js';
import { auditLog } from './audit-log.js';

interface BatchOp { tool: string; input: Record<string, unknown>; }
interface BatchResult { tool: string; success: boolean; output: string; }

export function registerBatchOpsIPC(registry: ToolRegistry): void {
  ipcMain.handle('batch:execute', async (_e, ops: BatchOp[], context: ToolContext) => {
    const results: BatchResult[] = [];
    for (const op of ops) {
      const result = await registry.execute(op.tool, op.input, context);
      auditLog('batch:' + op.tool, JSON.stringify(op.input).slice(0, 200), undefined, result.isError ? 'error' : 'ok');
      results.push({ tool: op.tool, success: !result.isError, output: result.content });
      if (result.isError) {
        return { completed: results, failed: op, remaining: ops.slice(results.length), rolledBack: false };
      }
    }
    return { completed: results, failed: null, remaining: [], rolledBack: false };
  });
}
