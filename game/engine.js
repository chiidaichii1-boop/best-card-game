// Starfall Pact — the rules engine.
//
// One duel, two sides. Each side has life, mana, a deck, a hand and a row of
// wards on the table. The engine owns every rule and never touches the DOM;
// render.js draws whatever state it holds, and main.js wires input to it.

import { buildDeck, shuffle, makeRng, CARD_BY_ID } from './cards.js';

export const START_LIFE = 20;
export const MAX_HAND = 7;
export const MAX_MANA = 8;

let nextWardId = 1;

function makeSide(deck, rng) {
  return {
    life: START_LIFE,
    mana: 0,
    maxMana: 0,
    deck: shuffle(deck, rng),
    hand: [],
    wards: [],
    fatigue: 0,
  };
}

export function newGame(seed) {
  const rng = seed === undefined ? makeRng((Math.random() * 0xffffffff) >>> 0) : makeRng(seed);
  const game = {
    rng,
    turn: 1,
    phase: 'player', // 'player' | 'ai' | 'over'
    winner: null, // 'player' | 'ai' | null
    log: [],
    playedCourts: [], // courts played this turn, for resonance
    selected: null, // hand index awaiting a target, or null
    player: makeSide(buildDeck(), rng),
    ai: makeSide(buildDeck(), rng),
  };
  drawCards(game, game.player, 3);
  drawCards(game, game.ai, 3);
  game.player.maxMana = 1;
  game.player.mana = 1;
  // Vex starts at 0: startAiTurn adds one, so its first turn has 1 mana,
  // the same as the challenger's — otherwise the second player would sit
  // one mana ahead for the whole duel.
  game.ai.maxMana = 0;
  game.ai.mana = 0;
  note(game, 'The pact is sealed. You begin with 1 mana.');
  return game;
}

export function note(game, text) {
  game.log.unshift(text);
  if (game.log.length > 6) game.log.length = 6;
}

export function drawCards(game, side, n) {
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.life -= side.fatigue;
      note(game, `${side === game.player ? 'You' : 'Vex'} draw from an empty deck and suffer ${side.fatigue} fatigue.`);
    } else if (side.hand.length >= MAX_HAND) {
      const burned = side.deck.shift();
      note(game, `${side === game.player ? 'Your' : "Vex's"} hand is full — ${CARD_BY_ID.get(burned).name} burns away.`);
    } else {
      side.hand.push(side.deck.shift());
    }
  }
}

// Resonance: the second card of a court played in one turn wakes that
// court up. Wards of the court gain +1 attack while they fight this turn;
// spells of the court gain +2 to their power.
export function resonanceBonus(game, court) {
  return game.playedCourts.filter((c) => c === court).length >= 2 ? 2 : 0;
}

export function wardAttack(game, ward) {
  const bonus = game.playedCourts.filter((c) => c === ward.court).length >= 2 ? 1 : 0;
  return ward.attack + bonus;
}

export function canPlay(game, side, handIndex) {
  if (game.phase === 'over') return { ok: false, why: 'The duel is over.' };
  const id = side.hand[handIndex];
  if (id === undefined) return { ok: false, why: 'No such card.' };
  const card = CARD_BY_ID.get(id);
  if (side.mana < card.cost) return { ok: false, why: `Needs ${card.cost} mana.` };
  return { ok: true, card };
}

export function needsTarget(card) {
  return card.effect === 'snare';
}

