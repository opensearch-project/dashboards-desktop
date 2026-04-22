---
title: "API Reference — IPC Channels"
head:
  - - meta
    - property: og:title
      content: "API Reference — IPC Channels — OSD Desktop"
---

# API Reference — IPC Channels

All IPC channels between renderer/sidebar/overlay and the main process.

---

## Conventions

- All channels use `ipcMain.handle` / `ipcRenderer.invoke` (request-response)
- Channel names are constants from `src/core/types.ts`
- All handlers are wrapped with error handling — errors return `{ error: string }`
- Credentials are never sent over IPC in plaintext

---

## Connections

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `CONNECTION_LIST` | — | `Connection[]` | List all connections in active workspace |
| `CONNECTION_ADD` | `{ name, url, type, auth }` | `Connection` | Add and save a connection |
| `CONNECTION_UPDATE` | `{ id, ...fields }` | `Connection` | Update connection details |
| `CONNECTION_DELETE` | `id: string` | `void` | Delete a connection |
| `CONNECTION_TEST` | `{ url, type, auth }` | `{ success, version?, error? }` | Test connectivity |
| `CONNECTION_SWITCH` | `id: string` | `void` | Set active connection |

## Workspaces

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `WORKSPACE_LIST` | — | `Workspace[]` | List all workspaces |
| `WORKSPACE_CREATE` | `{ name }` | `Workspace` | Create workspace |

## Conversations

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `CONVERSATION_LIST` | — | `Conversation[]` | List conversations (workspace-scoped) |
| `CONVERSATION_CREATE` | `{ title?, model? }` | `Conversation` | Create new conversation |
| `CONVERSATION_DELETE` | `id: string` | `void` | Delete conversation |
| `CONVERSATION_RENAME` | `id: string, title: string` | `void` | Rename conversation |
| `CONVERSATION_MESSAGES` | `id: string` | `Message[]` | Get messages for conversation |

## Messages

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `MESSAGE_PIN` | `messageId: string` | `void` | Pin a message |
| `MESSAGE_UNPIN` | `messageId: string` | `void` | Unpin a message |
| `MESSAGE_LIST_PINNED` | `conversationId: string` | `Message[]` | List pinned messages |

## Agent

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `AGENT_SEND` | `{ conversationId, message }` | Stream via callback | Send message, receive streaming response |
| `AGENT_CANCEL` | — | `void` | Cancel current generation |
| `AGENT_LIST_PERSONAS` | — | `Persona[]` | List available agent personas |
| `AGENT_SWITCH_PERSONA` | `name: string` | `void` | Switch active persona |
| `AGENT_ACTIVE_PERSONA` | — | `string` | Get current persona name |

## Models

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `MODEL_LIST` | — | `Model[]` | List configured models |
| `MODEL_SWITCH` | `specifier: string` | `void` | Switch model (e.g., "ollama:llama3") |
| `MODEL_CURRENT` | — | `string` | Get current model specifier |
| `AUTOROUTING_GET` | — | `{ enabled, localModel, cloudModel }` | Get auto-routing config |

## Cluster Admin

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `CLUSTER_HEALTH` | — | `ClusterHealth` | Cluster health summary |
| `CLUSTER_NODES` | — | `NodeStats[]` | Per-node stats |
| `CLUSTER_SHARDS` | — | `ShardInfo[]` | Shard allocation |
| `INDICES_LIST` | — | `Index[]` | List all indices |
| `INDICES_CREATE` | `{ name, settings? }` | `void` | Create index |
| `INDICES_DELETE` | `name: string` | `void` | Delete index |
| `INDICES_REINDEX` | `{ source, dest }` | `{ taskId }` | Start reindex task |
| `INDICES_ALIASES` | `name: string` | `Alias[]` | Get aliases for index |
| `INDICES_UPDATE_ALIAS` | `{ actions }` | `void` | Add/remove aliases |
| `INDICES_OPEN` | `name: string` | `void` | Open closed index |
| `INDICES_CLOSE` | `name: string` | `void` | Close index |

