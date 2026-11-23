// Starfall Pact — card catalogue.
//
// Every card belongs to one of four courts. A court is told apart by colour
// AND by shape, never by text alone: Ember is a red triangle, Tide a blue
// circle, Thorn a green diamond, Gloom a purple square.

export const COURTS = {
  ember: { name: 'Ember', color: '#e5484d', dark: '#8f1d22', shape: '▲', glow: 'rgba(229,72,77,0.45)' },
  tide: { name: 'Tide', color: '#3e9bff', dark: '#144a86', shape: '●', glow: 'rgba(62,155,255,0.45)' },
  thorn: { name: 'Thorn', color: '#46a758', dark: '#1d5c2a', shape: '◆', glow: 'rgba(70,167,88,0.45)' },
  gloom: { name: 'Gloom', color: '#9b7bea', dark: '#4c3480', shape: '■', glow: 'rgba(155,123,234,0.45)' },
};

// A ward is a creature that stays on the table and fights in the battle
// phase. A spell resolves at once and then leaves the table.
export const CATALOGUE = [
  // Ember wards — fast, fragile, hard-hitting.
  { id: 'cinder-imp', kind: 'ward', court: 'ember', name: 'Cinder Imp', cost: 1, attack: 2, health: 1, text: 'Quick spark, quick ash.' },
  { id: 'flame-drake', kind: 'ward', court: 'ember', name: 'Flame Drake', cost: 4, attack: 4, health: 3, text: 'Its wings are lit fuses.' },
  { id: 'ash-phoenix', kind: 'ward', court: 'ember', name: 'Ash Phoenix', cost: 6, attack: 5, health: 5, text: 'Burns out. Comes back brighter.' },
  // Tide wards — sturdy, patient.
  { id: 'tide-sprite', kind: 'ward', court: 'tide', name: 'Tide Sprite', cost: 1, attack: 1, health: 2, text: 'Rides every wave home.' },
  { id: 'coral-knight', kind: 'ward', court: 'tide', name: 'Coral Knight', cost: 3, attack: 2, health: 4, text: 'Armour grown, not forged.' },
  { id: 'leviathan', kind: 'ward', court: 'tide', name: 'Leviathan', cost: 6, attack: 6, health: 6, text: 'The deep keeps its promises.' },
  // Thorn wards — balanced, stubborn.
  { id: 'thorn-sprout', kind: 'ward', court: 'thorn', name: 'Thorn Sprout', cost: 1, attack: 2, health: 2, text: 'Small. Sharp. Everywhere.' },
  { id: 'briar-wolf', kind: 'ward', court: 'thorn', name: 'Briar Wolf', cost: 3, attack: 3, health: 2, text: 'Runs where the roots run.' },
  { id: 'ancient-oak', kind: 'ward', court: 'thorn', name: 'Ancient Oak', cost: 5, attack: 2, health: 7, text: 'It has outwaited kings.' },
  // Gloom wards — heavy hitters with thin skin.
  { id: 'shade-wisp', kind: 'ward', court: 'gloom', name: 'Shade Wisp', cost: 2, attack: 3, health: 1, text: 'There, then not there.' },
  { id: 'night-stalker', kind: 'ward', court: 'gloom', name: 'Night Stalker', cost: 4, attack: 4, health: 2, text: 'It hunts the light first.' },
  { id: 'void-reaper', kind: 'ward', court: 'gloom', name: 'Void Reaper', cost: 7, attack: 7, health: 4, text: 'The last card anyone plays.' },
  // Spells — one court each, so every court has a trick.
  { id: 'ember-burst', kind: 'spell', court: 'ember', name: 'Ember Burst', cost: 2, text: 'Deal 3 damage to the rival.', effect: 'damage', power: 3 },
  { id: 'tide-mend', kind: 'spell', court: 'tide', name: 'Tide Mend', cost: 2, text: 'Restore 4 life.', effect: 'heal', power: 4 },
  { id: 'thorn-snare', kind: 'spell', court: 'thorn', name: 'Thorn Snare', cost: 2, text: 'Destroy a rival ward with 3 attack or less.', effect: 'snare', power: 3 },
  { id: 'gloom-draw', kind: 'spell', court: 'gloom', name: 'Gloom Draw', cost: 1, text: 'Draw 2 cards.', effect: 'draw', power: 2 },
  { id: 'starfall', kind: 'spell', court: 'ember', name: 'Starfall', cost: 5, text: 'Deal 5 damage to the rival.', effect: 'damage', power: 5 },
];

export const CARD_BY_ID = new Map(CATALOGUE.map((c) => [c.id, c]));

// Two copies of every card make a 34-card deck. Both duelists draw from
// their own copy of the same deck, so every duel is a fair mirror.
export function buildDeck() {
  const deck = [];
  for (const card of CATALOGUE) deck.push(card.id, card.id);
  return deck;
}

// A tiny seeded RNG (mulberry32) so staged demo games and screenshot runs
// shuffle the same way every time. Real games pass no seed and use entropy.
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
