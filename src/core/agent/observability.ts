/**
 * Agent observability — structured traces for tool calls, model latency, token usage.
 * Compatible with OpenTelemetry span format for export.
 */

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  status: 'ok' | 'error';
}

let traces: Span[] = [];
let enabled = false;

export function enableTracing(on: boolean): void { enabled = on; }

export function startSpan(name: string, attributes: Record<string, string | number | boolean> = {}, parentSpanId?: string): Span {
  const span: Span = {
    traceId: `tr_${Date.now()}`,
    spanId: `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    parentSpanId,
    name,
    startTime: Date.now(),
    attributes,
    status: 'ok',
  };
  if (enabled) traces.push(span);
  return span;
}

export function endSpan(span: Span, status: 'ok' | 'error' = 'ok', attrs?: Record<string, string | number | boolean>): void {
  span.endTime = Date.now();
  span.status = status;
  if (attrs) Object.assign(span.attributes, attrs);
}

export function getTraces(limit = 100): Span[] { return traces.slice(-limit); }
export function clearTraces(): void { traces = []; }

export function exportOTLP(): string {
  return JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans: traces }] }] });
}
