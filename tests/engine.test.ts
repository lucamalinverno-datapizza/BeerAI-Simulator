import { describe, expect, it } from 'vitest';
import { simulate } from '../src/simulation/engine';
import type { ScenarioConfig, SimulationResult } from '../src/simulation/types';
import { checkInvariants } from './helpers';
import { validateConfig, ConfigError } from '../src/simulation/validate';

/** Base for T1–T5 (brief §8): single product, 20 hL lot & tank, residence 2, cleaning 1, 1 start/day, packaging 20 hL/day. */
function tiny(overrides: Partial<ScenarioConfig> = {}): ScenarioConfig {
  return {
    schema_version: 1,
    scenario_id: 'T',
    name: 'tiny',
    synthetic_data: true,
    horizon_day: 2,
    batch_volume_hl: 20,
    max_batches_per_day: 1,
    packaging_capacity_hl_per_day: 20,
    cleaning_days: 1,
    products: [{ id: 'P', name: 'Product', residence_days: 2 }],
    tanks: [{ id: 'T1', capacity_hl: 20, unavailable: [] }],
    initial_finished_stock_hl: {},
    initial_wip: [],
    orders: [],
    ...overrides,
  };
}

const deliveriesByDay = (r: SimulationResult) =>
  r.snapshots.map((s) => Object.values(s.delivered_today).reduce((a, b) => a + b, 0));
const brewDays = (r: SimulationResult) => r.batches.filter((b) => !b.initial).map((b) => b.start_day);

describe('T1–T5 hand-checkable cases (brief §8)', () => {
  it('T1 — maturation: start day 0, nothing before day 2, 20 hL on day 2', () => {
    const r = simulate(tiny({ horizon_day: 2, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }] }));
    expect(brewDays(r)).toEqual([0]);
    expect(deliveriesByDay(r)).toEqual([0, 0, 20]);
    expect(r.kpis.on_time_hl).toBe(20);
    expect(r.kpis.service_level).toBe(1);
    checkInvariants(r);
  });

  it('T2 — cleaning: starts on days 0 and 3, never 2; both deliveries on time', () => {
    const r = simulate(
      tiny({
        horizon_day: 5,
        orders: [
          { id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 },
          { id: 'X2', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 5 },
        ],
      }),
    );
    expect(brewDays(r)).toEqual([0, 3]);
    expect(brewDays(r)).not.toContain(2);
    expect(r.orders.map((o) => o.status)).toEqual(['on_time', 'on_time']);
    expect(r.kpis.orders_complete_on_time).toBe(2);
    checkInvariants(r);
  });

  it('T3 — residual WIP: 20 delivered on time, 20 backlog, 20 still in process', () => {
    const r = simulate(tiny({ horizon_day: 4, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 40, due_day: 2 }] }));
    expect(r.kpis.delivered_hl).toBe(20);
    expect(r.kpis.on_time_hl).toBe(20);
    expect(r.kpis.final_backlog_hl).toBe(20);
    expect(r.kpis.final_wip.P).toBe(20);
    expect(brewDays(r)).toEqual([0, 3]);
    const late = r.orders[0];
    expect(late.status).toBe('open_late');
    expect(late.completion_day).toBeNull();
    expect(late.open_delay_age_days).toBe(2);
    expect(r.batches.find((b) => b.start_day === 3)!.beyond_horizon).toBe(true);
    checkInvariants(r);
  });

  it('T4 — packaging limit: 10 on day 2, 10 on day 3; service 50%, 0/1 complete on time, backlog 0', () => {
    const r = simulate(
      tiny({ horizon_day: 3, packaging_capacity_hl_per_day: 10, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }] }),
    );
    expect(deliveriesByDay(r)).toEqual([0, 0, 10, 10]);
    expect(r.kpis.service_level).toBe(0.5);
    expect(r.kpis.orders_complete_on_time).toBe(0);
    expect(r.kpis.orders_due).toBe(1);
    expect(r.kpis.final_backlog_hl).toBe(0);
    expect(r.orders[0].delay_days).toBe(1);
    checkInvariants(r);
  });

  it('T5 — available stock: 10 delivered on day 0, 10 backlog, no production', () => {
    const r = simulate(
      tiny({
        horizon_day: 3,
        max_batches_per_day: 0,
        initial_finished_stock_hl: { P: 10 },
        orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 0 }],
      }),
    );
    expect(deliveriesByDay(r)).toEqual([10, 0, 0, 0]);
    expect(r.kpis.final_backlog_hl).toBe(10);
    expect(r.kpis.batches_started).toBe(0);
    expect(r.kpis.new_brew_hl).toBe(0);
    checkInvariants(r);
  });
});

