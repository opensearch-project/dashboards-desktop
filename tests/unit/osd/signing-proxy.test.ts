import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockOnBeforeSendHeaders, mockSign } = vi.hoisted(() => {
  const mockSign = vi.fn();
  return { mockOnBeforeSendHeaders: vi.fn(), mockSign };
});

vi.mock('electron', () => ({
  session: { defaultSession: { webRequest: { onBeforeSendHeaders: mockOnBeforeSendHeaders } } },
}));
vi.mock('@smithy/signature-v4', () => {
  return { SignatureV4: class { sign = mockSign; } };
});
vi.mock('@smithy/protocol-http', () => ({ HttpRequest: vi.fn((opts: any) => opts) }));
vi.mock('@aws-crypto/sha256-js', () => ({ Sha256: vi.fn() }));

import { registerSigningProxy, clearSigningProxy, type ProxyAuth } from '../../../src/core/osd/signing-proxy';

beforeEach(() => {
  mockOnBeforeSendHeaders.mockReset();
  mockSign.mockReset();
  mockSign.mockResolvedValue({ headers: { Authorization: 'AWS4-HMAC-SHA256 ...', 'x-amz-date': '20260419T000000Z', 'x-amz-security-token': 'tok' } });
});

describe('Signing Proxy: registration', () => {
  it('registers interceptor with cluster URL filter', () => {
    registerSigningProxy('https://cluster:9200', { type: 'none' });
    expect(mockOnBeforeSendHeaders).toHaveBeenCalledWith({ urls: ['https://cluster:9200/*'] }, expect.any(Function));
  });

  it('clearSigningProxy removes interceptor', () => {
    clearSigningProxy();
    expect(mockOnBeforeSendHeaders).toHaveBeenCalledWith(null);
  });
});

describe('Signing Proxy: basic auth', () => {
  it('adds Basic Authorization header', async () => {
    registerSigningProxy('https://cluster:9200', { type: 'basic', username: 'admin', password: 'secret' });
    const handler = mockOnBeforeSendHeaders.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ url: 'https://cluster:9200/_cat/health', method: 'GET', requestHeaders: {} }, cb);
    expect(cb).toHaveBeenCalledWith({
      requestHeaders: expect.objectContaining({ Authorization: `Basic ${Buffer.from('admin:secret').toString('base64')}` }),
    });
  });
});

describe('Signing Proxy: API key', () => {
  it('adds ApiKey header', async () => {
    registerSigningProxy('https://cluster:9200', { type: 'apikey', apiKey: 'my-key' });
    const handler = mockOnBeforeSendHeaders.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ url: 'https://cluster:9200/_search', method: 'POST', requestHeaders: {} }, cb);
    expect(cb).toHaveBeenCalledWith({ requestHeaders: expect.objectContaining({ Authorization: 'ApiKey my-key' }) });
  });
});

describe('Signing Proxy: SigV4', () => {
  it('signs request with AWS credentials', async () => {
    const auth: ProxyAuth = { type: 'sigv4', region: 'us-east-1', accessKeyId: 'AKIA', secretAccessKey: 'secret', sessionToken: 'tok' };
    registerSigningProxy('https://cluster:9200', auth);
    const handler = mockOnBeforeSendHeaders.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ url: 'https://cluster:9200/_search', method: 'GET', requestHeaders: {} }, cb);
    expect(mockSign).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ requestHeaders: expect.objectContaining({ Authorization: 'AWS4-HMAC-SHA256 ...' }) });
  });

  it('includes x-amz-security-token', async () => {
    const auth: ProxyAuth = { type: 'sigv4', region: 'us-west-2', accessKeyId: 'AK', secretAccessKey: 'SK', sessionToken: 'st' };
    registerSigningProxy('https://cluster:9200', auth);
    const handler = mockOnBeforeSendHeaders.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ url: 'https://cluster:9200/idx/_doc/1', method: 'PUT', requestHeaders: {} }, cb);
    expect(cb).toHaveBeenCalledWith({ requestHeaders: expect.objectContaining({ 'x-amz-security-token': 'tok' }) });
  });

  it('skips signing when credentials missing', async () => {
    registerSigningProxy('https://cluster:9200', { type: 'sigv4', region: 'us-east-1' });
    const handler = mockOnBeforeSendHeaders.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ url: 'https://cluster:9200/_search', method: 'GET', requestHeaders: { existing: 'h' } }, cb);
    expect(mockSign).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ requestHeaders: { existing: 'h' } });
  });
});

describe('Signing Proxy: no auth', () => {
  it('passes headers unmodified', async () => {
    registerSigningProxy('https://cluster:9200', { type: 'none' });
    const handler = mockOnBeforeSendHeaders.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ url: 'https://cluster:9200/_cat/health', method: 'GET', requestHeaders: { 'X-Custom': 'val' } }, cb);
    expect(cb).toHaveBeenCalledWith({ requestHeaders: { 'X-Custom': 'val' } });
  });
});
