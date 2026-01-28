# Web App Template

## Context

- This is a web-app starting template with first-class AI agent support
- Designed for non-technical humans building apps with AI assistance

## Protocol

1. READ `@README.md` for project overview and quick start.
2. READ `@TEMPLATE_ARCHITECTURE.md` to understand current architecture; maintain harmony with it.
3. READ `@TEMPLATE_INVARIANTS.md` to understand hard rules.

## Template Invariants (Summary)

- **Static First**: Build output must be relative (`base: "./"`) and work on GitHub Pages (subpaths).
- **Routing**: Must use `HashRouter` by default to avoid 404s on refresh without server config.
- **Devtools**: `.agent/`, `src/devtools/`, and `src/test/` must be tree-shaken from production.
- **Verification**: `pnpm check` (Doctor + Lint + Test + Build) is the single source of truth.

## Preferred Skill Stack

- **UI Driving**: Use `agent-browser` (see `.agent/skills/agent-browser/SKILL.md`).
- **Introspection**: Use built-in Vibe devtools (websocket bus) for state/logs.
- **Deployment**: Use `github` skill for Pages deployment (`.agent/skills/github/SKILL.md`).

## Workflow

- **Development**: `pnpm dev` (starts App + Assist Server).
- **Verification**: `pnpm check` (runs Doctor + Lint + Test + Build). Always run this before committing.
- **UI Interaction**: Use **agent-browser** skill to drive the UI.
- **Introspection**: Use `pnpm assist` (running in background via `dev`) to read state/logs.

## Skill Routing

- When user says "use X" or "X Skill" → read `.agent/skills/<X>/SKILL.md`
- Skills folder contains patterns/workflows for building, debugging, refactoring

## Quick Reference

| Task                                           | Location                                      |
| ---------------------------------------------- | --------------------------------------------- |
| Planning new feature                           | `.agent/skills/plan/SKILL.md`                 |
| Debugging                                      | `.agent/skills/debug/SKILL.md`                |
| Code review                                    | `.agent/skills/review/SKILL.md`               |
| ChatGPT escalation                             | `.agent/skills/debug/SKILL.md` (last section) |
| Missing tools (pnpm, git, brew, vibe-launcher) | `.agent/skills/tools/SKILL.md`                |

## Git Hygiene

- Commit changes often
- For experiments: use git worktree in `experiments/` folder, register in `.vibe.launcher.json`, run `vibe-launcher`