describe('edge cases and invariants', () => {
  it('zero demand → service N/A, no production', () => {
    const r = simulate(tiny({ horizon_day: 5 }));
    expect(r.kpis.demand_hl).toBe(0);
    expect(r.kpis.service_level).toBeNull();
    expect(r.kpis.batches_started).toBe(0);
    checkInvariants(r);
  });

  it('zero packaging capacity → nothing packaged or delivered', () => {
    const r = simulate(
      tiny({ horizon_day: 6, packaging_capacity_hl_per_day: 0, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }] }),
    );
    expect(r.kpis.delivered_hl).toBe(0);
    expect(r.kpis.final_buffer.P).toBe(20);
    checkInvariants(r);
  });

  it('zero tank capacity / no compatible tank → brew blocked, no new production', () => {
    const r = simulate(
      tiny({ horizon_day: 4, tanks: [{ id: 'T1', capacity_hl: 10, unavailable: [] }], orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }] }),
    );
    expect(r.kpis.batches_started).toBe(0);
    expect(r.events.some((e) => e.type === 'brew_blocked')).toBe(true);
    checkInvariants(r);
  });

  it('no tanks at all is valid with zero new production', () => {
    const r = simulate(tiny({ horizon_day: 4, tanks: [], orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }] }));
    expect(r.kpis.batches_started).toBe(0);
    expect(r.kpis.final_backlog_hl).toBe(20);
    checkInvariants(r);
  });

  it('horizon 0 works (single instant)', () => {
    const r = simulate(tiny({ horizon_day: 0, initial_finished_stock_hl: { P: 5 }, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 5, due_day: 0 }] }));
    expect(r.snapshots).toHaveLength(1);
    expect(r.kpis.service_level).toBe(1);
    expect(r.utilization[0].residence_share).toBeNull();
    checkInvariants(r);
  });

  it('initial WIP maturing beyond the horizon stays WIP and counts in coverage', () => {
    const r = simulate(
      tiny({
        horizon_day: 3,
        initial_wip: [{ id: 'W1', tank_id: 'T1', product_id: 'P', volume_hl: 20, ready_day: 10 }],
        orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 12 }],
      }),
    );
    expect(r.kpis.batches_started).toBe(0); // covered by WIP → no new batch
    expect(r.kpis.final_wip.P).toBe(20);
    expect(r.kpis.demand_hl).toBe(0); // order due after horizon
    expect(r.orders[0].status).toBe('not_due');
    checkInvariants(r);
  });

  it('unavailability blocks assignment whose occupancy+cleaning intersects the window', () => {
    const r = simulate(
      tiny({
        horizon_day: 8,
        tanks: [{ id: 'T1', capacity_hl: 20, unavailable: [{ start_day: 2, end_day: 4 }] }],
        orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }],
      }),
    );
    // [d, d+3) must not intersect [2,4) → first allowed start is day 4.
    expect(brewDays(r)).toEqual([4]);
    expect(r.snapshots[2].tanks[0].status).toBe('unavailable');
    checkInvariants(r);
  });

  it('repeatability: two runs are identical', () => {
    const cfg = tiny({
      horizon_day: 10,
      orders: [
        { id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 30, due_day: 3 },
        { id: 'X2', customer: 'c', product_id: 'P', quantity_hl: 10, due_day: 6 },
      ],
    });
    expect(JSON.stringify(simulate(cfg))).toBe(JSON.stringify(simulate(cfg)));
  });

  it('does not mutate its input', () => {
    const cfg = tiny({ horizon_day: 4, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 2 }] });
    const before = JSON.stringify(cfg);
    simulate(cfg);
    expect(JSON.stringify(cfg)).toBe(before);
  });

  it('a batch started on the last day is WIP, not ready product', () => {
    const r = simulate(tiny({ horizon_day: 0, orders: [{ id: 'X1', customer: 'c', product_id: 'P', quantity_hl: 20, due_day: 5 }] }));
    expect(r.kpis.batches_started).toBe(1);
    expect(r.kpis.final_wip.P).toBe(20);
    expect(r.kpis.final_stock.P).toBe(0);
  });
});

