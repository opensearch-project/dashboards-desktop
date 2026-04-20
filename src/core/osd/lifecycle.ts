/**
 * OSD Lifecycle Manager — spawns and monitors a local OpenSearch Dashboards instance.
 */

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as path from 'path';

export interface OsdConfig {
  /** Path to OSD binary or start script */
  binPath: string;
  /** Port to run on (default 5601) */
  port?: number;
  /** OpenSearch backend URL */
  opensearchUrl?: string;
  /** Additional CLI args */
  args?: string[];
}

export type OsdStatus = 'stopped' | 'starting' | 'running' | 'error';

export class OsdLifecycle extends EventEmitter {
  private process: ChildProcess | null = null;
  private _status: OsdStatus = 'stopped';
  private _port: number;
  private healthInterval: ReturnType<typeof setInterval> | null = null;

  get status(): OsdStatus { return this._status; }
  get port(): number { return this._port; }
  get url(): string { return `http://localhost:${this._port}`; }

  constructor(private config: OsdConfig) {
    super();
    this._port = config.port ?? 5601;
  }

  async start(): Promise<void> {
    if (this._status === 'running') return;
    this.setStatus('starting');

    const args = [
      '--server.port', String(this._port),
      '--data_source.enabled', 'true',
      ...(this.config.opensearchUrl ? ['--opensearch.hosts', this.config.opensearchUrl] : []),
      ...(this.config.args ?? []),
    ];

    this.process = spawn(this.config.binPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=1024',
        KBN_PATH_CONF: path.join(path.dirname(path.dirname(this.config.binPath)), 'config'),
      },
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.emit('log', chunk.toString());
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      this.emit('log', chunk.toString());
    });

    this.process.on('exit', (code) => {
      this.setStatus(code === 0 ? 'stopped' : 'error');
      this.stopHealthCheck();
    });

    // Poll for readiness
    await this.waitForReady(60_000);
    this.startHealthCheck();
  }

  stop(): void {
    this.stopHealthCheck();
    if (this.process) {
      this.process.kill('SIGTERM');
      setTimeout(() => { this.process?.kill('SIGKILL'); }, 5000);
      this.process = null;
    }
    this.setStatus('stopped');
  }

  private async waitForReady(timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.checkHealth()) {
        this.setStatus('running');
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    this.setStatus('error');
    throw new Error(`OSD failed to start within ${timeoutMs / 1000}s`);
  }

  private checkHealth(): Promise<boolean> {
    return new Promise(resolve => {
      const req = http.get(`http://localhost:${this._port}/api/status`, res => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
  }

  private startHealthCheck(): void {
    this.healthInterval = setInterval(async () => {
      if (!(await this.checkHealth())) {
        this.setStatus('error');
        this.emit('unhealthy');
      }
    }, 10_000);
  }

  private stopHealthCheck(): void {
    if (this.healthInterval) { clearInterval(this.healthInterval); this.healthInterval = null; }
  }

  private setStatus(s: OsdStatus): void {
    if (this._status !== s) { this._status = s; this.emit('status', s); }
  }
}
