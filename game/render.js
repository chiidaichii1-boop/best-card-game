// Starfall Pact — everything the player sees.
//
// render.js owns the DOM and nothing else: it draws the state the engine
// holds, and reports clicks back to main.js. The four screens are the
// title, the table, the victory and the defeat — every one of them is drawn
// from the same live state, so a screenshot of any screen is a render of
// the game itself.

import { COURTS, CARD_BY_ID } from './cards.js';
import { wardAttack, resonanceBonus } from './engine.js';

export function cardElement(card, opts = {}) {
  const court = COURTS[card.court];
  const el = document.createElement('div');
  el.className = `card court-${card.court}${opts.playable ? ' playable' : ''}${opts.selected ? ' selected' : ''}${opts.targetable ? ' targetable' : ''}`;
  el.style.setProperty('--court', court.color);
  el.style.setProperty('--court-dark', court.dark);
  el.style.setProperty('--court-glow', court.glow);

  const cost = document.createElement('div');
  cost.className = 'cost';
  cost.textContent = card.cost;
  el.appendChild(cost);

  const shape = document.createElement('div');
  shape.className = 'court-shape';
  shape.textContent = court.shape;
  el.appendChild(shape);

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = card.name;
  el.appendChild(name);

  const courtName = document.createElement('div');
  courtName.className = 'court-name';
  courtName.textContent = court.name;
  el.appendChild(courtName);

  if (card.kind === 'ward') {
    const stats = document.createElement('div');
    stats.className = 'stats';
    const atk = document.createElement('span');
    atk.className = 'attack';
    atk.textContent = `⚔ ${opts.attack !== undefined ? opts.attack : card.attack}`;
    const hp = document.createElement('span');
    hp.className = 'health';
    hp.textContent = `♥ ${opts.healthLeft !== undefined ? opts.healthLeft : card.health}`;
    stats.append(atk, hp);
    el.appendChild(stats);
  } else {
    const text = document.createElement('div');
    text.className = 'card-text';
    text.textContent = card.text;
    el.appendChild(text);
    const tag = document.createElement('div');
    tag.className = 'spell-tag';
    tag.textContent = 'SPELL';
    el.appendChild(tag);
  }
  return el;
}

function lifeBar(side, label) {
  const wrap = document.createElement('div');
  wrap.className = 'life-wrap';
  const name = document.createElement('div');
  name.className = 'side-name';
  name.textContent = label;
  const life = document.createElement('div');
  life.className = 'life';
  life.innerHTML = `♥ <span class="life-num">${Math.max(0, side.life)}</span><span class="life-max">/ 20</span>`;
  const bar = document.createElement('div');
  bar.className = 'life-bar';
  const fill = document.createElement('div');
  fill.className = 'life-fill';
  fill.style.width = `${Math.max(0, (side.life / 20) * 100)}%`;
  bar.appendChild(fill);
  wrap.append(name, life, bar);
  return wrap;
}

function manaRow(side) {
  const row = document.createElement('div');
  row.className = 'mana-row';
  const label = document.createElement('span');
  label.className = 'mana-label';
  label.textContent = 'Mana';
  row.appendChild(label);
  for (let i = 0; i < 8; i++) {
    const orb = document.createElement('span');
    orb.className = `mana-orb${i < side.mana ? ' full' : ''}${i < side.maxMana ? '' : ' locked'}`;
    orb.textContent = '●';
    row.appendChild(orb);
  }
  const count = document.createElement('span');
  count.className = 'mana-count';
  count.textContent = `${side.mana}/${side.maxMana}`;
  row.appendChild(count);
  return row;
}

function wardRow(game, side, foe, targeting, onTarget) {
  const row = document.createElement('div');
  row.className = 'ward-row';
  if (side.wards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'ward-empty';
    empty.textContent = 'No wards stand here.';
    row.appendChild(empty);
    return row;
  }
  for (const ward of side.wards) {
    const card = CARD_BY_ID.get(ward.id);
    const el = cardElement(card, {
      attack: wardAttack(game, ward),
      healthLeft: ward.healthLeft,
      targetable: targeting && side === foe,
    });
    el.classList.add('ward');
    if (targeting && side === foe) {
      el.addEventListener('click', () => onTarget(ward.uid));
    }
    row.appendChild(el);
  }
  return row;
}

