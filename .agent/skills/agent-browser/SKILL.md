---
name: agent-browser
description: Attach to Chrome and drive the UI deterministically (recommended path for UI automation).
allowed-tools:
  - bash
metadata:
  version: "1.0"
---

# Agent Browser (UI driving)

Use this when you want the agent to click/type/scroll in the real UI, not just inspect app state.

## Recommended flow (attach to existing Chrome)

1) Start Chrome with remote debugging:

```bash
./browser-start.js
```

2) Connect agent-browser to the same Chrome instance:

```bash
agent-browser connect 9222
```

3) Navigate and interact via snapshot loop:

- take snapshot
- find target element by label/text/role
- click/type
- re-snapshot and verify

## Dev setup (recommended)

Run the app + assist server:

```bash
pnpm dev:full
```

This gives you:
- UI automation via agent-browser
- introspection via the in-app dev overlay + assist server

## Common failures

- "Cannot connect" to `:9222`
  - Re-run `./browser-start.js` (it enables remote debugging)
  - Check the port is not already in use

- Page looks right but actions are flaky
  - Prefer stable targets: real `<button>`, `<input>`, `<label>`
  - Avoid relying on layout-only selectors

- Multiple Chrome instances
  - Close other Chrome windows and start again via `./browser-start.js`