describe('validation (brief §9)', () => {
  const issuesFor = (c: unknown) => validateConfig(c).map((i) => i.path);

  it('accepts the tiny config', () => expect(validateConfig(tiny())).toEqual([]));
  it('rejects negative / non-integer / non-finite values', () => {
    expect(issuesFor(tiny({ horizon_day: -1 }))).toContain('horizon_day');
    expect(issuesFor(tiny({ horizon_day: 2.5 }))).toContain('horizon_day');
    expect(issuesFor(tiny({ batch_volume_hl: 0 }))).toContain('batch_volume_hl');
    expect(issuesFor(tiny({ packaging_capacity_hl_per_day: Number.POSITIVE_INFINITY }))).toContain('packaging_capacity_hl_per_day');
    expect(issuesFor(tiny({ cleaning_days: -1 }))).toContain('cleaning_days');
    expect(issuesFor(tiny({ max_batches_per_day: 1.5 }))).toContain('max_batches_per_day');
    expect(issuesFor(tiny({ products: [{ id: 'P', name: 'p', residence_days: 0 }] }))).toContain('products[0].residence_days');
    expect(issuesFor(tiny({ tanks: [{ id: 'T1', capacity_hl: -5, unavailable: [] }] }))).toContain('tanks[0].capacity_hl');
    expect(issuesFor(tiny({ initial_finished_stock_hl: { P: -1 } }))).toContain('initial_finished_stock_hl.P');
    expect(issuesFor(tiny({ orders: [{ id: 'X', customer: 'c', product_id: 'P', quantity_hl: 0, due_day: 1 }] }))).toContain('orders[0].quantity_hl');
    expect(issuesFor(tiny({ orders: [{ id: 'X', customer: 'c', product_id: 'P', quantity_hl: Number.NaN, due_day: 1 }] }))).toContain('orders[0].quantity_hl');
    expect(issuesFor(tiny({ orders: [{ id: 'X', customer: 'c', product_id: 'P', quantity_hl: 5, due_day: 1.2 }] }))).toContain('orders[0].due_day');
  });
  it('rejects duplicate IDs and unknown references', () => {
    expect(issuesFor(tiny({ tanks: [{ id: 'T1', capacity_hl: 20, unavailable: [] }, { id: 'T1', capacity_hl: 20, unavailable: [] }] }))).toContain('tanks[1].id');
    expect(issuesFor(tiny({ orders: [{ id: 'X', customer: 'c', product_id: 'Z', quantity_hl: 5, due_day: 1 }] }))).toContain('orders[0].product_id');
    expect(
      issuesFor(
        tiny({
          orders: [
            { id: 'X', customer: 'c', product_id: 'P', quantity_hl: 5, due_day: 1 },
            { id: 'X', customer: 'c', product_id: 'P', quantity_hl: 5, due_day: 2 },
          ],
        }),
      ),
    ).toContain('orders[1].id');
    expect(issuesFor(tiny({ initial_wip: [{ id: 'W', tank_id: 'NOPE', product_id: 'P', volume_hl: 5, ready_day: 1 }] }))).toContain('initial_wip[0].tank_id');
    expect(issuesFor(tiny({ initial_finished_stock_hl: { Z: 5 } }))).toContain('initial_finished_stock_hl.Z');
  });
  it('rejects WIP over capacity, two WIP in one tank, reserved IDs', () => {
    expect(issuesFor(tiny({ initial_wip: [{ id: 'W', tank_id: 'T1', product_id: 'P', volume_hl: 25, ready_day: 1 }] }))).toContain('initial_wip[0].volume_hl');
    expect(
      issuesFor(
        tiny({
          initial_wip: [
            { id: 'W1', tank_id: 'T1', product_id: 'P', volume_hl: 10, ready_day: 1 },
            { id: 'W2', tank_id: 'T1', product_id: 'P', volume_hl: 10, ready_day: 2 },
          ],
        }),
      ),
    ).toContain('initial_wip[1].tank_id');
    expect(issuesFor(tiny({ initial_wip: [{ id: 'L001', tank_id: 'T1', product_id: 'P', volume_hl: 10, ready_day: 1 }] }))).toContain('initial_wip[0].id');
  });
  it('accepts ready_day = 0 for initial WIP', () => {
    const r = simulate(tiny({ horizon_day: 1, initial_wip: [{ id: 'W', tank_id: 'T1', product_id: 'P', volume_hl: 20, ready_day: 0 }] }));
    expect(r.snapshots[0].released_today).toEqual(['W']);
  });
  it('flags unavailability overlapping an initial batch as inconsistent (no silent fix)', () => {
    const cfg = tiny({
      tanks: [{ id: 'T1', capacity_hl: 20, unavailable: [{ start_day: 1, end_day: 3 }] }],
      initial_wip: [{ id: 'W', tank_id: 'T1', product_id: 'P', volume_hl: 20, ready_day: 2 }],
    });
    expect(issuesFor(cfg)).toContain('tanks.T1.unavailable');
    expect(() => simulate(cfg)).toThrow(ConfigError);
  });
  it('rejects garbage input', () => {
    expect(validateConfig(null).length).toBeGreaterThan(0);
    expect(validateConfig({}).length).toBeGreaterThan(0);
    expect(validateConfig([]).length).toBeGreaterThan(0);
  });
});
