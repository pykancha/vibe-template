# Reviewing a change

- See the latest change either uncommited changes in git or the last commit/ few commits

## Evaluation
- First and foremost always read the TEMPLATE_ARCHITECTURE.md file at the root of the project to know high level guide on how the project should structure and evolve.
- Decoupling: Look at the coupling between the UI and logic the ui should be dump and just listen and render the state, 0 logic. IF this is not the case HARD REJECT
- Introspectibility: Does the added code respects the websocket harmony if should expose functions or utilize and maintain compatibility with existing architecture. If the current changeset does not contain introspectible support, when it could; HARD REJECT
- Tests, the more tests for the core the better, we gaurd against regressions systematically and forever. If the current changeset is testable and no test present HARD REJECT

## Linting
- Check linting and formatting and ask to run lints or formatters properly
- Ask to remove all AI generated slop
This includes:
- Repetitve non-dry code and overly verbose code that can be compressed elegantly via language-specific idiomatic conventions
- Extra comments that a human wouldn't add or is inconsistent with the rest of the file
- Extra defensive checks or try/catch blocks that are abnormal for that area of the codebase (especially if called by trusted / validated codepaths)
- Casts to any to get around type issues
- Any other style that is inconsistent with the file

- If not commited or if any uncmmited files left add it and do semantic commit.