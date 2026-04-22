/**
 * Rate limiter — sliding window, prevents agent tool loops from flooding APIs.
 */

export class RateLimiter {
  private windows = new Map<string, number[]>();

  constructor(private maxRequests: number = 30, private windowMs: number = 60_000) {}

  canProceed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.windows.get(key) ?? [];
    const valid = timestamps.filter(t => now - t < this.windowMs);
    this.windows.set(key, valid);
    return valid.length < this.maxRequests;
  }

  record(key: string): void {
    const timestamps = this.windows.get(key) ?? [];
    timestamps.push(Date.now());
    this.windows.set(key, timestamps);
  }

  tryAcquire(key: string): boolean {
    if (!this.canProceed(key)) return false;
    this.record(key);
    return true;
  }

  remaining(key: string): number {
    const now = Date.now();
    const valid = (this.windows.get(key) ?? []).filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - valid.length);
  }

  reset(key?: string): void {
    if (key) this.windows.delete(key);
    else this.windows.clear();
  }
}
