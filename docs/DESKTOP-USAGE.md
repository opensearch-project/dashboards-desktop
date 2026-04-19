# Desktop Usage Guide

How to use the OSD Desktop GUI — homepage, workspaces, connections, settings, and theming.

---

## Homepage

The homepage is your command center. It shows:

- **Workspace cards** — click to switch, "+ New" to create
- **Connection health** — 🟢 healthy, 🟡 yellow, 🔴 offline for each data source
- **Recent items** — last 5 conversations and queries with relative timestamps
- **Chat prompt** — Cmd+K to jump straight to chat

Health indicators refresh automatically on load. Click the refresh icon on any connection for an immediate re-check.

### Empty States

| State | What You See |
|-------|-------------|
| No workspaces | "Create your first workspace to get started" + CTA button |
| No connections | "No data sources connected" + "Add Connection" button |
| No recent items | "Start a conversation or run a query to see recent activity" |
| Connection offline | 🔴 with "Offline" label and "Troubleshoot" action |

---

## Workspaces

Workspaces group your connections, conversations, and settings by environment.

### Create a Workspace

1. Click "+ New" on the homepage workspace cards
2. Enter a name (e.g., "Production", "Staging", "Dev")
3. The new workspace becomes active

### Switch Workspaces

Click any workspace card on the homepage. Everything updates — connections, conversations, recent items.

### Delete a Workspace

Right-click a workspace card → Delete. Confirmation dialog warns that all connections and conversations in the workspace will be removed.

### Workspace Isolation

Each workspace is fully isolated:
- Connections are workspace-scoped
- Conversation history is workspace-scoped
- Agent memory is workspace-scoped
- Switching workspaces switches your entire context

---

## Connection Manager

### Add a Connection

1. Click "Add Connection" (homepage or Settings → Connections)
2. Fill in:
   - **Name** — a label for this connection (e.g., "prod-opensearch")
   - **Type** — OpenSearch or Elasticsearch
   - **URL** — cluster endpoint
   - **Auth** — None, Basic Auth, API Key, or AWS SigV4/SSO
3. Click **Test Connection** — verifies connectivity and shows cluster version
4. Click **Save** (only enabled after successful test)

### Auth Methods

| Method | Fields | Use Case |
|--------|--------|----------|
| None | — | Local dev clusters without auth |
| Basic Auth | Username, Password | Self-managed clusters |
| API Key | API Key | Elasticsearch Cloud |
| AWS SigV4/SSO | Region, Profile (optional) | AWS OpenSearch Service |

### Edit / Delete

- Click a connection card → Edit to modify
- Click a connection card → Delete to remove (with confirmation)

### Credentials

All credentials are encrypted via your OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service). Raw credentials are never stored in SQLite.

---

## Settings

Access via Cmd+, (macOS) or Ctrl+, (Windows/Linux), or the gear icon.

### Sections

| Section | What You Configure |
|---------|-------------------|
| **Connections** | Add, edit, delete, test data source connections |
| **Models** | Configure model providers, API keys, default model |
| **Account** | GitHub/Google OAuth login (optional) |
| **Plugins** | Install, remove, enable/disable plugins |
| **Skills** | Install, remove skills and agent personas |
| **MCP** | Configure MCP servers |
| **Updates** | Release channel (stable/beta/nightly), check for updates |
| **Appearance** | Theme (light/dark/system) |

---

## Theming

OSD Desktop supports three theme modes:

| Mode | Behavior |
|------|----------|
| **System** (default) | Follows your OS light/dark preference |
| **Light** | Always light theme |
| **Dark** | Always dark theme |

Change in Settings → Appearance, or via the theme toggle in the sidebar.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K / Ctrl+K | Open or focus chat panel |
| Cmd+Shift+Enter | Toggle fullscreen chat |
| Cmd+N / Ctrl+N | New conversation |
| Cmd+M / Ctrl+M | Command palette / model switcher |
| Cmd+, / Ctrl+, | Open settings |
| Escape | Close chat panel or dialog |

---

## Window Behavior

- **Minimum size** — enforced at 800×600
- **Chat panel** — resizable between 20% and 80% of window width, default ~40%
- **Panel collapse** — click close or press Escape to collapse chat, main content expands to full width
