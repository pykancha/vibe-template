# Debugging Protocol

IMPORTANT: Go through the protocol one by one without skipping

## Step 1 Inquiry
- Ask as much from the user that they can answer, its okay if they don't have all info but ask to extract as much as they know about how, when, where, screenshots, logs (where they can look) etc reproduction steps first.

## Step 2 Diagnosis
- Go through the codebase once you have proper idea of where it might happen.
- Work through hypothesis and use subagents to read the heavy codebase and once they filter down potential candidates read those narrowed files yourself, always ask your subagent to report back file:line no along with summary
- Hypothesize and fix, add logs to prove that your hypothsis is correct,

- Refactor the codebase if necessary to follow @TEMPLATE_ARCHITECTURE.md this has massive different in you able to trigger the app, see logs and examine state, do whatever changes needed to utilize this system to the fullest!

- Commit your changes always after a fix is verified and remove all your logs during the debugging process, keep permanent logs only if they are veryyy useful for future and are in very tricky and error-prone codebase.

## Step 3 Ask help
- Sometimes you mgiht not be able to solve bugs no matter how hard you try.
- Collect all you know about he original problem/issue context, your analysis, your trials and findings and analysis and surrounding code context and prepare a long issue-report.md and ask user to open chatgpt web extended thinking and paste that file/drag drop that file there to ask it.