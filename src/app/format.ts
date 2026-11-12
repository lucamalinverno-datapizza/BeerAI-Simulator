import { T } from '../i18n/strings';
import type { ScenarioConfig, SimEvent } from '../simulation/types';

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** Readable hL value; internal states are never rounded, only their display. */
export const fmtNum = (x: number): string => nf.format(Math.abs(x) < 5e-10 ? 0 : x);
export const fmtHl = (x: number): string => `${fmtNum(x)} hL`;
export const fmtHl1 = (x: number): string => `${nf1.format(Math.abs(x) < 5e-10 ? 0 : x)} hL`;
export const fmtPct = (x: number | null): string => (x === null ? T.na : `${(x * 100).toFixed(2)}%`);
export const fmtErr = (x: number): string => (x === 0 ? '0' : x.toExponential(1));

export function productName(cfg: ScenarioConfig, id: string | null | undefined): string {
  if (!id) return T.none;
  return cfg.products.find((p) => p.id === id)?.name ?? id;
}

export function describeEvent(e: SimEvent, cfg: ScenarioConfig): string {
  const q = e.quantity_hl !== undefined ? fmtHl(e.quantity_hl) : '';
  const p = productName(cfg, e.product_id);
  switch (e.type) {
    case 'release':
      return `${e.batch_id} released from ${e.tank_id} → buffer (${p}, ${q}); ${e.tank_id} starts cleaning`;
    case 'cleaning_done':
      return `${e.tank_id} cleaned and free`;
    case 'package':
      return `Packaged ${q} of ${p} from ${e.batch_id}`;
    case 'deliver':
      return `Shipped ${q} of ${p} to ${e.order_id}`;
    case 'order_completed':
      return `${e.order_id} completed`;
    case 'brew':
      return `Brewed ${e.batch_id} (${p}, ${q}) into ${e.tank_id} — triggered by uncovered ${e.trigger_order_id}`;
    case 'brew_blocked':
      return `Batch of ${p} needed for ${e.trigger_order_id}, but no free compatible tank — no more batches today`;
    default:
      return e.type;
  }
}