// Play a card from a side's hand. For a snare, targetWardId names the rival
// ward to destroy. Returns { ok, why }.
export function playCard(game, side, handIndex, targetWardId) {
  const check = canPlay(game, side, handIndex);
  if (!check.ok) return check;
  const card = check.card;
  const foe = side === game.player ? game.ai : game.player;
  const who = side === game.player ? 'You' : 'Vex';

  if (needsTarget(card)) {
    const target = foe.wards.find((w) => w.uid === targetWardId);
    if (!target) return { ok: false, why: 'Choose a rival ward to snare.' };
    if (target.attack > card.power + resonanceBonus(game, card.court)) {
      return { ok: false, why: `${target.name} is too strong to snare.` };
    }
    side.hand.splice(handIndex, 1);
    side.mana -= card.cost;
    game.playedCourts.push(card.court);
    foe.wards = foe.wards.filter((w) => w.uid !== target.uid);
    note(game, `${who} snare ${target.name} — it dissolves into thorns.`);
    return { ok: true, card };
  }

  side.hand.splice(handIndex, 1);
  side.mana -= card.cost;
  game.playedCourts.push(card.court);
  const bonus = resonanceBonus(game, card.court);

  if (card.kind === 'ward') {
    const ward = { ...card, uid: nextWardId++, healthLeft: card.health };
    side.wards.push(ward);
    note(game, `${who} summon ${card.name} (${wardAttack(game, ward)} attack, ${ward.healthLeft} health).`);
  } else if (card.effect === 'damage') {
    const dmg = card.power + bonus;
    foe.life -= dmg;
    note(game, `${who} cast ${card.name} for ${dmg} damage.`);
  } else if (card.effect === 'heal') {
    const healed = Math.min(card.power + bonus, START_LIFE - side.life);
    side.life += healed;
    note(game, `${who} mend ${healed} life with ${card.name}.`);
  } else if (card.effect === 'draw') {
    const n = card.power + bonus;
    drawCards(game, side, n);
    note(game, `${who} draw ${n} cards with ${card.name}.`);
  }
  checkEnd(game);
  return { ok: true, card };
}

// Battle: each ward strikes the rival ward with the highest attack; with no
// rival ward standing, its attack hits the rival's life instead. Damage
// lingers on wards, and a ward at 0 health falls.
export function battlePhase(game, attacker, defender) {
  const who = attacker === game.player ? 'Your' : "Vex's";
  for (const ward of attacker.wards.slice()) {
    if (game.winner) return;
    const atk = wardAttack(game, ward);
    if (defender.wards.length === 0) {
      defender.life -= atk;
      note(game, `${who} ${ward.name} strikes the rival for ${atk}.`);
    } else {
      const target = defender.wards.reduce((a, b) => (b.attack > a.attack ? b : a));
      target.healthLeft -= atk;
      note(game, `${who} ${ward.name} hits ${target.name} for ${atk}.`);
      if (target.healthLeft <= 0) {
        defender.wards = defender.wards.filter((w) => w.uid !== target.uid);
        note(game, `${target.name} falls.`);
      }
    }
  }
  checkEnd(game);
}

export function checkEnd(game) {
  if (game.winner) return;
  if (game.ai.life <= 0 && game.player.life <= 0) {
    game.winner = game.player.life >= game.ai.life ? 'player' : 'ai';
  } else if (game.ai.life <= 0) {
    game.winner = 'player';
  } else if (game.player.life <= 0) {
    game.winner = 'ai';
  }
  if (game.winner) {
    game.phase = 'over';
    note(game, game.winner === 'player' ? 'Vex bows. The stars are yours.' : 'Vex takes the pact. The stars go dark.');
  }
}

// End the player's turn: your wards battle, then Vex takes a turn, then a
// new turn begins for you with +1 mana (up to 8) and a fresh card.
export function endPlayerTurn(game) {
  if (game.phase !== 'player') return;
  game.selected = null;
  battlePhase(game, game.player, game.ai);
  if (game.winner) return;
  game.phase = 'ai';
}

export function startPlayerTurn(game) {
  game.turn += 1;
  game.playedCourts = [];
  game.player.maxMana = Math.min(game.player.maxMana + 1, MAX_MANA);
  game.player.mana = game.player.maxMana;
  drawCards(game, game.player, 1);
  game.phase = 'player';
  checkEnd(game);
}

export function startAiTurn(game) {
  game.playedCourts = [];
  game.ai.maxMana = Math.min(game.ai.maxMana + 1, MAX_MANA);
  game.ai.mana = game.ai.maxMana;
  drawCards(game, game.ai, 1);
  checkEnd(game);
}
