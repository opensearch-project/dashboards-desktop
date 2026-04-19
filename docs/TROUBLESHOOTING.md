# Troubleshooting Guide

Diagnose and fix common issues with OSD Desktop.

---

## Quick Diagnosis

Run the built-in health check first:

```bash
osd doctor
```

```
🩺 osd doctor — checking subsystems...

  🟢 Data directory: ~/.osd
  🟢 SQLite database: osd.db (v3, 142 KB, WAL mode)
  🟢 Ollama: 3 model(s) available
  🟢 OpenAI API key: configured
  🔴 Connection: prod-opensearch — unreachable
     → Fix: Check URL and network connectivity
  🟢 MCP: server-filesystem (running, 3 tools)

6 checks: 5 passed, 1 failure
```

For auto-fixable issues:

```bash
osd doctor --fix
```

---

## Connection Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| 🔴 Connection refused | Cluster not running or wrong URL | Verify URL, check cluster is running |
| 🔴 Authentication failed (401) | Wrong credentials | Check username/password or API key in Settings → Connections |
| 🔴 SSL certificate error | Self-signed cert | Configure CA certificate or disable TLS verification for dev |
| 🔴 Connection timed out | Firewall, network, or overloaded cluster | Check network, try from another machine, check cluster load |
| 🔴 AWS SigV4 — no credentials | AWS credentials not configured | Run `aws sso login` or configure `~/.aws/credentials` |
| 🔴 AWS SSO expired | SSO session timed out | Run `aws sso login --profile <your-profile>` |

### Test a Connection

```bash
# From CLI
osd connect test prod-opensearch

# From GUI
Settings → Connections → click test icon on any connection
```

---

## Model Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| "Could not reach ollama:llama3" | Ollama not running | Run `ollama serve` |
| "Model not found" | Model not pulled | Run `ollama pull llama3` |
| "Authentication failed" (OpenAI/Anthropic) | Invalid API key | Check key in Settings → Models |
| "Access denied" (Bedrock) | IAM permissions | Verify IAM role has `bedrock:InvokeModel` permission |
| Empty response | Model issue or prompt too vague | Rephrase, or switch to a different model |
| Rate limited | Too many requests | Auto-retries with backoff. Wait or switch to local model. |

### Check Model Availability

```bash
# Ollama
ollama list                    # Shows installed models
ollama serve                   # Start Ollama if not running

# Verify via osd
osd doctor                     # Checks all model providers
```

---

## MCP Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Server won't start | Port conflict or missing dependency | Check `osd mcp list` for error, check port availability |
| Server crashes repeatedly | Bug in server or config issue | Check logs, run `osd mcp restart <name>`, review config |
| Tools not appearing | Server not running or discovery failed | Run `osd mcp list` to verify status, restart server |
| Install fails | Network issue | Check internet connection, try `npm install` manually |

### MCP Server Logs

```bash
osd mcp list                   # Shows status: running/stopped/unhealthy
osd mcp restart <server>       # Restart a specific server
```

After 3 consecutive crashes, a server is marked unhealthy and stops auto-restarting.

---

## Database Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| App won't start — "Cannot create data directory" | `~/.osd/` not writable | Check permissions: `chmod 755 ~/.osd` |
| "Database appears corrupt" | SQLite corruption (rare) | App offers to create new DB (old file backed up) |
| "Failed to migrate database" | Schema migration error | Report as bug with version info from error message |

### Manual Database Backup

```bash
# Safe even while app is running (WAL mode)
sqlite3 ~/.osd/osd.db ".backup ~/.osd/osd-backup.db"
```

### Reset Database

```bash
# Stop the app first
mv ~/.osd/osd.db ~/.osd/osd.db.bak
# Relaunch — app creates a fresh database and shows onboarding
```

---

## Build Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `npm ci` fails | Node version mismatch | Use Node 20 LTS: `nvm install 20` |
| `better-sqlite3` build error | Native module rebuild needed | Run `npx electron-rebuild -f -w better-sqlite3` |
| `tsc` errors | TypeScript compilation issue | Run `npx tsc --noEmit` to see errors, check `tsconfig.json` |
| Electron won't launch | Missing display server (headless) | Use `xvfb-run` on Linux, or test via CLI: `osd chat` |

---

## App Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| App crashes on launch after update | Bad update | Relaunch — app detects crash pattern and offers rollback |
| Chat panel won't open | Keyboard shortcut conflict | Try clicking the chat icon instead of Cmd+K |
| Blank screen on launch | Renderer crash | Check DevTools (Cmd+Shift+I), look for console errors |
| High memory usage | Many conversations or large query results | Restart app, or delete old conversations |

### Manual Rollback

```bash
osd update --rollback          # Restore previous version
```

---

## Log Locations

| Platform | Path |
|----------|------|
| macOS | `~/Library/Logs/OSD Desktop/` |
| Linux | `~/.config/OSD Desktop/logs/` |
| Windows | `%APPDATA%\OSD Desktop\logs\` |

---

## Still Stuck?

1. Run `osd doctor` and share the output
2. Check [GitHub Issues](https://github.com/opensearch-project/dashboards-desktop/issues) for known problems
3. File a new issue with: steps to reproduce, `osd --version`, OS, and `osd doctor` output
