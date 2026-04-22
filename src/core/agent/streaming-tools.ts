/**
 * Streaming tool results — emit partial output as tools execute.
 */

import type { ToolResult, ToolContext } from './types';

export type ProgressCallback = (partial: string) => void;

/**
 * Wrap a tool executor to stream partial results via callback.
 * Splits long outputs into chunks and emits progressively.
 */
export function withStreaming(
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>,
  onProgress: ProgressCallback,
): (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult> {
  return async (input, context) => {
    const result = await execute(input, context);
    // Stream content in chunks for long results
    const content = result.content;
    if (content.length > 500) {
      const chunkSize = 200;
      for (let i = 0; i < content.length; i += chunkSize) {
        onProgress(content.slice(i, i + chunkSize));
      }
    } else {
      onProgress(content);
    }
    return result;
  };
}
