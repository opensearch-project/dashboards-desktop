# CLI Reference

## osd

Launch the desktop GUI (Electron).

```bash
osd                    # Launch GUI
osd --tui              # Launch terminal UI (Ink, M5)
```

## osd chat

Quick agent chat from the terminal.

```bash
osd chat                              # Interactive chat (default model)
osd chat --model ollama:llama3        # Use a specific model
osd chat --model anthropic:claude-sonnet-4-20250514
osd chat "What's my cluster health?"  # One-shot query
```

## osd mcp

Manage MCP (Model Context Protocol) servers.

```bash
osd mcp install @modelcontextprotocol/server-filesystem
osd mcp install ./my-custom-server
osd mcp config server-filesystem --root ~/data
osd mcp config server-filesystem enabled false
osd mcp list
osd mcp start <server>
osd mcp stop <server>
osd mcp restart <server>
```

## osd skill

Install and manage agent skills.

```bash
osd skill install ./my-skill          # Install from local path
osd skill list                        # List installed skills
osd skill remove <name>               # Remove a skill
```

## osd agent

Switch between agent personas.

```bash
osd agent list                        # List available personas
osd agent current                     # Show active persona
osd agent switch ops-agent            # Switch to ops persona
osd agent switch analyst-agent        # Switch to analyst persona
osd agent switch security-agent       # Switch to security persona
osd agent switch default              # Reset to default
```

## osd doctor

Check all subsystems and report health.

```bash
osd doctor
```

Output example:
```
🩺 osd doctor — checking subsystems...

  🟢 Data directory: /home/user/.osd
  🟢 SQLite database: 142 KB
  🟢 Ollama: 3 model(s) available
  🟢 OpenAI API key: Configured
  🔴 Connection: prod-opensearch: https://... unreachable
     → Fix: Check URL and network connectivity

6 checks: 5 passed, 0 warnings, 1 failures
```

## osd update

Update the application (M4+).

```bash
osd update --check                    # Check for updates
osd update --channel stable           # Update to latest stable
osd update --channel beta             # Update to latest beta
osd update --from-source              # Pull source and build locally
osd update --from-source --branch x   # Build from specific branch
```

## osd plugin

Manage OSD plugins (M4+).

```bash
osd plugin install <name>             # Install a plugin
osd plugin remove <name>              # Remove a plugin
osd plugin list                       # List installed plugins
osd plugin enable <name>              # Enable a disabled plugin
osd plugin disable <name>             # Disable without removing
```
