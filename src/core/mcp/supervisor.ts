import { ChildProcess, spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
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
const PID_DIR = path.join(process.env.HOME ?? '~', '.osd', 'mcp', 'pids');

export class McpSupervisor extends EventEmitter {
  private servers = new Map<string, ServerState>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private shuttingDown = false;

  constructor() {
    super();
    fs.mkdirSync(PID_DIR, { recursive: true });
    this.killOrphans();
    this.registerCleanup();
  }

  /** Kill orphaned MCP processes from a previous crash */
  private killOrphans(): void {
    try {
      const files = fs.readdirSync(PID_DIR).filter((f) => f.endsWith('.pid'));
      for (const file of files) {
        const pid = parseInt(fs.readFileSync(path.join(PID_DIR, file), 'utf8').trim(), 10);
        if (!pid || isNaN(pid)) { this.removePidFile(file); continue; }
        try {
          process.kill(pid, 0); // check alive
          process.kill(pid, 'SIGTERM');
          this.emit('orphan-killed', file.replace('.pid', ''), pid);
        } catch { /* already dead */ }
        this.removePidFile(file);
      }
    } catch { /* PID dir may not exist yet */ }
  }

  private writePidFile(name: string, pid: number): void {
    fs.writeFileSync(path.join(PID_DIR, `${name}.pid`), String(pid));
  }

  private removePidFile(name: string): void {
    const file = name.endsWith('.pid') ? name : `${name}.pid`;
    try { fs.unlinkSync(path.join(PID_DIR, file)); } catch { /* ok */ }
  }

  /** Spawn an MCP server child process */
  async start(name: string, config: McpServerConfig): Promise<void> {
    if (this.servers.get(name)?.status === 'running') return;

    const state: ServerState = this.servers.get(name) ?? {
      config, process: null, status: 'stopped',
      restarts: 0, lastCrash: null, memoryMB: 0,
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
      this.removePidFile(name);
      return;
    }
    await this.killProcess(state);
    state.status = 'stopped';
    state.restarts = 0;
    this.removePidFile(name);
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

  /** Synchronous kill for process.on('exit') — cannot await */
  private shutdownSync(): void {
    this.shuttingDown = true;
    if (this.healthTimer) clearInterval(this.healthTimer);
    for (const [name, state] of this.servers) {
      if (state.process?.pid) {
        try { process.kill(state.process.pid, 'SIGKILL'); } catch { /* ok */ }
      }
      this.removePidFile(name);
    }
  }

  /** Start periodic health checks */
  startHealthChecks(): void {
    if (this.healthTimer) return;
    this.healthTimer = setInterval(() => this.checkHealth(), HEALTH_INTERVAL_MS);
  }

  private spawnProcess(name: string, state: ServerState): void {
    const { command, args = [], env } = state.config;
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    state.process = child;
    state.status = 'running';
    if (child.pid) this.writePidFile(name, child.pid);
    this.emit('started', name);

    child.on('error', (err) => {
      state.status = 'crashed';
      state.process = null;
      this.removePidFile(name);
      this.emit('error', name, err);
      this.maybeRestart(name, state);
    });

    child.on('exit', (code, signal) => {
      this.removePidFile(name);
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
        try { child.kill('SIGKILL'); } catch { /* already dead */ }
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);
      child.once('exit', () => { clearTimeout(timeout); state.process = null; resolve(); });
      try { child.kill('SIGTERM'); } catch { resolve(); }
    });
  }

  private checkHealth(): void {
    for (const [name, state] of this.servers) {
      if (state.status !== 'running' || !state.process?.pid) continue;
      try {
        process.kill(state.process.pid, 0);
      } catch {
        state.status = 'crashed';
        state.process = null;
        this.removePidFile(name);
        this.emit('health-fail', name);
        this.maybeRestart(name, state);
        continue;
      }
      this.checkMemory(name, state);
    }
  }

  private checkMemory(name: string, state: ServerState): void {
    if (!state.process?.pid || process.platform !== 'linux') return;
    try {
      const status = fs.readFileSync(`/proc/${state.process.pid}/status`, 'utf8');
      const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
      if (match) {
        state.memoryMB = parseInt(match[1], 10) / 1024;
        if (state.memoryMB > MEMORY_WARN_MB) {
          this.emit('memory-warning', name, state.memoryMB);
        }
      }
    } catch { /* process may have exited */ }
  }

  private registerCleanup(): void {
    // Sync handler for 'exit' — cannot await, use SIGKILL
    process.on('exit', () => this.shutdownSync());
    // Async handlers for signals — can await graceful shutdown
    const asyncCleanup = () => { void this.shutdownAll().then(() => process.exit(0)); };
    process.on('SIGINT', asyncCleanup);
    process.on('SIGTERM', asyncCleanup);
    process.on('uncaughtException', (err) => {
      this.emit('error', 'supervisor', err);
      this.shutdownSync();
    });
  }
}
