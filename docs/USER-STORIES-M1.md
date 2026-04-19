# User Stories — Milestone 1: Foundation

> Source: RFC-2026-DESKTOP-001, ROADMAP-2026.md
> Date: 2026-04-19

---

## Personas

| Persona | Description | Primary M1 Stories |
|---------|-------------|--------------------|
| **Developer** | Uses local AI + MCP for daily coding workflows. Wants fast setup, keyboard shortcuts, local-first. | First launch, chat panel, Cmd+K |
| **Data Analyst** | Connects to OpenSearch/Elasticsearch to explore data. Non-expert at cluster admin. | Add connection, homepage health, workspaces |
| **Platform Engineer** | Manages multiple clusters across environments. Needs multi-connection, multi-workspace. | Workspaces, connections, test connection, SigV4 auth |

---

## US-M1-01: First Launch & Onboarding

**As a** new user launching OSD Desktop for the first time,
**I want** a guided onboarding wizard that walks me through initial setup,
**so that** I can start using the app without reading documentation.

**Persona:** All

### Acceptance Criteria

**AC-01.1: Onboarding triggers on first launch**
- Given the app has never been launched (`~/.osd/osd.db` does not exist)
- When the user opens OSD Desktop
- Then the app auto-initializes the database and shows the onboarding wizard (not the homepage)

**AC-01.2: Step 1 — Model selection**
- Given the onboarding wizard is displayed
- When the user reaches the model step
- Then they see options: Ollama (local), OpenAI, Anthropic, Bedrock, "Skip for now"
- And selecting "Skip for now" proceeds without configuring a model

**AC-01.3: Step 2 — Add a connection (optional)**
- Given the user completed or skipped model selection
- When they reach the connection step
- Then they can add an OpenSearch or Elasticsearch connection, or skip
- And the connection type selector shows both OpenSearch and Elasticsearch

**AC-01.4: Step 3 — Create first workspace**
- Given the user completed or skipped the connection step
- When they reach the workspace step
- Then a default workspace named "Default" is pre-filled
- And the user can rename it or accept the default

**AC-01.5: Onboarding completion**
- Given the user finishes all steps (or skips them)
- When they click "Get Started"
- Then the onboarding wizard closes and the homepage is displayed
- And the onboarding wizard never shows again on subsequent launches

**AC-01.6: Guided prompt suggestions**
- Given the user completed onboarding with at least one connection
- When the homepage loads for the first time
- Then the chat prompt area shows 3-4 suggested starter prompts (e.g., "Check cluster health", "Show my indices")

### First-Run Experience Flow

```
App Launch
  │
  ├─ ~/.osd/osd.db exists? ──YES──→ Homepage
  │
  NO
  │
  ▼
Auto-init database (SQLite, WAL mode, schema v1)
  │
  ▼
┌─────────────────────────────────┐
│  Step 1: Choose a Model         │
│                                 │
│  ○ Ollama (local, private)      │
│  ○ OpenAI                       │
│  ○ Anthropic                    │
│  ○ Amazon Bedrock               │
│  ○ Skip for now                 │
│                                 │
│              [Next →]           │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  Step 2: Connect a Data Source  │
│                                 │
│  [+ Add OpenSearch Connection]  │
│  [+ Add Elasticsearch Conn.]   │
│  [Skip — I'll add one later]   │
│                                 │
│         [← Back] [Next →]      │
└─────────────────────────────────┘
  │
  ├─ User adds connection ──→ Connection dialog (see US-M1-03)
  │                            │
  │                            ▼
  │                          Test connection
  │                            │
  │                     ┌──────┴──────┐
  │                  SUCCESS        FAIL
  │                     │             │
  │                     ▼             ▼
  │                  Save         Show error,
  │                  & Next       offer retry
  │
  ├─ User skips
  │
  ▼
┌─────────────────────────────────┐
│  Step 3: Create a Workspace     │
│                                 │
│  Name: [Default_____________]   │
│                                 │
│  Workspaces group your          │
│  connections and conversations.  │
│                                 │
│      [← Back] [Get Started →]  │
└─────────────────────────────────┘
  │
  ▼
Homepage (with starter prompts if connection exists)
```

