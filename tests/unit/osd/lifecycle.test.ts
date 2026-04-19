import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

const mockChild = () => {
  const child = new EventEmitter() as any;
  child.pid = 9999;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
};

const { spawnMock, setHealth } = vi.hoisted(() => {
  const spawnMock = vi.fn();
  let health = 200;
  return { spawnMock, setHealth: (code: number) => { health = code; }, getHealth: () => health };
});

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, default: actual, spawn: (...args: any[]) => spawnMock(...args) };
});

vi.mock('http', async (importOriginal) => {
  const { getHealth } = await vi.importMock<{ getHealth: () => number }>('../../../tests/unit/osd/lifecycle.test.ts');
  const actual = await importOriginal<typeof import('http')>();
  return {
    ...actual, default: actual,
    get: (_url: string, cb: (res: { statusCode: number }) => void) => {
      const req = new EventEmitter() as any;
      req.setTimeout = vi.fn(); req.destroy = vi.fn();
      setTimeout(() => cb({ statusCode: 200 }), 5);
      return req;
    },
  };
});

import { OsdLifecycle } from '../../../src/core/osd/lifecycle';

const config = { binPath: '/opt/osd/bin/opensearch-dashboards', port: 5601 };

beforeEach(() => { spawnMock.mockReset(); spawnMock.mockReturnValue(mockChild()); });

describe('OSD Lifecycle: spawn', () => {
  it('starts OSD and resolves when healthy', async () => {
    const osd = new OsdLifecycle(config);
    await osd.start();
    expect(osd.status).toBe('running');
    expect(spawnMock).toHaveBeenCalledWith(config.binPath, expect.arrayContaining(['--server.port', '5601']), expect.any(Object));
    osd.stop();
  });

  it('emits status events', async () => {
    const osd = new OsdLifecycle(config);
    const statuses: string[] = [];
    osd.on('status', (s: string) => statuses.push(s));
    await osd.start();
    expect(statuses).toContain('starting');
    expect(statuses).toContain('running');
    osd.stop();
  });

  it('passes opensearchUrl arg', async () => {
    const osd = new OsdLifecycle({ ...config, opensearchUrl: 'https://cluster:9200' });
    await osd.start();
    expect(spawnMock).toHaveBeenCalledWith(config.binPath, expect.arrayContaining(['--opensearch.hosts', 'https://cluster:9200']), expect.any(Object));
    osd.stop();
  });

  it('no-op if already running', async () => {
    const osd = new OsdLifecycle(config);
    await osd.start();
    await osd.start();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    osd.stop();
  });

  it('defaults to port 5601', () => {
    const osd = new OsdLifecycle({ binPath: '/bin/osd' });
    expect(osd.port).toBe(5601);
    expect(osd.url).toBe('http://localhost:5601');
  });
});

describe('OSD Lifecycle: stop', () => {
  it('sends SIGTERM', async () => {
    const child = mockChild();
    spawnMock.mockReturnValue(child);
    const osd = new OsdLifecycle(config);
    await osd.start();
    osd.stop();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('sets status to stopped', async () => {
    const osd = new OsdLifecycle(config);
    await osd.start();
    osd.stop();
    expect(osd.status).toBe('stopped');
  });
});

describe('OSD Lifecycle: crash', () => {
  it('emits error on unexpected exit', async () => {
    const child = mockChild();
    spawnMock.mockReturnValue(child);
    const osd = new OsdLifecycle(config);
    await osd.start();
    const statuses: string[] = [];
    osd.on('status', (s: string) => statuses.push(s));
    child.emit('exit', 1);
    expect(statuses).toContain('error');
  });

  it('emits stopped on clean exit', async () => {
    const child = mockChild();
    spawnMock.mockReturnValue(child);
    const osd = new OsdLifecycle(config);
    await osd.start();
    const statuses: string[] = [];
    osd.on('status', (s: string) => statuses.push(s));
    child.emit('exit', 0);
    expect(statuses).toContain('stopped');
  });

  it('emits log from stdout', async () => {
    const child = mockChild();
    spawnMock.mockReturnValue(child);
    const osd = new OsdLifecycle(config);
    const logs: string[] = [];
    osd.on('log', (msg: string) => logs.push(msg));
    await osd.start();
    child.stdout.emit('data', Buffer.from('OSD started'));
    expect(logs).toContain('OSD started');
    osd.stop();
  });
});
