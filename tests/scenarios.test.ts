import { describe, expect, it } from 'vitest';
import { simulate } from '../src/simulation/engine';
import { PRESETS, buildPreset, type PresetId } from '../src/scenarios/presets';
import { BASELINE_S0 } from '../src/scenarios/baseline';
import { configToJson, importConfigJson } from '../src/scenarios/io';
import type { SimulationResult } from '../src/simulation/types';
import { checkInvariants } from './helpers';

/** Reference results, brief 05 §7 (computed separately on 6 Nov 2026). */
const REFERENCE: Record<PresetId, { demand: number; delivered: number; onTime: number; service: number; complete: [number, number]; backlog: number }> = {
  S0: { demand: 155, delivered: 155, onTime: 155, service: 1.0, complete: [7, 7], backlog: 0 },
  S1: { demand: 195, delivered: 195, onTime: 180, service: 0.9231, complete: [6, 8], backlog: 0 },
  S2: { demand: 195, delivered: 195, onTime: 180, service: 0.9231, complete: [6, 8], backlog: 0 },
  S3: { demand: 195, delivered: 195, onTime: 190, service: 0.9744, complete: [7, 8], backlog: 0 },
  S4: { demand: 201.5, delivered: 201.5, onTime: 167.5, service: 0.8313, complete: [5, 7], backlog: 0 },
  S5: { demand: 155, delivered: 155, onTime: 145, service: 0.9355, complete: [5, 7], backlog: 0 },
};

const run = (id: PresetId) => simulate(buildPreset(id));
const shipments = (r: SimulationResult, orderId: string) =>
  r.orders.find((o) => o.id === orderId)!.shipments.map((s) => [s.day, s.quantity_hl]);
const newBrews = (r: SimulationResult) => r.batches.filter((b) => !b.initial).map((b) => `${b.start_day}/${b.tank_id}/${b.product_id}`);

describe('S0–S5 reproduce the reference table', () => {
  for (const p of PRESETS) {
    it(`${p.id} — ${p.name}`, () => {
      const r = run(p.id);
      const ref = REFERENCE[p.id];
      expect(r.kpis.demand_hl).toBeCloseTo(ref.demand, 8);
      expect(r.kpis.delivered_hl).toBeCloseTo(ref.delivered, 8);
      expect(r.kpis.on_time_hl).toBeCloseTo(ref.onTime, 8);
      expect(Math.round(r.kpis.service_level! * 10000) / 10000).toBeCloseTo(ref.service, 4);
      expect([r.kpis.orders_complete_on_time, r.kpis.orders_due]).toEqual(ref.complete);
      expect(r.kpis.final_backlog_hl).toBeCloseTo(ref.backlog, 8);
      // All reference scenarios end with no WIP and no buffer.
      for (const v of Object.values(r.kpis.final_wip)) expect(v).toBeCloseTo(0, 9);
      for (const v of Object.values(r.kpis.final_buffer)) expect(v).toBeCloseTo(0, 9);
      checkInvariants(r);
    });
  }
});

