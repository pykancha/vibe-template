# TEMPLATE_INVARIANTS (hard rules)

This file defines the non-negotiable invariants for this template.
If you change architecture, update this file and update `pnpm vibe:doctor` to enforce it.

## Static hosting invariants (GitHub Pages first)

- Build output must not assume the site is served from `/`.
- No root-absolute public asset references in `index.html` (avoid `href="/…"`, `src="/…"`).
- Default routing must work without server rewrites (HashRouter by default).

## Devtools invariants

- Devtools overlay / assist WS client must be disabled in production builds.
- Production builds must not attempt WS connections.
- No secrets/tokens are shipped to the browser.

## Verification loop invariants

- `pnpm check` is the single verification command: doctor + lint + test + build.
- `pnpm vibe:doctor` must fail on invariant drift.
