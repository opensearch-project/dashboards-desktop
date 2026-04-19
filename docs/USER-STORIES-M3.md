# User Stories — Milestone 3: Admin Tools

> Source: RFC-2026-DESKTOP-001 §3.6, §3.12, ROADMAP-2026.md
> Date: 2026-04-19
> Depends on: M1 (connections, SQLite, IPC), M2 (agent runtime, chat, tools)

---

## Personas

| Persona | Description | Primary M3 Stories |
|---------|-------------|--------------------|
| **Platform Engineer** | Manages OpenSearch + Elasticsearch clusters across environments. Daily admin tasks. | All admin stories, cross-cluster switching |
| **Security Engineer** | Configures roles, users, tenants. Audits access. | Security config, OAuth |
| **Data Engineer** | Manages indices, pipelines, lifecycle policies. | Index management, ILM, ingest pipelines |
| **Developer** | Wants GitHub login for app identity, occasional cluster admin. | OAuth login |

---

## US-M3-01: OpenSearch Cluster Health via GUI

**As a** platform engineer,
**I want** a dedicated admin panel showing OpenSearch cluster health, node stats, and shard allocation,
**so that** I can monitor cluster status without switching to a separate tool.

**Persona:** Platform Engineer

### Acceptance Criteria

**AC-01.1: Cluster overview panel**
- Given the user navigates to the Admin view for an OpenSearch connection
- When the panel loads
- Then it displays: cluster name, status (GREEN/YELLOW/RED), node count, index count, total shards, storage used/total

**AC-01.2: Node stats table**
- Given the cluster overview is displayed
- When the user expands the Nodes section
- Then a table shows per-node: name, role (data/master/coordinating), heap %, disk %, CPU %, load average

**AC-01.3: Shard allocation view**
- Given the user expands the Shards section
- When the view loads
- Then unassigned shards are highlighted with reason (e.g., "NODE_LEFT", "ALLOCATION_FAILED")
- And the user can click to see allocation explanation

**AC-01.4: Auto-refresh**
- Given the admin panel is open
- When 30 seconds elapse
- Then the health data refreshes automatically
- And a manual refresh button is also available

**AC-01.5: Offline cluster**
- Given the cluster is unreachable
- When the admin panel loads
- Then it shows: "Cluster unreachable" with last known status and timestamp

---

## US-M3-02: Index Management

**As a** data engineer,
**I want** to create, delete, reindex, and manage index aliases and mappings from the app,
**so that** I can perform routine index operations without writing curl commands.

**Persona:** Data Engineer (primary), Platform Engineer

### Acceptance Criteria

**AC-02.1: Index list**
- Given the user opens the Index Management view
- When the view loads
- Then all indices are listed with: name, health, doc count, store size, primary shards, replica count
- And the list is sortable and filterable

**AC-02.2: Create index**
- Given the user clicks "Create Index"
- When they fill in name, shard count, replica count, and optional mappings (JSON editor)
- Then the index is created on the cluster
- And a success confirmation shows with the index name

**AC-02.3: Delete index**
- Given the user selects an index and clicks "Delete"
- When the confirmation dialog appears ("Delete index 'logs-2026.03'? This cannot be undone.")
- Then on confirm, the index is deleted
- And the index list refreshes

**AC-02.4: Reindex**
- Given the user selects a source index
- When they click "Reindex" and specify a destination index name
- Then a reindex task is submitted
- And progress is shown (docs processed / total)

**AC-02.5: Manage aliases**
- Given the user views an index's details
- When they open the Aliases tab
- Then they can add, remove, and view aliases for that index

**AC-02.6: View/edit mappings**
- Given the user views an index's details
- When they open the Mappings tab
- Then the current mapping is displayed as formatted JSON
- And they can add new fields (but not modify existing ones — Elasticsearch/OpenSearch limitation)

---

## US-M3-03: Security Configuration (OpenSearch)

**As a** security engineer,
**I want** to manage OpenSearch Security roles, users, and tenants from the app,
**so that** I can configure access control without editing YAML files or using the REST API directly.

**Persona:** Security Engineer

