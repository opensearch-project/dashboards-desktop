# UX Design Specifications — M1 Foundation

> Author: ux (UX Designer)
> Date: 2026-04-19
> Status: Draft — for fee to implement and incorporate into RFC sections
> Covers: §3.9.0, §3.4.1, §7.1, §3.1

---

## §3.9.0 Chat Panel Layout

### Layout States

The chat panel has three states. The user can switch between them at any time.

```
STATE 1: COLLAPSED (default on first launch before onboarding completes)

┌──────────────────────────────────────────────────────┐
│  App Header                              [💬] ← FAB  │
├──────────────────────────────────────────────────────┤
│                                                      │
│                  Main Content                        │
│              (Homepage / Admin / etc.)                │
│                                                      │
└──────────────────────────────────────────────────────┘

- Floating action button (FAB) in bottom-right or header icon
- Badge shows unread count if agent responded while collapsed
- Cmd+K / Ctrl+K opens → transitions to SIDE PANEL


STATE 2: SIDE PANEL (primary working state)

┌──────────────────────────────────────────────────────┐
│  App Header                         [model pill] [⛶] │
├────────────────────────┬─┬───────────────────────────┤
│                        │↔│  Chat Panel               │
│   Main Content         │ │  ┌─────────────────────┐  │
│                        │ │  │ Conversation list ▾  │  │
│                        │ │  ├─────────────────────┤  │
│                        │ │  │                     │  │
│                        │ │  │  Messages           │  │
│                        │ │  │                     │  │
│                        │ │  ├─────────────────────┤  │
│                        │ │  │ [Input box] [Send]  │  │
│                        │ │  └─────────────────────┘  │
└────────────────────────┴─┴───────────────────────────┘

- Default width: 40% of viewport
- Min width: 320px
- Max width: 70% of viewport
- Resize handle (↔): drag to resize, double-click to reset to 40%
- Escape: collapse panel → STATE 1
- Cmd+Shift+Enter / Ctrl+Shift+Enter: expand → STATE 3


STATE 3: FULL SCREEN

┌──────────────────────────────────────────────────────┐
│  App Header                         [model pill] [⛶] │
├──────────┬───────────────────────────────────────────┤
│ History  │  Chat (full width)                        │
│          │  ┌─────────────────────────────────────┐  │
│ • Conv 1 │  │                                     │  │
│ • Conv 2 │  │  Messages                           │  │
│ • Conv 3 │  │                                     │  │
│   ...    │  │                                     │  │
│          │  ├─────────────────────────────────────┤  │
│ [+ New]  │  │ [Input box]                 [Send]  │  │
│          │  └─────────────────────────────────────┘  │
└──────────┴───────────────────────────────────────────┘

- Conversation history sidebar: 240px wide, collapsible
- Escape: return to STATE 2 (side panel)
- Cmd+Shift+Enter: toggle back to STATE 2
```

### Keyboard Shortcuts

| Action | macOS | Linux/Windows |
|--------|-------|---------------|
| Open/focus chat | Cmd+K | Ctrl+K |
| Full-screen toggle | Cmd+Shift+Enter | Ctrl+Shift+Enter |
| Close/collapse chat | Escape | Escape |
| Send message | Enter | Enter |
| New line in input | Shift+Enter | Shift+Enter |
| New conversation | Cmd+N | Ctrl+N |
| Focus input box | / (when chat open) | / (when chat open) |

### Responsive Breakpoints

| Viewport Width | Behavior |
|---------------|----------|
| ≥ 1200px | Side panel at 40%, all features visible |
| 900–1199px | Side panel at 50%, main content compressed |
| < 900px | Side panel auto-switches to full-screen. No split view — viewport too narrow |
| < 600px | Full-screen only. History sidebar hidden (accessible via hamburger menu) |

### Resize Persistence

