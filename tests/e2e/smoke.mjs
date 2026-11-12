#!/usr/bin/env node
/**
 * End-to-end checks of the production build in the locally installed Google Chrome (playwright-core,
 * no browser download). Serves dist/ with scripts/serve.mjs on 127.0.0.1, drives the visible controls,
 * cross-checks panels against engine snapshots, records screenshots and blocks any non-local request.
 *
 *   node tests/e2e/smoke.mjs            (requires `npm run build` first)
 *   HEADED=1 node tests/e2e/smoke.mjs   (watch it run)
 *
 * Output: test-results/e2e-report.json + screenshots in test-results/.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Folder with dist/, scripts/serve.mjs and fallback/ — the project root or a packaged stable copy. */
const appDir = process.env.E2E_APP_DIR ? path.resolve(process.env.E2E_APP_DIR) : root;
const outDir = process.env.E2E_OUT ? path.resolve(process.env.E2E_OUT) : path.join(root, 'test-results');
fs.mkdirSync(outDir, { recursive: true });
const PORT = Number(process.env.E2E_PORT || 4199);
const BASE = `http://127.0.0.1:${PORT}/`;
const results = [];
let currentTest = '(setup)';
const foreignRequests = new Set();
const consoleErrors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function record(name, ok, detail = '') {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
async function check(name, fn) {
  currentTest = name;
  try {
    const detail = await fn();
    record(name, true, detail ?? '');
  } catch (e) {
    record(name, false, e?.message ?? e);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------------------------
const server = spawn(process.execPath, ['scripts/serve.mjs', '--root', 'dist', '--port', String(PORT), '--strict-port'], { cwd: appDir, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server did not start')), 8000);
  server.stdout.on('data', (d) => {
    if (String(d).includes('Open http')) {
      clearTimeout(t);
      resolve();
    }
  });
  server.on('exit', (c) => reject(new Error(`server exited ${c}`)));
});

process.on('exit', () => server.kill());
process.on('uncaughtException', (e) => {
  console.error(e);
  server.kill();
  process.exit(1);
});
const launchArgs = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED, args: launchArgs });
const browserVersion = browser.version();

function watch(page) {
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('file:')) return;
    try {
      const h = new URL(u).hostname;
      if (h !== '127.0.0.1') foreignRequests.add(u);
    } catch {
      foreignRequests.add(u);
    }
  });
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[${currentTest}] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`[${currentTest}] pageerror: ${e.message}`));
}

const S = (page) => page.evaluate(() => window.__BEERAI__.getState());
const kpiText = async (page) => ({
  service: (await page.textContent('[data-testid=kpi-service]'))?.trim(),
  orders: (await page.textContent('[data-testid=kpi-orders]'))?.trim(),
  ontime: (await page.textContent('[data-testid=kpi-ontime]'))?.trim(),
  backlog: (await page.textContent('[data-testid=kpi-backlog]'))?.trim(),
});
async function waitKpi(page, service, orders) {
  await page.waitForFunction(
    ([s, o]) => document.querySelector('[data-testid=kpi-service]')?.textContent?.trim() === s && document.querySelector('[data-testid=kpi-orders]')?.textContent?.trim() === o,
    [service, orders],
    { timeout: 8000 },
  );
}
const actor = (page) => page.evaluate(() => { const s = window.__BEERAI__.getState(); return { ...window.__BEERAI__.crewPoses.find(p => p.id === s.activeCrewId) }; });
const pose = (page) => page.evaluate(() => {
  const p = window.__BEERAI__.cameraPose;
  return { x: p.x, y: p.y, z: p.z, yaw: p.yaw, fps: p.fps, mode: p.mode };
});
const near = (a, b, tol) => Math.abs(a - b) <= tol;
async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
}

const EXPECT = {
  S0: ['100.00%', '7/7'],
  S1: ['92.31%', '6/8'],
  S2: ['92.31%', '6/8'],
  S3: ['97.44%', '7/8'],
  S4: ['83.13%', '5/7'],
  S5: ['93.55%', '5/7'],
};

// =============================================================================================
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
watch(page);

