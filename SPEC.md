---

# Vibe Template Compatibility & Low‑Friction Spec

## 1) Goals

### 1.1 Primary goal

Provide a **static-site-first framework** that:

* Works out of the box on **GitHub Pages** with zero config.
* Minimizes “explicit maintenance” for non‑technical users (and agents working on their behalf).
* Keeps long‑term coherence via enforced invariants + self-checks.
* Enables “agent ergonomics” (logging, state introspection, navigation, UI driving) during dev, without contaminating production builds.

### 1.2 Secondary goals

* Support additional static hosts with minimal or no changes:

  * Vercel static export
  * Netlify
  * Cloudflare Pages
  * S3 + CloudFront
* Work cleanly in:

  * local dev
  * Codespaces / remote dev
  * HTTPS dev environments
* Provide “first-class agent UI driving” via **Vercel Labs agent-browser**, ideally attachable to the same Chrome instance you already start via CDP.

---

## 2) Non-goals

- This template is not a general server framework (no required backend).
- No requirement to support non-static routing on GitHub Pages (you will default to hash routing for frictionless SPA behavior).
- No requirement to support authenticated multi-user production dashboards; devtools are dev-only.
- No requirement to provide a full plugin marketplace; skills are curated + vendored.

---

## 3) Guiding principles (low friction)

1. **One command should “just work.”**
   Default dev workflow must start everything needed for the default experience.

2. **Implicit > explicit.**
   Prefer auto-detection, sane defaults, and “works without knowing what `base` means.”

3. **Fail soft.**
   If assist server / agent tools aren’t available, app still runs normally.

4. **Dev affordances must never leak to production.**
   Observability and remote control are dev-only by default.

5. **Coherence is enforced, not hoped for.**
   Provide invariants + a doctor check so agents don’t drift the template over time.

---

## 4) Compatibility targets

### 4.1 Browser support (static site)

- Evergreen browsers: latest Chrome/Edge/Firefox/Safari.
- Mobile: iOS Safari (recent), Android Chrome.
- No IE support.

### 4.2 Host environments

Must work out-of-the-box for:

- GitHub Pages under repo subpath: `https://<user>.github.io/<repo>/`

Should work with minimal/no changes for:

- Custom domain root: `https://example.com/`
- Vercel static
- Netlify, Cloudflare Pages

### 4.3 Development environments

- Local dev (http)
- HTTPS dev (when hosted by platforms)
- Codespaces (remote origin, often https)
- LAN testing (phone on same network)

---

## 5) Mandatory template invariants

Create a file `TEMPLATE_INVARIANTS.md` and treat these as **hard rules**:

### 5.1 Static hosting invariants

- No root-absolute public asset references in HTML (e.g. avoid `href="/vite.svg"`).
- Build output must not assume site is served from `/`.
- Routing must work on GitHub Pages without server rewrites (default to hash routing).

### 5.2 Devtools invariants

- Devtools overlay, assist WS client, and any agent control surfaces:

  - must be **disabled in production builds**
  - must not attempt WS connections in production
  - must not ship with secrets/tokens

- Devtools should be tree-shakeable and gated by `import.meta.env.DEV` (or equivalent).

### 5.3 Agent invariants

- `.agent/` directory is part of the template contract.
- Skills must be usable offline (vendored docs or pinned references).
- Provide a stable interface for:

  - state snapshot export
  - console logs
  - network events
  - command execution request/response

### 5.4 “Non-technical safe” invariants

- Default scripts are safe and predictable:

  - `pnpm dev` runs the full dev experience
  - `pnpm build` produces deployable static assets
  - `pnpm deploy` (or CI) deploys to GitHub Pages without custom edits

---

## 6) Build & deploy spec (GitHub Pages first)

### 6.1 Vite base path strategy (must be implicit)

**Requirement:** build must work on GitHub Pages subpaths without requiring users to set repo name.

**Implementation requirement:**

- In `vite.config.ts`, set:

  - `base: "./"` when `command === "build"`
  - `base: "/"` when `command !== "build"`

