/**
 * Agent debug mode — verbose logging of tool calls, prompts, token counts.
 */

let debugEnabled = false;

export function setDebugMode(enabled: boolean): void { debugEnabled = enabled; }
export function isDebugMode(): boolean { return debugEnabled; }

export function debugLog(category: string, data: unknown): void {
  if (!debugEnabled) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[agent:debug:${ts}] [${category}]`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

/** Log a tool call for debugging */
export function debugToolCall(name: string, input: Record<string, unknown>, output: string, durationMs: number): void {
  debugLog('tool', { name, input, outputLength: output.length, durationMs });
}

/** Log prompt sent to model */
export function debugPrompt(model: string, messageCount: number, tokenEstimate: number): void {
  debugLog('prompt', { model, messages: messageCount, estimatedTokens: tokenEstimate });
}

/** Log model response */
export function debugResponse(model: string, tokens: { input: number; output: number }, durationMs: number): void {
  debugLog('response', { model, tokens, durationMs });
}
