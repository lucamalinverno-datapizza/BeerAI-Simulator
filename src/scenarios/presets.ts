import type { ScenarioConfig } from '../simulation/types';
import { BASELINE_S0 } from './baseline';

/**
 * Scenario presets S0–S5 (brief 05 §6). Every preset is built as an independent deep copy of its
 * starting point: switching presets never accumulates modifications. Added resources are
 * counterfactual (available from day 0, no purchase/installation time).
 */
export type PresetId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export interface PresetInfo {
  id: PresetId;
  short: string;
  name: string;
  basedOn: PresetId | 'dataset';
  change: string;
  build: () => ScenarioConfig;
}

const copy = (c: ScenarioConfig): ScenarioConfig => JSON.parse(JSON.stringify(c)) as ScenarioConfig;

/** Rounds derived input quantities (not internal state) to avoid binary artefacts such as 20×1.3 = 26.000000000000004. */
const roundInput = (x: number): number => Math.round(x * 1e6) / 1e6;

function s0(): ScenarioConfig {
  return copy(BASELINE_S0);
}

function s1(): ScenarioConfig {
  const c = s0();
  c.scenario_id = 'S1';
  c.name = 'New Festival order';
  c.based_on = 'S0';
  c.description = 'S0 + order O08: Festival, product A, 40 hL, due day 21.';
  c.orders.push({ id: 'O08', customer: 'Festival', product_id: 'A', quantity_hl: 40, due_day: 21 });
  return c;
}

function s2(): ScenarioConfig {
  const c = s1();
  c.scenario_id = 'S2';
  c.name = 'Festival + packaging ×2';
  c.based_on = 'S1';
  c.description = 'S1 with packaging capacity raised from 30 to 60 hL/day.';
  c.packaging_capacity_hl_per_day = 60;
  return c;
}

function s3(): ScenarioConfig {
  const c = s1();
  c.scenario_id = 'S3';
  c.name = 'Festival + extra tank F5';
  c.based_on = 'S1';
  c.description = 'S1 + empty fermenter F5 (20 hL), available from day 0.';
  c.tanks.push({ id: 'F5', capacity_hl: 20, unavailable: [] });
  return c;
}

function s4(): ScenarioConfig {
  const c = s0();
  c.scenario_id = 'S4';
  c.name = 'Demand +30%';
  c.based_on = 'S0';
  c.description = 'S0 with every existing order quantity ×1.30; stocks unchanged, no O08.';
  c.orders = c.orders.map((o) => ({ ...o, quantity_hl: roundInput(o.quantity_hl * 1.3) }));
  return c;
}

function s5(): ScenarioConfig {
  const c = s0();
  c.scenario_id = 'S5';
  c.name = 'F4 unavailable days 0–21';
  c.based_on = 'S0';
  c.description = 'S0 with tank F4 unavailable in [0, 21); nothing else changes.';
  const f4 = c.tanks.find((t) => t.id === 'F4')!;
  f4.unavailable = [{ start_day: 0, end_day: 21, note: 'Planned maintenance' }];
  return c;
}

export const PRESETS: PresetInfo[] = [
  { id: 'S0', short: 'S0', name: 'Existing commitments', basedOn: 'dataset', change: 'Existing commitments.', build: s0 },
  { id: 'S1', short: 'S1', name: 'New Festival order', basedOn: 'S0', change: 'Add O08 — Festival, A, 40 hL, due day 21.', build: s1 },
  { id: 'S2', short: 'S2', name: 'Festival + packaging ×2', basedOn: 'S1', change: 'Packaging 30 → 60 hL/day.', build: s2 },
  { id: 'S3', short: 'S3', name: 'Festival + extra tank F5', basedOn: 'S1', change: 'Add empty fermenter F5, 20 hL, from day 0.', build: s3 },
  { id: 'S4', short: 'S4', name: 'Demand +30%', basedOn: 'S0', change: 'All existing order quantities ×1.30.', build: s4 },
  { id: 'S5', short: 'S5', name: 'F4 unavailable 0–21', basedOn: 'S0', change: 'F4 unavailable in [0, 21).', build: s5 },
];

export function buildPreset(id: PresetId): ScenarioConfig {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown preset ${id}`);
  return p.build();
}

export const PRESET_FILE_NAMES: Record<PresetId, string> = {
  S0: 'S0_existing.json',
  S1: 'S1_new_order.json',
  S2: 'S2_packaging_x2.json',
  S3: 'S3_extra_tank.json',
  S4: 'S4_demand_plus30.json',
  S5: 'S5_tank_unavailable.json',
};