---

## US-M1-02: Homepage & Connection Health

**As a** user returning to OSD Desktop,
**I want** a homepage that shows my workspaces, connection health, and recent activity,
**so that** I can quickly assess the state of my clusters and resume work.

**Persona:** All (Platform Engineer primary)

### Acceptance Criteria

**AC-02.1: Homepage is the default view**
- Given the user has completed onboarding
- When they launch OSD Desktop
- Then the homepage is displayed as the default view

**AC-02.2: Workspace cards**
- Given the user has one or more workspaces
- When the homepage loads
- Then each workspace is shown as a card with its name and connection count
- And a "+ New" card is always visible to create a new workspace

**AC-02.3: Connection health indicators**
- Given the active workspace has connections
- When the homepage loads
- Then each connection shows a health indicator: 🟢 healthy, 🟡 yellow, 🔴 offline/red
- And health is determined by a background cluster health check on load

**AC-02.4: Recent items**
- Given the user has previous activity
- When the homepage loads
- Then the most recent 5 items are shown with relative timestamps ("2 hours ago")

**AC-02.5: Empty state — no workspaces**
- Given the user has deleted all workspaces
- When the homepage loads
- Then a friendly empty state is shown: "Create your first workspace to get started" with a CTA button

**AC-02.6: Empty state — no connections**
- Given the active workspace has no connections
- When the homepage loads
- Then the connections section shows: "No data sources connected" with an "Add Connection" button

**AC-02.7: Offline connection handling**
- Given a connection was previously healthy but the cluster is now unreachable
- When the homepage loads
- Then that connection shows 🔴 with "Offline" label and a "Troubleshoot" action

---

## US-M1-03: Add a Data Source Connection

**As a** platform engineer,
**I want** to add OpenSearch and Elasticsearch connections with various auth methods,
**so that** I can manage multiple clusters from one application.

**Persona:** Platform Engineer (primary), Data Analyst

### Acceptance Criteria

**AC-03.1: Connection dialog**
- Given the user clicks "Add Connection" (from homepage, connection manager, or onboarding)
- When the dialog opens
- Then they see fields: Name, URL, Type (OpenSearch / Elasticsearch), Auth method

**AC-03.2: Auth methods**
- Given the user is adding a connection
- When they select an auth method
- Then the available options are: None, Basic Auth, API Key, AWS SigV4/SSO
- And the form fields update to match the selected auth type

**AC-03.3: Basic auth fields**
- Given the user selects "Basic Auth"
- When the form updates
- Then Username and Password fields are shown
- And the password field is masked

**AC-03.4: API key field**
- Given the user selects "API Key"
- When the form updates
- Then a single API Key field is shown (masked)

**AC-03.5: AWS SigV4 fields**
- Given the user selects "AWS SigV4/SSO"
- When the form updates
- Then Region and optional Profile fields are shown
- And the app uses the AWS credential chain (env vars, ~/.aws/credentials, SSO)

**AC-03.6: Test before save**
- Given the user has filled in connection details
- When they click "Test Connection"
- Then the app attempts to connect and shows: ✅ "Connected — OpenSearch 2.17" or ❌ error message
- And the Save button is only enabled after a successful test

**AC-03.7: Credential encryption**
- Given the user saves a connection with credentials
- When the connection is persisted
- Then credentials are encrypted via Electron `safeStorage` (OS keychain)
- And raw credentials are never stored in SQLite

**AC-03.8: Both client libraries**
- Given the user adds an OpenSearch connection
- When the app connects
- Then it uses `@opensearch-project/opensearch` client
- And for Elasticsearch connections, it uses `@elastic/elasticsearch` client

