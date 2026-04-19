# User Stories — Milestone 4: Extensibility

> Source: RFC-2026-DESKTOP-001 §3.10, §3.11, §3.13, ROADMAP-2026.md
> Date: 2026-04-19
> Depends on: M1 (shell, SQLite), M2 (agent runtime, MCP host), M3 (admin tools)

---

## Personas

| Persona | Description | Primary M4 Stories |
|---------|-------------|--------------------|
| **Developer** | Builds and installs plugins, skills, CLI extensions. Wants a hackable platform. | All stories |
| **Platform Engineer** | Installs ops-focused plugins and agent personas. Manages updates across team. | Plugins, updates, diagnostics |
| **Power User** | Customizes everything — agents, skills, CLI. Wants stable/beta/nightly channels. | Skills, agents, updates, rollback |

---

## US-M4-01: Install and Manage Plugins

**As a** developer,
**I want** to install, update, and remove OSD plugins from a visual browser and CLI,
**so that** I can extend the app with dashboards, visualizations, and admin features.

**Persona:** Developer, Platform Engineer

### Acceptance Criteria

**AC-01.1: Visual plugin browser**
- Given the user opens Settings > Plugins
- When the plugin browser loads
- Then available plugins are shown as cards with: name, description, version, author, install button
- And installed plugins show an "Update" or "Remove" button instead

**AC-01.2: Install plugin (GUI)**
- Given the user clicks "Install" on a plugin card
- When the installation runs
- Then a progress indicator shows download and install steps
- And on completion, the plugin is active (or app prompts restart if required)

**AC-01.3: Install plugin (CLI)**
- Given the user runs `osd plugin install opensearch-security-dashboards`
- When the installation completes
- Then the plugin is downloaded, verified, and installed to `~/.osd/plugins/`
- And a success message shows the plugin name and version

**AC-01.4: Remove plugin**
- Given the user clicks "Remove" on an installed plugin (or runs `osd plugin remove <name>`)
- When the removal completes
- Then the plugin files are deleted
- And the plugin no longer appears in the installed list

**AC-01.5: Plugin sandboxing**
- Given a plugin is installed
- When it runs
- Then it executes in a `worker_threads` or `child_process` sandbox
- And it cannot access the main process, other plugins, or the filesystem outside its scope

**AC-01.6: Install from local file**
- Given the user runs `osd plugin install ./my-plugin.zip`
- When the file is valid
- Then the plugin is installed from the local archive

**AC-01.7: Plugin list (CLI)**
- Given the user runs `osd plugin list`
- When the output displays
- Then each plugin shows: name, version, status (active/disabled), source (registry/local)

---

## US-M4-02: Install and Manage Skills & Agent Personas

**As a** power user,
**I want** to install skill packages and pre-configured agent personas,
**so that** I can specialize the AI agent for my workflow (DBA, security analyst, ops).

**Persona:** Power User, Developer

### Acceptance Criteria

**AC-02.1: Install skill (CLI)**
- Given the user runs `osd skill install opensearch-dba`
- When the installation completes
- Then the skill package (TypeScript) is installed to `~/.osd/skills/`
- And the agent can use the skill's tools and prompts in conversations

**AC-02.2: List skills**
- Given the user runs `osd skill list`
- When the output displays
- Then each skill shows: name, version, description, tool count

**AC-02.3: Install agent persona**
- Given the user runs `osd agent install ops-agent`
- When the installation completes
- Then the persona is available in the agent switcher
- And it includes pre-configured: system prompt, default tools, preferred model

**AC-02.4: Switch agent persona**
- Given the user runs `osd agent switch ops-agent` or selects from the GUI
- When the switch completes
- Then the agent's behavior changes to match the persona
- And a confirmation shows: "Switched to ops-agent — optimized for cluster operations"

**AC-02.5: List agents**
- Given the user runs `osd agent list`
- When the output displays
- Then each persona shows: name, description, model preference, skill count

**AC-02.6: TypeScript skill format**
- Given a developer creates a custom skill
- When they package it
- Then the skill is a TypeScript package (not YAML) — testable, type-safe, composable
- And it exports tools, prompts, and configuration via a standard interface

---

## US-M4-03: CLI Extensions

