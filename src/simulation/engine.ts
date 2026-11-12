/**
 * Simulation engine — pure, deterministic, no DOM / canvas / network.
 * Implements brief 05 §4 (model contract) exactly; the 3D scene and panels only read its output.
 *
 * Daily event order (days 0..horizon_day inclusive):
 *   1. release batches reaching ready_day → abstract pre-packaging buffer; tank goes to cleaning
 *   2. package the buffer FIFO by (ready_day, batch_id) within the shared hL/day capacity
 *   3. deliver orders with due_day <= day, by (due_day, order_id), from packaged stock only (partials allowed)
 *   4. plan & start new batches with the deterministic coverage heuristic (recomputed after each start)
 *   5. record the daily snapshot and check the per-product balance
 */
import { assertValidConfig } from './validate';
import {
  BALANCE_TOLERANCE_HL,
  EPS_HL,
  type Batch,
  type DaySnapshot,
  type Kpis,
  type LotQuantity,
  type OrderResult,
  type PackagingRecord,
  type ProductMap,
  type ScenarioConfig,
  type Shipment,
  type SimEvent,
  type SimulationResult,
  type TankDayState,
  type TankUtilization,
} from './types';

export const ENGINE_VERSION = '1.0.0';

/** Plain lexicographic comparison of IDs (brief §5: "Gli ID sono confrontati lessicograficamente"). */
export const cmpId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

interface TankRuntime {
  id: string;
  capacity: number;
  windows: { start: number; end: number }[];
  /** First day the tank can accept a new batch. */
  freeFrom: number;
}

interface BufferLot {
  batch_id: string;
  product_id: string;
  ready_day: number;
  remaining: number;
}