- Panel width is saved to SQLite `settings` table (key: `chat_panel_width`)
- Last-used state (collapsed/side/full) is restored on app relaunch
- Per-workspace: each workspace can have its own panel state

### M1 Scope (Non-Functional Shell)

For M1, the chat panel is UI chrome only:
- Layout renders in all 3 states with transitions
- Keyboard shortcuts work
- Resize handle works
- Input box is present but disabled with placeholder: "Connect a model to start chatting — set up in Settings → Models"
- Send button is disabled
- No message rendering, no streaming, no tool feedback (all M2)

---

## §3.4.1 First Run Experience

### Detection

First run is detected by: `settings` table has no row with key `onboarding_completed`.

### Flow

```
STEP 1: WELCOME
┌──────────────────────────────────────────┐
│                                          │
│        🔍 OpenSearch Dashboards          │
│             Desktop                      │
│                                          │
│   Your local-first, agent-powered        │
│   search & analytics workbench.          │
│                                          │
│          [ Get Started ]                 │
│                                          │
│   Skip setup → (link, goes to homepage)  │
└──────────────────────────────────────────┘


STEP 2: MODEL SETUP (skippable)
┌──────────────────────────────────────────┐
│  Step 2 of 4 — AI Model          [Skip] │
├──────────────────────────────────────────┤
│                                          │
│  How do you want to run AI?              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 🏠 Local (Ollama)                 │  │
│  │ Private, runs on your machine     │  │
│  │ Requires: Ollama installed         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ☁️  Cloud API                      │  │
│  │ OpenAI, Anthropic, or Bedrock     │  │
│  │ Requires: API key                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ⏭️  Skip for now                   │  │
│  │ Set up later in Settings           │  │
│  └────────────────────────────────────┘  │
│                                          │
│              [Back] [Next]               │
└──────────────────────────────────────────┘

- If "Local": check if Ollama is running → show detected models or install link
- If "Cloud API": show provider picker → API key input → test connection


STEP 3: DATA SOURCE (skippable)
┌──────────────────────────────────────────┐
│  Step 3 of 4 — Data Source        [Skip] │
├──────────────────────────────────────────┤
│                                          │
│  Connect to a cluster:                   │
│                                          │
│  Name:  [________________________]       │
│  URL:   [________________________]       │
│  Auth:  [Basic ▾]                        │
│                                          │
│         [ Test Connection ]              │
│         ✅ Connected: my-cluster v2.17   │
│                                          │
│              [Back] [Next]               │
└──────────────────────────────────────────┘

- Same connection form as the full Connection Manager
- Test Connection required before Next (unless skipping)


STEP 4: DONE
┌──────────────────────────────────────────┐
│                                          │
│        ✅ You're all set!                │
│                                          │
│  Workspace "Default" created.            │
│                                          │
│  Try asking:                             │
│  • "Show me cluster health"              │
│  • "What indices do I have?"             │
│  • "What can you do?"                    │
│                                          │
│        [ Open Dashboard ]                │
│                                          │
└──────────────────────────────────────────┘

- Auto-creates "Default" workspace with any connections added
- Sets `onboarding_completed = true` in settings
- Opens homepage with chat panel in SIDE PANEL state
- If model was configured, chat input is enabled with prompt suggestions
- If no model, chat shows "Connect a model to start chatting" empty state
```

### Skip Behavior

- "Skip setup" on Step 1: creates Default workspace, goes to homepage, all empty states shown
- "Skip" on any step: proceeds to next step, that feature left unconfigured
- User can always configure later via Settings

### Re-Triggering

- Settings → "Re-run setup wizard" option for users who skipped
- Deleting `onboarding_completed` from settings table also re-triggers

---

## §7.1 Accessibility

### Target

WCAG 2.1 Level AA compliance for all M1 views.

### Checklist — M1 Components

#### Keyboard Navigation

