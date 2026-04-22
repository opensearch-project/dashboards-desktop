/**
 * Bedrock provider test with recorded fixture — no live API calls.
 * Uses FixtureReplayer to replay a recorded Bedrock conversation.
 */
import { describe, it, expect } from 'vitest';
import { FixtureReplayer } from '../../../src/core/agent/testing/fixture-replayer';
import { ModelRouter } from '../../../src/core/agent/model-router';
import type { StreamChunk, ChatMessage } from '../../../src/core/agent/types';
import simpleQuery from '../../fixtures/agent/simple-query.json';
import toolUseFlow from '../../fixtures/agent/tool-use-flow.json';
import streamingTokens from '../../fixtures/agent/streaming-tokens.json';
import errorHandling from '../../fixtures/agent/error-handling.json';

async function collectChunks(iter: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const c of iter) chunks.push(c);
  return chunks;
}

describe('Bedrock fixture E2E: simple query', () => {
  it('replays a simple query fixture', async () => {
    const replayer = new FixtureReplayer(simpleQuery as any);
    const router = new ModelRouter();
    router.register(replayer);
    const messages: ChatMessage[] = [{ role: 'user', content: 'What is OpenSearch?' }];
    const chunks = await collectChunks(router.chat(`fixture:${simpleQuery.model}`, messages, []));
    const text = chunks.filter(c => c.type === 'text').map(c => c.content).join('');
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('Bedrock fixture E2E: tool use', () => {
  it('replays tool call flow', async () => {
    const replayer = new FixtureReplayer(toolUseFlow as any);
    const chunks = await collectChunks(replayer.chat({ model: toolUseFlow.model, messages: [{ role: 'user', content: 'Check cluster health' }] }));
    const toolCalls = chunks.filter(c => c.type === 'tool_call_start');
    expect(toolCalls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Bedrock fixture E2E: streaming', () => {
  it('replays streaming tokens incrementally', async () => {
    const replayer = new FixtureReplayer(streamingTokens as any);
    const chunks = await collectChunks(replayer.chat({ model: streamingTokens.model, messages: [{ role: 'user', content: 'Explain shards' }] }));
    const textChunks = chunks.filter(c => c.type === 'text');
    expect(textChunks.length).toBeGreaterThan(1); // multiple tokens streamed
  });
});

describe('Bedrock fixture E2E: error handling', () => {
  it('replays error fixture', async () => {
    const replayer = new FixtureReplayer(errorHandling as any);
    const chunks = await collectChunks(replayer.chat({ model: errorHandling.model, messages: [{ role: 'user', content: 'fail' }] }));
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('throws when fixture is exhausted', async () => {
    const replayer = new FixtureReplayer({ name: 'empty', model: 'test', turns: [] } as any);
    await expect(collectChunks(replayer.chat({ model: 'test', messages: [] }))).rejects.toThrow(/exhausted/i);
  });
});