---

## US-M1-04: Test a Connection

**As a** platform engineer,
**I want** to test a connection before and after saving it,
**so that** I can verify connectivity and diagnose issues without guessing.

**Persona:** Platform Engineer

### Acceptance Criteria

**AC-04.1: Test from connection dialog (pre-save)**
- Given the user is in the Add/Edit Connection dialog
- When they click "Test Connection"
- Then a spinner shows while testing
- And the result displays within 10 seconds (or timeout error)

**AC-04.2: Test from connection list (post-save)**
- Given the user has saved connections
- When they click the test/refresh icon on a connection card
- Then the connection is re-tested and the health indicator updates

**AC-04.3: Success result**
- Given the connection test succeeds
- When the result is displayed
- Then it shows: cluster name, version, and engine type (OpenSearch/Elasticsearch)

**AC-04.4: Failure — unreachable**
- Given the cluster URL is unreachable
- When the test completes
- Then the error shows: "Connection refused — check that the cluster is running and the URL is correct"

**AC-04.5: Failure — auth rejected**
- Given the credentials are invalid
- When the test completes
- Then the error shows: "Authentication failed (401) — check your credentials"

**AC-04.6: Failure — SSL/TLS error**
- Given the cluster uses self-signed certificates
- When the test completes
- Then the error shows: "SSL certificate error — the cluster may use a self-signed certificate" with guidance

**AC-04.7: Failure — timeout**
- Given the cluster does not respond within 10 seconds
- When the test completes
- Then the error shows: "Connection timed out — the cluster may be under heavy load or unreachable"

---

## US-M1-05: Create and Switch Workspaces

**As a** platform engineer managing multiple environments,
**I want** to create separate workspaces for prod, staging, and dev,
**so that** each environment has its own connections and conversation history.

**Persona:** Platform Engineer (primary), Developer

### Acceptance Criteria

**AC-05.1: Create workspace**
- Given the user clicks "+ New" on the homepage workspace cards
- When they enter a workspace name and confirm
- Then a new empty workspace is created and becomes the active workspace

**AC-05.2: Switch workspace**
- Given the user has multiple workspaces
- When they click a workspace card on the homepage
- Then the active workspace switches
- And the connections list, conversation history, and recent items update to reflect the new workspace

**AC-05.3: Delete workspace**
- Given the user wants to remove a workspace
- When they select delete from the workspace context menu
- Then a confirmation dialog appears: "Delete workspace 'Prod'? This will remove all connections and conversations in this workspace."
- And on confirm, the workspace and all its data are deleted
- And the app switches to another workspace (or shows empty state if none remain)

**AC-05.4: Workspace isolation**
- Given the user has workspaces "Prod" and "Dev"
- When they are in "Prod"
- Then they only see Prod's connections and conversations
- And Dev's data is not visible or accessible

**AC-05.5: At least one workspace**
- Given the user deletes their last workspace
- When the deletion completes
- Then the app shows the empty state with "Create a workspace to get started"

---

## US-M1-06: Chat Panel Shell

**As a** developer,
**I want** a chat panel I can open with a keyboard shortcut,
**so that** I have quick access to the AI assistant from anywhere in the app.

**Persona:** Developer (primary), All

> ⚠️ **M1 Scope:** The chat panel is a UI shell only. No agent runtime, no model integration, no message handling. The panel renders layout and placeholder state. Agent functionality ships in M2.

### Acceptance Criteria

**AC-06.1: Resizable side panel**
- Given the chat panel is open
- When the user drags the panel edge
- Then the panel resizes between 20% and 80% of the window width
- And the default width is ~40%

**AC-06.2: Cmd+K to open/focus**
- Given the user is anywhere in the app
- When they press Cmd+K (macOS) or Ctrl+K (Windows/Linux)
- Then the chat panel opens (if closed) or focuses the input (if open)

