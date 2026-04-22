import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../../src/core/agent/conversation-encryption';
import { chatWithFallback, DEFAULT_FALLBACK } from '../../../src/core/agent/model-fallback';

describe('Integration: conversation encryption round-trip', () => {
  it('encrypts and decrypts correctly', () => {
    const password = 'test-password-123';
    const plaintext = 'Hello, this is a secret conversation about cluster health.';
    const encrypted = encrypt(plaintext, password);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':'); // salt:iv:tag:data format
    const decrypted = decrypt(encrypted, password);
    expect(decrypted).toBe(plaintext);
  });

  it('fails with wrong password', () => {
    const encrypted = encrypt('secret', 'correct-password');
    expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
  });

  it('handles empty string', () => {
    const encrypted = encrypt('', 'pass');
    expect(decrypt(encrypted, 'pass')).toBe('');
  });

  it('handles unicode content', () => {
    const text = '日本語テスト 🚀 émojis';
    const encrypted = encrypt(text, 'pass');
    expect(decrypt(encrypted, 'pass')).toBe(text);
  });
});

describe('Integration: model fallback chain', () => {
  it('uses first model when it succeeds', async () => {
    const mockRouter = {
      chat: async function* (model: string) {
        yield { type: 'text' as const, content: `response from ${model}` };
      },
    };
    const chunks: unknown[] = [];
    for await (const c of chatWithFallback(mockRouter as any, [{ role: 'user', content: 'hi' }], [], new AbortController().signal, { chain: ['model-a', 'model-b'], retryableErrors: ['fail'] })) {
      chunks.push(c);
    }
    expect(chunks).toHaveLength(1);
    expect((chunks[0] as any).model).toBe('model-a');
  });

  it('falls back when primary throws retryable error', async () => {
    let callCount = 0;
    const mockRouter = {
      chat: async function* (model: string) {
        callCount++;
        if (model === 'model-a') throw new Error('rate limit exceeded');
        yield { type: 'text' as const, content: 'fallback response' };
      },
    };
    const chunks: unknown[] = [];
    for await (const c of chatWithFallback(mockRouter as any, [{ role: 'user', content: 'hi' }], [], new AbortController().signal, { chain: ['model-a', 'model-b'], retryableErrors: ['rate limit'] })) {
      chunks.push(c);
    }
    expect(callCount).toBe(2);
    expect((chunks[0] as any).model).toBe('model-b');
  });

  it('throws on non-retryable error', async () => {
    const mockRouter = {
      chat: async function* () { throw new Error('auth failed'); },
    };
    await expect(async () => {
      for await (const _ of chatWithFallback(mockRouter as any, [{ role: 'user', content: 'hi' }], [], new AbortController().signal, { chain: ['a'], retryableErrors: ['rate limit'] })) {}
    }).rejects.toThrow('auth failed');
  });
});
