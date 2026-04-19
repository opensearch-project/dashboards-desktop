import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import type { McpServerConfig } from './config';

export interface ServerState {
  config: McpServerConfig;
  process: ChildProcess | null;
  status: 'stopped' | 'starting' | 'running' | 'crashed';
  restarts: number;
  lastCrash: number | null;
  memoryMB: number;
}

const MAX_RESTARTS = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
const SHUTDOWN_TIMEOUT_MS = 5000;
const HEALTH_INTERVAL_MS = 30000;
const MEMORY_WARN_MB = 512;

export class McpSupervisor extends EventEmitter {
  private servers = new Map<string, ServerState>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private shuttingDown = false;

  constructor() {
    super();
    this.registerCleanup();
  }

  /** Spawn an MCP server child process */
  async start(name: string, config: McpServerConfig): Promise<void> {
    if (this.servers.get(name)?.status === 'running') return;

    const state: ServerState = this.servers.get(name) ?? {
      config,
      process: null,
      status: 'stopped',
      restarts: 0,
      lastCrash: null,
      memoryMB: 0,
    };
    state.config = config;
    state.status = 'starting';
    this.servers.set(name, state);

    this.spawnProcess(name, state);
  }

  /** Graceful stop: SIGTERM → wait → SIGKILL */
  async stop(name: string): Promise<void> {
    const state = this.servers.get(name);
    if (!state?.process) {
      if (state) state.status = 'stopped';
      return;
    }
    await this.killProcess(state);
    state.status = 'stopped';
    state.restarts = 0;
  }

  /** Restart a server (stop + start) */
  async restart(name: string): Promise<void> {
    const state = this.servers.get(name);
    if (!state) throw new Error(`Unknown MCP server: ${name}`);
    await this.stop(name);
    state.restarts = 0;
    await this.start(name, state.config);
  }

  /** Get status of all servers */
  list(): Map<string, Omit<ServerState, 'process'>> {
    const result = new Map<string, Omit<ServerState, 'process'>>();
    for (const [name, s] of this.servers) {
      const { process: _proc, ...rest } = s;
      result.set(name, rest);
    }
    return result;
  }

  /** Get single server status */
  get(name: string): ServerState | undefined {
    return this.servers.get(name);
  }

  /** Shutdown all servers — called on app exit */
  async shutdownAll(): Promise<void> {
    this.shuttingDown = true;
    if (this.healthTimer) clearInterval(this.healthTimer);
    await Promise.all([...this.servers.keys()].map((name) => this.stop(name)));
  }

  /** Start periodic health checks */
  startHealthChecks(): void {
    if (this.healthTimer) return;
    this.healthTimer = setInterval(() => this.checkHealth(), HEALTH_INTERVAL_MS);
  }

  private spawnProcess(name: string, state: ServerState): void {
    const { command, args = [], env } = state.config;
    const mergedEnv = { ...process.env, ...env };

    const child = spawn(command, args, {
      env: mergedEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    state.process = child;
    state.status = 'running';
    this.emit('started', name);

    child.on('error', (err) => {
      state.status = 'crashed';
      state.process = null;
      this.emit('error', name, err);
      this.maybeRestart(name, state);
    });

    child.on('exit', (code, signal) => {
      if (state.status === 'stopped' || this.shuttingDown) {
        state.process = null;
        return;
      }
      state.status = 'crashed';
      state.process = null;
      state.lastCrash = Date.now();
      this.emit('exit', name, code, signal);
      this.maybeRestart(name, state);
    });

    child.stderr?.on('data', (data: Buffer) => {
      this.emit('stderr', name, data.toString());
    });
  }

  private maybeRestart(name: string, state: ServerState): void {
    if (this.shuttingDown) return;
    if (state.restarts >= MAX_RESTARTS) {
      this.emit('max-restarts', name);
      return;
    }

    state.restarts++;
    const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, state.restarts - 1), MAX_BACKOFF_MS);

    this.emit('restarting', name, delay, state.restarts);
    setTimeout(() => {
      if (state.status !== 'stopped' && !this.shuttingDown) {
        this.spawnProcess(name, state);
      }
    }, delay);
  }

  private async killProcess(state: ServerState): Promise<void> {
    const child = state.process;
    if (!child || child.exitCode !== null) {
      state.process = null;
      return;
    }

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          /* already dead */
        }
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);

      child.once('exit', () => {
        clearTimeout(timeout);
        state.process = null;
        resolve();
      });

      try {
        child.kill('SIGTERM');
      } catch {
        resolve();
      }
    });
  }

  private checkHealth(): void {
    for (const [name, state] of this.servers) {
      if (state.status !== 'running' || !state.process?.pid) continue;

      try {
        // Check process is alive
        process.kill(state.process.pid, 0);
      } catch {
        state.status = 'crashed';
        state.process = null;
        this.emit('health-fail', name);
        this.maybeRestart(name, state);
        continue;
      }

      // Memory check via /proc on Linux
      this.checkMemory(name, state);
    }
  }

  private checkMemory(name: string, state: ServerState): void {
    if (!state.process?.pid || process.platform !== 'linux') return;
    try {
      const fs = require('fs');
      const status = fs.readFileSync(`/proc/${state.process.pid}/status`, 'utf8');
      const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
      if (match) {
        state.memoryMB = parseInt(match[1], 10) / 1024;
        if (state.memoryMB > MEMORY_WARN_MB) {
          this.emit('memory-warning', name, state.memoryMB);
        }
      }
    } catch {
      /* process may have exited */
    }
  }

  private registerCleanup(): void {
    // Async cleanup on beforeExit (allows event loop to drain)
    process.on('beforeExit', () => {
      void this.shutdownAll();
    });
    // Sync fallback: force-kill any remaining children on exit
    process.on('exit', () => {
      for (const state of this.servers.values()) {
        if (state.process?.pid && state.process.exitCode === null) {
          try { process.kill(state.process.pid, 'SIGKILL'); } catch { /* already dead */ }
        }
      }
    });
    process.on('SIGINT', () => {
      void this.shutdownAll().then(() => process.exit(130));
    });
    process.on('SIGTERM', () => {
      void this.shutdownAll().then(() => process.exit(143));
    });
  }
}
