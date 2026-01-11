# Planning Guide Protocol

IMPORTANT: Go through the protocol one by one without skipping

## Case 1: New project/Fresh Start
- See current architecture at @TEMPLATE_ARCHITECTURE.md file, and plan for a github pages friendly deployable stack.
- If the project needs backend install and use pocketbase see @.agent/skills/tools/SKILL.md for how to install tools
- Decompose big request into a sub tasks of todos eg
- Follow Case 2

## Case 2: New Feature
- Research see the current files involving that feature and document as you go on (at last prd file you'll mention these sources/citation) 
- If its a ui component that has lots of moving parts document the current features/ in .agent/plans/feature/<name>.md that includes every functionality of the feature so we don't break it later
- Finally breakdown the user's task, ask clarification questions to user in a questions.md and ask in a loop till you are on same page and no confusions left, build a prd file after getting answers.

### Example breakdown
1) User: Build me a ai image generation app! use openrouter api key
Breakdown: Read the TEMPLATE_ARCHITECTURE.md file
Then split task into what makes sense for the architecture ie.
- Making a core/ logic that decouples from the ui and connects to a cli so u can use it and verify.
- Identify what should go into core/ vs ui, do not over-abstract just simple defensive architecture of decoupling.
- Plugin the ui after the core is handled and verified via cli, think of how to setup the ui in terms of Actors and state and logicless brain dead ui that just displays current state
- Plan the current architecture components eg the websocket system to be able to control ui get logs/state and errors etc. Plan other such architecture components specified in the TEMPLATE_ARCHITECTURE.md as well

2) User: Build me a website that takes in a csv/json/data-format and does X, Y, Z
Breakdown: Read the TEMPLATE_ARCHITECTURE.md file
- Core/ with a cli that just transforms the example given csv/json and ask user if the transformation is okay
- This makes it possible for u to differentiate ui bugs vs processing bugs if a column/row appears corruped is it the algo or the ui?
- Then build a ui that connects this core .... with all usual architecture scaffolding

### ASK QUESTIONS:
- This is important and another major step, create a markdown file in .agent/plans/<name>.md with high level questions for a non-technical user! if you must ask technical question translate what it means for user and tradeoff for the app in non-technical way.
- Open this file in current editor for user and ask them to edit it, You can output the filepath and ask user to click it and write their answers as well.
- After user answers, read the file and append more questions till u have no questions left!

### After Q&A with user
- Spit a .agent/plans/<name>.prd file with the plan and ask user to give this to implmenter agent in a new tab