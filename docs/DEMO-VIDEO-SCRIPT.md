# Demo Video Script — OSD Desktop in 3 Minutes

> **Format:** Screen recording with voiceover
> **Duration:** ~3 minutes
> **Audience:** Developers, data engineers, platform engineers evaluating OSD Desktop

---

## [0:00–0:15] Intro

**Screen:** App icon on desktop
**Voiceover:**
"OSD Desktop is an open-source desktop app that wraps OpenSearch Dashboards with an AI agent. Connect to any cluster, chat with your data, and manage everything from one app. Let me show you."

**Action:** Double-click to launch.

---

## [0:15–0:40] First Launch & Onboarding

**Screen:** Onboarding wizard appears
**Voiceover:**
"On first launch, a setup wizard walks you through three steps. First, pick a model — I'll use Ollama running locally for privacy. Next, add a connection — I'll point to my OpenSearch cluster on AWS using SigV4 auth. Finally, name my workspace."

**Actions:**
1. Select "Ollama (local)"
2. Click "Add OpenSearch Connection" → fill in URL, select SigV4, enter region → Test → Save
3. Name workspace "Production" → Click "Get Started"

---

## [0:40–1:10] Homepage & OSD UI

**Screen:** OSD loads in the main window, sidebar visible on left
**Voiceover:**
"The app loads the real OpenSearch Dashboards UI — not a reimplementation. You get the full admin experience: index management, security, alerting, everything. The sidebar on the left is owned by Electron — it shows your connections, settings, and plugins. These persist even when you upgrade OSD."

**Actions:**
1. Show OSD homepage loading
2. Click through sidebar: connections list, settings, plugins
3. Navigate to Index Management in OSD

---

## [1:10–1:50] Chat with the Agent

**Screen:** Chat panel opens
**Voiceover:**
"Press Cmd+K to open the chat panel. This is where it gets interesting. I can ask questions in plain English."

**Actions:**
1. Press Cmd+K → chat panel slides open
2. Type: "What's the health of my cluster?"
3. Agent streams response: cluster status, node count, storage, warnings
4. Type: "Show me the top 10 largest indices"
5. Agent runs query, shows formatted table
6. Type: "Any indices without replicas?"
7. Agent highlights issues, offers to fix

**Voiceover:**
"The agent translates natural language to query DSL, runs it against my cluster, and formats the results. It even spots issues proactively."

---

## [1:50–2:20] Model Switching & MCP

**Screen:** Model selector in chat header
**Voiceover:**
"I can switch models anytime. Ollama for quick lookups, Claude for complex analysis. And with MCP servers, the agent can access my filesystem, GitHub, databases — anything."

**Actions:**
1. Click model pill → switch to "anthropic:claude-sonnet"
2. Type: "Analyze my index settings and suggest optimizations for cost"
3. Agent provides detailed analysis
4. Show MCP section: `osd mcp list` showing filesystem server running

---

## [2:20–2:50] Multi-Cluster & Admin

**Screen:** Chat panel
**Voiceover:**
"I manage multiple clusters from one app. Just tell the agent to switch."

**Actions:**
1. Type: "Switch to staging-elastic"
2. Agent confirms: "Switched to staging-elastic (Elasticsearch 8.17)"
3. Type: "Compare health with prod-opensearch"
4. Agent shows comparison table
5. Show fullscreen chat (Cmd+Shift+Enter)

---

## [2:50–3:00] Closing

**Screen:** Homepage with chat panel open
**Voiceover:**
"OSD Desktop — open source, local-first, runs any model. Download it from GitHub. Link in the description."

**Action:** Show GitHub URL overlay.

---

## Production Notes

- **Resolution:** 1920×1080 or 2560×1440
- **Theme:** Dark mode (looks better on video)
- **Model responses:** Pre-record or use fixture responses for consistent demo
- **Cluster:** Use a demo cluster with sample data (logs, metrics, orders indices)
- **Timing:** Each section can be trimmed — target 3:00 total
