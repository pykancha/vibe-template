# Web App Template

This is a web-app starting template for our preferred stack, with first class native support for ai agents like you.
This project has helpers for non-technical humans trying to build their ideas app with AI assistance.

See the current architecture of the this app in @TEMPLATE_ARCHITECTURE.md, try to stay in harmony and maintain the current architecture.
Feel free to replace this initial template with user requested app IMPORTANT try to keep the stack technology same/github pages compatible.

When user says to use 'X' or 'X Skill' see .agent/skills folder for that name and read the SKILL.md file there.
You'll use and refer to the .agent/skills folder to understand the pattern and workflows for building debugging refactoring the features.

If any command like pnpm, git, brew, vibe-launcher etc are not available go to .agent/skills/tools/SKILL.md to help user install them first.

Commit your changes often, when user says to experiment a project use worktree feature to add worktrees into root experiments/ folder and register the experiment with proper name in root @.vibe.launcher.json and run vibe-launcher.

For planning a new feature see .agent/skills/plan/SKILL.md
For debugging see .agent/skills/debug/SKILL.md
For code review see @.agent/review.md
For asking chatgpt help see .agent/skills/debug/SKILL.md (last section)