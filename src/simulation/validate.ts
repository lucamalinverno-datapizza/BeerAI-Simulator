import { SCHEMA_VERSION, type ScenarioConfig, type ValidationIssue } from './types';

/** Thrown by the engine when the configuration is not valid; never auto-corrected. */
export class ConfigError extends Error {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(`Invalid configuration: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonNegInt = (v: unknown): v is number => isFiniteNum(v) && Number.isInteger(v) && v >= 0;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** New batch IDs are generated as L001, L002, … — initial WIP must not collide with them. */
export const NEW_BATCH_ID_PATTERN = /^L\d{3,}$/;

/**
 * Validates a configuration before execution (brief §9). Returns every issue found;
 * an empty array means the configuration can be simulated.
 * Accepts `unknown` so imported JSON can be checked safely.
 */
export function validateConfig(input: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  if (!isObj(input)) {
    add('$', 'Configuration must be a JSON object.');
    return issues;
  }
  const c = input as Partial<ScenarioConfig> & Record<string, unknown>;

  if (c.schema_version !== SCHEMA_VERSION) add('schema_version', `Must be ${SCHEMA_VERSION}.`);
  if (typeof c.scenario_id !== 'string') add('scenario_id', 'Must be a string.');
  if (typeof c.name !== 'string') add('name', 'Must be a string.');

  if (!isNonNegInt(c.horizon_day)) add('horizon_day', 'Must be a finite non-negative integer.');
  if (!isFiniteNum(c.batch_volume_hl) || c.batch_volume_hl <= 0) add('batch_volume_hl', 'Must be a finite positive number.');
  if (!isNonNegInt(c.max_batches_per_day)) add('max_batches_per_day', 'Must be a finite non-negative integer.');
  if (!isFiniteNum(c.packaging_capacity_hl_per_day) || c.packaging_capacity_hl_per_day < 0)
    add('packaging_capacity_hl_per_day', 'Must be a finite non-negative number.');
  if (!isNonNegInt(c.cleaning_days)) add('cleaning_days', 'Must be a finite non-negative integer.');

  // Products
  const productIds = new Set<string>();
  if (!Array.isArray(c.products)) {
    add('products', 'Must be an array.');
  } else {
    c.products.forEach((p, i) => {
      const path = `products[${i}]`;
      if (!isObj(p)) return add(path, 'Must be an object.');
      if (!isStr(p.id)) add(`${path}.id`, 'Must be a non-empty string.');
      else if (productIds.has(p.id)) add(`${path}.id`, `Duplicate product ID "${p.id}".`);
      else productIds.add(p.id);
      if (typeof p.name !== 'string') add(`${path}.name`, 'Must be a string.');
      if (!isNonNegInt(p.residence_days) || (p.residence_days as number) < 1)
        add(`${path}.residence_days`, 'Must be an integer of at least 1 day.');
    });
  }

  // Tanks
  const tankIds = new Set<string>();
  const tankCapacity = new Map<string, number>();
  const tankWindows = new Map<string, { start: number; end: number }[]>();
  if (!Array.isArray(c.tanks)) {
    add('tanks', 'Must be an array.');
  } else {
    c.tanks.forEach((t, i) => {
      const path = `tanks[${i}]`;
      if (!isObj(t)) return add(path, 'Must be an object.');
      const idOk = isStr(t.id);
      if (!idOk) add(`${path}.id`, 'Must be a non-empty string.');
      else if (tankIds.has(t.id as string)) add(`${path}.id`, `Duplicate tank ID "${t.id}".`);
      else tankIds.add(t.id as string);
      if (!isFiniteNum(t.capacity_hl) || (t.capacity_hl as number) < 0) add(`${path}.capacity_hl`, 'Must be a finite non-negative number.');
      else if (idOk) tankCapacity.set(t.id as string, t.capacity_hl as number);
      if (!Array.isArray(t.unavailable)) {
        add(`${path}.unavailable`, 'Must be an array (use [] for none).');
      } else {
        const windows: { start: number; end: number }[] = [];
        t.unavailable.forEach((w, j) => {
          const wp = `${path}.unavailable[${j}]`;
          if (!isObj(w)) return add(wp, 'Must be an object {start_day, end_day}.');
          const okS = isNonNegInt(w.start_day);
          const okE = isNonNegInt(w.end_day);
          if (!okS) add(`${wp}.start_day`, 'Must be a finite non-negative integer.');
          if (!okE) add(`${wp}.end_day`, 'Must be a finite non-negative integer.');
          if (okS && okE) {
            if ((w.end_day as number) <= (w.start_day as number)) add(wp, 'end_day must be greater than start_day ([start, end) window).');
            else windows.push({ start: w.start_day as number, end: w.end_day as number });
          }
        });
        if (idOk) tankWindows.set(t.id as string, windows);
      }
    });
  }

  // Initial finished stock
  if (!isObj(c.initial_finished_stock_hl)) {
    add('initial_finished_stock_hl', 'Must be an object {productId: hL}.');
  } else {
    for (const [pid, v] of Object.entries(c.initial_finished_stock_hl)) {
      const path = `initial_finished_stock_hl.${pid}`;
      if (!productIds.has(pid)) add(path, `Unknown product "${pid}".`);
      if (!isFiniteNum(v) || v < 0) add(path, 'Must be a finite non-negative number.');
    }
  }

  // Initial WIP
  const wipIds = new Set<string>();
  const wipTanks = new Set<string>();
  if (!Array.isArray(c.initial_wip)) {
    add('initial_wip', 'Must be an array.');
  } else {
    c.initial_wip.forEach((w, i) => {
      const path = `initial_wip[${i}]`;
      if (!isObj(w)) return add(path, 'Must be an object.');
      if (!isStr(w.id)) add(`${path}.id`, 'Must be a non-empty string.');
      else if (wipIds.has(w.id as string)) add(`${path}.id`, `Duplicate WIP batch ID "${w.id}".`);
      else if (NEW_BATCH_ID_PATTERN.test(w.id as string)) add(`${path}.id`, `"${w.id}" is reserved for new batches (L001, L002, …).`);
      else wipIds.add(w.id as string);
      if (!isStr(w.product_id) || !productIds.has(w.product_id as string)) add(`${path}.product_id`, `Unknown product "${String(w.product_id)}".`);
      const volOk = isFiniteNum(w.volume_hl) && (w.volume_hl as number) > 0;
      if (!volOk) add(`${path}.volume_hl`, 'Must be a finite positive number.');
      const readyOk = isNonNegInt(w.ready_day);
      if (!readyOk) add(`${path}.ready_day`, 'Must be a finite non-negative integer.');
      if (!isStr(w.tank_id) || !tankIds.has(w.tank_id as string)) {
        add(`${path}.tank_id`, `Unknown tank "${String(w.tank_id)}".`);
      } else {
        const tid = w.tank_id as string;
        if (wipTanks.has(tid)) add(`${path}.tank_id`, `Tank ${tid} already holds another initial batch (one batch per tank).`);
        wipTanks.add(tid);
        const cap = tankCapacity.get(tid);
        if (volOk && cap !== undefined && (w.volume_hl as number) > cap + 1e-12)
          add(`${path}.volume_hl`, `Volume ${w.volume_hl} hL exceeds tank ${tid} capacity ${cap} hL.`);
        // Unavailability intersecting an initial batch (occupancy [0, ready) + cleaning) is an inconsistent configuration.
        const cleaning = isNonNegInt(c.cleaning_days) ? (c.cleaning_days as number) : 0;
        if (readyOk) {
          const occEnd = (w.ready_day as number) + cleaning;
          for (const win of tankWindows.get(tid) ?? []) {
            if (win.start < occEnd && 0 < win.end && occEnd > 0) {
              add(
                `tanks.${tid}.unavailable`,
                `Inconsistent configuration: unavailability [${win.start}, ${win.end}) overlaps initial batch ${String(w.id)} (occupied/cleaning until day ${occEnd}).`,
              );
            }
          }
        }
      }
    });
  }

  // Orders
  const orderIds = new Set<string>();
  if (!Array.isArray(c.orders)) {
    add('orders', 'Must be an array.');
  } else {
    c.orders.forEach((o, i) => {
      const path = `orders[${i}]`;
      if (!isObj(o)) return add(path, 'Must be an object.');
      if (!isStr(o.id)) add(`${path}.id`, 'Must be a non-empty string.');
      else if (orderIds.has(o.id as string)) add(`${path}.id`, `Duplicate order ID "${o.id}".`);
      else orderIds.add(o.id as string);
      if (typeof o.customer !== 'string') add(`${path}.customer`, 'Must be a string.');
      if (!isStr(o.product_id) || !productIds.has(o.product_id as string)) add(`${path}.product_id`, `Unknown product "${String(o.product_id)}".`);
      if (!isFiniteNum(o.quantity_hl) || (o.quantity_hl as number) <= 0) add(`${path}.quantity_hl`, 'Must be a finite positive number.');
      if (!isNonNegInt(o.due_day)) add(`${path}.due_day`, 'Must be a finite non-negative integer.');
    });
  }

  return issues;
}

export function assertValidConfig(input: unknown): asserts input is ScenarioConfig {
  const issues = validateConfig(input);
  if (issues.length > 0) throw new ConfigError(issues);
}