**AC-06.3: Cmd+Shift+Enter for fullscreen**
- Given the chat panel is open
- When the user presses Cmd+Shift+Enter
- Then the chat panel expands to fullscreen mode
- And pressing the shortcut again returns to side panel mode

**AC-06.4: Conversation history sidebar**
- Given the chat panel is open
- When the user views the sidebar
- Then previous conversations are listed (workspace-scoped), searchable by title
- And in M1, this list is empty with placeholder text

**AC-06.5: Placeholder state (M1)**
- Given the chat panel is open in M1
- When the user views the chat area
- Then the input is disabled
- And a placeholder message reads: "Agent runtime available in M2 — connect a model to start chatting"

**AC-06.6: Panel collapse**
- Given the chat panel is open
- When the user clicks the close button or presses Escape
- Then the panel collapses and the main content area expands to full width

---

## Error Scenarios

### E-01: No Internet / Cluster Unreachable

| Trigger | Behavior |
|---------|----------|
| App launch with no internet | Homepage loads from local SQLite. Connections show 🔴 offline. No crash. |
| Add connection with unreachable URL | Test fails with "Connection refused" error. Save button stays disabled. |
| Previously healthy connection goes offline | Homepage health check updates to 🔴. "Troubleshoot" action offered. |
| All connections offline | Homepage shows all connections as 🔴. App remains fully functional for local operations. |

### E-02: Invalid Credentials

| Trigger | Behavior |
|---------|----------|
| Wrong username/password | Test returns "Authentication failed (401)". User can edit and retry. |
| Expired API key | Test returns "Authentication failed (401)". Error suggests regenerating the key. |
| AWS SigV4 with no credentials configured | Test returns "No AWS credentials found — configure ~/.aws/credentials or set environment variables". |
| AWS SSO session expired | Test returns "SSO session expired — run `aws sso login` to refresh". |

### E-03: Database Errors

| Trigger | Behavior |
|---------|----------|
| `~/.osd/` directory not writable | App shows fatal error on launch: "Cannot create data directory. Check permissions on ~/.osd/" |
| Corrupt SQLite database | App detects corruption, offers: "Database appears corrupt. Create a new database? (old file backed up)" |
| Schema migration failure | App shows error with version info: "Failed to migrate database from v1 to v2. Please report this issue." |

### E-04: Window / UI Edge Cases

| Trigger | Behavior |
|---------|----------|
| Window resized below minimum | Minimum window size enforced (e.g., 800×600). Panels collapse gracefully. |
| Chat panel dragged to extreme width | Panel width clamped between 20% and 80%. |
| Rapid workspace switching | Debounced — only the final workspace switch takes effect. |

---

## Story Map

```
                    First Launch          Daily Use              Admin
                    ───────────          ─────────              ─────
Developer           US-M1-01             US-M1-06 (Cmd+K)      —
                    (onboarding)         US-M1-02 (homepage)

Data Analyst        US-M1-01             US-M1-02 (health)     US-M1-03 (add conn)
                    (onboarding)         US-M1-06 (chat)       US-M1-04 (test conn)

Platform Engineer   US-M1-01             US-M1-02 (health)     US-M1-03 (add conn)
                    (onboarding)         US-M1-05 (workspaces) US-M1-04 (test conn)
                                                               US-M1-05 (workspaces)
```

---

## Priority

| Story | Priority | Effort | Rationale |
|-------|----------|--------|-----------|
| US-M1-01 | P0 | L | First impression. Broken onboarding = abandoned app. |
| US-M1-02 | P0 | M | Homepage is the daily landing page. Must work. |
| US-M1-03 | P0 | M | No connections = no value. Core functionality. |
| US-M1-04 | P0 | S | Test-before-save prevents frustration. Cheap to build. |
| US-M1-05 | P1 | M | Multi-workspace is key for platform engineers. Can ship with single workspace initially. |
| US-M1-06 | P1 | M | UI shell only in M1. Layout + shortcuts, no agent logic. |
