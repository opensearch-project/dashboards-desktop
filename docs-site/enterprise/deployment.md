---
title: "Enterprise Deployment Guide"
head:
  - - meta
    - property: og:title
      content: "Enterprise Deployment Guide — OSD Desktop"
---

# Enterprise Deployment Guide

Deploy OSD Desktop across your organization.

---

## Deployment Options

| Method | Best For | Managed Updates |
|--------|----------|----------------|
| GitHub Releases (manual) | Small teams, evaluation | No |
| Homebrew cask (macOS) | Developer teams on macOS | `brew upgrade` |
| apt repository (Linux) | Server teams, CI environments | `apt upgrade` |
| MDM / SCCM push | Enterprise fleet (macOS/Windows) | Yes |
| Shared network drive | Air-gapped environments | Manual |

## Fleet Installation

### macOS (MDM)

1. Download the `.dmg` from GitHub Releases
2. Extract the `.app` bundle
3. Deploy via Jamf, Mosyle, or Munki
4. Pre-configure `~/.osd/config.yaml` via MDM profile

### Windows (SCCM / Intune)

1. Download the `.exe` installer (NSIS, silent install supported)
2. Silent install: `OSD-Desktop-Setup.exe /S`
3. Deploy via SCCM package or Intune Win32 app
4. Pre-configure via `%APPDATA%\OSD Desktop\config.yaml`

### Linux (apt)

```bash
# Add repository (when available)
sudo apt-get update
sudo apt-get install osd-desktop

# Or deploy .deb directly
sudo dpkg -i osd-desktop_0.5.0_amd64.deb
```

## Pre-Configuration

Deploy a `config.yaml` to pre-configure connections, models, and settings before first launch:

```yaml
# ~/.osd/config.yaml (macOS/Linux)
# %APPDATA%\OSD Desktop\config.yaml (Windows)

connections:
  - name: prod-opensearch
    url: https://search-prod.us-east-1.es.amazonaws.com
    type: opensearch
    auth: aws-sigv4
    region: us-east-1

  - name: staging-elastic
    url: https://staging.es.eu-west-1.aws.elastic.co:9243
    type: elasticsearch
    auth: apikey

models:
  default: ollama:llama3
  providers:
    ollama:
      endpoint: http://localhost:11434

settings:
  theme: system
  autorouting: false
  update_channel: stable
  telemetry: false
```

With pre-configuration, users skip the onboarding wizard and land directly on the homepage with connections ready.

## Update Management

### Channels

| Channel | Cadence | Use Case |
|---------|---------|----------|
| `stable` | Monthly | Production fleet |
| `beta` | Bi-weekly | Early adopters, QA team |
| `nightly` | Daily | Contributors, CI |

### Controlled Rollout

1. Deploy `beta` to a pilot group
2. Monitor for 1 week (crash rate, `osd doctor` reports)
3. Promote to `stable` for the full fleet
4. Keep previous version for rollback: `osd update --rollback`

### Air-Gapped Environments

1. Download the release artifact on a connected machine
2. Transfer to the air-gapped network
3. Install manually (`.dmg`, `.exe`, `.deb`)
4. Use local models only (Ollama) — no cloud API calls

## Compliance

### Data Residency

All data stays local:
- SQLite database: `~/.osd/osd.db`
- Credentials: OS keychain (never on disk)
- Conversations: local only (no sync)
- No telemetry unless explicitly opted in

### Audit

- All cluster operations are logged in conversation history
- `osd doctor` provides system health reports
- IPC channels are wrapped with error logging

### Network

OSD Desktop makes outbound connections to:
- Configured cluster endpoints (OpenSearch/Elasticsearch)
- Configured model providers (if using cloud models)
- MCP server processes (localhost only)
- GitHub (for update checks, if enabled)

With local models and update checks disabled, the app makes **zero outbound connections** beyond your clusters.

## Support

- **Self-diagnostics:** `osd doctor`
- **Logs:** `~/Library/Logs/OSD Desktop/` (macOS), `~/.config/OSD Desktop/logs/` (Linux), `%APPDATA%\OSD Desktop\logs\` (Windows)
- **Issues:** [GitHub Issues](https://github.com/opensearch-project/dashboards-desktop/issues)