This makes all build assets relative, eliminating the most common GH Pages friction.

### 6.2 HTML public asset references

**Requirement:** `index.html` must not use root-absolute paths to public assets.

**Implementation requirement:**

- Replace any `href="/something"` and `src="/something"` for public assets with base-aware paths.
- Prefer Vite’s base token (`%BASE_URL%`) for public assets.

### 6.3 Routing default

**Requirement:** Works on GH Pages without 404 rewrites.

**Implementation requirement:**

- Default router: `HashRouter`.
- All navigation commands should operate on hash routing by default.

### 6.4 GitHub Pages deploy workflow

**Requirement:** one-click deploy via GitHub Actions without manual branch juggling.

**Implementation requirement:**

- Add `.github/workflows/deploy.yml` using GitHub Pages official approach:

  - install deps
  - build
  - upload artifact
  - deploy to pages

**Docs requirement:**

- `.agent/skills/github/SKILL.md` must include:

  - how to enable Pages
  - required permissions
  - common pitfalls: base path, router mode

### 6.5 Offline-friendly output

- Build output must be static and self-contained (no runtime CDN dependency required by default).

---

## 7) Dev workflow spec (maximum low friction)

### 7.1 Single “default dev” command

**Requirement:** `pnpm dev` starts:

- Vite dev server
- Assist server (WS + HTTP endpoints)
- (Optionally) “browser tools” / Chrome if you choose to include it, but only if it’s reliable

**Implementation requirement:**

- `pnpm dev` uses `concurrently` (or a small node runner) to launch both.
- Provide `pnpm dev:solo` as escape hatch (Vite only).
- Provide `pnpm assist` for standalone assist server.

### 7.2 Connection defaults must be environment-safe

**Requirement:** assist WS client must work in:

- localhost
- https origins
- Codespaces / remote dev
- LAN

**Implementation requirements:**

- WS URL defaults:

  - protocol: `wss` when `location.protocol === "https:"`, else `ws`
  - host: `location.hostname` by default
  - port: default 3001, but overrideable

- Overrides supported:

  - `VITE_ASSIST_URL` (full ws/wss URL)
  - or `VITE_ASSIST_PORT`, `VITE_ASSIST_HOST` (optional)

### 7.3 Fail-soft overlay behavior

**Requirement:** If assist server is not running or cannot connect:

- Overlay UI must not block app usage.
- It should clearly display “Disconnected” and keep local logging visible if available.

---

## 8) Assist server protocol spec (request/response correctness)

### 8.1 Transport

- WebSocket for real-time events and command execution.
- HTTP endpoints for lightweight querying (`/context`, `/commands`, `/state`) if retained.

### 8.2 Message types (versioned)

All messages must include:

- `v`: protocol version integer (start at 1)
- `type`: string
- `timestamp`: ISO or epoch ms

#### 8.2.1 Client → Server

- `hello`

  - includes client info: app name, template version, page URL

- `registerCommands`

  - list of command metadata

- `executeResult`

  - `{ requestId, ok, result?, error? }`

#### 8.2.2 Server → Client

- `helloAck`

  - includes server info + protocol version

- `executeCommand`

  - `{ requestId, command, args }`

- `ping` / `pong` (optional keepalive)

#### 8.2.3 Client → Server event stream (optional but useful)

- `logEvent` (console)
- `networkEvent`
- `stateEvent`
- `uiEvent` (optional later)

### 8.3 Command execution must be round-trip correct

**Hard requirement:** When a remote agent requests a command:

- server sends `executeCommand` to a specific connected client
- client executes locally and returns `executeResult`
- server forwards result back to the requesting party (socket or http long-poll)

**Implementation requirement:**

- server maintains a `pendingRequests` map:

  - `requestId → requesterSocketId`

- server must handle `executeResult` and route it.

### 8.4 Command metadata schema

Each command includes:

