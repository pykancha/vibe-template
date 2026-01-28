# TODO

## High Priority (P0) - Compatibility & Coherence

- [x] **Command Coherence**: Fix `setTheme` in `src/devtools/commands.ts` to update Zustand store instead of just DOM.
- [x] **Multi-tab Safety**: Prevent duplicate command execution by routing commands only to the most recently active client.
- [x] **Security**: Bind assist server to localhost by default and require token for external access.

## Medium Priority (P2) - Long-term Coherence

- [x] **Store Wrapper**: Add `createVibeStore()` for implicit instrumentation (auto-emit state, auto-register commands).
- [x] **Navigation Commands**: Add `nav.current`, `nav.back`, `nav.forward` to registry.
- [x] **Overlay UX**: Add connection status indicator (Connected/Disconnected badge) to the devtools overlay.
- [x] **Doctor Checks**: Add checks for:
  - [x] `cross-env` usage in scripts
  - [x] Build purity (devtools tree-shaking)
  - [x] `verify:build` inclusion in check script

## Maintenance

- [x] **Testing**: Add tests for:
  - [x] Assist Server Protocol (timeouts, auth, message routing)
  - [x] Store Wrapper (state emission, command registration)
  - [x] Build Verification (ensure devtools don't leak)

## Documentation

- [x] **README**: Add root `README.md` for non-technical users.
- [x] **Architecture**: Update `TEMPLATE_ARCHITECTURE.md` to reflect `pnpm dev` changes.
- [x] **Agents**: Update `AGENTS.md` with pointers to invariants, checking, and agent-browser workflow.