export function render(game, hooks) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (game.screen === 'title') {
    app.appendChild(titleScreen(hooks));
    return;
  }

  const table = document.createElement('div');
  table.className = 'table';

  // Rival's side: face-down hand, life, wards.
  const foeZone = document.createElement('div');
  foeZone.className = 'zone foe-zone';
  const foeHead = document.createElement('div');
  foeHead.className = 'zone-head';
  foeHead.appendChild(lifeBar(game.ai, 'VEX · THE HOLLOW DEALER'));
  const foeHand = document.createElement('div');
  foeHand.className = 'foe-hand';
  for (let i = 0; i < game.ai.hand.length; i++) {
    const back = document.createElement('div');
    back.className = 'card-back';
    back.textContent = '✦';
    foeHand.appendChild(back);
  }
  const foeCount = document.createElement('div');
  foeCount.className = 'hand-count';
  foeCount.textContent = `${game.ai.hand.length} cards · ${game.ai.deck.length} left in deck`;
  foeHead.append(foeHand, foeCount);
  foeZone.append(foeHead, wardRow(game, game.ai, game.ai, game.selected !== null, hooks.onTarget));
  table.appendChild(foeZone);

  // The middle: turn banner, log, end-turn.
  const mid = document.createElement('div');
  mid.className = 'mid-row';
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.textContent = game.phase === 'over'
    ? (game.winner === 'player' ? 'Victory is yours' : 'Vex takes the pact')
    : game.phase === 'ai'
      ? 'Vex is thinking…'
      : game.selected !== null
        ? 'Choose a rival ward to snare.'
        : `Turn ${game.turn} — play a card, then end your turn.`;
  const endBtn = document.createElement('button');
  endBtn.className = 'end-turn';
  endBtn.textContent = game.phase === 'player' ? 'End Turn ➤' : game.phase === 'ai' ? 'Vex plays…' : '—';
  endBtn.disabled = game.phase !== 'player';
  endBtn.addEventListener('click', hooks.onEndTurn);
  const log = document.createElement('div');
  log.className = 'log';
  for (const line of game.log.slice(-3)) {
    const p = document.createElement('p');
    p.textContent = line;
    log.appendChild(p);
  }
  mid.append(banner, endBtn, log);
  table.appendChild(mid);

  // Your side: wards, life, mana, hand.
  const myZone = document.createElement('div');
  myZone.className = 'zone my-zone';
  myZone.appendChild(wardRow(game, game.player, game.ai, false, hooks.onTarget));
  const myHead = document.createElement('div');
  myHead.className = 'zone-head';
  myHead.appendChild(lifeBar(game.player, 'YOU · THE CHALLENGER'));
  myHead.appendChild(manaRow(game.player));
  const hand = document.createElement('div');
  hand.className = 'hand';
  game.player.hand.forEach((id, i) => {
    const card = CARD_BY_ID.get(id);
    const playable = game.phase === 'player' && game.player.mana >= card.cost;
    const el = cardElement(card, { playable, selected: game.selected === i });
    el.addEventListener('click', () => hooks.onPlayCard(i));
    hand.appendChild(el);
  });
  const handCount = document.createElement('div');
  handCount.className = 'hand-count';
  handCount.textContent = `${game.player.hand.length} cards in hand · ${game.player.deck.length} left in deck`;
  myZone.append(myHead, hand, handCount);
  table.appendChild(myZone);

  app.appendChild(table);

  if (game.phase === 'over') {
    app.appendChild(endScreen(game, hooks));
  }
}

function titleScreen(hooks) {
  const screen = document.createElement('div');
  screen.className = 'screen title-screen';
  const kicker = document.createElement('div');
  kicker.className = 'kicker';
  kicker.textContent = 'A DUEL OF FOUR COURTS';
  const title = document.createElement('h1');
  title.innerHTML = 'STARFALL<br>PACT';
  const sub = document.createElement('p');
  sub.className = 'subtitle';
  sub.textContent = 'Outwit Vex, the Hollow Dealer. Play wards, cast spells, and wake the courts — first to break the rival’s 20 life takes the stars.';
  const courts = document.createElement('div');
  courts.className = 'court-legend';
  for (const key of ['ember', 'tide', 'thorn', 'gloom']) {
    const c = COURTS[key];
    const chip = document.createElement('div');
    chip.className = 'court-chip';
    chip.style.setProperty('--court', c.color);
    chip.innerHTML = `<span class="chip-shape">${c.shape}</span> ${c.name}`;
    courts.appendChild(chip);
  }
  const rules = document.createElement('div');
  rules.className = 'howto';
  rules.innerHTML = '<b>How to play:</b> each turn you gain mana (up to 8). Play cards with it. '
    + 'Wards fight in the battle phase — each strikes the rival’s strongest ward, or their life when none stand. '
    + 'Play two cards of one court in a turn to wake <b>Resonance</b>: +1 attack for its wards, +2 power for its spells.';
  const btn = document.createElement('button');
  btn.className = 'big-btn';
  btn.textContent = 'Begin the Duel';
  btn.addEventListener('click', hooks.onStart);
  const foot = document.createElement('div');
  foot.className = 'title-foot';
  foot.textContent = 'An original game · Best played with mouse or keyboard (Enter ends your turn)';
  screen.append(kicker, title, sub, courts, rules, btn, foot);
  return screen;
}

function endScreen(game, hooks) {
  const won = game.winner === 'player';
  const screen = document.createElement('div');
  screen.className = `screen end-screen ${won ? 'win' : 'lose'}`;
  const kicker = document.createElement('div');
  kicker.className = 'kicker';
  kicker.textContent = won ? 'THE PACT IS YOURS' : 'THE PACT IS LOST';
  const title = document.createElement('h1');
  title.textContent = won ? 'VICTORY' : 'DEFEAT';
  const score = document.createElement('div');
  score.className = 'end-score';
  score.innerHTML = `You <b>${Math.max(0, game.player.life)}</b> ♥ &nbsp;·&nbsp; Vex <b>${Math.max(0, game.ai.life)}</b> ♥ &nbsp;·&nbsp; ${game.turn} turn${game.turn === 1 ? '' : 's'}`;
  const line = document.createElement('p');
  line.className = 'subtitle';
  line.textContent = won
    ? 'Vex bows and the stars fall into your hands. A flawless pact, challenger.'
    : 'Vex gathers the stars and fades into the hollow. Demand a rematch — the deck remembers.';
  const btn = document.createElement('button');
  btn.className = 'big-btn';
  btn.textContent = 'Play Again';
  btn.addEventListener('click', hooks.onRestart);
  screen.append(kicker, title, score, line, btn);
  return screen;
}

// A tiny synth blip, generated in code — no audio files, no network.
let audioCtx = null;
export function blip(freq = 520, dur = 0.09, type = 'sine', gain = 0.05) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (_) { /* silence is fine */ }
}
