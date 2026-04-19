# v0.3.0 — Desktop Management Sidebar

> RFC Addition | Date: 2026-04-19

## Overview

Slack-style left sidebar panel for desktop-specific management. This panel is **owned by the Electron shell**, not OSD — so settings persist across OSD upgrades/reinstalls.

## Requirements

### Sidebar Layout
- [ ] Fixed left panel (~240px, collapsible to icons)
- [ ] Always visible alongside OSD content area
- [ ] Sections: Connections, OSD Config, Plugins, Chat, Settings

### Connection Management
- [ ] List all configured data source connections
- [ ] Add/edit/delete connections
- [ ] Connection health indicators (green/yellow/red)
- [ ] Quick-switch active connection

### OSD Configuration
- [ ] Edit opensearch_dashboards.yml settings via UI
- [ ] Enable/disable plugins (data_source, alerting, etc.)
- [ ] Restart OSD with one click (after config changes)
- [ ] Show OSD status (running/stopped/restarting)
- [ ] View OSD logs (tail last N lines)

### Plugin Management
- [ ] List installed OSD plugins
- [ ] Install/remove plugins (runs bin/opensearch-dashboards-plugin)
- [ ] Auto-restart OSD after plugin install/remove
- [ ] Track installed plugins in SQLite (survives OSD upgrade)

### Persistent Settings (survives OSD upgrades)
- [ ] All sidebar settings stored in SQLite (~/.osd-desktop/osd.db)
- [ ] On OSD upgrade: re-apply config (yml generation), re-install plugins
- [ ] Settings include: enabled plugins, yml overrides, connection list, UI preferences
- [ ] Export/import settings (JSON backup)

### Chat Panel Access
- [ ] Chat icon in sidebar opens/closes the chat overlay
- [ ] Shows unread indicator if agent has pending response

### Settings
- [ ] Model provider configuration
- [ ] Theme preference (system/light/dark for sidebar only — OSD owns its own theme)
- [ ] Update channel (stable/beta)
- [ ] OSD binary path

## Architecture

```
┌─────────┬──────────────────────────────────┐
│ Sidebar │  OSD (localhost:5601)             │
│ (Electron│  loaded in BrowserWindow         │
│  native) │                                  │
│         │                          ┌───────┤
│ • Conns │                          │ Chat  │
│ • Config│                          │Overlay│
│ • Plugins                          │       │
│ • Chat  │                          │       │
│ • Settings                         │       │
└─────────┴──────────────────────────┴───────┘
```

Sidebar is a separate BrowserView (left) or native panel. OSD fills the remaining space. Chat overlay is on the right.

## Key Design Decision

**Settings are Electron-owned, not OSD-owned.** When OSD is upgraded:
1. Electron detects new OSD version
2. Regenerates opensearch_dashboards.yml from stored settings
3. Re-installs tracked plugins
4. Restarts OSD

User never loses their configuration.
