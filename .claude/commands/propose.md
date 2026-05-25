Propose a new game as a GitHub issue for the GandoGames project.

The game name is: $ARGUMENTS

Follow these steps exactly:

1. **Extract the game name.** Use the provided argument as the game name. If no argument was provided, ask the user: "Please provide a game name: `/propose-new-game <gameName>`" and stop.

2. **Check for an existing issue.** Run:
   ```
   gh issue list --search "NEW GAME - <gameName>" --state all --json number,title
   ```
   Parse the output. If any issue has a title that exactly matches `NEW GAME - <gameName>` (case-insensitive), report its URL and stop — do not create a duplicate.

3. **Determine the game rules.** Think carefully about whether you know the rules of `<gameName>`. This must be a real, well-known game with clear, unambiguous rules (e.g. Tic-Tac-Toe, Connect Four, Chess, Battleship).
   - If you are **not certain** of the rules, tell the user: "I'm not familiar with the rules of `<gameName>`. Please describe the rules so I can write them up." Then stop and wait.
   - If you **do know** the rules, proceed.

4. **Ensure the "new game" label exists.** Run:
   ```
   gh label list --json name
   ```
   If `new game` is not present, create it:
   ```
   gh label create "new game" --color "#0075ca" --description "Proposal for a new game to implement"
   ```

5. **Create the GitHub issue.** Use `gh issue create` with:
   - `--title "NEW GAME - <gameName>"`
   - `--label "new game"`
   - `--body` set to a Markdown description structured as:

```markdown
## Overview
Brief description of the game and its objective.

## Players
- Number of players (min/max)
- Turn order

## Setup
How the game starts (board, hands, initial state).

## Rules
Numbered list of the game rules.

## Win Condition
How a player wins (or loses) the game.

## Notes
Any optional rules, variants, or implementation considerations relevant to GandoGames.
```

   Fill every section with the actual rules. Use a heredoc or temp file so the body is passed correctly to `gh`.

6. **Report the result.** Print the newly created issue URL.
