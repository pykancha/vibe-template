## Publishing to GitHub Pages (recommended: GitHub Actions)

This template ships with a GitHub Pages workflow: `.github/workflows/deploy.yml`.

### One-time setup (GitHub UI)

1) Repo → Settings → Pages
2) Build and deployment → Source: **GitHub Actions**

### Deploy

Push to `main`.

### Verify locally before pushing

```bash
pnpm check
```

### Optional: gh CLI helpers

If you want to automate setup:

```bash
gh auth login
```

Create a repo (if needed):

```bash
gh repo create <repo-name> --private=false --source=. --push
```

Notes:
- This template builds with Vite `base: "./"` for GH Pages subpaths (no repo-name config needed).
- Default router is `HashRouter` so refresh works without rewrites.

