// Starfall Pact — the rival's brain.
//
// Vex, the Hollow Dealer, plays by rules a player can read and counter:
// it guards its life when low, snares your biggest ward when it can, spends
// its mana on the strongest ward it affords, and only burns a damage spell
// when it finishes you or when mana would otherwise go to waste.

import { CARD_BY_ID } from './cards.js';
import { canPlay, playCard, resonanceBonus } from './engine.js';

// One step of the rival's turn. Returns the move it made, or null when it
// has nothing left worth playing. main.js calls this on a timer so each
// card lands on the table where the player can watch it.
export function aiNextMove(game) {
  const ai = game.ai;
  const you = game.player;

  // 1. Hurt? Mend first — a rival at 8 life or less heals before anything.
  if (ai.life <= 8) {
    const i = ai.hand.findIndex((id) => CARD_BY_ID.get(id).effect === 'heal' && canPlay(game, ai, ai.hand.indexOf(id)).ok);
    if (i >= 0) return take(game, i);
  }

  // 2. Your biggest ward is a problem? Snare it if it fits.
  const threat = you.wards.reduce((a, b) => (b.attack > (a ? a.attack : 0) ? b : a), null);
  if (threat) {
    const i = ai.hand.findIndex((id) => {
      const c = CARD_BY_ID.get(id);
      return c.effect === 'snare' && threat.attack <= c.power + resonanceBonus(game, c.court) && canPlay(game, ai, ai.hand.indexOf(id)).ok;
    });
    if (i >= 0) return take(game, i, threat.uid);
  }

  // 3. Spend mana on the strongest ward it can afford. A bigger ward now
  // beats a cheaper one held for later.
  let best = -1;
  let bestScore = -1;
  ai.hand.forEach((id, i) => {
    const c = CARD_BY_ID.get(id);
    if (c.kind !== 'ward' || !canPlay(game, ai, i).ok) return;
    const score = c.attack * 2 + c.health + (c.cost <= ai.mana ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = i; }
  });
  if (best >= 0) return take(game, best);

  // 4. Lethal? A damage spell that ends the duel goes now.
  const burst = ai.hand.findIndex((id) => {
    const c = CARD_BY_ID.get(id);
    return c.effect === 'damage' && c.power + resonanceBonus(game, c.court) >= you.life && canPlay(game, ai, ai.hand.indexOf(id)).ok;
  });
  if (burst >= 0) return take(game, burst);

  // 5. Mana would rot? Draw cards, or throw a damage spell at you.
  if (ai.hand.length < 7) {
    const draw = ai.hand.findIndex((id) => CARD_BY_ID.get(id).effect === 'draw' && canPlay(game, ai, ai.hand.indexOf(id)).ok);
    if (draw >= 0 && ai.mana >= 3) return take(game, draw);
  }
  const spare = ai.hand.findIndex((id) => {
    const c = CARD_BY_ID.get(id);
    return c.effect === 'damage' && canPlay(game, ai, ai.hand.indexOf(id)).ok;
  });
  if (spare >= 0 && ai.mana >= CARD_BY_ID.get(ai.hand[spare]).cost + 2) return take(game, spare);

  return null;
}

function take(game, handIndex, targetWardId) {
  const result = playCard(game, game.ai, handIndex, targetWardId);
  return result.ok ? result.card : null;
}
