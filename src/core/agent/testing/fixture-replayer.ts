import type { ModelProvider, ModelInfo, ChatParams, StreamChunk } from '../types.js';
import type { Fixture } from './fixture-recorder.js';

/**
 * Mock ModelProvider that replays recorded fixtures for deterministic CI tests.
 * Never makes network calls.
 */
export class FixtureReplayer implements ModelProvider {
  id = 'fixture';
  displayName = 'Fixture (test only)';
  private turnIndex = 0;

  constructor(private fixture: Fixture) {}

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: this.fixture.model,
        displayName: 'Fixture model',
        contextWindow: 128_000,
        supportsTools: true,
        local: true,
      },
    ];
  }

  async *chat(_params: ChatParams): AsyncIterable<StreamChunk> {
    const turn = this.fixture.turns[this.turnIndex];
    if (!turn) throw new Error(`Fixture exhausted: no turn at index ${this.turnIndex}`);
    this.turnIndex++;

    for (const chunk of turn.response.chunks) {
      yield chunk;
      // Yield control to simulate async without real latency
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  /** Reset replay to the beginning. */
  reset(): void {
    this.turnIndex = 0;
  }
}