await check('App loads from the production build and S0 runs', async () => {
  await page.goto(BASE);
  await page.waitForSelector('[data-testid=viewport] canvas', { timeout: 15000 });
  await waitKpi(page, ...EXPECT.S0);
  const k = await kpiText(page);
  assert(k.ontime === '155 / 155 hL' && k.backlog === '0 hL', JSON.stringify(k));
  const hasGl = await page.evaluate(() => {
    const c = document.querySelector('[data-testid=viewport] canvas');
    return !!(c && (c.getContext('webgl2') || c.getContext('webgl')));
  });
  assert(hasGl, 'no WebGL context on the canvas');
  await sleep(1500);
  return `KPIs ${JSON.stringify(k)}`;
});

await check('Simulation runs in a Web Worker', async () => {
  const st = await S(page);
  assert(st.lastRun?.via === 'worker', `via=${st.lastRun?.via}`);
  return `last run ${st.lastRun.ms.toFixed(1)} ms via worker`;
});
await shot(page, '01_overview_1440');

for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S0']) {
  await check(`Preset ${id} reproduces reference KPIs in the UI`, async () => {
    await page.click(`[data-testid=preset-${id}]`);
    await page.waitForFunction((sid) => window.__BEERAI__.getState().result?.config.scenario_id === sid && !window.__BEERAI__.getState().running, id);
    await waitKpi(page, ...EXPECT[id]);
    const st = await S(page);
    assert(st.result.config.scenario_id === id, `result scenario ${st.result.config.scenario_id}`);
    assert(st.result.balance_ok, 'balance check failed');
    return JSON.stringify(await kpiText(page));
  });
}

