/**
 * Model contract — Brewery Control Room 3D (brief 05, section 4).
 * Pure data types shared by engine, worker, store, 3D scene, panels and the 2D fallback.
 * Units: volumes in hectolitres (hL), time in integer days.
 */

export const SCHEMA_VERSION = 1 as const;

/** Numerical tolerance used for balances and "is this residual zero?" checks (hL). */
export const EPS_HL = 1e-9;
/** Tolerance required by the brief for the per-product balance check (hL). */
export const BALANCE_TOLERANCE_HL = 1e-8;

export interface Product {
  id: string;
  name: string;
  /** Fermentation + maturation, merged into one residence time in the tank (days, integer ≥ 1). */
  residence_days: number;
}

/** Tank unavailability window [start_day, end_day). */
export interface Unavailability {
  start_day: number;
  end_day: number;
  note?: string;
}

export interface Tank {
  id: string;
  capacity_hl: number;
  unavailable: Unavailability[];
}

export interface InitialWip {
  id: string;
  tank_id: string;
  product_id: string;
  volume_hl: number;
  /** Day the batch leaves the tank (explicit; not recomputed from residence time). */
  ready_day: number;
}

export interface Order {
  id: string;
  customer: string;
  product_id: string;
  quantity_hl: number;
  due_day: number;
}

export interface ScenarioConfig {
  schema_version: typeof SCHEMA_VERSION;
  scenario_id: string;
  name: string;
  synthetic_data: boolean;
  description?: string;
  based_on?: string;
  horizon_day: number;
  batch_volume_hl: number;
  max_batches_per_day: number;
  packaging_capacity_hl_per_day: number;
  cleaning_days: number;
  products: Product[];
  tanks: Tank[];
  initial_finished_stock_hl: Record<string, number>;
  initial_wip: InitialWip[];
  orders: Order[];
}

export type ProductMap = Record<string, number>;

export interface Batch {
  id: string;
  product_id: string;
  tank_id: string;
  volume_hl: number;
  /** null for initial WIP (start happened before day 0 and is not counted). */
  start_day: number | null;
  ready_day: number;
  /** First day the tank can be reused: ready_day + cleaning_days. */
  clean_until: number;
  initial: boolean;
  /** True when ready_day > horizon_day: still in the tank at the end of the horizon. */
  beyond_horizon: boolean;
}

export interface LotQuantity {
  lot_id: string;
  quantity_hl: number;
}

export interface Shipment {
  order_id: string;
  day: number;
  quantity_hl: number;
  on_time: boolean;
  /** FIFO traceability of finished stock (does not change any quantity). */
  lots: LotQuantity[];
}

export interface PackagingRecord {
  day: number;
  batch_id: string;
  product_id: string;
  quantity_hl: number;
}

export type OrderStatus =
  | 'on_time' // fully delivered by due day
  | 'late' // fully delivered after due day
  | 'open_late' // due within horizon, not fully delivered at horizon
  | 'not_due'; // due after horizon (counted in planning, not in period KPIs)

export interface OrderResult {
  id: string;
  customer: string;
  product_id: string;
  quantity_hl: number;
  due_day: number;
  in_period: boolean;
  delivered_hl: number;
  on_time_hl: number;
  late_hl: number;
  remaining_hl: number;
  completion_day: number | null;
  /** Completed orders only: max(0, completion_day - due_day). */
  delay_days: number | null;
  complete_on_time: boolean;
  /** Open orders due within horizon: horizon_day - due_day (age of the delay, no invented completion date). */
  open_delay_age_days: number | null;
  status: OrderStatus;
  shipments: Shipment[];
}

export type TankStatus = 'occupied' | 'cleaning' | 'unavailable' | 'idle';

export interface TankDayState {
  tank_id: string;
  status: TankStatus;
  capacity_hl: number;
  batch_id: string | null;
  product_id: string | null;
  /** Volume physically in the tank (hL). Fermentation does not consume volume. */
  volume_hl: number;
  start_day: number | null;
  ready_day: number | null;
  clean_until: number | null;
  /** Time progress of the residence in [0,1]; null when unknown (initial WIP) or not occupied. */
  time_progress: number | null;
  days_to_release: number | null;
}

export interface DaySnapshot {
  day: number;
  tanks: TankDayState[];
  finished_stock: ProductMap;
  /** FIFO lots composing finished stock (traceability). */
  stock_lots: Record<string, LotQuantity[]>;
  buffer: ProductMap;
  buffer_lots: LotQuantity[];
  wip: ProductMap;
  delivered_cum: ProductMap;
  new_brew_cum: ProductMap;
  packaged_today: ProductMap;
  packaged_total_today: number;
  delivered_today: ProductMap;
  released_today: string[];
  brews_started_today: string[];
  shipments_today: Shipment[];
  open_orders: number;
  /** Max absolute balance error over products at this snapshot (hL). */
  balance_error_hl: number;
}

export type SimEventType =
  | 'release'
  | 'cleaning_done'
  | 'package'
  | 'deliver'
  | 'order_completed'
  | 'brew'
  | 'brew_blocked';

export interface SimEvent {
  seq: number;
  day: number;
  type: SimEventType;
  product_id?: string;
  batch_id?: string;
  tank_id?: string;
  order_id?: string;
  quantity_hl?: number;
  /** For brew_blocked: why no batch was started. */
  reason?: 'no_tank_available';
  /** For brew: the order whose uncovered quantity triggered the batch. */
  trigger_order_id?: string;
}

export interface Kpis {
  demand_hl: number;
  delivered_hl: number;
  on_time_hl: number;
  late_hl: number;
  /** on_time / demand; null when demand is zero (shown as N/A). */
  service_level: number | null;
  orders_due: number;
  orders_complete_on_time: number;
  orders_late_or_open: number;
  final_backlog_hl: number;
  max_delay_days: number;
  new_brew_hl: number;
  batches_started: number;
  final_stock: ProductMap;
  final_buffer: ProductMap;
  final_wip: ProductMap;
}

export interface TankUtilization {
  tank_id: string;
  /** Denominator: tank-days in the window [0, horizon_day). */
  window_days: number;
  residence_days: number;
  cleaning_days: number;
  unavailable_days: number;
  idle_days: number;
  /** residence_days / window_days; null if window is empty. */
  residence_share: number | null;
}

export interface SimulationResult {
  engine_version: string;
  config: ScenarioConfig;
  kpis: Kpis;
  orders: OrderResult[];
  batches: Batch[];
  snapshots: DaySnapshot[];
  events: SimEvent[];
  packaging: PackagingRecord[];
  utilization: TankUtilization[];
  balance_ok: boolean;
  max_balance_error_hl: number;
}

export interface ValidationIssue {
  path: string;
  message: string;
}