### Acceptance Criteria

**AC-03.1: Roles list**
- Given the user opens Security > Roles
- When the view loads
- Then all roles are listed with: name, cluster permissions count, index permissions count
- And built-in roles are visually distinguished from custom roles

**AC-03.2: Create/edit role**
- Given the user clicks "Create Role" or edits an existing role
- When the role editor opens
- Then they can configure: cluster permissions, index permissions (index patterns + allowed actions), tenant permissions
- And changes are saved to the cluster's security configuration

**AC-03.3: Users list and management**
- Given the user opens Security > Users
- When the view loads
- Then internal users are listed with: username, backend roles, last login (if available)
- And the user can create, edit, and delete internal users

**AC-03.4: Tenant management**
- Given the user opens Security > Tenants
- When the view loads
- Then tenants are listed
- And the user can create and delete tenants

**AC-03.5: Security plugin not installed**
- Given the connected OpenSearch cluster does not have the Security plugin
- When the user navigates to Security
- Then a message shows: "Security plugin not detected on this cluster. Security management is not available."

---

## US-M3-04: Elasticsearch Admin

**As a** platform engineer managing Elasticsearch clusters,
**I want** to manage ILM policies, Watcher alerts, snapshots, and ingest pipelines,
**so that** I have parity with OpenSearch admin features for my Elastic clusters.

**Persona:** Platform Engineer, Data Engineer

### Acceptance Criteria

**AC-04.1: ILM policy management**
- Given the user is connected to an Elasticsearch cluster
- When they open Index Lifecycle Management
- Then all ILM policies are listed with: name, phases (hot/warm/cold/delete), index count
- And the user can create, edit, and delete policies

**AC-04.2: Watcher alerts**
- Given the user opens Alerting (Elasticsearch)
- When the view loads
- Then Watcher watches are listed with: name, status (active/inactive), last triggered
- And the user can create, activate, deactivate, and delete watches

**AC-04.3: Snapshot management**
- Given the user opens Snapshots
- When the view loads
- Then snapshot repositories are listed with their snapshots
- And the user can: register repositories, take snapshots, restore snapshots, delete snapshots

**AC-04.4: Ingest pipelines**
- Given the user opens Ingest Pipelines
- When the view loads
- Then all pipelines are listed with: name, processor count, description
- And the user can create, edit, test (simulate), and delete pipelines

**AC-04.5: Security (native realm)**
- Given the user is connected to an Elasticsearch cluster with security enabled
- When they open Security
- Then they can manage: native realm users, API keys, role mappings

**AC-04.6: Engine-aware UI**
- Given the user switches between OpenSearch and Elasticsearch connections
- When the admin panel loads
- Then the UI adapts: OpenSearch shows ISM/Security plugin features, Elasticsearch shows ILM/Watcher features
- And features not available on the current engine are hidden (not grayed out)

---

## US-M3-05: Cross-Cluster Context Switching

**As a** platform engineer managing multiple clusters,
**I want** to switch between clusters in the admin panel and in chat,
**so that** I can compare and manage environments without opening multiple windows.

**Persona:** Platform Engineer

### Acceptance Criteria

**AC-05.1: Connection switcher in admin panel**
- Given the user has multiple connections in the active workspace
- When they click the connection selector in the admin panel header
- Then a dropdown shows all connections with health status
- And selecting one switches the admin panel to that cluster

**AC-05.2: Switch via chat**
- Given the user is in a chat conversation
- When they say "Switch to staging-elastic"
- Then the agent switches the active connection
- And confirms: "Switched to staging-elastic (Elasticsearch 8.17)"
- And subsequent admin commands target the new connection

**AC-05.3: Cross-cluster comparison**
- Given the user asks "Compare index count between prod and staging"
- When the agent processes the request
- Then it queries both clusters and presents a comparison table

**AC-05.4: Connection not found**
- Given the user says "Switch to nonexistent-cluster"
- When the agent processes the request
- Then it responds: "No connection named 'nonexistent-cluster'. Available connections: prod-opensearch, staging-elastic"

---

## US-M3-06: GitHub & Google OAuth Login

