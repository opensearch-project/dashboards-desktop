# Security Guide

## Credential Storage
All credentials encrypted via OS keychain (Electron `safeStorage`): macOS Keychain, Windows DPAPI, Linux libsecret. Never stored in plaintext.

## Network Security
- Signing proxy intercepts requests, adds SigV4/Basic/API Key headers
- `contextIsolation: true`, `nodeIntegration: false` — renderer cannot access Node.js
- CSP headers enforced

## Privacy
- No telemetry by default
- Fully offline with local models (Ollama)
- All data in local SQLite (`~/.osd/osd.db`)

## Sandboxing
- Plugins: `worker_threads` isolation
- MCP servers: child process isolation, SIGTERM/SIGKILL cleanup

## OAuth
- GitHub/Google PKCE flows via system browser
- Tokens in OS keychain, never on disk

## Updates
- Electron shell: `electron-updater` signing
- OSD bundles: GPG signature verification

## Reporting
Report security issues via [AWS vulnerability reporting](http://aws.amazon.com/security/vulnerability-reporting/). Do not create public GitHub issues.
