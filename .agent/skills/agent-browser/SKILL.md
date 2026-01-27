---
name: agent-browser
description: Drive the real UI (click/type/scroll) deterministically via snapshots.
allowed-tools:
  - bash
metadata:
  version: "1.1"
---

# agent-browser (UI driving)

Use this when you want the agent to interact with the real UI, not just inspect app state.

## Install (one-time)

```bash
npm install -g agent-browser
agent-browser install
```

## Dev setup (recommended)

Start the app + assist server:

```bash
pnpm dev
```

## Recommended flow (lowest friction)

Let agent-browser open its own controlled browser:

```bash
agent-browser open http://localhost:5173/#/
```

Then iterate in a snapshot loop:

- take snapshot
- find target element by label/text/role
- click/type
- re-snapshot and verify

## Advanced: attach to an existing Chrome (CDP)

If you already started Chrome with `--remote-debugging-port=9222`:

```bash
agent-browser connect 9222
```

## Common failures

- "Command not found: agent-browser"
  - Re-run the install steps above

- "Cannot connect" to `:9222`
  - Ensure Chrome was started with `--remote-debugging-port=9222`
  - Check the port is not already in use

- Actions are flaky
  - Prefer stable targets: real `<button>`, `<input>`, `<label>`
  - Avoid relying on layout-only selectors

- Multiple Chrome instances
  - Close other Chrome windows and retry
