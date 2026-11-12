import { SCHEMA_VERSION, type ScenarioConfig, type ValidationIssue } from '../simulation/types';
import { validateConfig } from '../simulation/validate';

/** Canonical, stable JSON for a configuration (keys in schema order). Used for export and staleness hashing. */
export function canonicalConfig(c: ScenarioConfig): ScenarioConfig {
  return {
    schema_version: SCHEMA_VERSION,
    scenario_id: c.scenario_id,
    name: c.name,
    synthetic_data: c.synthetic_data,
    ...(c.description !== undefined ? { description: c.description } : {}),
    ...(c.based_on !== undefined ? { based_on: c.based_on } : {}),
    horizon_day: c.horizon_day,
    batch_volume_hl: c.batch_volume_hl,
    max_batches_per_day: c.max_batches_per_day,
    packaging_capacity_hl_per_day: c.packaging_capacity_hl_per_day,
    cleaning_days: c.cleaning_days,
    products: c.products.map((p) => ({ id: p.id, name: p.name, residence_days: p.residence_days })),
    tanks: c.tanks.map((t) => ({
      id: t.id,
      capacity_hl: t.capacity_hl,
      unavailable: t.unavailable.map((w) => ({ start_day: w.start_day, end_day: w.end_day, ...(w.note ? { note: w.note } : {}) })),
    })),
    initial_finished_stock_hl: { ...c.initial_finished_stock_hl },
    initial_wip: c.initial_wip.map((w) => ({ id: w.id, tank_id: w.tank_id, product_id: w.product_id, volume_hl: w.volume_hl, ready_day: w.ready_day })),
    orders: c.orders.map((o) => ({ id: o.id, customer: o.customer, product_id: o.product_id, quantity_hl: o.quantity_hl, due_day: o.due_day })),
  };
}

export function configToJson(c: ScenarioConfig): string {
  return JSON.stringify(canonicalConfig(c), null, 2) + '\n';
}

/** Hash of the inputs that influence the simulation (name/description excluded). */
export function configHash(c: ScenarioConfig): string {
  const k = canonicalConfig(c);
  const { name: _n, description: _d, scenario_id: _s, based_on: _b, ...rest } = k;
  return JSON.stringify(rest);
}

export type ImportResult = { ok: true; config: ScenarioConfig } | { ok: false; issues: ValidationIssue[] };

/**
 * Parses an exported scenario. Accepts either the bare configuration or a wrapper
 * `{ schema_version, name, config }`. Never fetches adjacent files: input is the text of a user-selected file.
 */
export function importConfigJson(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, issues: [{ path: '$', message: `Not valid JSON: ${(e as Error).message}` }] };
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && 'config' in data && !('tanks' in data)) {
    data = (data as { config: unknown }).config;
  }
  // Tolerate tanks exported without the unavailable array (e.g. hand-written JSON).
  if (data && typeof data === 'object' && Array.isArray((data as ScenarioConfig).tanks)) {
    for (const t of (data as ScenarioConfig).tanks) {
      if (t && typeof t === 'object' && !('unavailable' in t)) (t as { unavailable: unknown[] }).unavailable = [];
    }
  }
  const issues = validateConfig(data);
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, config: canonicalConfig(data as ScenarioConfig) };
}
