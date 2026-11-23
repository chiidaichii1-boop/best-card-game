// Starfall Pact — boot, input and the rival's turn.
//
// main.js is the only file that touches both the engine and the renderer:
// it starts games, turns clicks into engine calls, drives Vex's turn on a
// timer so each of its cards lands where the player can watch it, and
// offers ?screen= states so the game's own screens can be photographed.

import { newGame, playCard, endPlayerTurn, startAiTurn, startPlayerTurn, battlePhase, checkEnd, needsTarget, canPlay } from './engine.js';
import { aiNextMove } from './ai.js';
import { render, blip } from './render.js';
import { CARD_BY_ID } from './cards.js';

let game = null;
let aiTimer = null;

const hooks = {
  onStart,
  onRestart,
  onPlayCard,
  onTarget,
  onEndTurn,
};

function draw() {
  render(game, hooks);
}

function onStart() {
  blip(660, 0.12, 'triangle', 0.06);
  game = newGame();
  game.screen = 'table';
  draw();
}

function onRestart() {
  blip(660, 0.12, 'triangle', 0.06);
  game = newGame();
  game.screen = 'table';
  draw();
}

function onPlayCard(handIndex) {
  if (!game || game.phase !== 'player') return;
  const check = canPlay(game, game.player, handIndex);
  if (!check.ok) {
    blip(180, 0.12, 'sawtooth', 0.04);
    return;
  }
  const card = check.card;
  if (needsTarget(card)) {
    game.selected = handIndex;
    blip(440, 0.07);
    draw();
    return;
  }
  const result = playCard(game, game.player, handIndex);
  if (result.ok) {
    blip(card.kind === 'ward' ? 520 : 760, 0.1, 'triangle', 0.06);
    game.selected = null;
  }
  draw();
}

function onTarget(wardUid) {
  if (!game || game.selected === null) return;
  const result = playCard(game, game.player, game.selected, wardUid);
  if (result.ok) blip(760, 0.1, 'triangle', 0.06);
  game.selected = null;
  draw();
}

function onEndTurn() {
  if (!game || game.phase !== 'player') return;
  blip(392, 0.1, 'triangle', 0.05);
  endPlayerTurn(game);
  draw();
  if (!game.winner) driveAiTurn();
}

// Vex plays one card at a time so the table tells the story, then its
// wards battle and the turn comes back to the player.
function driveAiTurn() {
  clearTimeout(aiTimer);
  if (!game || game.phase !== 'ai') return;
  startAiTurn(game);
  draw();
  const step = () => {
    if (!game || game.phase !== 'ai') return;
    const card = aiNextMove(game);
    draw();
    if (game.winner) return;
    if (card) {
      blip(330, 0.08, 'sine', 0.04);
      aiTimer = setTimeout(step, 750);
    } else {
      aiTimer = setTimeout(() => {
        if (!game || game.phase !== 'ai') return;
        battlePhase(game, game.ai, game.player);
        draw();
        if (!game.winner) {
          startPlayerTurn(game);
          draw();
        }
      }, 650);
    }
  };
  aiTimer = setTimeout(step, 750);
}

// ---- Screenshot staging -------------------------------------------------
// ?screen=title | table | win | lose renders that screen of the live game.
// The table state is staged with fixed hands played through the engine,
// so the wards, life and mana on screen are genuine game state. The
// win/lose states stage a lethal finish the same way the engine would
// resolve one.

function stageTable() {
  // A mid-game table, staged through the engine with fixed hands: both
  // sides summon wards, no battle phase runs, so every ward stands for
  // the photograph — life, mana and hands all read as a real game in
  // progress.
  const g = newGame(7);
  g.screen = 'table';
  g.turn = 5;
  g.player.life = 14;
  g.ai.life = 16;
  g.player.hand = ['flame-drake', 'coral-knight', 'briar-wolf', 'ember-burst', 'tide-mend'];
  g.ai.hand = ['leviathan', 'night-stalker', 'thorn-sprout', 'gloom-draw'];
  g.player.maxMana = 8;
  g.player.mana = 8;
  g.ai.maxMana = 8;
  g.ai.mana = 10; // staging only: 6 + 4 to summon both wards
  playCard(g, g.player, 0); // Flame Drake
  playCard(g, g.player, 0); // Coral Knight
  g.playedCourts = []; // a fresh court count for Vex's summons
  playCard(g, g.ai, 0); // Leviathan
  playCard(g, g.ai, 0); // Night Stalker
  g.player.maxMana = 5;
  g.player.mana = 5;
  g.ai.maxMana = 5;
  g.ai.mana = 5;
  return g;
}

function stageEnd(playerWins) {
  const g = newGame(11);
  g.screen = 'table';
  if (playerWins) {
    // A real lethal cast: Starfall through the engine, Vex at 3 life.
    g.ai.life = 3;
    g.player.hand = ['starfall', 'cinder-imp', 'tide-mend'];
    g.player.mana = 5;
    g.player.maxMana = 5;
    playCard(g, g.player, 0);
  } else {
    // Vex's wards finish a challenger at 2 life, through the battle phase.
    g.player.life = 2;
    g.ai.wards.push({ id: 'night-stalker', kind: 'ward', court: 'gloom', name: 'Night Stalker', cost: 4, attack: 4, health: 2, uid: 9001, healthLeft: 2 });
    battlePhase(g, g.ai, g.player);
  }
  checkEnd(g);
  return g;
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get('screen');
  if (screen === 'table') {
    game = stageTable();
  } else if (screen === 'win') {
    game = stageEnd(true);
  } else if (screen === 'lose') {
    game = stageEnd(false);
  } else {
    game = newGame();
    game.screen = 'title';
  }
  draw();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && game && game.phase === 'player') onEndTurn();
  });
}

boot();
