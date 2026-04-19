# User Stories — Milestone 5: Polish & Launch

> Source: RFC-2026-DESKTOP-001, ROADMAP-2026.md
> Date: 2026-04-19
> Depends on: M1-M4 (all prior milestones)

---

## Personas

| Persona | Description | Primary M5 Stories |
|---------|-------------|--------------------|
| **Developer** | Daily user who wants advanced chat features and TUI mode. | TUI, branching, model auto-routing |
| **New User** | First-time user discovering OSD Desktop. Needs clear docs and smooth onboarding. | Docs, getting-started guide, public beta |
| **Power User** | Heavy user who wants keyboard-driven workflows and conversation management. | Branching, pinning, Cmd+M, TUI |
| **Maintainer** | OSS contributor who needs up-to-date project docs. | MAINTAINERS.md, CONTRIBUTING.md |

---

## US-M5-01: TUI Mode

**As a** developer working in a terminal,
**I want** to chat with the agent from the command line without launching the GUI,
**so that** I can use OSD Desktop in SSH sessions, tmux panes, and headless environments.

**Persona:** Developer, Power User

### Acceptance Criteria

**AC-01.1: Readline CLI**
- Given the user runs `osd chat`
- When the CLI starts
- Then a readline-based chat prompt appears
- And the user can type messages and receive streaming responses in the terminal

**AC-01.2: Model flag**
- Given the user runs `osd chat --model ollama:llama3`
- When the session starts
- Then the specified model is used for the conversation

**AC-01.3: Conversation persistence**
- Given the user has a TUI chat session
- When they exit and relaunch `osd chat`
- Then they can resume the previous conversation or start a new one

**AC-01.4: Tool output in terminal**
- Given the agent invokes a tool (e.g., `opensearch-query`)
- When results are returned
- Then they render as formatted text/tables in the terminal (not HTML)

**AC-01.5: Full Ink TUI (if demand warrants)**
- Given the user runs `osd --tui`
- When the TUI launches
- Then a full Ink-based interface shows: chat pane + results pane (split view)
- And keyboard navigation works throughout

**AC-01.6: No GUI dependency**
- Given the user is in a headless environment (no display server)
- When they run `osd chat`
- Then the CLI works without Electron or any GUI dependency

---

## US-M5-02: Conversation Branching

**As a** power user,
**I want** to fork a conversation from any message to explore alternative approaches,
**so that** I can try different prompts without losing my original conversation thread.

**Persona:** Power User, Developer

### Acceptance Criteria

**AC-02.1: Fork from any message**
- Given the user is viewing a conversation
- When they right-click (or use a keyboard shortcut) on any message
- Then they see "Branch from here" option
- And selecting it creates a new conversation starting from that message

**AC-02.2: Branch indicator**
- Given a conversation was branched
- When the user views the conversation list
- Then branched conversations show a branch icon and reference the parent conversation

**AC-02.3: Navigate between branches**
- Given a conversation has branches
- When the user views the original conversation
- Then branch points are visually marked
- And clicking a branch point shows the available branches

**AC-02.4: Independent history**
- Given a branched conversation exists
- When the user sends messages in the branch
- Then the original conversation is not modified
- And each branch has its own independent message history

---

## US-M5-03: Message Pinning & Bookmarking

**As a** power user,
**I want** to pin important messages and bookmark conversations,
**so that** I can quickly find key information across long conversation histories.

**Persona:** Power User, Data Analyst

### Acceptance Criteria

**AC-03.1: Pin a message**
- Given the user is viewing a conversation
- When they click the pin icon on a message (or press a shortcut)
- Then the message is pinned
- And a pin indicator appears on the message

**AC-03.2: View pinned messages**
- Given a conversation has pinned messages
- When the user clicks "Pinned" in the conversation header
- Then only pinned messages are shown (filtered view)

**AC-03.3: Bookmark a conversation**
- Given the user is viewing the conversation list
- When they bookmark a conversation
- Then it appears in a "Bookmarked" section at the top of the list

**AC-03.4: Search across pins**
- Given the user has pinned messages across multiple conversations
- When they search in the conversation sidebar
- Then pinned messages are boosted in search results

---

## US-M5-04: Model Auto-Routing

**As a** developer,
**I want** the app to automatically pick the best model for each message,
**so that** simple questions use a fast local model and complex reasoning uses a powerful cloud model.

**Persona:** Developer, Power User

### Acceptance Criteria

**AC-04.1: Enable auto-routing**
- Given the user opens Settings > Models
- When they enable "Auto-route"
- Then they configure: fast model (e.g., ollama:llama3) and powerful model (e.g., anthropic:claude-sonnet)

**AC-04.2: Automatic selection**
- Given auto-routing is enabled
- When the user sends a message
- Then the app classifies the message complexity (simple lookup vs. multi-step reasoning)
- And routes to the appropriate model

**AC-04.3: Routing indicator**
- Given auto-routing selected a model
- When the response appears
- Then a small label shows which model was used (e.g., "via ollama:llama3")

**AC-04.4: Override**
- Given auto-routing is enabled
- When the user explicitly selects a model via the dropdown or `/model` command
- Then the override applies for that message (or the rest of the conversation)

