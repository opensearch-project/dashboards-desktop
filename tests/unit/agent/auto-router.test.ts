import { describe, it, expect } from 'vitest';
import { scoreComplexity, selectModel, DEFAULT_CONFIG, type AutoRouterConfig } from '../../../src/core/agent/auto-router';
import type { ChatMessage, ToolDefinition } from '../../../src/core/agent/types';

const tools5: ToolDefinition[] = Array.from({ length: 5 }, (_, i) => ({
  name: `tool-${i}`, description: '', source: 'builtin' as const, inputSchema: {}, requiresApproval: false,
}));
const tools15: ToolDefinition[] = Array.from({ length: 15 }, (_, i) => ({
  name: `tool-${i}`, description: '', source: 'builtin' as const, inputSchema: {}, requiresApproval: false,
}));

function history(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `Message ${i}`,
  }));
}

describe('scoreComplexity', () => {
  it('returns low score for simple short query', () => {
    const score = scoreComplexity('hi', [], []);
    expect(score).toBeLessThan(0.2);
  });

  it('increases score for long queries', () => {
    const short = scoreComplexity('hello', [], []);
    const long = scoreComplexity('x'.repeat(600), [], []);
    expect(long).toBeGreaterThan(short);
  });

  it('increases score for many tools', () => {
    const few = scoreComplexity('query', [], tools5);
    const many = scoreComplexity('query', [], tools15);
    expect(many).toBeGreaterThan(few);
  });

  it('increases score for deep conversation history', () => {
    const shallow = scoreComplexity('query', history(2), []);
    const deep = scoreComplexity('query', history(30), []);
    expect(deep).toBeGreaterThan(shallow);
  });

  it('increases score for code blocks', () => {
    const noCode = scoreComplexity('explain this', [], []);
    const withCode = scoreComplexity('explain this ```\nconst x = 1;\n```', [], []);
    expect(withCode).toBeGreaterThan(noCode);
  });

  it('increases score for multi-step queries', () => {
    const simple = scoreComplexity('show health', [], []);
    const multiStep = scoreComplexity('first check health then reindex logs and after that create an alert', [], []);
    expect(multiStep).toBeGreaterThan(simple);
  });

  it('caps at 1.0', () => {
    const score = scoreComplexity('x'.repeat(1000) + ' ```code``` first do this then that', history(50), tools15);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('selectModel', () => {
  const config: AutoRouterConfig = {
    enabled: true,
    localModel: 'ollama:llama3',
    cloudModel: 'anthropic:claude-sonnet-4-20250514',
    complexityThreshold: 0.5,
  };

  it('returns local model for simple queries when enabled', () => {
    const model = selectModel('hi', [], [], config);
    expect(model).toBe('ollama:llama3');
  });

  it('returns cloud model for complex queries when enabled', () => {
    const model = selectModel(
      'first analyze the error patterns in logs-* then create an alerting monitor and after that set up an ISM policy ```\n{"phases":{}}\n```',
      history(25), tools15, config
    );
    expect(model).toBe('anthropic:claude-sonnet-4-20250514');
  });

  it('returns local model when auto-router is disabled', () => {
    const disabled = { ...config, enabled: false };
    const model = selectModel('very complex multi-step query', history(30), tools15, disabled);
    expect(model).toBe('ollama:llama3');
  });

  it('manual override always wins', () => {
    const model = selectModel('hi', [], [], config, 'openai:gpt-4o');
    expect(model).toBe('openai:gpt-4o');
  });

  it('manual override wins even when disabled', () => {
    const disabled = { ...config, enabled: false };
    const model = selectModel('hi', [], [], disabled, 'openai:gpt-4o');
    expect(model).toBe('openai:gpt-4o');
  });
});