describe('reference details (brief §7)', () => {
  it('S0: new batches 0/F4/B, 4/F1/A, 6/F3/A, 8/F2/B, 19/F1/A; 100 hL; final stock A=5, B=15', () => {
    const r = run('S0');
    expect(newBrews(r)).toEqual(['0/F4/B', '4/F1/A', '6/F3/A', '8/F2/B', '19/F1/A']);
    expect(r.batches.filter((b) => !b.initial).map((b) => b.id)).toEqual(['L001', 'L002', 'L003', 'L004', 'L005']);
    expect(r.kpis.new_brew_hl).toBe(100);
    expect(r.kpis.final_stock).toEqual({ A: 5, B: 15 });
  });

  it('S1: O08 complete on day 21; O05 20@28 + 10@33; O06 15@35 + 5@42; 140 hL; final stock A=5, B=15', () => {
    const r = run('S1');
    expect(shipments(r, 'O08')).toEqual([[21, 40]]);
    expect(shipments(r, 'O05')).toEqual([
      [28, 20],
      [33, 10],
    ]);
    expect(shipments(r, 'O06')).toEqual([
      [35, 15],
      [42, 5],
    ]);
    expect(r.kpis.new_brew_hl).toBe(140);
    expect(r.kpis.final_stock).toEqual({ A: 5, B: 15 });
  });

  it('S2: same results and deliveries as S1 (packaging ×2 does not relieve the constraint)', () => {
    const r1 = run('S1');
    const r2 = run('S2');
    expect(r2.kpis).toEqual(r1.kpis);
    expect(r2.orders.map((o) => o.shipments.map((s) => [s.day, s.quantity_hl]))).toEqual(
      r1.orders.map((o) => o.shipments.map((s) => [s.day, s.quantity_hl])),
    );
  });

  it('S3: O05 back on time; O06 15@35 + last 5@37 (residual delay remains)', () => {
    const r = run('S3');
    expect(r.orders.find((o) => o.id === 'O05')!.status).toBe('on_time');
    expect(shipments(r, 'O06')).toEqual([
      [35, 15],
      [37, 5],
    ]);
    expect(r.config.tanks.map((t) => t.id)).toContain('F5');
  });

  it('S4: final stock A=13.5, B=0; O04 last 14 hL on day 25; O06 last 20 on day 36', () => {
    const r = run('S4');
    expect(r.kpis.final_stock.A).toBeCloseTo(13.5, 9);
    expect(r.kpis.final_stock.B).toBeCloseTo(0, 9);
    const o04 = r.orders.find((o) => o.id === 'O04')!.shipments;
    expect(o04[o04.length - 1].day).toBe(25);
    expect(o04[o04.length - 1].quantity_hl).toBeCloseTo(14, 9);
    const o06 = r.orders.find((o) => o.id === 'O06')!.shipments;
    expect(o06[o06.length - 1].day).toBe(36);
    expect(o06[o06.length - 1].quantity_hl).toBeCloseTo(20, 9);
  });

  it('S5: O04 last 5 hL on day 25; O06 last 5 on day 42', () => {
    const r = run('S5');
    const o04 = r.orders.find((o) => o.id === 'O04')!.shipments;
    expect(o04[o04.length - 1]).toMatchObject({ day: 25, quantity_hl: 5 });
    const o06 = r.orders.find((o) => o.id === 'O06')!.shipments;
    expect(o06[o06.length - 1]).toMatchObject({ day: 42, quantity_hl: 5 });
  });
});

describe('scenario isolation, import/export', () => {
  it('presets are independent copies (no accumulation)', () => {
    const a = buildPreset('S1');
    a.orders.push({ id: 'ZZ', customer: 'x', product_id: 'A', quantity_hl: 1, due_day: 1 });
    a.tanks[0].capacity_hl = 999;
    expect(buildPreset('S1').orders.map((o) => o.id)).not.toContain('ZZ');
    expect(buildPreset('S0').tanks[0].capacity_hl).toBe(20);
    expect(BASELINE_S0.orders).toHaveLength(7);
    expect(buildPreset('S3').orders).toHaveLength(8);
    expect(buildPreset('S0').tanks.map((t) => t.id)).not.toContain('F5');
  });

  it('S0 preset equals the dataset in the brief', () => {
    expect(buildPreset('S0')).toEqual(BASELINE_S0);
  });

  it('export → import is equivalent and gives identical results', () => {
    for (const p of PRESETS) {
      const cfg = buildPreset(p.id);
      const back = importConfigJson(configToJson(cfg));
      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(JSON.stringify(simulate(back.config).kpis)).toBe(JSON.stringify(simulate(cfg).kpis));
      expect(back.config.schema_version).toBe(1);
      expect(back.config.name).toBe(cfg.name);
    }
  });

  it('import rejects invalid JSON and invalid configs without throwing', () => {
    expect(importConfigJson('{nope').ok).toBe(false);
    const bad = importConfigJson(JSON.stringify({ ...BASELINE_S0, horizon_day: -3 }));
    expect(bad.ok).toBe(false);
  });

  it('import accepts the wrapper {schema_version, name, config}', () => {
    const r = importConfigJson(JSON.stringify({ schema_version: 1, name: 'w', config: buildPreset('S2') }));
    expect(r.ok).toBe(true);
  });
});
