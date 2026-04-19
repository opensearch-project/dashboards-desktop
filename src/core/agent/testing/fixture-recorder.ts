import type { ModelProvider, ModelInfo, ChatParams, StreamChunk } from '../types.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface FixtureTurn {
  request: { model: string; messages: unknown[]; tools?: unknown[] };
  response: { chunks: StreamChunk[] };
}

export interface Fixture {
  name: string;
  model: string;
  turns: FixtureTurn[];
}

/**
 * Wraps a real ModelProvider, records all chat turns to a fixture file.
 * Usage: `new FixtureRecorder(realProvider, 'tests/fixtures/agent/my-test.json')`
 * Call `flush()` after the test to write the fixture to disk.
 */
export class FixtureRecorder implements ModelProvider {
  id: string;
  displayName: string;
  private fixture: Fixture;

  constructor(
    private inner: ModelProvider,
    private outputPath: string,
    fixtureName?: string,
  ) {
    this.id = inner.id;
    this.displayName = inner.displayName;
    this.fixture = { name: fixtureName ?? 'recorded', model: '', turns: [] };
  }

  listModels(): Promise<ModelInfo[]> {
    return this.inner.listModels();
  }

  async *chat(params: ChatParams): AsyncIterable<StreamChunk> {
    this.fixture.model = `${this.inner.id}:${params.model}`;
    const chunks: StreamChunk[] = [];

    for await (const chunk of this.inner.chat(params)) {
      chunks.push(chunk);
      yield chunk;
    }

    this.fixture.turns.push({
      request: {
        model: params.model,
        messages: params.messages,
        tools: params.tools,
      },
      response: { chunks },
    });
  }

  /** Write recorded fixture to disk. */
  flush(): void {
    mkdirSync(dirname(this.outputPath), { recursive: true });
    writeFileSync(this.outputPath, JSON.stringify(this.fixture, null, 2) + '\n');
  }
}
