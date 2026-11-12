#!/usr/bin/env node
/**
 * Assembles the stable demo package (run `npm run build` and the tests first):
 *   release/BeerAI_Demo_Stable_<date>/
 *     Avvia_BeerAI.command  dist/  scripts/serve.mjs  fallback/  scenarios/
 *     README_APRI_QUI.md  RISULTATI_VERIFICATI.md  verifica/e2e-report.json
 * Never overwrites an existing stable folder (use --force explicitly), so live edits cannot replace it.
 *   node scripts/package-stable.mjs [--date 2026-11-11] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dateArg = args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10);
const force = args.includes('--force');
const reportPath = args.includes('--report') ? path.resolve(args[args.indexOf('--report') + 1]) : path.join(root, 'test-results/e2e-report.json');
const dest = path.join(root, 'release', `BeerAI_Demo_Stable_${dateArg}`);

for (const req of ['dist/index.html', 'fallback/beerai-control-2d.html', 'scenarios/S0_existing.json']) {
  if (!fs.existsSync(path.join(root, req))) {
    console.error(`[package] missing ${req} — run "npm run build" first.`);
    process.exit(2);
  }
}
if (fs.existsSync(dest)) {
  if (!force) {
    console.error(`[package] ${path.relative(root, dest)} already exists. Refusing to overwrite the stable copy (pass --force to replace it on purpose).`);
    process.exit(3);
  }
  fs.rmSync(dest, { recursive: true, force: true });
}
const copy = (rel, to = rel) => fs.cpSync(path.join(root, rel), path.join(dest, to), { recursive: true });
fs.mkdirSync(dest, { recursive: true });
copy('dist');
copy('fallback');
copy('scenarios');
fs.mkdirSync(path.join(dest, 'scripts'), { recursive: true });
copy('scripts/serve.mjs');
copy('Avvia_BeerAI.command');
copy('Start_BeerAI.command');
fs.chmodSync(path.join(dest, 'Avvia_BeerAI.command'), 0o755);
fs.chmodSync(path.join(dest, 'Start_BeerAI.command'), 0o755);
copy('README.md');
if (fs.existsSync(path.join(root, 'VERIFICATION.md'))) copy('VERIFICATION.md');
if (fs.existsSync(reportPath)) {
  fs.mkdirSync(path.join(dest, 'verifica'), { recursive: true });
  fs.copyFileSync(reportPath, path.join(dest, 'verifica/e2e-report.json'));
}
fs.writeFileSync(
  path.join(dest, 'START_HERE.md'),
  `# BeerAI — Brewery Control Room 3D (stable build ${dateArg})

Synthetic data. Keep this stable folder separate from live development.

## Start
1. Double-click **Start_BeerAI.command** on macOS. The browser opens at http://127.0.0.1:4173/.
   If the port is busy, the next free port is used. The Terminal prints the actual URL.
   Custom port: BEERAI_PORT=4180 ./Start_BeerAI.command
2. Stop: press Ctrl+C in the Terminal or close its window.
3. Requires Node.js >=20.19 (tested with 24.13.1). The launcher uses the precompiled build.
   The original Avvia_BeerAI.command shortcut also works.

## Explore in third person
Choose **Your avatar** in the navigation rail, then click **Explore**. WASD / arrows move your
staff member, Shift runs, drag or Q/E orbits, scroll zooms. The blue helmet and ground ring identify
your character. The other staff patrol their departments. You can also click a person to take control.
**Overview** returns to the plant view; **Guided views** and **Focus selected** remain available.

## 2D fallback
Double-click **fallback/beerai-control-2d.html**: same engine and presets, no server or WebGL required.
Inside the 3D app, click **2D control room**.

## Scenarios
The scenarios/ folder contains S0–S5 JSON files for Import JSON. The engine_results_summary.json file
contains KPIs calculated at build time. Run simulation applies edited inputs. Reset to baseline restores S0.

## Recovery
Esc releases mouse capture or text-field focus. Overview returns to the plant view.
For slower graphics, choose Quality: reduced. If WebGL fails, use the 2D control room.
`,
);
console.log(`[package] stable copy written to ${path.relative(root, dest)}`);
