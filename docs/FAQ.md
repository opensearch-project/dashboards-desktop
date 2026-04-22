# Frequently Asked Questions

---

## Setup

**Q: What are the prerequisites?**
Node.js 20+, an OpenSearch Dashboards binary, and optionally Ollama for local AI models. See [Getting Started](GETTING-STARTED.md).

**Q: Do I need a local OpenSearch cluster?**
No. OSD Desktop connects to remote clusters. The local OSD instance provides the admin UI only.

**Q: How do I install on macOS?**
Download the `.dmg` from [GitHub Releases](https://github.com/opensearch-project/dashboards-desktop/releases), or build from source: `npm ci && npm run build`.

**Q: The app shows "OSD binary not found" on first launch.**
Set the path to your OpenSearch Dashboards installation in Settings, or set the `OSD_HOME` environment variable.

**Q: macOS says the app is from an unidentified developer.**
Right-click the app → Open. This bypasses Gatekeeper for unsigned builds. Signed builds are planned for stable release.

---

## Models

**Q: How do I use a local model?**
Install [Ollama](https://ollama.ai/), pull a model (`ollama pull llama3`), and start it (`ollama serve`). OSD Desktop auto-detects Ollama at localhost:11434.

**Q: How do I use OpenAI / Anthropic / Bedrock?**
Add your API key in Settings → Models. For Bedrock, configure AWS credentials via `~/.aws/credentials` or SSO.

**Q: Can I switch models mid-conversation?**
Yes. Click the model pill in the chat header, or type `/model ollama:mistral` in chat.

**Q: What's model auto-routing?**
When enabled, the app automatically picks a fast local model for simple questions and a cloud model for complex reasoning. Enable in Settings → Models → Auto-route.

**Q: The agent says "Could not reach ollama:llama3".**
Make sure Ollama is running: `ollama serve`. Check that port 11434 is not blocked.

**Q: The agent says "Authentication failed" for OpenAI/Anthropic.**
Your API key may be invalid or expired. Check Settings → Models.

---

## Connections

**Q: How do I connect to AWS OpenSearch Service?**
Add a connection with auth type "AWS SigV4/SSO" and your region. The app uses your AWS credential chain (`~/.aws/credentials`, env vars, or SSO).

**Q: How do I connect to Elasticsearch?**
Add a connection with type "Elasticsearch" and auth type "API Key" or "Basic Auth".

**Q: Connection test says "SSL certificate error".**
Your cluster may use a self-signed certificate. Check your CA configuration.

**Q: Can I connect to multiple clusters?**
Yes. Add multiple connections in a workspace. Switch between them in the sidebar or via chat: "Switch to staging-elastic".

---

## MCP

**Q: What is MCP?**
Model Context Protocol — a standard for extending AI agents with external tools. MCP servers give the agent access to filesystems, databases, APIs, and more.

**Q: How do I install an MCP server?**
```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp config server-filesystem --root ~/data
```

**Q: MCP server shows "unhealthy".**
The server crashed 3+ times and stopped auto-restarting. Check the config and restart: `osd mcp restart <name>`.

**Q: MCP tools don't appear in chat.**
Make sure the server is running (`osd mcp list`). Restart it if needed. The agent discovers tools on startup.

---

## Chat

**Q: How do I open the chat panel?**
Press Cmd+K (macOS) or Ctrl+K (Windows/Linux).

**Q: Can I use chat from the terminal?**
Yes: `osd chat` for interactive mode, or `osd chat --model ollama:llama3` to specify a model.

**Q: How do I start a new conversation?**
Press Cmd+N or click "New Conversation" in the sidebar.

**Q: Are conversations saved?**
Yes, in SQLite (`~/.osd/osd.db`), scoped to your workspace. They persist across app restarts.

---

## Troubleshooting

**Q: The app won't start.**
Run `osd doctor` to check all subsystems. Check logs at:
- macOS: `~/Library/Logs/OSD Desktop/`
- Linux: `~/.config/OSD Desktop/logs/`
- Windows: `%APPDATA%\OSD Desktop\logs\`

**Q: How do I reset everything?**
Stop the app, then: `rm -rf ~/.osd` and relaunch. The app creates a fresh database and shows onboarding.

**Q: How do I report a bug?**
File an issue at [GitHub Issues](https://github.com/opensearch-project/dashboards-desktop/issues) with: steps to reproduce, `osd --version`, OS, and `osd doctor` output.