interface OrderRuntime {
  id: string;
  customer: string;
  product_id: string;
  quantity_hl: number;
  due_day: number;
  remaining: number;
  completion_day: number | null;
  shipments: Shipment[];
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function pushLot(lots: LotQuantity[], lotId: string, q: number): void {
  const last = lots[lots.length - 1];
  if (last && last.lot_id === lotId) last.quantity_hl += q;
  else lots.push({ lot_id: lotId, quantity_hl: q });
}

/** Consume `q` hL from FIFO lots; returns the lot breakdown actually taken. */
function consumeFifo(lots: LotQuantity[], q: number): LotQuantity[] {
  const taken: LotQuantity[] = [];
  let need = q;
  while (need > EPS_HL && lots.length > 0) {
    const head = lots[0];
    const t = Math.min(head.quantity_hl, need);
    head.quantity_hl -= t;
    need -= t;
    taken.push({ lot_id: head.lot_id, quantity_hl: t });
    if (head.quantity_hl <= EPS_HL) lots.shift();
  }
  return taken;
}

export function simulate(input: ScenarioConfig): SimulationResult {
  assertValidConfig(input);
  const cfg = clone(input);
  const H = cfg.horizon_day;
  const C = cfg.cleaning_days;
  const productIds = cfg.products.map((p) => p.id);
  const residence = new Map(cfg.products.map((p) => [p.id, p.residence_days]));
  const zero = (): ProductMap => Object.fromEntries(productIds.map((p) => [p, 0]));

  const events: SimEvent[] = [];
  let seq = 0;
  const emit = (e: Omit<SimEvent, 'seq'>) => {
    events.push({ seq: seq++, ...e });
  };

  // ---- Tanks -----------------------------------------------------------------
  const tanks: TankRuntime[] = cfg.tanks.map((t) => ({
    id: t.id,
    capacity: t.capacity_hl,
    windows: t.unavailable.map((w) => ({ start: w.start_day, end: w.end_day })),
    freeFrom: 0,
  }));
  const tankById = new Map(tanks.map((t) => [t.id, t]));
  const tanksByIdOrder = [...tanks].sort((a, b) => cmpId(a.id, b.id));

  // ---- Batches (initial WIP first) -------------------------------------------
  const batches: Batch[] = [];
  const initialWip = zero();
  for (const w of [...cfg.initial_wip].sort((a, b) => cmpId(a.id, b.id))) {
    batches.push({
      id: w.id,
      product_id: w.product_id,
      tank_id: w.tank_id,
      volume_hl: w.volume_hl,
      start_day: null,
      ready_day: w.ready_day,
      clean_until: w.ready_day + C,
      initial: true,
      beyond_horizon: w.ready_day > H,
    });
    initialWip[w.product_id] += w.volume_hl;
    const t = tankById.get(w.tank_id)!;
    t.freeFrom = w.ready_day + C;
  }
  const released = new Set<string>();

  // ---- Stocks ----------------------------------------------------------------
  const initialStock = zero();
  const stockLots: Record<string, LotQuantity[]> = {};
  for (const p of productIds) {
    const init = cfg.initial_finished_stock_hl[p] ?? 0;
    initialStock[p] = init;
    stockLots[p] = init > 0 ? [{ lot_id: `STOCK-${p}`, quantity_hl: init }] : [];
  }
  const stockTotal = (p: string): number => sum(stockLots[p].map((l) => l.quantity_hl));
  let buffer: BufferLot[] = [];
  const deliveredCum = zero();
  const newBrewCum = zero();

  // ---- Orders ----------------------------------------------------------------
  const orders: OrderRuntime[] = cfg.orders.map((o) => ({
    ...o,
    remaining: o.quantity_hl,
    completion_day: null,
    shipments: [],
  }));
  const ordersByDue = [...orders].sort((a, b) => a.due_day - b.due_day || cmpId(a.id, b.id));

  const packaging: PackagingRecord[] = [];
  const snapshots: DaySnapshot[] = [];
  let newBatchCounter = 0;
  let maxBalanceError = 0;

  for (let d = 0; d <= H; d++) {
    const releasedToday: string[] = [];
    const brewsToday: string[] = [];
    const packagedToday = zero();
    const deliveredToday = zero();
    const shipmentsToday: Shipment[] = [];

    // 1. Release batches reaching ready_day; tank enters cleaning [ready, ready + C).
    const toRelease = batches.filter((b) => !released.has(b.id) && b.ready_day === d).sort((a, b) => cmpId(a.id, b.id));
    for (const b of toRelease) {
      released.add(b.id);
      buffer.push({ batch_id: b.id, product_id: b.product_id, ready_day: b.ready_day, remaining: b.volume_hl });
      releasedToday.push(b.id);
      emit({ day: d, type: 'release', batch_id: b.id, tank_id: b.tank_id, product_id: b.product_id, quantity_hl: b.volume_hl });
    }
    if (C > 0) {
      for (const b of batches) {
        if (released.has(b.id) && b.clean_until === d) emit({ day: d, type: 'cleaning_done', tank_id: b.tank_id, batch_id: b.id });
      }
    }

    // 2. Packaging: shared capacity, FIFO by (ready_day, batch_id), partial lots allowed.
    let cap = cfg.packaging_capacity_hl_per_day;
    buffer.sort((a, b) => a.ready_day - b.ready_day || cmpId(a.batch_id, b.batch_id));
    for (const lot of buffer) {
      if (cap <= EPS_HL) break;
      const q = Math.min(cap, lot.remaining);
      if (q <= 0) continue;
      lot.remaining -= q;
      cap -= q;
      if (lot.remaining <= EPS_HL) lot.remaining = 0;
      pushLot(stockLots[lot.product_id], lot.batch_id, q);
      packagedToday[lot.product_id] += q;
      packaging.push({ day: d, batch_id: lot.batch_id, product_id: lot.product_id, quantity_hl: q });
      emit({ day: d, type: 'package', batch_id: lot.batch_id, product_id: lot.product_id, quantity_hl: q });
    }
    buffer = buffer.filter((l) => l.remaining > 0);

    // 3. Deliveries: due orders only (never early), by (due_day, order_id), packaged stock only.
    for (const o of ordersByDue) {
      if (o.due_day > d) break;
      if (o.remaining <= EPS_HL) continue;
      const avail = stockTotal(o.product_id);
      if (avail <= EPS_HL) continue;
      const q = Math.min(avail, o.remaining);
      const lots = consumeFifo(stockLots[o.product_id], q);
      o.remaining -= q;
      if (o.remaining <= EPS_HL) o.remaining = 0;
      deliveredCum[o.product_id] += q;
      deliveredToday[o.product_id] += q;
      const sh: Shipment = { order_id: o.id, day: d, quantity_hl: q, on_time: d <= o.due_day, lots };
      o.shipments.push(sh);
      shipmentsToday.push(sh);
      emit({ day: d, type: 'deliver', order_id: o.id, product_id: o.product_id, quantity_hl: q });
      if (o.remaining === 0) {
        o.completion_day = d;
        emit({ day: d, type: 'order_completed', order_id: o.id, product_id: o.product_id });
      }
    }

    // 4. Planning heuristic (deterministic, not optimal). Coverage recomputed after each start.
    let started = 0;
    while (started < cfg.max_batches_per_day) {
      const supply = zero();
      for (const p of productIds) supply[p] = stockTotal(p);
      for (const lot of buffer) supply[lot.product_id] += lot.remaining;
      for (const b of batches) if (!released.has(b.id)) supply[b.product_id] += b.volume_hl;

      let trigger: OrderRuntime | null = null;
      for (const o of ordersByDue) {
        if (o.remaining <= EPS_HL) continue;
        const cover = Math.min(supply[o.product_id], o.remaining);
        supply[o.product_id] -= cover;
        if (o.remaining - cover > EPS_HL) {
          trigger = o;
          break;
        }
      }
      if (!trigger) break; // no uncovered order → no production

      const p = trigger.product_id;
      const r = residence.get(p)!;
      const occEnd = d + r + C; // occupancy [d, d+r) + cleaning [d+r, d+r+C)
      const tank = tanksByIdOrder.find(
        (t) => t.capacity >= cfg.batch_volume_hl && t.freeFrom <= d && !t.windows.some((w) => d < w.end && w.start < occEnd),
      );
      if (!tank) {
        emit({ day: d, type: 'brew_blocked', product_id: p, reason: 'no_tank_available', trigger_order_id: trigger.id });
        break; // no tank for that product → no more batches today
      }
      newBatchCounter += 1;
      const id = `L${String(newBatchCounter).padStart(3, '0')}`;
      batches.push({
        id,
        product_id: p,
        tank_id: tank.id,
        volume_hl: cfg.batch_volume_hl,
        start_day: d,
        ready_day: d + r,
        clean_until: occEnd,
        initial: false,
        beyond_horizon: d + r > H,
      });
      tank.freeFrom = occEnd;
      newBrewCum[p] += cfg.batch_volume_hl;
      brewsToday.push(id);
      emit({ day: d, type: 'brew', batch_id: id, tank_id: tank.id, product_id: p, quantity_hl: cfg.batch_volume_hl, trigger_order_id: trigger.id });
      started += 1;
    }

    // 5. Snapshot + balance check.
    const wip = zero();
    for (const b of batches) if (!released.has(b.id)) wip[b.product_id] += b.volume_hl;
    const bufferMap = zero();
    for (const lot of buffer) bufferMap[lot.product_id] += lot.remaining;
    const finished = zero();
    for (const p of productIds) finished[p] = stockTotal(p);

    let balanceErr = 0;
    for (const p of productIds) {
      const lhs = initialStock[p] + initialWip[p] + newBrewCum[p];
      const rhs = deliveredCum[p] + finished[p] + bufferMap[p] + wip[p];
      balanceErr = Math.max(balanceErr, Math.abs(lhs - rhs));
    }
    maxBalanceError = Math.max(maxBalanceError, balanceErr);

    const tankStates: TankDayState[] = cfg.tanks.map((t) => tankStateAt(t.id, t.capacity_hl, d, batches, tankById.get(t.id)!.windows));

    snapshots.push({
      day: d,
      tanks: tankStates,
      finished_stock: finished,
      stock_lots: clone(stockLots),
      buffer: bufferMap,
      buffer_lots: buffer.map((l) => ({ lot_id: l.batch_id, quantity_hl: l.remaining })),
      wip,
      delivered_cum: { ...deliveredCum },
      new_brew_cum: { ...newBrewCum },
      packaged_today: packagedToday,
      packaged_total_today: sum(Object.values(packagedToday)),
      delivered_today: deliveredToday,
      released_today: releasedToday,
      brews_started_today: brewsToday,
      shipments_today: shipmentsToday,
      open_orders: orders.filter((o) => o.remaining > 0).length,
      balance_error_hl: balanceErr,
    });
  }

  // ---- Order results & KPIs ------------------------------------------------------
  const orderResults: OrderResult[] = orders.map((o) => {
    const inPeriod = o.due_day <= H;
    const delivered = sum(o.shipments.map((s) => s.quantity_hl));
    const onTime = sum(o.shipments.filter((s) => s.on_time).map((s) => s.quantity_hl));
    const late = sum(o.shipments.filter((s) => !s.on_time).map((s) => s.quantity_hl));
    const completed = o.completion_day !== null;
    const delay = completed ? Math.max(0, (o.completion_day as number) - o.due_day) : null;
    const status: OrderResult['status'] = completed
      ? (o.completion_day as number) <= o.due_day
        ? 'on_time'
        : 'late'
      : inPeriod
        ? 'open_late'
        : 'not_due';
    return {
      id: o.id,
      customer: o.customer,
      product_id: o.product_id,
      quantity_hl: o.quantity_hl,
      due_day: o.due_day,
      in_period: inPeriod,
      delivered_hl: delivered,
      on_time_hl: onTime,
      late_hl: late,
      remaining_hl: o.remaining,
      completion_day: o.completion_day,
      delay_days: delay,
      complete_on_time: status === 'on_time',
      open_delay_age_days: !completed && inPeriod ? H - o.due_day : null,
      status,
      shipments: o.shipments,
    };
  });

  const inPeriod = orderResults.filter((o) => o.in_period);
  const demand = sum(inPeriod.map((o) => o.quantity_hl));
  const delivered = sum(inPeriod.map((o) => o.delivered_hl));
  const onTime = sum(inPeriod.map((o) => o.on_time_hl));
  const lateHl = sum(inPeriod.map((o) => o.late_hl));
  const backlog = Math.max(0, sum(inPeriod.map((o) => o.remaining_hl)));
  const last = snapshots[snapshots.length - 1];

  const kpis: Kpis = {
    demand_hl: demand,
    delivered_hl: delivered,
    on_time_hl: onTime,
    late_hl: lateHl,
    service_level: demand > 0 ? onTime / demand : null,
    orders_due: inPeriod.length,
    orders_complete_on_time: inPeriod.filter((o) => o.complete_on_time).length,
    orders_late_or_open: inPeriod.filter((o) => !o.complete_on_time).length,
    final_backlog_hl: backlog,
    max_delay_days: Math.max(0, ...orderResults.map((o) => o.delay_days ?? o.open_delay_age_days ?? 0)),
    new_brew_hl: sum(Object.values(newBrewCum)),
    batches_started: newBatchCounter,
    final_stock: { ...last.finished_stock },
    final_buffer: { ...last.buffer },
    final_wip: { ...last.wip },
  };

  // ---- Tank utilization over the window [0, H): state of each day-interval [d, d+1) ----
  const utilization: TankUtilization[] = cfg.tanks.map((t, i) => {
    const u = { residence: 0, cleaning: 0, unavailable: 0, idle: 0 };
    for (let d = 0; d < H; d++) {
      const s = snapshots[d].tanks[i].status;
      if (s === 'occupied') u.residence++;
      else if (s === 'cleaning') u.cleaning++;
      else if (s === 'unavailable') u.unavailable++;
      else u.idle++;
    }
    return {
      tank_id: t.id,
      window_days: H,
      residence_days: u.residence,
      cleaning_days: u.cleaning,
      unavailable_days: u.unavailable,
      idle_days: u.idle,
      residence_share: H > 0 ? u.residence / H : null,
    };
  });

  return {
    engine_version: ENGINE_VERSION,
    config: cfg,
    kpis,
    orders: orderResults,
    batches,
    snapshots,
    events,
    packaging,
    utilization,
    balance_ok: maxBalanceError <= BALANCE_TOLERANCE_HL,
    max_balance_error_hl: maxBalanceError,
  };
}

function tankStateAt(
  tankId: string,
  capacity: number,
  d: number,
  batches: Batch[],
  windows: { start: number; end: number }[],
): TankDayState {
  const base: TankDayState = {
    tank_id: tankId,
    status: 'idle',
    capacity_hl: capacity,
    batch_id: null,
    product_id: null,
    volume_hl: 0,
    start_day: null,
    ready_day: null,
    clean_until: null,
    time_progress: null,
    days_to_release: null,
  };
  const inTank = batches.filter((b) => b.tank_id === tankId);
  const occ = inTank.find((b) => (b.start_day ?? Number.NEGATIVE_INFINITY) <= d && d < b.ready_day);
  if (occ) {
    return {
      ...base,
      status: 'occupied',
      batch_id: occ.id,
      product_id: occ.product_id,
      volume_hl: occ.volume_hl,
      start_day: occ.start_day,
      ready_day: occ.ready_day,
      clean_until: occ.clean_until,
      time_progress: occ.start_day === null ? null : (d - occ.start_day) / (occ.ready_day - occ.start_day),
      days_to_release: occ.ready_day - d,
    };
  }
  const cleaning = inTank.find((b) => b.ready_day <= d && d < b.clean_until);
  if (cleaning) {
    return {
      ...base,
      status: 'cleaning',
      batch_id: cleaning.id,
      product_id: cleaning.product_id,
      start_day: cleaning.start_day,
      ready_day: cleaning.ready_day,
      clean_until: cleaning.clean_until,
    };
  }
  if (windows.some((w) => w.start <= d && d < w.end)) return { ...base, status: 'unavailable' };
  return base;
}

/** Snapshot for a given day, clamped to the simulated range. */
export function snapshotAt(result: SimulationResult, day: number): DaySnapshot {
  const i = Math.max(0, Math.min(result.snapshots.length - 1, Math.round(day)));
  return result.snapshots[i];
}