| Component | Tab Stop | Enter/Space | Escape | Arrow Keys |
|-----------|----------|-------------|--------|------------|
| Workspace cards | Yes | Opens workspace | — | Left/Right between cards |
| Connection list items | Yes | Opens edit | — | Up/Down between items |
| Chat input | Yes | Send (Enter), newline (Shift+Enter) | Collapse panel | — |
| Chat panel resize handle | Yes | — | — | Left/Right to resize by 10px |
| Onboarding wizard | Yes (buttons, inputs) | Activates | Close wizard | — |
| Modal dialogs | Focus trapped | Activates focused element | Closes modal | — |
| Dropdown menus | Yes | Opens/selects | Closes | Up/Down to navigate |

#### Focus Management

- On app launch: focus on chat input (if chat open) or first interactive element on homepage
- On modal open: focus moves to first focusable element inside modal
- On modal close: focus returns to the element that triggered the modal
- On route change: focus moves to main content heading (h1)
- On chat panel open (Cmd+K): focus moves to chat input
- On chat panel close (Escape): focus returns to previously focused element
- Visible focus indicator: 2px solid outline, offset 2px, high-contrast color (not browser default)

#### ARIA Patterns

| Component | ARIA Role/Pattern |
|-----------|-------------------|
| Chat panel | `role="complementary"`, `aria-label="Chat panel"` |
| Chat messages | `role="log"`, `aria-live="polite"` for new messages |
| Conversation list | `role="listbox"` with `role="option"` items |
| Workspace cards | `role="radiogroup"` (active workspace = selected) |
| Connection status | `aria-label` includes text status, not just emoji (e.g., "prod-opensearch: healthy" not just 🟢) |
| Onboarding wizard | `role="dialog"`, `aria-label="Setup wizard"`, step indicator with `aria-current="step"` |
| Modal dialogs | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title |
| Toast notifications | `role="alert"`, `aria-live="assertive"` |
| Loading spinners | `aria-busy="true"` on parent, `role="status"` with `aria-label="Loading"` |
| Tool execution status | `aria-live="polite"` region, announces "Running query..." and "Query complete" |

#### Color & Contrast

- Text on background: minimum 4.5:1 contrast ratio
- Large text (≥18pt or ≥14pt bold): minimum 3:1
- UI components and graphical objects: minimum 3:1
- No information conveyed by color alone:
  - Connection status: 🟢 "Healthy" / 🔴 "Offline" — always include text label
  - Error states: red border + icon + text message (not just red border)
- Support `prefers-color-scheme` (light/dark)
- Support `prefers-reduced-motion`: disable transitions and animations
- Support `prefers-contrast`: increase contrast when requested

#### Screen Reader Announcements

| Event | Announcement |
|-------|-------------|
| Connection test success | "Connection successful: [cluster name] version [version]" |
| Connection test failure | "Connection failed: [error reason]" |
| Chat message received | "Agent response: [first 100 chars]" (via aria-live) |
| Tool execution started | "Running [tool name] on [connection]" |
| Tool execution complete | "[Tool name] complete" |
| Workspace switched | "Switched to workspace [name]" |
| Error occurred | "Error: [message]" (via role="alert") |

#### Minimum Window Size

- Minimum: 800×600px (enforced by Electron `minWidth`/`minHeight`)
- At minimum size: chat panel is full-screen only (no split view)
- All content remains accessible via scrolling — no clipping or overflow:hidden on interactive elements

---

## §3.1 Error & Empty States

### Design Principle

Every view has four states: **loaded**, **empty**, **loading**, **error**. All four must be designed. No blank screens.

### Pattern

```
EMPTY STATE TEMPLATE:
┌──────────────────────────────────────┐
│                                      │
│          [Illustration/Icon]         │
│                                      │
│       Primary message (what)         │
│    Secondary message (why / how)     │
│                                      │
│         [ Call to Action ]           │
│                                      │
└──────────────────────────────────────┘

ERROR STATE TEMPLATE:
┌──────────────────────────────────────┐
│                                      │
│          ⚠️  [Error Icon]            │
│                                      │
│       What went wrong (plain text)   │
│    What to do next (actionable)      │
│                                      │
│    [ Retry ]   [ Troubleshoot ]      │
│                                      │
└──────────────────────────────────────┘
```