## Security (OpenSearch)

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `SECURITY_ROLES_LIST` | — | `Role[]` | List roles |
| `SECURITY_ROLES_SAVE` | `{ name, ...config }` | `void` | Create/update role |
| `SECURITY_ROLES_DELETE` | `name: string` | `void` | Delete role |
| `SECURITY_USERS_LIST` | — | `User[]` | List users |
| `SECURITY_USERS_SAVE` | `{ username, ...config }` | `void` | Create/update user |
| `SECURITY_USERS_DELETE` | `username: string` | `void` | Delete user |
| `SECURITY_TENANTS_LIST` | — | `Tenant[]` | List tenants |
| `SECURITY_TENANTS_SAVE` | `{ name, description }` | `void` | Create/update tenant |
| `SECURITY_TENANTS_DELETE` | `name: string` | `void` | Delete tenant |

## MCP

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `MCP_LIST` | — | `McpServer[]` | List servers with status |
| `MCP_START` | `name: string` | `void` | Start server |
| `MCP_STOP` | `name: string` | `void` | Stop server |
| `MCP_RESTART` | `name: string` | `void` | Restart server |
| `MCP_TOOLS` | — | `Tool[]` | List all MCP tools |
| `MCP_CONFIG_GET` | — | `McpConfig` | Get MCP configuration |
| `MCP_CONFIG_SET` | `{ server, key, value }` | `void` | Update server config |

## Plugins

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `PLUGIN_LIST` | — | `Plugin[]` | List installed plugins |
| `PLUGIN_INSTALL` | `name: string` | `void` | Install plugin |
| `PLUGIN_UNINSTALL` | `name: string` | `void` | Remove plugin |
| `PLUGIN_ENABLE` | `name: string` | `void` | Enable plugin |
| `PLUGIN_DISABLE` | `name: string` | `void` | Disable plugin |

## Skills

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `SKILL_LIST` | — | `Skill[]` | List installed skills |
| `SKILL_INSTALL` | `path: string` | `void` | Install skill from path |
| `SKILL_REMOVE` | `name: string` | `void` | Remove skill |
| `SKILL_ACTIVATE` | `name: string` | `void` | Activate skill |

## Auth

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `AUTH_LOGIN_GITHUB` | — | `User` | Start GitHub OAuth PKCE flow |
| `AUTH_LOGIN_GOOGLE` | — | `User` | Start Google OAuth PKCE flow |
| `AUTH_LOGOUT` | — | `void` | Clear auth tokens |
| `AUTH_CURRENT_USER` | — | `User \| null` | Get current user |
| `CREDENTIALS_SAVE` | `{ key, value }` | `void` | Save to OS keychain |
| `CREDENTIALS_LOAD` | `key: string` | `string` | Load from OS keychain |

## Settings

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `SETTINGS_GET` | `key: string` | `string \| null` | Get setting |
| `SETTINGS_SET` | `{ key, value }` | `void` | Set setting |
| `SETTINGS_GET_ALL` | — | `Record<string, string>` | Get all settings |
| `STORAGE_INIT` | — | `{ isOnboarded }` | Initialize storage, check onboarding |

## Updates

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `UPDATE_CHECK` | — | `{ available, version?, changelog? }` | Check for updates |
| `UPDATE_INSTALL` | — | `void` | Download and install update |
| `UPDATE_CHANNEL` | — | `string` | Get current channel |
| `UPDATE_SET_CHANNEL` | `channel: string` | `void` | Set channel (stable/beta/nightly) |

## Multi-Agent

| Channel | Params | Returns | Description |
|---------|--------|---------|-------------|
| `MULTI_AGENT_LIST` | — | `AgentInstance[]` | List running agents |
| `MULTI_AGENT_SPAWN` | `{ persona, model? }` | `AgentInstance` | Spawn agent |
| `MULTI_AGENT_KILL` | `id: string` | `void` | Kill agent |
| `MULTI_AGENT_ROUTE` | `{ message }` | `AgentInstance` | Route message to best agent |
