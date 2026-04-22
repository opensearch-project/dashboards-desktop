import { describe, it, expect } from 'vitest';
import { IPC } from '../../src/core/types';

describe('IPC contract: all channels are defined', () => {
  it('IPC constants object is not empty', () => {
    expect(Object.keys(IPC).length).toBeGreaterThan(20);
  });

  it('all IPC values are unique strings', () => {
    const values = Object.values(IPC);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
    for (const v of values) expect(typeof v).toBe('string');
  });

  it('critical channels exist', () => {
    expect(IPC.AGENT_SEND).toBeDefined();
    expect(IPC.AGENT_CANCEL).toBeDefined();
    expect(IPC.AGENT_STREAM).toBeDefined();
    expect(IPC.MODEL_LIST).toBeDefined();
    expect(IPC.MODEL_SWITCH).toBeDefined();
    expect(IPC.CONVERSATION_LIST).toBeDefined();
    expect(IPC.CONVERSATION_CREATE).toBeDefined();
    expect(IPC.CONNECTION_ADD).toBeDefined();
    expect(IPC.CONNECTION_TEST).toBeDefined();
    expect(IPC.SETTINGS_GET).toBeDefined();
    expect(IPC.CREDENTIALS_SAVE).toBeDefined();
  });

  it('channel naming convention is consistent (namespace:action)', () => {
    for (const [_key, value] of Object.entries(IPC)) {
      expect(value).toMatch(/^[a-z][a-z0-9-]*:[a-zA-Z:]+$/);
    }
  });
});