**As a** developer,
**I want** to install additional `osd` subcommands,
**so that** I can extend the CLI with team-specific tools like benchmarking and migration.

**Persona:** Developer

### Acceptance Criteria

**AC-03.1: Install CLI extension**
- Given the user runs `osd cli install osd-benchmark`
- When the installation completes
- Then `osd benchmark` becomes a valid subcommand

**AC-03.2: Unified package system**
- Given plugins, skills, CLI extensions, and agents are all packages
- When the user installs any of them
- Then they use the same underlying package system (install, update, remove, list)

**AC-03.3: Extension discovery**
- Given the user runs `osd cli list`
- When the output displays
- Then installed CLI extensions are listed with: command name, version, description

**AC-03.4: Unknown subcommand**
- Given the user runs `osd nonexistent`
- When the command is not found
- Then the error shows: "Unknown command 'nonexistent'. Run `osd --help` for available commands."
- And if a similar extension exists in the registry: "Did you mean `osd benchmark`? Install with `osd cli install osd-benchmark`"

---

## US-M4-04: Auto-Update with Release Channels

**As a** platform engineer,
**I want** the app to update itself with signed releases across stable, beta, and nightly channels,
**so that** I can stay current without manual downloads.

**Persona:** Platform Engineer, Power User

### Acceptance Criteria

**AC-04.1: Check for updates**
- Given the user opens Settings > Updates (or runs `osd update --check`)
- When the check completes
- Then it shows: current version, latest version on the selected channel, and changelog summary

**AC-04.2: Update channels**
- Given the user selects a release channel
- When they choose from stable / beta / nightly
- Then future update checks use that channel
- And the current channel is shown in Settings

**AC-04.3: Download and install update**
- Given an update is available
- When the user clicks "Update Now" (or runs `osd update`)
- Then the update downloads with progress indicator
- And the app prompts to restart to apply

**AC-04.4: Signature verification**
- Given an update is downloaded
- When the app verifies it
- Then Electron shell updates are verified via `electron-updater` built-in signing
- And OSD bundle updates are verified via GPG detached signatures
- And if verification fails: "Update signature invalid — download may be corrupted. Retry?"

**AC-04.5: Semver compatibility**
- Given the Electron shell declares a compatible OSD version range
- When an OSD bundle update is available
- Then the update only applies if the bundle version is within the shell's compatible range
- And if incompatible: "OSD bundle v3.2 requires shell v2.x. Update the shell first."

**AC-04.6: Source build (contributor mode)**
- Given the user runs `osd update --from-source`
- When the build completes
- Then the app is rebuilt from the latest source on the specified branch/tag
- And this option is only shown in developer/contributor settings (not the default update UI)

---

## US-M4-05: Self-Diagnostics

**As a** platform engineer,
**I want** a diagnostic command that checks all subsystems,
**so that** I can quickly identify what's broken when the app misbehaves.

**Persona:** Platform Engineer, Developer

### Acceptance Criteria

**AC-05.1: osd doctor CLI**
- Given the user runs `osd doctor`
- When the checks complete
- Then each subsystem shows pass/fail: SQLite, MCP servers, connections, models, OAuth tokens
- And failed checks include a suggested fix

**AC-05.2: SQLite check**
- Given `osd doctor` runs the SQLite check
- When the database is healthy
- Then it shows: ✅ SQLite — osd.db (v1, 2.3 MB, WAL mode)
- And if corrupt: ❌ SQLite — database corrupt. Run `osd doctor --fix` to rebuild.

**AC-05.3: MCP server check**
- Given MCP servers are configured
- When `osd doctor` checks them
- Then each server shows: ✅ running / ❌ stopped / ⚠️ unhealthy (crashed 3x)

**AC-05.4: Connection check**
- Given connections are configured
- When `osd doctor` checks them
- Then each connection shows: ✅ healthy (OpenSearch 2.17) / ❌ unreachable / ⚠️ auth expired

**AC-05.5: Model check**
- Given models are configured
- When `osd doctor` checks them
- Then each model shows: ✅ reachable / ❌ unreachable (Ollama not running) / ⚠️ API key expired

