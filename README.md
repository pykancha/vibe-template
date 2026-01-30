# Vibe Template

A minimal, AI-introspectable React template designed for **GitHub Pages** and **Agentic Development**.

## Why this template?

1.  **Zero Config Deploy**: Works on GitHub Pages out-of-the-box (no broken paths, no routing issues).
2.  **AI Agent Friendly**: Built-in "Assist Server" allows AI agents to inspect app state, logs, and network traffic.
3.  **Low Friction**: One command (`pnpm dev`) starts everything.
4.  **Safe**: Devtools are completely stripped from production builds.

## Quick Start

### 1. Create your repo

Click "Use this template" on GitHub, or clone locally:

```bash
git clone https://github.com/your-username/vibe-template.git my-app
cd my-app
pnpm install
```

### 2. Start Developing

```bash
pnpm dev
```

This starts:

- App at `http://localhost:5173`
- Assist API at `http://localhost:3001` (for agents)

### 3. Verify

Before committing, run the full verification suite:

```bash
pnpm check
```

This runs:

- **Doctor**: Checks template invariants
- **Lint**: ESLint
- **Test**: Vitest
- **Build**: Production build
- **Verify**: Ensures no devtools leaked into production

### 4. Deploy

1. Push to GitHub.
2. Go to **Settings > Pages**.
3. Set **Source** to `GitHub Actions`.
4. The included workflow (`.github/workflows/deploy.yml`) will automatically build and deploy your site.

## Troubleshooting

### "Command not found: agent-browser"

If you see this when trying to use agent-browser:

```bash
npm install -g agent-browser
agent-browser install
```

### GitHub Pages 404s

If your site loads but routes are broken:

- Ensure you are using `HashRouter` (default in this template).
- If using custom domain, verify CNAME settings.

### Assist Connection Failed

If the devtools overlay says "Disconnected":

- Check if `pnpm assist` or `pnpm dev` is running.
- If running in Codespaces/Remote, ensure port 3001 is forwarded.
- If running on https, ensure you are using `wss://` (handled automatically by default).

### Windows Script Errors

If `pnpm dev` fails on Windows:

- Ensure you have `cross-env` installed (included in devDependencies).
- The template uses `cross-env` to set `VITE_ASSIST=1` safely across platforms.

## Architecture

- **Vite + React + TypeScript**: Standard modern stack.
- **HashRouter**: Used by default for compatibility with GitHub Pages (no 404s on refresh).
- **Zustand**: State management with built-in AI observability.
- **shadcn/ui**: Optional, pre-configured.

## For AI Agents

This template includes a `.agent/` folder with "Skills" that help agents work effectively.

- **Check Health**: Run `pnpm vibe:doctor` to verify the template configuration.
- **Agent Browser**: Use `agent-browser` to drive the UI.
- **Introspection**: Connect to `ws://localhost:3001` to receive live logs, errors, and state updates.

See [AGENTS.md](./AGENTS.md) for detailed agent protocols.