- `name` (namespaced, e.g. `store.theme.set`)
- `description`
- `argsSchema` (simple JSON schema-like)
- `returnsSchema` (optional)
- `sideEffects` boolean
- `safety` tag: `safe | destructive | external`

This supports safe agent planning.

---

## 9) Security & privacy spec (dev-only remote control)

### 9.1 Default binding

**Requirement:** assist server binds to localhost by default.

- Default host: `127.0.0.1`
- Explicit opt-in required to bind to `0.0.0.0`

### 9.2 Auth token for remote dev environments

**Requirement:** If origin is non-local (Codespaces, remote host, LAN), require a token handshake.

- If `VIBE_ASSIST_TOKEN` is set:

  - server requires it
  - client includes it in `hello`

- If token missing, server rejects.

### 9.3 Data minimization / redaction

Captured events must redact by default:

- Authorization headers
- cookies
- tokens in query params (heuristic)
- large payload bodies (size threshold)
- PII keys if detected (configurable)

### 9.4 Production build guarantees

- assist server is not started in production deploy
- client code that connects to assist server must not run in production build
- devtools overlay must be excluded from build or dormant with zero network activity

---

## 10) State / logging instrumentation spec (coherence over time)

### 10.1 “Vibe Store” wrapper (implicit instrumentation)

**Requirement:** provide a single helper that creates Zustand stores with:

- auto state emission (throttled)
- auto command registration (get/set/reset)
- optional redaction transform
- stable naming and namespacing

**Interface requirements (example):**

- `createVibeStore(namespace, initializer, options)`

  - options:

    - `emitState: boolean` default true in dev
    - `registerCommands: boolean` default true in dev
    - `serialize: (state) => jsonSafe`
    - `redact: (jsonSafe) => jsonSafe`
    - `throttleMs: number` default 200–500ms

**Hard requirement:** state snapshots must be JSON-safe and bounded in size.

### 10.2 Event bus schema

Define a stable internal bus event schema for:

- console events
- errors
- network events
- state snapshots
- command registry updates

This allows UI overlay and assist server to remain stable even as app grows.

### 10.3 Initial theme application

**Requirement:** initial theme state must be applied on startup without user action.

- If theme state is `dark`, `.dark` must be added immediately on mount/init.

---

## 11) Routing & “agent navigation” spec

### 11.1 Default routing model

- Must ship with a router skeleton (HashRouter).
- Template should include a tiny routes setup so navigation commands are meaningful.

### 11.2 Navigation command contract

Provide commands:

- `nav.go(path)` → updates hash route
- `nav.back()`
- `nav.forward()`
- `nav.current()` → returns current route

Commands must work even if app adds nested routes.

---

## 12) agent-browser integration spec (first-class)

### 12.1 Skill packaging

**Requirement:** include an `.agent/skills/agent-browser/SKILL.md` that:

- explains what agent-browser is
- provides canonical workflows
- includes quickstart commands
- lists common failure modes and fixes

### 12.2 agent-browser workflow (Zero Config)

**Requirement:** The template prefers the "zero-config" agent-browser flow (`agent-browser open`) for lowest friction.

Canonical flow (default):

1. `pnpm dev`
2. `agent-browser open http://localhost:5173`

**Advanced/Optional:** Attaching to an existing Chrome instance (`agent-browser connect 9222`) is supported but not required for the default experience.

### 12.3 Accessibility conventions

**Requirement:** Template UI components must be agent-drivable:

- real buttons/inputs
- labels / aria-labels
- avoid click handlers on divs for primary actions

### 12.4 Interaction + introspection story

Agents should combine:

- agent-browser → “do things in UI”
- vibe devtools → “observe logs/state/network”
- commands → “make safe internal state changes / introspect”

This is the “big win” narrative.

---

## 13) Documentation spec (for non-technical users)

### 13.1 README must include

- “Use this template” steps
- Dev: `pnpm dev`
- Deploy: “push to main, GH Action deploys”
- Troubleshooting:

  - Pages base path issues (should be rare after fixes)
  - router mode
  - assist overlay connection issues

