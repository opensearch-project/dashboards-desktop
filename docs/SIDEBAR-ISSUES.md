# Sidebar Feature Issues (v0.3)

Track implementation of each sidebar menu item. Each issue is independent and can be developed in parallel.

---

## Issue #1: Home — Navigate back to OSD home

**Priority:** P2  
**Assignee:** fee  
**Description:** Clicking the Home icon navigates the OSD BrowserView back to `/app/home` or the workspace landing page.  
**Acceptance Criteria:**
- Home icon click loads `http://localhost:5601/app/home`
- Active state indicator on icon
- Works in both managed and external OSD modes

---

## Issue #2: Management — OSD Configuration Editor

**Priority:** P1  
**Assignee:** fee + sde  
**Description:** Settings panel that lets users edit OSD configuration (opensearch_dashboards.yml) through a UI. Changes saved to SQLite, regenerated to yml, OSD restarted.  
**Acceptance Criteria:**
- Panel shows current config values from SQLite
- User can edit: server.port, opensearch.hosts, data_source settings, workspace settings
- Save triggers yml regeneration + OSD bounce
- Sensitive values masked in UI
- Validates input before saving

---

## Issue #3: Update OSD — Version Management

**Priority:** P1  
**Assignee:** sde + devops  
**Description:** Panel to manage OSD installation: re-download latest, switch to a specific version, point to local install, or switch to source-code mode.  
**Acceptance Criteria:**
- Shows current OSD version
- "Check for updates" fetches latest from GitHub API
- "Download update" with progress bar
- "Browse for local install" file picker
- "Use source checkout" option (points to OSD dev repo)
- After update: symlink node on macOS, write config, restart

---

## Issue #4: Plugins — Install/Remove/Configure

**Priority:** P1  
**Assignee:** fee + sde  
**Description:** Plugin management panel. List installed plugins, install from URL/name, remove, and link to plugin config pages in OSD.  
**Acceptance Criteria:**
- List installed plugins (via `opensearch-dashboards-plugin list`)
- Install plugin by URL or npm-style name
- Remove plugin with confirmation
- Progress indicator during install
- "Configure" button opens OSD's plugin settings page in the main view
- Tracks installed plugins in SQLite for upgrade persistence

---

## Issue #5: Bounce — Kill and Restart OSD

**Priority:** P0  
**Assignee:** sde  
**Description:** Button to kill the running OSD process and restart it. Useful after config changes or when OSD is unresponsive.  
**Acceptance Criteria:**
- Click triggers SIGTERM → wait 5s → SIGKILL if needed
- Shows "Restarting..." state
- Re-spawns OSD with current config
- Health check confirms OSD is back
- OSD BrowserView reloads after restart

---

## Issue #6: Backup/Restore — SQLite Data Management

**Priority:** P2  
**Assignee:** sde  
**Description:** Export and import the SQLite database (connections, settings, chat history, plugin list) as a JSON file.  
**Acceptance Criteria:**
- "Export" saves JSON to user-chosen location (file dialog)
- "Import" loads JSON, merges or replaces data
- Includes: connections, settings, conversations, pinned messages, plugin list
- Confirmation dialog before import (destructive)
- Validates JSON schema before import

---

## Issue #7: Recovery — Factory Reset

**Priority:** P2  
**Assignee:** sde  
**Description:** Reset all configuration and OSD to original state. Deletes SQLite, regenerates default yml, optionally re-downloads OSD.  
**Acceptance Criteria:**
- Confirmation dialog with warning
- Deletes `~/.osd/osd.db`
- Regenerates `opensearch_dashboards.yml` with defaults
- Option to also delete `~/.osd-desktop/osd/` (full re-download)
- Restarts app after reset

---

## Issue #8: Utilities — Local OpenSearch + S3 Credentials

**Priority:** P3  
**Assignee:** sde + devops  
**Description:** Helper utilities: spin up a local OpenSearch single-node cluster (Docker), configure S3 repository credentials for snapshots.  
**Acceptance Criteria:**
- "Create Local OpenSearch": runs `docker run opensearchproject/opensearch:latest` with single-node config
- Shows container status, logs, stop button
- "Setup S3 Credentials": form for access key, secret key, region → saves to OSD keystore or env
- Validates credentials before saving
