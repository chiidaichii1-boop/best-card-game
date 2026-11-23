// Starfall Pact — the hand-in program.
//
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with buildDossier from the kit's
// library. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// The program only ever creates the output directory and writes inside it;
// it never removes it.

import { cpSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });

// Clear only what this program owns inside the output directory, so a
// re-run into the same directory cannot carry stale files from an earlier
// one. The output directory itself is never removed.
rmSync(join(outDir, 'game'), { recursive: true, force: true });
rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
rmSync(join(outDir, 'dossier.json'), { force: true });

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Starfall Pact handed in: ${dossier.length} byte dossier written to ${outDir}/dossier.json`);