**AC-04.5: Fallback**
- Given the selected model is unreachable
- When auto-routing detects the failure
- Then it falls back to the other configured model
- And shows: "ollama:llama3 unreachable — using anthropic:claude-sonnet"

---

## US-M5-05: Onboarding Documentation & Getting-Started Guide

**As a** new user,
**I want** clear documentation that walks me through installation and first use,
**so that** I can get value from OSD Desktop within 10 minutes of downloading it.

**Persona:** New User, Maintainer

### Acceptance Criteria

**AC-05.1: Getting-started guide**
- Given a new user visits the project README or docs site
- When they read the getting-started guide
- Then it covers: install → launch → add connection → first chat → first query
- And each step has a screenshot or terminal output example
- And the guide takes under 10 minutes to complete

**AC-05.2: Updated MAINTAINERS.md**
- Given the project has been rebooted
- When a contributor reads MAINTAINERS.md
- Then it lists current maintainers with roles and contact info
- And the 2022 maintainer list is replaced

**AC-05.3: Updated CONTRIBUTING.md**
- Given a developer wants to contribute
- When they read CONTRIBUTING.md
- Then it covers: dev setup, project structure, coding standards, PR process, test requirements
- And it references the current TypeScript + Vitest + Playwright stack

**AC-05.4: CLI help**
- Given the user runs `osd --help`
- When the help output displays
- Then all subcommands are listed with descriptions
- And each subcommand supports `--help` for detailed usage

---

## US-M5-06: Public Beta Release

**As a** project maintainer,
**I want** to ship a public beta with clear scope and feedback channels,
**so that** early adopters can test the app and report issues before GA.

**Persona:** Maintainer, New User

### Acceptance Criteria

**AC-06.1: Beta release artifacts**
- Given the release pipeline runs
- When the beta is published
- Then signed binaries are available for: macOS (x64 + arm64), Linux (x64 + arm64), Windows (x64 + arm64)
- And a Homebrew cask and apt repo are available for macOS and Linux

**AC-06.2: Beta label**
- Given the user installs the beta
- When the app launches
- Then a "BETA" badge is visible in the title bar
- And the about dialog shows the beta version and feedback link

**AC-06.3: Feedback channel**
- Given the user encounters an issue
- When they click "Report Issue" (in app or docs)
- Then they are directed to the GitHub Issues page with a pre-filled template

**AC-06.4: Opt-in crash reporting**
- Given the user launches the beta
- When prompted on first launch
- Then they can opt in to anonymous crash reporting via Electron `crashReporter`
- And opting out is respected — no data sent

**AC-06.5: Opt-in telemetry**
- Given the user opts in to telemetry
- When they use the app
- Then anonymous usage data (feature usage counts, no PII) is collected
- And a clear privacy policy explains what is collected

**AC-06.6: Beta exit criteria**
- Given the beta has been running for the target period
- When the team evaluates GA readiness
- Then the following must be true:
  - [ ] Zero P0 bugs open
  - [ ] All M1-M4 user stories pass acceptance criteria
  - [ ] Crash rate < 1% of sessions
  - [ ] Getting-started guide validated by 3+ external users
  - [ ] All platforms (macOS, Linux, Windows) tested by at least 1 external user each

---

## Error Scenarios

### E-01: TUI

| Trigger | Behavior |
|---------|----------|
| No model configured | "No model configured. Run `osd chat --model ollama:llama3` or configure in `~/.osd/config.yaml`" |
| Terminal too narrow | Graceful degradation — tables wrap, no crash. Minimum 40 columns. |
| Ctrl+C during response | Streaming stops. Partial response is kept. User can continue chatting. |

### E-02: Branching

| Trigger | Behavior |
|---------|----------|
| Branch from first message | Creates a new conversation with only the system prompt — effectively a fresh start. |
| Delete parent conversation | Branches become standalone conversations (no orphan references). |

### E-03: Updates & Beta

| Trigger | Behavior |
|---------|----------|
| Beta expires (if time-limited) | "This beta has expired. Download the latest version from..." |
| Crash reporter fails to send | Silently retries. Never blocks the user. |

---

## Priority

| Story | Priority | Effort | Rationale |
|-------|----------|--------|-----------|
| US-M5-05 | P0 | M | Docs are required for public beta. No docs = no adoption. |
| US-M5-06 | P0 | L | Beta release is the M5 deliverable. Everything else supports it. |
| US-M5-01 | P0 | L | TUI mode is a key differentiator for terminal-native developers. |
| US-M5-02 | P1 | M | Branching is a power-user feature. High value but not launch-blocking. |
| US-M5-04 | P1 | M | Auto-routing is a UX improvement. Can ship post-beta. |
| US-M5-03 | P2 | S | Pinning/bookmarking is nice-to-have. Low effort but low urgency. |

---

## Dependencies on M1-M4

| M5 Story | Requires |
|----------|----------|
| US-M5-01 | M1: CLI entry point. M2: agent runtime, model switching. |
| US-M5-02 | M2: conversation storage, chat panel. |
| US-M5-03 | M2: conversation storage, chat panel. |
| US-M5-04 | M2: model switching, agent runtime. |
| US-M5-05 | M1-M4: all features documented. |
| US-M5-06 | M1: CI/CD, code signing. M4: auto-update, diagnostics. |
