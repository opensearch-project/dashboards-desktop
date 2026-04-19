import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import type { PluginMeta } from './manager';

const PLUGINS_DIR = path.join(process.env.HOME ?? '~', '.osd', 'plugins');
const SHUTDOWN_TIMEOUT_MS = 5000;

export interface SandboxedPlugin {
  meta: PluginMeta;
  worker: Worker | null;
  status: 'stopped' | 'running' | 'crashed';
}

export class PluginSandbox extends EventEmitter {
  private plugins = new Map<string, SandboxedPlugin>();

  /** Load and run a plugin in a worker thread */
  start(meta: PluginMeta): void {
    if (this.plugins.get(meta.name)?.status === 'running') return;

    const pluginDir = path.join(PLUGINS_DIR, meta.name);
    const entryPoint = path.join(pluginDir, meta.main);

    const worker = new Worker(entryPoint, {
      workerData: { pluginName: meta.name, pluginDir },
      // Limit what the worker can access
      env: { NODE_ENV: process.env.NODE_ENV ?? 'production' },
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 64,
        stackSizeMb: 4,
      },
    });

    const entry: SandboxedPlugin = { meta, worker, status: 'running' };
    this.plugins.set(meta.name, entry);

    worker.on('message', (msg) => this.emit('message', meta.name, msg));
    worker.on('error', (err) => {
      entry.status = 'crashed';
      entry.worker = null;
      this.emit('error', meta.name, err);
    });
    worker.on('exit', (code) => {
      if (entry.status !== 'stopped') entry.status = 'crashed';
      entry.worker = null;
      this.emit('exit', meta.name, code);
    });

    this.emit('started', meta.name);
  }

  /** Stop a plugin's worker thread */
  async stop(name: string): Promise<void> {
    const entry = this.plugins.get(name);
    if (!entry?.worker) {
      if (entry) entry.status = 'stopped';
      return;
    }

    entry.status = 'stopped';
    await terminateWorker(entry.worker);
    entry.worker = null;
  }

  /** Send a message to a plugin's worker */
  send(name: string, message: unknown): void {
    const entry = this.plugins.get(name);
    if (entry?.worker) entry.worker.postMessage(message);
  }

  /** Stop all plugins */
  async stopAll(): Promise<void> {
    await Promise.all([...this.plugins.keys()].map((n) => this.stop(n)));
  }

  /** Get status of all loaded plugins */
  list(): Map<string, Omit<SandboxedPlugin, 'worker'>> {
    const result = new Map<string, Omit<SandboxedPlugin, 'worker'>>();
    for (const [name, p] of this.plugins) {
      const { worker: _w, ...rest } = p;
      result.set(name, rest);
    }
    return result;
  }
}

function terminateWorker(worker: Worker): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      worker.terminate().then(resolve, resolve);
    }, SHUTDOWN_TIMEOUT_MS);

    worker.once('exit', () => { clearTimeout(timeout); resolve(); });
    worker.postMessage({ type: 'shutdown' });
  });
}
