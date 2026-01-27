# Web App Template

## Context

- This is a web-app starting template with first-class AI agent support
- Designed for non-technical humans building apps with AI assistance

## Protocol

1. READ `@README.md` for project overview and quick start.
2. READ `@TEMPLATE_ARCHITECTURE.md` to understand current architecture; maintain harmony with it.
3. READ `@TEMPLATE_INVARIANTS.md` to understand hard rules (GH Pages compatibility, etc).
4. You MAY replace this template with user-requested app; MUST keep stack GitHub Pages compatible.
5. For AI API integrations (text/image/video generation) → `@.agent/skills/template-scripts/`

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
