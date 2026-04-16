# Morra — Rock Paper Scissors

## Overview
2 players play simultaneous Rock Paper Scissors.

## Phases

1. **Lobby** (`waiting`): Players join the room. The host starts when ≥ 2 players are present.
2. **Picking** (`playing` / `picking`): All alive players secretly choose Rock, Paper, or Scissors. The players strip shows who has picked (not what).
3. **Reveal** (`playing` / `reveal`): All picks are shown. Losing-type players each lose a life. Continue to the next round.
4. **Game Over** (`game-over`): One player remains with lives — they win.

## Win/Lose logic per round

- Exactly 2 unique hands played → the hand beaten by the other loses:
  - Rock vs Scissors → Scissors players lose a life
  - Scissors vs Paper → Paper players lose a life
  - Paper vs Rock → Rock players lose a life
- All same hand → draw, no change
- All three hands present → triple stalemate, no change

## Constants
- Starting lives: **3**
- Players: **2–6**
