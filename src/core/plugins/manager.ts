import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

const PLUGINS_DIR = path.join(process.env.HOME ?? '~', '.osd', 'plugins');

export interface PluginMeta {
  name: string;
  version: string;
  description: string;
  main: string;
  enabled: boolean;
  installedAt: string;
}

const META_FILE = 'plugin.json';

function ensureDir(): void {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

/** Install a plugin from a local .zip or tarball path */
export function installFromArchive(archivePath: string): PluginMeta {
  ensureDir();
  const tmpDir = path.join(PLUGINS_DIR, `.tmp-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    if (archivePath.endsWith('.zip')) {
      execFileSync('unzip', ['-o', archivePath, '-d', tmpDir], { stdio: 'pipe' });
    } else {
      execFileSync('tar', ['xzf', archivePath, '-C', tmpDir, '--strip-components=1'], {
        stdio: 'pipe',
      });
    }

    const meta = readMeta(tmpDir);
    const dest = path.join(PLUGINS_DIR, meta.name);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true });
    fs.renameSync(tmpDir, dest);

    meta.enabled = true;
    meta.installedAt = new Date().toISOString();
    writeMeta(dest, meta);
    return meta;
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

/** Install a plugin from npm registry */
export function installFromNpm(packageName: string): PluginMeta {
  ensureDir();
  const dest = path.join(PLUGINS_DIR, packageName.replace(/^@[^/]+\//, ''));
  fs.mkdirSync(dest, { recursive: true });

  // Init package.json if needed
  const pkgJson = path.join(dest, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    fs.writeFileSync(pkgJson, JSON.stringify({ private: true }, null, 2));
  }

  execFileSync('npm', ['install', packageName], { cwd: dest, stdio: 'pipe' });

  const meta: PluginMeta = {
    name: packageName.replace(/^@[^/]+\//, ''),
    version: '0.0.0',
    description: '',
    main: `node_modules/${packageName}/index.js`,
    enabled: true,
    installedAt: new Date().toISOString(),
  };
  writeMeta(dest, meta);
  return meta;
}

/** Uninstall a plugin */
export function uninstall(name: string): void {
  const dir = path.join(PLUGINS_DIR, name);
  if (!fs.existsSync(dir)) throw new Error(`Plugin '${name}' not found`);
  fs.rmSync(dir, { recursive: true });
}

/** Enable a plugin */
export function enable(name: string): void {
  setEnabled(name, true);
}

/** Disable a plugin */
export function disable(name: string): void {
  setEnabled(name, false);
}

/** List all installed plugins */
export function listPlugins(): PluginMeta[] {
  ensureDir();
  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => {
      try {
        return readMeta(path.join(PLUGINS_DIR, e.name));
      } catch {
        return null;
      }
    })
    .filter((m): m is PluginMeta => m !== null);
}

/** Get a single plugin's metadata */
export function getPlugin(name: string): PluginMeta | null {
  try {
    return readMeta(path.join(PLUGINS_DIR, name));
  } catch {
    return null;
  }
}

function setEnabled(name: string, enabled: boolean): void {
  const dir = path.join(PLUGINS_DIR, name);
  const meta = readMeta(dir);
  meta.enabled = enabled;
  writeMeta(dir, meta);
}

function readMeta(dir: string): PluginMeta {
  return JSON.parse(fs.readFileSync(path.join(dir, META_FILE), 'utf8'));
}

function writeMeta(dir: string, meta: PluginMeta): void {
  fs.writeFileSync(path.join(dir, META_FILE), JSON.stringify(meta, null, 2));
}