**AC-05.6: Startup self-check**
- Given the app launches
- When startup completes
- Then a background health check runs for all subsystems
- And any failures show as a non-blocking notification banner

**AC-05.7: osd doctor --fix**
- Given `osd doctor` found fixable issues
- When the user runs `osd doctor --fix`
- Then auto-fixable issues are resolved (e.g., restart crashed MCP server, rebuild corrupt DB index)
- And unfixable issues show manual remediation steps

---

## US-M4-06: Rollback After Failed Update

**As a** platform engineer,
**I want** the app to detect a failed update and offer to roll back,
**so that** a bad release doesn't leave me with a broken tool.

**Persona:** Platform Engineer

### Acceptance Criteria

**AC-06.1: Previous version retained**
- Given the app updates to a new version
- When the update is applied
- Then the previous version is kept on disk (not deleted)

**AC-06.2: Crash-on-launch detection**
- Given the app crashes within 10 seconds of launching after an update
- When the user relaunches
- Then the app detects the crash pattern
- And offers: "The app crashed after updating to v2.1.0. Roll back to v2.0.0?"

**AC-06.3: Manual rollback**
- Given the user wants to revert
- When they run `osd update --rollback` or click "Roll Back" in the crash dialog
- Then the previous version is restored
- And the app restarts on the previous version

**AC-06.4: No previous version**
- Given this is a fresh install (no previous version exists)
- When a crash occurs
- Then the rollback option is not shown
- And the error directs to: "Run `osd doctor` to diagnose, or reinstall from https://..."

---

## Error Scenarios

### E-01: Plugin Errors

| Trigger | Behavior |
|---------|----------|
| Plugin install fails (network) | "Failed to download plugin. Check your internet connection." |
| Plugin incompatible with app version | "Plugin 'security-dashboards' v3.0 requires OSD Desktop v2.x. Current: v1.5." |
| Plugin crashes at runtime | Plugin is isolated in sandbox. App shows: "Plugin 'X' crashed. Disable or remove it in Settings > Plugins." |
| Malicious plugin attempt | Sandbox prevents filesystem/network access outside scope. Plugin is terminated. |

### E-02: Update Errors

| Trigger | Behavior |
|---------|----------|
| Update download interrupted | "Download interrupted. Resume?" (supports partial download resume) |
| Signature verification fails | "Update signature invalid. The download may be corrupted or tampered with. Retry from official source?" |
| Disk space insufficient | "Not enough disk space to install update. Need 500 MB, have 120 MB." |
| Source build fails | "Build failed. Check build output: `~/.osd/logs/build.log`" |

### E-03: Diagnostics

| Trigger | Behavior |
|---------|----------|
| All checks pass | "✅ All systems healthy. OSD Desktop v1.2.0" |
| Multiple failures | Failures listed first, passes last. Summary: "2 issues found. Run `osd doctor --fix` to auto-repair." |

---

## Priority

| Story | Priority | Effort | Rationale |
|-------|----------|--------|-----------|
| US-M4-01 | P0 | XL | Plugin ecosystem is the platform play. Must work for M4 to deliver value. |
| US-M4-04 | P0 | L | Auto-update is table stakes for a desktop app. Users won't manually update. |
| US-M4-06 | P0 | M | Rollback protects users from bad releases. Ships with update system. |
| US-M4-05 | P1 | M | Diagnostics reduce support burden. High value, moderate effort. |
| US-M4-02 | P1 | L | Skills/agents differentiate from generic chat apps. Can ship after plugins. |
| US-M4-03 | P2 | M | CLI extensions are a power-user feature. Lower priority than plugins/skills. |

---

## Dependencies on M1/M2/M3

| M4 Story | Requires |
|----------|----------|
| US-M4-01 | M1: Electron shell, `~/.osd/` directory. M2: agent runtime (for agent-aware plugins). |
| US-M4-02 | M2: agent runtime, tool registry. |
| US-M4-03 | M1: CLI entry point (`bin/osd.js`). |
| US-M4-04 | M1: Electron shell (`electron-updater`), code signing (M1 CI/CD). |
| US-M4-05 | M1: SQLite, connections. M2: MCP host, models. M3: OAuth. |
| US-M4-06 | US-M4-04 (update system). |
