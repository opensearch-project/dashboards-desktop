/**
 * Tool result cache — avoids re-querying for identical tool calls within a TTL.
 */

export interface CacheEntry {
  result: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 30_000; // 30 seconds

function cacheKey(toolName: string, input: Record<string, unknown>): string {
  return `${toolName}:${JSON.stringify(input)}`;
}

export function getCached(toolName: string, input: Record<string, unknown>, ttlMs = DEFAULT_TTL_MS): string | null {
  const key = cacheKey(toolName, input);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) { cache.delete(key); return null; }
  return entry.result;
}

export function setCached(toolName: string, input: Record<string, unknown>, result: string): void {
  cache.set(cacheKey(toolName, input), { result, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}

export function cacheSize(): number {
  return cache.size;
}
