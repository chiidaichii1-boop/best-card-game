# Starfall Pact

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/chiidaichii1-boop/best-card-game/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/chiidaichii1-boop/best-card-game/reward.svg)](https://make.fun)

An original turn-based card duel for [make.fun](https://make.fun)'s best card game bounty. You face Vex, the Hollow Dealer, across a midnight table: four courts, twenty life each, and a pact sealed in starlight.

## How to play

- Each turn you gain mana (1 on the first turn, up to 8). Play cards with it.
- **Wards** stay on the table and fight in the battle phase: each strikes the rival's strongest ward, or the rival's life when none stand.
- **Spells** resolve at once: damage, healing, snaring a rival ward, or drawing cards.
- **Resonance:** play two cards of one court in a turn to wake it — +1 attack for its wards, +2 power for its spells.
- First to break the rival's 20 life takes the stars.

The four courts are told apart by colour and shape: Ember ▲ red, Tide ● blue, Thorn ◆ green, Gloom ■ purple.

## Layout

- `game/` — the playable game as static files: `index.html`, `style.css`, and one module per job (`cards.js` catalogue, `engine.js` rules, `ai.js` the rival's brain, `render.js` the table, `main.js` boot and input).
- `screenshots/` — four renders of the game's own code: title, table, victory, defeat.
- `vendor/makefun-game.ts` — make.fun's dossier library, copied from the kit unchanged.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.

## Play it locally

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Or any static server over `game/`. `?screen=table`, `?screen=win` and `?screen=lose` open staged states of the live game for screenshots.
