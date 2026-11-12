#!/usr/bin/env node
/** Exports the S0–S5 presets as JSON (same canonical format as "Export JSON") into scenarios/. */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beerai-export-'));
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(
  entry,
  `export { PRESETS, PRESET_FILE_NAMES } from ${JSON.stringify(path.join(root, 'src/scenarios/presets.ts'))};
   export { configToJson } from ${JSON.stringify(path.join(root, 'src/scenarios/io.ts'))};
   export { simulate } from ${JSON.stringify(path.join(root, 'src/simulation/engine.ts'))};`,
);
const out = path.join(tmp, 'bundle.mjs');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'warning' });
const mod = await import(pathToFileURL(out).href);
const dir = path.join(root, 'scenarios');
fs.mkdirSync(dir, { recursive: true });
const summary = [];
for (const p of mod.PRESETS) {
  const cfg = p.build();
  const file = path.join(dir, mod.PRESET_FILE_NAMES[p.id]);
  fs.writeFileSync(file, mod.configToJson(cfg));
  const k = mod.simulate(cfg).kpis;
  summary.push({ id: p.id, file: path.basename(file), demand_hl: k.demand_hl, delivered_hl: k.delivered_hl, on_time_hl: k.on_time_hl, service_level: k.service_level, orders_complete_on_time: `${k.orders_complete_on_time}/${k.orders_due}`, final_backlog_hl: k.final_backlog_hl });
}
fs.writeFileSync(path.join(dir, 'engine_results_summary.json'), JSON.stringify({ generated_at: new Date().toISOString(), note: 'Computed by the engine at build time (not hard-coded in the UI).', scenarios: summary }, null, 2) + '\n');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`[scenarios] wrote ${summary.length} presets to scenarios/`);
for (const s of summary) console.log(`  ${s.id}  ${s.file.padEnd(26)} demand ${s.demand_hl}  on-time ${s.on_time_hl}  service ${(s.service_level * 100).toFixed(2)}%  orders ${s.orders_complete_on_time}`);