**As a** developer,
**I want** to log in with my GitHub or Google account,
**so that** I have an app-level identity for future features like settings sync and plugin registry access.

**Persona:** Developer (GitHub), All (Google)

### Acceptance Criteria

**AC-06.1: Login options in settings**
- Given the user opens Settings > Account
- When the view loads
- Then they see: "Sign in with GitHub" and "Sign in with Google" buttons
- And if already signed in, their profile (name, avatar, email) is displayed

**AC-06.2: GitHub OAuth PKCE flow**
- Given the user clicks "Sign in with GitHub"
- When the OAuth flow starts
- Then a system browser window opens to GitHub's authorization page
- And after the user authorizes, the app receives the token via localhost redirect
- And the user's GitHub profile is displayed in the app

**AC-06.3: Google OAuth PKCE flow**
- Given the user clicks "Sign in with Google"
- When the OAuth flow starts
- Then a system browser window opens to Google's consent page
- And after the user authorizes, the app receives the token via localhost redirect

**AC-06.4: Token storage**
- Given the user completes OAuth login
- When the token is received
- Then it is stored in the OS keychain via Electron `safeStorage`
- And raw tokens are never written to SQLite or disk

**AC-06.5: Sign out**
- Given the user is signed in
- When they click "Sign Out"
- Then the token is removed from the keychain
- And the app returns to the signed-out state

**AC-06.6: OAuth is optional**
- Given the user has not signed in with OAuth
- When they use the app
- Then all local features work without restriction
- And OAuth is only required for future cloud features (sync, registry)

---

## Error Scenarios

### E-01: Admin Operations

| Trigger | Behavior |
|---------|----------|
| Delete index on read-only cluster | "Index 'logs' is read-only. Remove the read-only block first." |
| Create index with invalid name | "Invalid index name — names cannot contain uppercase letters, spaces, or special characters." |
| Reindex timeout | "Reindex task timed out. Check cluster load. Task ID: abc123 — monitor with `GET _tasks/abc123`." |
| Security API disabled | "Security plugin not detected. Security management requires the OpenSearch Security plugin." |

### E-02: OAuth

| Trigger | Behavior |
|---------|----------|
| User denies OAuth consent | App returns to signed-out state. No error — user chose not to sign in. |
| OAuth redirect fails (port conflict) | "Sign-in failed — could not start local callback server. Close other apps using port 8234 and retry." |
| Token expired | App silently refreshes using refresh token. If refresh fails: "Session expired — please sign in again." |
| Network error during OAuth | "Could not reach GitHub/Google. Check your internet connection." |

### E-03: Cross-Cluster

| Trigger | Behavior |
|---------|----------|
| Comparison with one cluster offline | "Could not reach staging-elastic for comparison. Showing prod-opensearch data only." |
| Admin action on wrong cluster | Confirmation dialog always shows cluster name: "Delete index 'logs' on **prod-opensearch**?" |

---

## Priority

| Story | Priority | Effort | Rationale |
|-------|----------|--------|-----------|
| US-M3-01 | P0 | M | Core admin value — cluster health is the most common admin task. |
| US-M3-02 | P0 | L | Index management is daily work for data engineers. |
| US-M3-05 | P0 | M | Multi-cluster is the key differentiator over single-cluster tools. |
| US-M3-03 | P1 | L | Security config is critical but only for OpenSearch Security users. |
| US-M3-04 | P1 | XL | Elasticsearch parity is important but large surface area. Can ship incrementally. |
| US-M3-06 | P1 | M | OAuth enables future features but no M3 feature depends on it. |

---

## Dependencies on M1/M2

| M3 Story | Requires |
|----------|----------|
| US-M3-01 | M1: connections, IPC bridge. M2: `cluster-health` tool. |
| US-M3-02 | M1: connections. M2: `index-manage` tool. |
| US-M3-03 | M1: connections (OpenSearch only). |
| US-M3-04 | M1: connections (Elasticsearch only). |
| US-M3-05 | M1: multi-connection workspaces. M2: agent context switching. |
| US-M3-06 | M1: Electron shell, safeStorage. |
