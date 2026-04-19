# OSD Binary Bundling Strategy

## Distribution Analysis

| Platform | Format | Full Bundle | Min Bundle | Notes |
|----------|--------|-------------|------------|-------|
| Linux x64 | tar.gz | 445 MB | 208 MB | ✅ Available |
| Linux arm64 | tar.gz | ~445 MB | ~208 MB | ✅ Available |
| Windows x64 | zip | 509 MB | ❌ N/A | No min bundle |
| macOS x64 | — | ❌ N/A | ❌ N/A | **Not distributed** |
| macOS arm64 | — | ❌ N/A | ❌ N/A | **Not distributed** |

**Critical finding**: OpenSearch Dashboards has **no macOS distribution**. The project only ships Linux and Windows binaries.

OSD bundles its own Node.js runtime (v20 for 3.x, v22 for 3.5+).

## Recommended Strategy: Download-on-First-Run

### Why NOT embed

1. **Size**: Adding 200-500 MB to the Electron installer makes downloads unacceptable (current app is ~191 MB)
2. **macOS**: No OSD binary exists — embedding is impossible on macOS
3. **Updates**: OSD releases independently; embedded binaries go stale
4. **Platform matrix**: 6 Electron targets × OSD binary = 6 separate bundles to maintain

### Why NOT sidecar (always-bundled)

Same size/macOS problems as embedding, plus version coupling.

### Download-on-First-Run (Recommended)

```
First launch:
1. App detects no local OSD installation
2. Shows setup wizard: "Downloading OpenSearch Dashboards (~200 MB)..."
3. Downloads platform-appropriate OSD min bundle from artifacts.opensearch.org
4. Extracts to ~/.osd-desktop/osd/ (user-local, no admin required)
5. Configures opensearch_dashboards.yml for localhost-only binding
6. Starts OSD, loads BrowserWindow → localhost:5601

Subsequent launches:
1. App checks ~/.osd-desktop/osd/ exists
2. Spawns OSD process
3. Waits for health check (GET localhost:5601/api/status)
4. Loads BrowserWindow
```

### macOS Solution

Since OSD has no macOS binary, we have two options:

**Option A (Recommended): Build OSD from source for macOS**
- OSD is a Node.js app — it runs on any platform with Node.js
- Clone opensearch-dashboards repo, `yarn osd bootstrap`, bundle the output
- Ship as a platform-specific "OSD for Desktop" artifact we build ourselves
- ~200 MB after stripping dev deps

**Option B: Use Docker on macOS**
- Require Docker Desktop on macOS
- Run OSD in a container, expose localhost:5601
- Worse UX (Docker dependency), but zero build effort

**Recommendation**: Option A. OSD is just Node.js — we can build it for any platform.

## Architecture

```
~/.osd-desktop/
├── osd/                          # OSD installation
│   ├── bin/opensearch-dashboards # Entry point
│   ├── config/
│   │   └── opensearch_dashboards.yml  # Our managed config
│   ├── node/                     # Bundled Node.js
│   └── src/                      # OSD source
├── data/                         # OSD runtime data
└── config.json                   # Desktop app config (version, channel)
```

## OSD Lifecycle Management

### Spawn

```typescript
// src/core/osd/manager.ts
const osdProcess = spawn(
  path.join(osdDir, 'bin', 'opensearch-dashboards'),
  ['--config', configPath],
  {
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false  // dies with parent
  }
);
```

### Health Check

```typescript
async function waitForOsd(port = 5601, timeout = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/api/status`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('OSD failed to start within timeout');
}
```

### Shutdown

```typescript
function shutdownOsd(proc: ChildProcess): void {
  proc.kill('SIGTERM');
  setTimeout(() => {
    if (!proc.killed) proc.kill('SIGKILL');
  }, 5000);
}

// Register on app quit
app.on('before-quit', () => shutdownOsd(osdProcess));
```

### Config Generation

```yaml
# Generated opensearch_dashboards.yml
server.host: "127.0.0.1"
server.port: 5601
server.basePath: ""
opensearch.hosts: []  # Managed by desktop app connection manager
opensearch.ssl.verificationMode: none
logging.dest: ~/.osd-desktop/logs/osd.log
pid.file: ~/.osd-desktop/osd.pid
```

The desktop app's connection manager injects the active cluster URL into OSD config and restarts OSD when switching clusters.

## electron-builder.yml Changes

No OSD binary in the package. Instead, add the downloader/manager:

```yaml
extraResources:
  - from: "assets/osd-setup"
    to: "osd-setup"
    filter: ["**/*"]
```

The `osd-setup/` directory contains:
- `manifest.json` — OSD version, download URLs per platform, SHA-256 checksums
- `setup.js` — download + extract logic (runs on first launch)

## Download Manifest

```json
{
  "version": "3.6.0",
  "artifacts": {
    "linux-x64": {
      "url": "https://artifacts.opensearch.org/releases/core/opensearch-dashboards/3.6.0/opensearch-dashboards-min-3.6.0-linux-x64.tar.gz",
      "sha256": "<hash>",
      "size": 217769295
    },
    "linux-arm64": {
      "url": "https://artifacts.opensearch.org/releases/core/opensearch-dashboards/3.6.0/opensearch-dashboards-min-3.6.0-linux-arm64.tar.gz",
      "sha256": "<hash>",
      "size": 0
    },
    "win32-x64": {
      "url": "https://artifacts.opensearch.org/releases/bundle/opensearch-dashboards/3.6.0/opensearch-dashboards-3.6.0-windows-x64.zip",
      "sha256": "<hash>",
      "size": 533712897
    },
    "darwin-x64": {
      "type": "build-from-source",
      "repo": "https://github.com/opensearch-project/OpenSearch-Dashboards",
      "tag": "3.6.0"
    },
    "darwin-arm64": {
      "type": "build-from-source",
      "repo": "https://github.com/opensearch-project/OpenSearch-Dashboards",
      "tag": "3.6.0"
    }
  }
}
```

## App Size Impact

| Component | Size |
|-----------|------|
| Electron app (current) | ~191 MB |
| OSD download (first run) | ~208 MB (Linux min) / ~509 MB (Windows full) |
| Total on disk | ~400-700 MB |
| **Installer download** | **~191 MB (unchanged)** |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| macOS has no OSD binary | Build from source in CI, host our own artifact |
| Download fails on first run | Retry with exponential backoff, show progress, allow manual path |
| OSD version incompatibility | Pin version in manifest, test in CI |
| Port 5601 conflict | Configurable port, auto-detect available port |
| OSD crashes | Auto-restart (max 3 attempts), show error UI |
| Disk space insufficient | Check before download, show clear error |
| Windows full bundle is 509 MB | Accept for now; future: strip unused plugins |

## Next Steps

1. **sde**: Implement `src/core/osd/manager.ts` (spawn, health, shutdown)
2. **devops**: Build macOS OSD artifact in CI (separate workflow)
3. **devops**: Create download manifest + first-run setup logic
4. **fee**: First-run setup wizard UI (progress bar, error states)