### 13.2 AGENTS.md must include

- Template invariants summary
- How to run doctor checks
- Preferred skill stack:

  - agent-browser for UI
  - vibe devtools for introspection
  - github deploy skill

### 13.3 Skills docs must be complete

No placeholder skills. Every skill must:

- state purpose
- give step-by-step commands
- include failure modes

---

## 14) Drift prevention: “Doctor” check spec

### 14.1 Command

Add `pnpm vibe:doctor`

### 14.2 What it checks (hard checks)

- `vite.config.ts` base behavior is correct (build uses `./`)
- `index.html` does not contain root-absolute references to public assets
- router is HashRouter by default (or documented alternative)
- devtools not imported in production build entry
- assist protocol supports executeResult routing
- `.agent/skills/*/SKILL.md` exist and non-empty
- `TEMPLATE_INVARIANTS.md` present

### 14.3 Output

- prints PASS/FAIL with actionable messages
- never requires user edits unless failing

---

## 15) Acceptance criteria (definition of done)

### 15.1 GitHub Pages acceptance

- Fresh repo created from template
- User enables Pages and pushes main
- Site loads at `https://user.github.io/repo/`
- Refresh on any route works (hash routing)
- No broken favicon/assets
- No console errors on first load

### 15.2 Dev acceptance

- `pnpm dev` launches app + assist
- Overlay shows connected within 2 seconds locally
- Overlay shows disconnected gracefully if assist server killed
- Works in Codespaces (with token if configured)

### 15.3 Assist protocol acceptance

- Remote command request returns a routed result (executeResult path works)
- Command errors are propagated with readable messages
- Multiple clients can connect without confusion (correct routing to target client)

### 15.4 agent-browser acceptance

- From a fresh template:

  - start chrome
  - connect with agent-browser
  - snapshot/click/fill works reliably

- Default UI includes enough semantics for agent-browser to reference elements stably

### 15.5 Production acceptance

- Production build contains no active WS client attempts
- Devtools overlay is not rendered (or is inert and not reachable)
- No dev-only endpoints referenced

---

## 16) Implementation roadmap (suggested sequencing)

### Phase 1 — Must-fix compatibility + correctness

1. Vite base `./` on build + HTML base-aware assets
2. HashRouter default skeleton + navigation commands aligned
3. Assist server handles `executeResult` and routes results
4. Assist client WS URL becomes origin-aware + supports wss + env overrides
5. `pnpm dev` becomes the single default “full dev” entry

### Phase 2 — First-class agent-browser

6. Vendor `agent-browser` skill doc into `.agent/skills/agent-browser/`
7. Update browser-tools skill to recommend agent-browser connect flow
8. Add accessibility conventions to template UI components

### Phase 3 — Coherence automation

9. Introduce `createVibeStore()` wrapper for implicit instrumentation
10. Add `TEMPLATE_INVARIANTS.md` and enforce with `vibe:doctor`
11. Expand github deploy skill into a complete, no-gotchas doc

---

## 17) Deliverables list (what should exist in the repo)

- `TEMPLATE_INVARIANTS.md`
- `pnpm vibe:doctor` (script + implementation)
- `vite.config.ts` base strategy aligned with spec
- `index.html` base-aware public asset references
- Router skeleton using HashRouter (by default)
- Assist server:

  - single connection handler
  - request routing map
  - executeResult handling
  - optional auth token support

- Assist client:

  - origin-aware WS URL
  - wss support
  - graceful reconnect / disconnected UX

- `.agent/skills/agent-browser/SKILL.md`
- (Optional) `.agent/skills/browser-tools/SKILL.md`
- Updated `.agent/skills/github/SKILL.md` with full GH Pages workflow
- Updated `AGENTS.md` to explain the “agent-browser + devtools” workflow

---

If you want, I can also turn this into:

- a **single `SPEC.md`** you can drop into the repo, and/or
- a **GitHub issue checklist** (epics + tasks + acceptance tests) so you can execute incrementally without losing coherence.
