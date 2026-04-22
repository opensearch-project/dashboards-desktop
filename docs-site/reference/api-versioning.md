# IPC API Versioning

How IPC channels are versioned for plugin and extension developers.

---

## Versioning Strategy

OSD Desktop uses **semantic versioning** for its IPC API:

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| New channel added | Minor (0.x.0) | Adding `INDICES_FREEZE` |
| Channel params extended (backward-compatible) | Minor (0.x.0) | Adding optional `timeout` param |
| Channel removed or params changed (breaking) | Major (x.0.0) | Renaming `CONNECTION_ADD` → `DATASOURCE_ADD` |
| Bug fix in handler | Patch (0.0.x) | Fixing error message format |

## Stability Tiers

| Tier | Channels | Guarantee |
|------|----------|-----------|
| **Stable** | `CONNECTION_*`, `CONVERSATION_*`, `SETTINGS_*`, `AGENT_SEND`, `MODEL_*` | No breaking changes within a major version |
| **Beta** | `MCP_*`, `PLUGIN_*`, `SKILL_*`, `MULTI_AGENT_*` | May change in minor versions with deprecation notice |
| **Internal** | `STORAGE_INIT`, `CREDENTIALS_*` | No stability guarantee — do not depend on these |

## For Plugin Developers

### Checking API Version

```typescript
const version = await window.osd.invoke('API_VERSION');
// Returns: { major: 0, minor: 6, patch: 0 }
```

### Handling Missing Channels

Always handle the case where a channel doesn't exist (older app version):

```typescript
try {
  const result = await window.osd.invoke('NEW_CHANNEL', params);
} catch (err) {
  if (err.message.includes('No handler registered')) {
    // Channel not available in this version — use fallback
  }
}
```

### Deprecation Notices

When a channel is deprecated:
1. The old channel continues to work for one major version
2. A console warning is logged: `[DEPRECATED] Use NEW_CHANNEL instead of OLD_CHANNEL`
3. The old channel is removed in the next major version

## Changelog

Track IPC changes in [CHANGELOG.md](../../CHANGELOG.md). Breaking changes are always listed under `### Changed` or `### Removed`.
