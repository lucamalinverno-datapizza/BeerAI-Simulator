#!/usr/bin/env node
/** Screenshot tour of every guided view (production build, local Chrome). Output: test-results/tour/. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = path.join(root, 'test-results', 'tour');
fs.mkdirSync(out, { recursive: true });
const W = Number(process.env.TOUR_W || 1440);
const H = Number(process.env.TOUR_H || 900);
const scenario = process.env.TOUR_SCENARIO || 'S1';
const day = process.env.TOUR_DAY || '21';
const server = spawn(process.execPath, ['scripts/serve.mjs', '--root', 'dist', '--port', '4197', '--strict-port'], { cwd: root });
process.on('exit', () => server.kill());
await new Promise((r) => server.stdout.on('data', (d) => String(d).includes('Open') && r()));
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.goto(`http://127.0.0.1:4197/?scenario=${scenario}&day=${day}`);
await p.waitForFunction(() => window.__BEERAI__?.getState().result);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1500);
await p.screenshot({ path: path.join(out, `00_overview_${W}.png`) });
for (const v of ['brewhouse', 'fermentation', 'packaging', 'warehouse', 'shipping', 'control']) {
  await p.click(`[data-testid=view-${v}]`);
  await sleep(1300);
  await p.screenshot({ path: path.join(out, `${v}_${W}.png`) });
}
await p.click('[data-testid=view-fermentation]');
await sleep(900);
await p.click('[data-testid=btn-explore]');
await sleep(1300);
await p.screenshot({ path: path.join(out, `explore_${W}.png`) });
await b.close();
server.kill();
console.log(`[tour] screenshots in ${path.relative(root, out)}`);
process.exit(0);
