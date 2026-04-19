# RFC Addendum — UI Specifications

> Drafted by: fee (front-end engineer)
> Date: 2026-04-19
> Status: Draft — supplements RFC-2026-DESKTOP-001

---

## §3.9.0 — Chat Panel Layout

### Dual-Mode Panel

The chat panel operates in two modes:

1. **Side panel (default)** — Resizable right panel, ~40% viewport width default, minimum 320px, maximum 80% viewport. The main content (homepage, admin pages) remains visible on the left.
2. **Full-screen** — Chat expands to fill the entire viewport. Toggle via keyboard shortcut or button.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar │ Main Content (page)        │ Chat Panel        │
│  200px  │ flex: 1                    │ resizable ~40%    │
│         │                            │ ┌──────────────┐  │
│ Home    │                            │ │ Header       │  │
│ Chat    │                            │ │ model pill   │  │
│ Cluster │                            │ ├──────────────┤  │
│ Indices │                            │ │ Conv sidebar │  │
│ ...     │                            │ │ │ Messages   │  │
│         │                            │ ├──────────────┤  │
│ [user]  │                            │ │ Input area   │  │
│         │                            │ └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Action | macOS | Linux / Windows |
|--------|-------|-----------------|
| Open / focus chat | Cmd+K | Ctrl+K |
| Toggle full-screen chat | Cmd+Shift+Enter | Ctrl+Shift+Enter |
| Exit full-screen | Escape | Escape |
| Send message | Enter | Enter |
| Newline in input | Shift+Enter | Shift+Enter |
| Edit last message | Up Arrow (empty input) | Up Arrow (empty input) |

### Resize Behavior

- Drag handle on the left edge of the chat panel.
- Keyboard accessible: focus the separator, use Left/Right arrow keys to resize in 20px increments.
- The separator has `role="separator"`, `aria-orientation="vertical"`, and `aria-valuenow` reflecting current width.

### Conversation Sidebar

- Collapsible left section within the chat panel (220px).
- Toggle via hamburger button in chat header (`aria-expanded`).
- Search input filters conversations by title.
- Conversations are workspace-scoped.
- Inline rename (click edit icon), delete with active conversation handling.

### M1 vs M2

- **M1**: Chat panel is a UI shell only. Input is present but sends a placeholder response ("Connect a model to start chatting. Agent runtime ships in M2."). No model calls, no streaming, no tool execution.
- **M2**: Full agent wiring — streaming tokens via `agent:stream` IPC, model switching, tool execution feedback, conversation persistence.

---

## §3.4.1 — First Run Experience

### Trigger

On first launch, the app checks `settings.get('onboarded')`. If not `'1'`, the onboarding wizard is shown instead of the homepage.

### Steps

| Step | Screen | Required? | Skip? |
|------|--------|-----------|-------|
| 1 | **Welcome** — App name, one-line description, "Get Started" button | Yes | No |
| 2 | **Add Connection** — Name, URL, type (OpenSearch/Elasticsearch), auth type selector with conditional fields. "Test Connection" button with live result. | No | Yes ("Skip" button) |
| 3 | **Create Workspace** — Name field, pre-filled with "Default". | No | Auto-creates "Default" if skipped |
| 4 | **Ready** — Prompt suggestions ("Show me cluster health", "What can you do?", "List my indices") + "Go to Homepage" button | Yes | No |

### Design Principles

- Each step focuses heading with `tabIndex={-1}` and `ref.focus()` for screen reader announcement.
- Progress indicator shows all 4 steps with active/done/pending states using `aria-current="step"`.
- Connection test in step 2 shows success (cluster name + version) or failure (error + troubleshoot tips).
- On completion, `settings.set('onboarded', '1')` is called and the homepage loads with data.

---

## §3.1 Addendum — Error & Empty States

### Principle

Every view must handle three states: **loading**, **empty**, and **error**. No blank screens.

### Loading States

- Show text with `role="status"` and `aria-label`: "Loading cluster data…", "Loading indices…", etc.
- Centered in the content area, muted color.

### Empty States

- Dashed border container with centered text.
- Primary message: what's missing ("No connections yet", "No conversations yet").
- Secondary message: what to do ("Start a conversation or connect a data source").
- Call-to-action button when applicable ("Add your first connection").

### Error States

- `role="alert"` for screen reader announcement.
- Error message with dismiss button.
- Retry button when the error is recoverable (network failures, cluster offline).
- Troubleshoot details (collapsible) for connection failures.

### Connection-Specific States

| State | Indicator | Action |
|-------|-----------|--------|
| Healthy | 🟢 green dot | None |
| Degraded | 🟡 yellow dot | Show warning |
| Offline | 🔴 red dot | "Troubleshoot" button with checklist |
| Unknown | ⚪ gray dot | "Test Connection" button |

---

## §7.1 — Accessibility

### Target

WCAG 2.1 AA compliance across all views.

### Keyboard Navigation

- All interactive elements reachable via Tab.
- Skip-to-content link as first focusable element (`<a href="#root" class="skip-link">`).
- Focus trap in modal dialogs (Tab cycles within dialog, Escape closes).
- `focus-visible` ring (2px accent color) on all focusable elements.
- Chat panel resize handle keyboard-accessible (arrow keys).

### Screen Readers

- All sections have `aria-label` or `aria-labelledby`.
- Interactive elements have accessible names (visible text or `aria-label`).
- Dynamic content uses `aria-live="polite"` (chat messages) and `role="alert"` (errors).
- `role="log"` on chat message list for streaming content.
- `aria-current="page"` on active nav item, `aria-current="true"` on active workspace/conversation.
- `aria-expanded` on toggleable panels (conversation sidebar, model dropdown).
- `aria-modal="true"` on all dialogs.

### Color & Contrast

- CSS custom properties for all colors — single source of truth.
- System preference detection via `prefers-color-scheme` media query.
- Manual override in Settings (system / light / dark).
- All text meets 4.5:1 contrast ratio against background (AA).
- Status indicators use both color AND text/shape (not color alone).

### Motion

- `prefers-reduced-motion` media query disables all animations and transitions.

### Semantic HTML

- `<main>`, `<nav>`, `<header>`, `<footer>`, `<section>` used appropriately.
- `<table role="table">` with `<thead>`/`<tbody>` for data tables.
- `<meter>` for CPU/heap/disk usage with `aria-label`.
- `<details>`/`<summary>` for collapsible content (troubleshoot, changelogs).
- Form inputs associated with `<label htmlFor>` or `aria-label`.
