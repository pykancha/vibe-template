## Publishing to github pages

## Install gh cli

See @../tools/SKILL.md (@.agent/skills/tools/SKILL.md) to install brew and gh cli

### Authenticate

```bash
gh auth login
```

### Link the local repo to remote

See existing remotes, if none create a repository on github

```bash
gh repo create <repo-name> ....
```

### Build

Run the build command of the project to build the dist folder

### Publish

```bash
Create a gh-pages branch/worktree then push it to the remote
```
