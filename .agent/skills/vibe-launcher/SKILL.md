# Vibe Launcher Skill

A double-clickable macOS app that launches your dev servers with a web dashboard.

## Installation

Check if installed:
```bash
which vibe-launcher
```

If not found, install via Homebrew:
```bash
brew install pykancha/tap/vibe-launcher
```

If brew is not installed, read `.agent/skills/tools/SKILL.md` first.

## Configuration

Read the project's `.vibe.launcher.json` to understand current setup:

```json
{
  "entries": [
    {
      "name": "Display Name",
      "start": "command to start",
      "stop": "",
      "ports": [3000, 3001]
    }
  ]
}
```

Fields:
- `name`: Entry label shown in dashboard
- `start`: Shell command to run (e.g., `pnpm dev`, `npm run dev`)
- `stop`: Optional stop command (empty = SIGTERM)
- `ports`: Ports to monitor for status indicators

Modify entries as needed for the project's dev servers.

## Building the Launcher

From project root:
```bash
vibe-launcher build
```

Creates `Launcher.app` in the project directory.

## Launcher.app Anatomy

```
Launcher.app/
  Contents/
    MacOS/launcher      # Shell script that runs vibe-launcher
    Resources/
      launch.html       # Dashboard UI (customizable!)
      AGENTS.md         # API documentation
      openapi.json      # OpenAPI 3.0 spec
      AppIcon.icns      # App icon
    Info.plist          # macOS bundle metadata
```

Users can edit `launch.html` to customize their dashboard - changes take effect on browser refresh.

## Launching for User

Option 1 - Open programmatically:
```bash
open Launcher.app
```

Option 2 - Open in Finder for manual launch:
```bash
open -R Launcher.app
```
Then tell user: "I've opened Finder showing the Launcher. Double-click it to start your dev servers."

The launcher opens a browser to `http://localhost:9876` with controls to start/stop/restart entries and view logs.

## Workflow Summary

1. Check/install vibe-launcher
2. Read and modify `.vibe.launcher.json` for project needs
3. Run `vibe-launcher build`
4. Open `Launcher.app` for user or show in Finder
