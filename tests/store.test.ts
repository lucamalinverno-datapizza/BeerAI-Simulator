import { beforeEach, describe, expect, it } from 'vitest';
import { executeRun, setRunner } from '../src/simulation/runner';
import { appStore, selectStale } from '../src/state/store';
import { buildPreset } from '../src/scenarios/presets';
import { configHash } from '../src/scenarios/io';

/** Fake runner with per-scenario latency: lets us force an older run to finish after a newer one. */
function delayedRunner(delays: Record<string, number>) {
  setRunner({
    kind: 'main-thread',
    run: (config, runId) => new Promise((res) => setTimeout(() => res(executeRun(config, runId, 'main-thread')), delays[config.scenario_id] ?? 1)),
  });
}

describe('store: run lifecycle (brief §3.1, §9)', () => {
  beforeEach(async () => {
    delayedRunner({});
    await appStore.getState().resetToBaseline();
  });

  it('a superseded (older, slower) run never replaces the latest result', async () => {
    delayedRunner({ S1: 60, S3: 5 });
    const slow = appStore.getState().loadPreset('S1');
    const fast = appStore.getState().loadPreset('S3');
    await Promise.all([slow, fast]);
    const st = appStore.getState();
    expect(st.result?.config.scenario_id).toBe('S3');
    expect(st.completedRunId).toBe(st.latestRunId);
  });

  it('editing inputs marks results stale; Run recomputes from day 0 without residues', async () => {
    await appStore.getState().loadPreset('S1');
    expect(selectStale(appStore.getState())).toBe(false);
    appStore.getState().updateDraft((c) => void (c.packaging_capacity_hl_per_day = 60));
    expect(selectStale(appStore.getState())).toBe(true);
    expect(appStore.getState().activePreset).toBeNull();
    await appStore.getState().runSimulation();
    const st = appStore.getState();
    expect(selectStale(st)).toBe(false);
    expect(st.result?.config.packaging_capacity_hl_per_day).toBe(60);
    expect(st.result?.kpis.on_time_hl).toBe(180); // = S2
    await appStore.getState().runSimulation();
    expect(appStore.getState().result?.kpis.on_time_hl).toBe(180); // repeat run: identical
  });

  it('invalid inputs block the run and keep the previous result', async () => {
    await appStore.getState().loadPreset('S0');
    const before = appStore.getState().result;
    appStore.getState().updateDraft((c) => void (c.horizon_day = -1));
    await appStore.getState().runSimulation();
    const st = appStore.getState();
    expect(st.runIssues?.length).toBeGreaterThan(0);
    expect(st.result).toBe(before);
  });

  it('Reset to baseline returns exactly to S0 (orders, WIP, stocks, tanks)', async () => {
    await appStore.getState().loadPreset('S3');
    appStore.getState().updateDraft((c) => {
      c.initial_finished_stock_hl.A = 99;
      c.orders.pop();
    });
    await appStore.getState().resetToBaseline();
    const st = appStore.getState();
    expect(configHash(st.draft)).toBe(configHash(buildPreset('S0')));
    expect(st.draft).toEqual(buildPreset('S0'));
    expect(st.result?.config.tanks.map((t) => t.id)).toEqual(['F1', 'F2', 'F3', 'F4']);
    expect(st.currentDay).toBe(0);
  });

  it('export → import through the store restores the same results', async () => {
    await appStore.getState().loadPreset('S4');
    const { text } = appStore.getState().exportJson();
    const kpis = JSON.stringify(appStore.getState().result?.kpis);
    await appStore.getState().loadPreset('S0');
    expect(await appStore.getState().importJsonText(text, 'S4.json')).toBe(true);
    expect(JSON.stringify(appStore.getState().result?.kpis)).toBe(kpis);
    expect(await appStore.getState().importJsonText('{"broken":', 'x.json')).toBe(false);
    expect(JSON.stringify(appStore.getState().result?.kpis)).toBe(kpis);
  });

  it('playback changes only the displayed day', async () => {
    await appStore.getState().loadPreset('S1');
    const k = JSON.stringify(appStore.getState().result?.kpis);
    appStore.getState().setDay(10);
    appStore.getState().tick();
    appStore.getState().tick();
    expect(appStore.getState().currentDay).toBe(12);
    appStore.getState().setDay(999);
    expect(appStore.getState().currentDay).toBe(42);
    expect(JSON.stringify(appStore.getState().result?.kpis)).toBe(k);
  });
});