await check('Guided view "Fermentation" moves the camera (short tween)', async () => {
  await page.click('[data-testid=view-fermentation]');
  await sleep(1100);
  const p = await pose(page);
  assert(near(p.x, 1.5, 0.3) && near(p.y, 9, 0.3) && near(p.z, 9, 0.3), JSON.stringify(p));
  return `camera at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
});

await check('All guided views reachable with one click', async () => {
  const views = { brewhouse: [-11, 10, 3], packaging: [21, 8.5, 5], warehouse: [7, 9.5, 17], shipping: [13, 13, 39], control: [-20.9, 2.7, 16.8] };
  for (const [v, [x, y, z]] of Object.entries(views)) {
    await page.click(`[data-testid=view-${v}]`);
    await sleep(1000);
    const p = await pose(page);
    assert(near(p.x, x, 0.4) && near(p.y, y, 0.4) && near(p.z, z, 0.4), `${v}: ${JSON.stringify(p)}`);
  }
  await page.click('[data-testid=btn-overview]');
  await sleep(1000);
  const p = await pose(page);
  assert(near(p.y, 44, 0.5), `overview y=${p.y}`);
  return 'brewhouse, packaging, warehouse, shipping, control room, overview';
});

await check('Equipment list selection opens the F1 panel; values match the engine snapshot of the same day', async () => {
  await page.click('[data-testid=view-fermentation]');
  await page.click('[data-testid="equip-tank:F1"]');
  await page.waitForSelector('[data-testid=panel-tank-F1]');
  assert((await page.textContent('[data-testid=panel-title]')).includes('Fermenter F1'), 'title');
  await page.fill('[data-testid=day-slider]', '5');
  await sleep(200);
  const st = await S(page);
  assert(st.currentDay === 5, `day ${st.currentDay}`);
  const t = st.result.snapshots[5].tanks.find((x) => x.tank_id === 'F1');
  const panel = await page.textContent('[data-testid=panel-tank-F1]');
  assert(panel.includes(t.batch_id) && panel.includes(`day ${t.ready_day}`), `panel vs snapshot ${t.batch_id}/${t.ready_day}`);
  const label = await page.textContent('[data-testid=label-tank-F1]');
  assert(label.includes(t.batch_id), `3D label ${label}`);
  return `day 5: F1 ${t.status} ${t.batch_id} ${t.volume_hl}/${t.capacity_hl} hL, release day ${t.ready_day} (panel + 3D label agree)`;
});
await shot(page, '02_fermentation_F1_panel_1440');

await check('Clicking the tank geometry selects the same object/panel as the list', async () => {
  await page.click('[data-testid=equip-brewhouse]');
  await page.waitForSelector('[data-testid=panel-brewhouse]');
  await page.click('[data-testid=view-fermentation]');
  await sleep(1100);
  const pt = await page.evaluate(() => window.__BEERAI__.cameraPose.project(-5, 4.0, -11)); // F2 body
  assert(pt.inFront, 'F2 not in front of camera');
  await page.mouse.click(pt.x, pt.y);
  await page.waitForSelector('[data-testid=panel-tank-F2]', { timeout: 3000 });
  const st = await S(page);
  assert(st.selectedId === 'tank:F2', st.selectedId);
  return `clicked at (${pt.x.toFixed(0)}, ${pt.y.toFixed(0)}) → ${st.selectedId}`;
});

await check('"Focus selected" brings the camera to the selected tank', async () => {
  await page.click('[data-testid=btn-focus]');
  await sleep(1000);
  const p = await pose(page);
  assert(near(p.x, -5 + 2.6, 0.4) && near(p.z, -11 + 8.2, 0.4), JSON.stringify(p));
  return `camera at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`;
});

await check('Six staff patrol the brewery autonomously without changing simulated results', async () => {
  const before = await page.evaluate(() => ({people: window.__BEERAI__.crewPoses.map(p=>({id:p.id,x:p.x,z:p.z})),kpis:JSON.stringify(window.__BEERAI__.getState().result.kpis)}));
  await sleep(3000);
  const after = await page.evaluate(() => ({people: window.__BEERAI__.crewPoses.map(p=>({id:p.id,x:p.x,z:p.z})),kpis:JSON.stringify(window.__BEERAI__.getState().result.kpis)}));
  assert(before.people.length===6,'expected 6 staff');
  assert(after.people.filter((p,i)=>Math.hypot(p.x-before.people[i].x,p.z-before.people[i].z)>.1).length>=4,'staff not patrolling');
  assert(before.kpis===after.kpis,'staff changed engine results');
  return 'six articulated models, independent patrols, unchanged KPIs';
});

await check('Explore: selected avatar walks in third person with collisions and stays on the floor', async () => {
  await page.click('[data-testid=btn-explore]');
  await sleep(1000);
  let p = await actor(page);
  const camera = await pose(page);
  assert(camera.mode === 'explore' && camera.y > 2, `camera ${JSON.stringify(camera)}`);
  assert(Math.hypot(camera.x-p.x,camera.z-p.z)>0.5, 'camera must follow behind the visible avatar');
  const start = p;
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.down('KeyW');
  await sleep(2500);
  await page.keyboard.up('KeyW');
  p = await actor(page);
  const moved = Math.hypot(p.x - start.x, p.z - start.z);
  assert(moved > 0.5, `did not move (${moved})`);
  // Long walk into walls / machines in several directions.
  for (const k of ['KeyA', 'KeyS', 'KeyD', 'KeyW']) {
    await page.keyboard.down(k);
    await page.keyboard.down('ShiftLeft');
    await sleep(2500);
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up(k);
  }
  p = await actor(page);
  const st = await S(page);
  const tanks = st.result.config.tanks.map((t, i) => [[-10, -11], [-5, -11], [0, -11], [5, -11], [10, -11], [-7.5, -5], [-2.5, -5], [2.5, -5]][i]);
  const insideTank = tanks.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 1.35 + 0.4 - 1e-6);
  assert(!insideTank, `inside a tank at ${p.x},${p.z}`);
  assert(p.x > -29.6 && p.x < 29.6 && p.z > -17.6 && p.z < 17.6, `outside hall ${p.x},${p.z}`);
  return `avatar walked ${moved.toFixed(1)} m; final (${p.x.toFixed(1)}, 0, ${p.z.toFixed(1)}), camera follows above and behind`;
});
await shot(page, '03_explore_third_person_1440');

await check('Avatar switch takes control at the new person and releases the previous one', async () => {
  const previous = (await S(page)).activeCrewId;
  await page.selectOption('[data-testid=avatar-select]', 'sam');
  await sleep(1100);
  assert((await S(page)).activeCrewId === 'sam','switch failed');
  const start = await actor(page);
  await sleep(1800);
  const end = await actor(page);
  assert(Math.hypot(start.x-end.x,start.z-end.z)<.001,'controlled staff moved without input');
  assert((await page.textContent('.avatar-nameplate')).includes('Sam'),'wrong nameplate');
  const c = await pose(page);
  assert(Math.hypot(c.x-end.x,c.z-end.z)<10,'camera not following new avatar');
  return `${previous} released; Sam controlled and stationary without input`;
});

await check('Orbit and zoom change the third-person camera while the avatar stays still', async () => {
  if (await page.locator('[data-testid=panel]').count()) await page.getByRole('button', {name:'Close panel',exact:true}).click();
  const start = await actor(page);
  const before = await pose(page);
  await page.keyboard.down('KeyE'); await sleep(650); await page.keyboard.up('KeyE');
  const orbited = await pose(page);
  assert(Math.hypot(before.x-orbited.x,before.z-orbited.z)>.3,'orbit failed');
  await page.mouse.move(650,640); await page.mouse.wheel(0,-220); await sleep(200);
  const zoomed = await pose(page);
  const after = await actor(page);
  assert(Math.hypot(start.x-after.x,start.z-after.z)<.001,'orbit moved the avatar');
  assert(Math.hypot(zoomed.x-orbited.x,zoomed.y-orbited.y,zoomed.z-orbited.z)>.15,'zoom failed');
  await page.mouse.move(650,640); await page.mouse.down(); await page.mouse.move(780,610,{steps:8}); await page.mouse.up();
  const dragged = await pose(page);
  assert(Math.hypot(dragged.x-zoomed.x,dragged.z-zoomed.z)>.15,'drag orbit failed');
  return 'Q/E orbit and wheel zoom work; avatar position unchanged';
});

await check('Clicking a visible staff model takes control of that person', async () => {
  await page.click('[data-testid=btn-overview]');
  await page.click('[data-testid=view-fermentation]');
  await sleep(1000);
  const point = await page.evaluate(() => {
    const p = window.__BEERAI__.crewPoses.find(p=>p.id==='taylor');
    return window.__BEERAI__.cameraPose.project(p.x,1.25,p.z);
  });
  assert(point.inFront,'person not in front of camera');
  await page.mouse.click(point.x,point.y);
  await page.waitForFunction(()=>window.__BEERAI__.getState().cameraMode==='explore' && window.__BEERAI__.getState().activeCrewId==='taylor');
  await sleep(900);
  assert((await page.textContent('.avatar-nameplate')).includes('Taylor'),'model click did not select Taylor');
  return 'clicked Taylor in the 3D scene → third-person control';
});

await check('Walking into a tank is blocked by collision', async () => {
  // Take control of Quality, whose patrol is in front of the fermenters.
  await page.click('[data-testid=btn-overview]');
  await page.click('[data-testid=view-fermentation]');
  await sleep(900);
  await page.selectOption('[data-testid=avatar-select]', 'taylor');
  await page.click('[data-testid=btn-explore]');
  await sleep(1000);
  await page.keyboard.down('KeyW');
  await sleep(5000);
  await page.keyboard.up('KeyW');
  const p = await actor(page);
  const d = Math.min(...[[-10, -11], [-5, -11], [0, -11], [5, -11]].map(([x, z]) => Math.hypot(p.x - x, p.z - z)));
  assert(d >= 1.35 + 0.4 - 1e-6, `penetrated tank: distance ${d}`);
  return `stopped ${(d - 1.35).toFixed(2)} m from the nearest tank wall`;
});

await check('Typing in a panel field does not move the camera; Esc releases focus', async () => {
  await page.click('[data-testid=equip-shipping]');
  await page.waitForSelector('[data-testid=new-order-customer]');
  const before = await pose(page);
  await page.click('[data-testid=new-order-customer]');
  await page.fill('[data-testid=new-order-customer]', '');
  await page.keyboard.type('wasd WASD');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await sleep(400);
  const after = await pose(page);
  const val = await page.inputValue('[data-testid=new-order-customer]');
  assert(val === 'wasd WASD', `value=${val}`);
  assert(near(before.x, after.x, 1e-6) && near(before.z, after.z, 1e-6), `camera moved ${JSON.stringify([before, after])}`);
  await page.keyboard.press('Escape');
  const active = await page.evaluate(() => document.activeElement?.tagName);
  assert(active === 'BODY', `active=${active}`);
  return 'camera unchanged while typing; Esc → focus on body';
});

await check('Pointer capture needs an explicit gesture (button) and is reversible', async () => {
  const lockedBefore = await page.evaluate(() => !!document.pointerLockElement);
  assert(!lockedBefore, 'pointer locked without gesture');
  const btn = await page.$('[data-testid=btn-capture]');
  assert(btn, 'Capture mouse button missing in explore mode');
  return 'not captured by default; "Capture mouse" button present (Esc release is browser-native)';
});

await check('Packaging panel: 30 → 60 hL/day feeds the engine (S2 equivalence)', async () => {
  await page.click('[data-testid=btn-overview]');
  await page.click('[data-testid=preset-S1]');
  await waitKpi(page, ...EXPECT.S1);
  await page.click('[data-testid=view-packaging]');
  await page.click('[data-testid=equip-packaging]');
  await page.fill('[data-testid=packaging-capacity]', '60');
  await page.waitForFunction(() => document.querySelector('[data-testid=result-status]')?.textContent?.includes('not up to date'));
  await page.click('[data-testid=run-simulation]');
  await page.waitForFunction(() => window.__BEERAI__.getState().result.config.packaging_capacity_hl_per_day === 60);
  await waitKpi(page, ...EXPECT.S2);
  const st = await S(page);
  const maxPackaged = Math.max(...st.result.snapshots.map((s) => s.packaged_total_today));
  await sleep(900); // let the guided-view tween finish before the screenshot
  return `engine received 60 hL/day; KPIs unchanged vs S1 (92.31%, 6/8); max packaged in a day ${maxPackaged} hL`;
});
await shot(page, '04_packaging_panel_60_1440');

await check('S3: F5 appears physically, is selectable and linked to the engine; S0 removes it', async () => {
  await page.click('[data-testid=preset-S3]');
  await waitKpi(page, ...EXPECT.S3);
  await page.waitForSelector('[data-testid="equip-tank:F5"]');
  await page.click('[data-testid="equip-tank:F5"]');
  await page.waitForSelector('[data-testid=panel-tank-F5]');
  await page.click('[data-testid=btn-focus]');
  await sleep(1200);
  await page.fill('[data-testid=day-slider]', '10');
  await sleep(300);
  const st = await S(page);
  const f5 = st.result.snapshots[10].tanks.find((t) => t.tank_id === 'F5');
  assert(f5, 'F5 missing in snapshot');
  const label = await page.textContent('[data-testid=label-tank-F5]');
  assert(label.includes('F5'), 'F5 label missing in 3D');
  await shot(page, '05_S3_F5_focus_1440');
  await page.click('[data-testid=preset-S0]');
  await waitKpi(page, ...EXPECT.S0);
  assert(!(await page.$('[data-testid="equip-tank:F5"]')), 'F5 still listed in S0');
  assert(!(await page.$('[data-testid=label-tank-F5]')), 'F5 still in the 3D scene in S0');
  assert(await page.$('[data-testid="equip-slot:F5"]'), 'empty slot F5 missing');
  const ids = (await S(page)).result.config.tanks.map((t) => t.id).join(',');
  assert(ids === 'F1,F2,F3,F4', ids);
  return `F5 day 10: ${f5.status} ${f5.batch_id ?? ''}; back to S0 → tanks ${ids}`;
});

await check('Rapid scenario switching: an old run never replaces the latest one', async () => {
  for (const seq of [['S1', 'S3', 'S5', 'S4'], ['S4', 'S0', 'S3', 'S2'], ['S2', 'S5', 'S1', 'S3']]) {
    for (const id of seq) await page.click(`[data-testid=preset-${id}]`, { delay: 0 });
    const last = seq[seq.length - 1];
    await waitKpi(page, ...EXPECT[last]);
    await sleep(400);
    const st = await S(page);
    assert(st.result.config.scenario_id === last && st.activePreset === last, `${seq.join('→')}: got ${st.result.config.scenario_id}`);
    assert(st.completedRunId === st.latestRunId, `completed ${st.completedRunId} latest ${st.latestRunId}`);
  }
  return 'three rapid sequences ended on S4, S2, S3 with matching results';
});

await check('Play/Pause and speed change only the displayed day, never the results', async () => {
  const before = JSON.stringify((await S(page)).result.kpis);
  await page.fill('[data-testid=day-slider]', '0');
  await page.selectOption('[data-testid=speed-select]', '4');
  await page.click('[data-testid=btn-play]');
  await page.waitForFunction(() => window.__BEERAI__.getState().currentDay >= 3, null, { timeout: 4000 });
  // camera moves freely while playing
  await page.click('[data-testid=view-warehouse]');
  await sleep(800);
  await page.click('[data-testid=btn-play]');
  const st = await S(page);
  assert(!st.playing, 'still playing');
  assert(JSON.stringify(st.result.kpis) === before, 'KPIs changed during playback');
  return `played to day ${st.currentDay} at 4×; KPIs identical`;
});

await check('Inspect mode and reduced quality keep the scene working', async () => {
  await page.click('[data-testid=view-fermentation]');
  await page.fill('[data-testid=day-slider]', '12');
  await page.click('[data-testid=btn-inspect]');
  await sleep(800);
  await shot(page, '06_inspect_mode_1440');
  const kBefore = JSON.stringify((await S(page)).result.kpis);
  await page.click('[data-testid=btn-quality]');
  await sleep(1200);
  assert(await page.$('[data-testid=viewport] canvas'), 'canvas gone');
  const st = await S(page);
  assert(st.quality === 'reduced', st.quality);
  assert(JSON.stringify(st.result.kpis) === kBefore, 'KPIs changed');
  await shot(page, '07_reduced_quality_1440');
  await page.click('[data-testid=btn-quality]');
  await page.click('[data-testid=btn-inspect]');
  return 'inspect + reduced quality OK (results unchanged)';
});

let exportedPath = '';
await check('Export JSON downloads the current configuration', async () => {
  await page.click('[data-testid=preset-S5]');
  await waitKpi(page, ...EXPECT.S5);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Export JSON')]);
  exportedPath = path.join(outDir, dl.suggestedFilename());
  await dl.saveAs(exportedPath);
  const json = JSON.parse(fs.readFileSync(exportedPath, 'utf8'));
  assert(json.schema_version === 1 && json.scenario_id === 'S5' && json.name, 'bad export');
  assert(json.tanks.find((t) => t.id === 'F4').unavailable[0].end_day === 21, 'F4 window missing');
  return path.basename(exportedPath);
});

await check('Reset to baseline returns exactly to S0 (orders, WIP, stock)', async () => {
  await page.click('[data-testid=equip-warehouse]');
  await page.fill('[data-testid=initial-stock-A]', '99');
  await page.click('[data-testid=run-simulation]');
  await page.waitForFunction(() => window.__BEERAI__.getState().result.config.initial_finished_stock_hl.A === 99);
  await page.click('[data-testid=reset-baseline]');
  await waitKpi(page, ...EXPECT.S0);
  const ok = await page.evaluate(() => {
    const st = window.__BEERAI__.getState();
    const d = st.draft;
    return d.scenario_id === 'S0' && d.initial_finished_stock_hl.A === 10 && d.orders.length === 7 && d.initial_wip.length === 3 && st.result.config.tanks.length === 4 && st.currentDay === 0;
  });
  assert(ok, 'draft not equal to S0');
  return 'draft + result equal S0, day 0';
});

await check('Import JSON (local file picker) restores the exported scenario and its results', async () => {
  await page.setInputFiles('[data-testid=import-file]', exportedPath);
  await waitKpi(page, ...EXPECT.S5);
  const st = await S(page);
  assert(st.result.config.tanks.find((t) => t.id === 'F4').unavailable.length === 1, 'window not imported');
  return `imported ${path.basename(exportedPath)} → ${(await kpiText(page)).service}`;
});

await check('Invalid import is rejected without breaking the app', async () => {
  const bad = path.join(outDir, 'bad-scenario.json');
  fs.writeFileSync(bad, JSON.stringify({ schema_version: 1, horizon_day: -2 }));
  await page.setInputFiles('[data-testid=import-file]', bad);
  await sleep(500);
  const k = await kpiText(page);
  assert(k.service === EXPECT.S5[0], `KPIs changed after bad import: ${k.service}`);
  return 'rejected, previous result kept';
});

await check('Save scenario + Compare scenarios side by side', async () => {
  await page.click('text=Save scenario');
  await page.click('[data-testid=compare-scenarios]');
  await page.waitForSelector('[data-testid=compare-table]');
  const txt = await page.textContent('[data-testid=compare-table]');
  assert(txt.includes('92.31%') && txt.includes('97.44%'), 'default comparison S1/S2/S3 missing');
  const saved = (await S(page)).saved.length;
  assert(saved >= 1, 'saved scenario missing');
  await shot(page, '08_compare_1440');
  return `compare table OK; ${saved} saved scenario(s)`;
});

await check('Who is late? view (S1): O05 and O06 late, with delays', async () => {
  await page.click('[data-testid=preset-S1]');
  await waitKpi(page, ...EXPECT.S1);
  await page.click('[data-testid=btn-control-panel]');
  await page.click('text=Who is late?');
  const rows = await page.$$eval('[data-testid=orders-table] tbody tr', (trs) => trs.map((t) => t.getAttribute('data-order')));
  assert(rows.join(',') === 'O05,O06', rows.join(','));
  const txt = await page.textContent('[data-testid=orders-table]');
  assert(txt.includes('d33') && txt.includes('d42'), 'shipment days missing');
  await shot(page, '09_who_is_late_S1_1440');
  await page.click('text=Show all orders');
  return 'O05 (+5 d, 10 hL late), O06 (+7 d, 5 hL late)';
});

await check('Model assumptions panel is reachable', async () => {
  await page.click('[data-testid=btn-assumptions]');
  await page.waitForSelector('[data-testid=panel-assumptions]');
  const txt = await page.textContent('[data-testid=panel-assumptions]');
  assert(txt.includes('unlimited') && txt.includes('not optimal'), 'assumptions text');
  return 'assumptions shown';
});

await check('2D control room (in-app) shows the same results; back to 3D', async () => {
  const k3 = await kpiText(page);
  await page.click('[data-testid=toggle-2d]');
  await page.waitForSelector('[data-testid=control-room-2d]');
  const cards = await page.textContent('[data-testid=kpi-cards]');
  assert(cards.includes(k3.service), `2D service differs (${k3.service})`);
  await shot(page, '10_control_room_2d_1440');
  await page.click('[data-testid=toggle-2d]');
  await page.waitForSelector('[data-testid=viewport] canvas');
  return `service ${k3.service} in both`;
});

await check('Same scenario twice gives identical events and KPIs (repeatability)', async () => {
  await page.click('[data-testid=preset-S3]');
  await waitKpi(page, ...EXPECT.S3);
  const a = await page.evaluate(() => JSON.stringify([window.__BEERAI__.getState().result.events, window.__BEERAI__.getState().result.kpis]));
  await page.click('[data-testid=run-simulation]');
  await sleep(500);
  const b = await page.evaluate(() => JSON.stringify([window.__BEERAI__.getState().result.events, window.__BEERAI__.getState().result.kpis]));
  assert(a === b, 'different');
  return 'identical';
});

// Screenshots at 1920×1080 in a fresh page (resizing a live headless/SwiftShader context can drop it).
await context.close();
const ctx1920 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p19 = await ctx1920.newPage();
watch(p19);
await check('1920×1080: S1 overview, fermentation/F1 and shipping views render', async () => {
  await p19.goto(`${BASE}?scenario=S1&day=21`);
  await waitKpi(p19, ...EXPECT.S1);
  await sleep(1500);
  await shot(p19, '11_overview_S1_day21_1920');
  await p19.click('[data-testid=view-fermentation]');
  await p19.click('[data-testid="equip-tank:F1"]');
  await sleep(1300);
  await shot(p19, '12_fermentation_F1_1920');
  await p19.click('[data-testid=view-shipping]');
  await p19.click('[data-testid=equip-shipping]');
  await sleep(1300);
  await shot(p19, '13_shipping_day21_1920');
  await p19.click('[data-testid=view-fermentation]');
  await sleep(2500);
  const st = await S(p19);
  assert(st.mode === '3d' && !st.webglIssue, `mode ${st.mode} issue ${st.webglIssue}`);
  return 'rendered in 3D (URL params ?scenario=S1&day=21)';
});
await check('Frame rate sample (headless Chrome — NOT representative of the demo Mac)', async () => {
  const p = await pose(p19);
  return `${p.fps} fps in headless Chrome ${browserVersion} at 1920×1080`;
});
const page2 = p19;
// Collect app-reported results per preset for the fallback cross-check.
const appKpis = {};
for (const id of Object.keys(EXPECT)) {
  await page2.click(`[data-testid=preset-${id}]`);
  await waitKpi(page2, ...EXPECT[id]);
  appKpis[id] = await page2.evaluate(() => JSON.stringify(window.__BEERAI__.getState().result.kpis));
}
await ctx1920.close();

// =============================================================================================
// Standalone 2D fallback from file:// (no server, no WebGL needed)
const fbContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const fb = await fbContext.newPage();
watch(fb);
await check('Standalone 2D fallback opens from file:// and matches the 3D app for S0–S5', async () => {
  await fb.goto(pathToFileURL(path.join(appDir, 'fallback', 'beerai-control-2d.html')).href);
  await fb.waitForSelector('[data-testid=control-room-2d]');
  const hasCanvas = await fb.$('canvas');
  assert(!hasCanvas, 'fallback created a canvas');
  for (const id of Object.keys(EXPECT)) {
    await fb.click(`[data-testid=preset-${id}]`);
    await fb.waitForFunction((sid) => window.__BEERAI__.getState().result?.config.scenario_id === sid, id);
    const k = await fb.evaluate(() => JSON.stringify(window.__BEERAI__.getState().result.kpis));
    assert(k === appKpis[id], `${id} differs from 3D app`);
  }
  await fb.click('[data-testid=preset-S1]');
  await fb.waitForFunction(() => window.__BEERAI__.getState().result?.config.scenario_id === 'S1');
  await fb.screenshot({ path: path.join(outDir, '14_fallback_2d_file_1440.png'), fullPage: false });
  return 'identical KPIs for all six presets (main-thread runner, same engine)';
});
await fbContext.close();

// Without localStorage (throws) the app must still work.
const nsContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await nsContext.addInitScript(() => {
  Object.defineProperty(window, 'localStorage', {
    get() {
      throw new Error('blocked');
    },
  });
});
const ns = await nsContext.newPage();
watch(ns);
await check('Works without localStorage (presets, run, reset)', async () => {
  await ns.goto(BASE);
  await waitKpi(ns, ...EXPECT.S0);
  await ns.click('[data-testid=preset-S3]');
  await waitKpi(ns, ...EXPECT.S3);
  await ns.click('[data-testid=reset-baseline]');
  await waitKpi(ns, ...EXPECT.S0);
  return 'OK';
});
await nsContext.close();
await browser.close();

// Browser with WebGL disabled → the app must switch to the 2D control room automatically.
const noGl = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
const ngPage = await (await noGl.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
watch(ngPage);
await check('Without WebGL the app opens the 2D control room with the same engine', async () => {
  await ngPage.goto(BASE);
  await ngPage.waitForSelector('[data-testid=control-room-2d]', { timeout: 10000 });
  await ngPage.waitForFunction(() => window.__BEERAI__.getState().result?.kpis.orders_due === 7);
  const banner = await ngPage.textContent('.banner-warn');
  assert(banner.includes('WebGL'), 'banner');
  return 'auto-switched to 2D with banner';
});
await noGl.close();

// =============================================================================================
await check('No network request left 127.0.0.1 (offline-capable build)', async () => {
  assert(foreignRequests.size === 0, [...foreignRequests].join(', '));
  return 'only 127.0.0.1 / file:// / data: / blob:';
});
const relevantErrors = consoleErrors.filter((e) => !/GPU stall|Automatic fallback to software WebGL|swiftshader/i.test(e));
await check('No console errors', async () => {
  assert(relevantErrors.length === 0, relevantErrors.slice(0, 5).join(' | '));
  return 'clean';
});

server.kill();
const failed = results.filter((r) => r.status === 'FAIL');
const report = {
  executed_at: new Date().toISOString(),
  browser: `Google Chrome ${browserVersion} (${process.env.HEADED ? 'headed' : 'headless'}), playwright-core`,
  platform: `${process.platform} ${process.arch}, Node ${process.version}`,
  base_url: BASE,
  app_dir: appDir,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
  console_errors: relevantErrors,
  foreign_requests: [...foreignRequests],
};
fs.writeFileSync(path.join(outDir, 'e2e-report.json'), JSON.stringify(report, null, 2));
console.log(`\n${report.passed} passed, ${report.failed} failed — report: ${path.relative(root, path.join(outDir, "e2e-report.json"))}`);
process.exit(failed.length ? 1 : 0);