### M1 Views — All States

#### Homepage

| State | Content |
|-------|---------|
| Loaded | Workspace cards, connection health, recent items, chat prompt |
| Empty (first run) | Onboarding wizard triggers automatically |
| Empty (post-onboarding, no connections) | "No data sources connected" + [Add Connection] button |
| Loading | Skeleton cards for workspaces, skeleton rows for connections |
| Error (SQLite failure) | "Couldn't load your data — database may be corrupted" + [Run Diagnostics] + [Reset Database] |

#### Workspace Switcher

| State | Content |
|-------|---------|
| Loaded | Workspace cards with connection count, active indicator |
| Empty | Single "Default" workspace card + "Create a workspace to organize your connections and conversations" + [Create Workspace] |
| Loading | Skeleton cards |
| Error | "Couldn't load workspaces" + [Retry] |

#### Connection Manager

| State | Content |
|-------|---------|
| Loaded | Connection list with health indicators and text labels |
| Empty | "No connections yet — connect to an OpenSearch or Elasticsearch cluster to get started" + [Add Connection] |
| Loading | Skeleton list rows |
| Error (list load) | "Couldn't load connections" + [Retry] |
| Error (test fail — timeout) | "Connection timed out — check that the URL is reachable and the cluster is running" + [Retry Test] |
| Error (test fail — auth) | "Authentication failed — check your credentials" + [Edit Credentials] |
| Error (test fail — cert) | "Certificate error — the server's certificate couldn't be verified" + [Details] + [Trust Anyway] (if self-signed) |
| Error (test fail — unreachable) | "Couldn't reach [url] — check the URL and your network connection" + [Retry Test] |

#### Chat Panel

| State | Content |
|-------|---------|
| Loaded (M2+) | Messages, input enabled, model pill shows active model |
| Empty — no model (M1) | "Connect a model to start chatting" + [Set Up Model] (links to Settings → Models) |
| Empty — no conversations | "Start a conversation — try asking about your cluster health" |
| Loading (M2+) | Streaming tokens with cursor animation |
| Error — model offline (M2+) | "Model [name] is not responding" + [Switch Model] + [Retry] |
| Error — tool failed (M2+) | Inline error in message: "Query failed: [reason]" + [Retry Query] |

#### Onboarding Wizard

| State | Content |
|-------|---------|
| Normal | Step content with progress indicator |
| Connection test loading | Spinner on "Test Connection" button, button disabled |
| Connection test success | Green check + cluster name + version |
| Connection test failure | Red X + specific error + [Retry] |
| Ollama detection loading | "Checking for Ollama..." spinner |
| Ollama not found | "Ollama not detected — [Install Ollama](link) or choose Cloud API" |

### Loading State Guidelines

| Duration | Pattern |
|----------|---------|
| < 300ms | No indicator (avoid flash) |
| 300ms–3s | Inline spinner or skeleton screen |
| 3s–10s | Progress indicator with label ("Testing connection...") |
| > 10s | Progress bar + cancel button + elapsed time |

---

## Implementation Notes for fee

1. Build the chat panel layout FIRST — it's the structural backbone for the entire app
2. Use CSS Grid for the main layout (sidebar + content + chat panel) — flexbox for internal components
3. All color values via CSS custom properties (`--color-*`) from day one
4. Test every component with keyboard-only navigation before considering it done
5. Use `prefers-reduced-motion` media query to wrap all CSS transitions
6. Connection status must always have a text label alongside the emoji/icon
7. Empty states should feel helpful, not broken — use friendly copy and clear CTAs
