# Flatpak vs Snap Evaluation for OSD Desktop

## Summary

**Recommendation: Neither for v1.0.** Both sandbox models conflict with MCP's filesystem access requirements. Ship AppImage + deb + rpm for Linux. Revisit when Flatpak portal APIs mature.

## Comparison

| Feature | Flatpak | Snap |
|---------|---------|------|
| Sandbox | Bubblewrap (strict) | AppArmor (strict/classic) |
| Filesystem access | Portal API or `--filesystem=host` | `classic` confinement (no sandbox) |
| Auto-updates | Flathub handles it | snapd handles it |
| Electron support | Good (electron-builder has flatpak target) | Good (electron-builder has snap target) |
| Distribution | Flathub (review required) | Snap Store (auto-publish) |
| User base | Growing (Fedora, RHEL, SteamDeck) | Ubuntu default |

## MCP Filesystem Problem

MCP servers need to:
1. Read/write `~/.osd-desktop/mcp/` (config, PID files)
2. Spawn child processes (MCP servers are separate binaries)
3. Access user's filesystem (MCP servers may read project files)
4. Bind to localhost ports (MCP JSON-RPC over stdio or HTTP)

### Flatpak
- Default sandbox blocks all of the above
- `--filesystem=host` grants full fs access but defeats the sandbox purpose
- `--talk-name=org.freedesktop.Flatpak` allows spawning outside sandbox (security concern)
- Portal API (xdg-desktop-portal) only covers file dialogs, not programmatic fs access
- **Verdict: Requires `--filesystem=host` + `--share=network`, making sandbox meaningless**

### Snap
- `strict` confinement blocks child process spawning and arbitrary fs access
- `classic` confinement removes all restrictions (equivalent to native .deb)
- Classic snaps require manual Snap Store review and approval
- **Verdict: Only works with `classic` confinement, which is just a .deb with extra steps**

## What Works Today

| Format | Sandbox | MCP Compatible | Auto-Update | Distribution |
|--------|---------|----------------|-------------|-------------|
| AppImage | None | ✅ | electron-updater | GitHub Releases |
| .deb | None | ✅ | apt repo | GitHub Releases + apt |
| .rpm | None | ✅ | yum repo | GitHub Releases |
| Flatpak | Broken for MCP | ❌ | Flathub | N/A |
| Snap (classic) | None | ✅ | Snap Store | Requires review |

## Future Path

If we want Flatpak/Snap in the future:
1. **MCP over D-Bus**: Instead of spawning child processes, MCP servers register as D-Bus services. Flatpak can talk to D-Bus.
2. **MCP portal**: Create an xdg-desktop-portal backend for MCP filesystem access.
3. **Snap classic**: Apply for classic confinement review. Low effort but adds snapd dependency.

## Recommendation

Ship with: **AppImage + deb + rpm** (already in electron-builder.yml).
Skip: Flatpak and Snap for now.
Revisit: When MCP protocol supports D-Bus transport or Flatpak portals cover our use case.
