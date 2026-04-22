# Screenshots

Visual guide to OSD Desktop's key UI flows.

> 📸 **Note:** These are placeholder descriptions. Replace with actual screenshots before GA release.

---

## Sidebar

<!-- ![Sidebar](./images/sidebar.png) -->
**Sidebar — Management Panel**
Slack-style left panel showing: connection list with health indicators, settings gear, plugin count badge, OSD status indicator. Collapsed state shows icons only.

---

## Chat Panel

<!-- ![Chat Panel](./images/chat-panel.png) -->
**Chat Panel — Conversation with Agent**
Right side panel (~40% width) showing: model selector pill in header, streaming response with markdown rendering, code block with copy button, collapsible tool execution result, message actions (pin, retry, edit).

---

## Onboarding

<!-- ![Onboarding Step 1](./images/onboarding-model.png) -->
**Onboarding — Step 1: Choose a Model**
Radio buttons: Ollama (local), OpenAI, Anthropic, Bedrock, Skip. Description text for each option. Next button.

<!-- ![Onboarding Step 2](./images/onboarding-connection.png) -->
**Onboarding — Step 2: Add Connection**
Connection form: name, URL, type dropdown (OpenSearch/Elasticsearch), auth method selector. Test Connection button with success/error feedback.

<!-- ![Onboarding Step 3](./images/onboarding-workspace.png) -->
**Onboarding — Step 3: Create Workspace**
Text input pre-filled with "Default". Explanation text: "Workspaces group your connections and conversations." Get Started button.

---

## Homepage (OSD)

<!-- ![Homepage](./images/homepage.png) -->
**Homepage — OSD Dashboard with Chat Overlay**
Full OSD web UI at localhost:5601 in the main window. Chat overlay visible as a right sidebar. Sidebar on left showing connections. Native Electron menu bar at top.

---

## Connection Health

<!-- ![Connection Health](./images/connection-health.png) -->
**Sidebar — Connection Health Indicators**
List of connections: "prod-opensearch 🟢", "staging-elastic 🟡", "local-opensearch 🔴 Offline". Each with test/refresh icon.

---

## Chat Tabs

<!-- ![Chat Tabs](./images/chat-tabs.png) -->
**Chat — Multiple Conversation Tabs**
Tab bar at top of chat panel showing 3 conversations. Active tab highlighted. "+" button to create new tab. Close button on each tab.

---

## Image Checklist

| Screenshot | Section | Status |
|-----------|---------|--------|
| Sidebar (expanded) | sidebar | ⬜ TODO |
| Sidebar (collapsed) | sidebar | ⬜ TODO |
| Chat panel (streaming) | chat | ⬜ TODO |
| Chat panel (tool result) | chat | ⬜ TODO |
| Onboarding step 1 | onboarding | ⬜ TODO |
| Onboarding step 2 | onboarding | ⬜ TODO |
| Onboarding step 3 | onboarding | ⬜ TODO |
| OSD homepage with overlay | homepage | ⬜ TODO |
| Connection health indicators | sidebar | ⬜ TODO |
| Chat tabs | chat | ⬜ TODO |
| Model switcher dropdown | chat | ⬜ TODO |
| Keyboard shortcuts panel | chat | ⬜ TODO |
| Dark theme | settings | ⬜ TODO |
| osd doctor output | cli | ⬜ TODO |
