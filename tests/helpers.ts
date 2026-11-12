import { expect } from 'vitest';
import { BALANCE_TOLERANCE_HL, type SimulationResult } from '../src/simulation/types';

/** Structural invariants every simulation result must satisfy (brief §4, §8). */
export function checkInvariants(r: SimulationResult): void {
  const cfg = r.config;
  // Balance at every snapshot.
  expect(r.balance_ok).toBe(true);
  for (const s of r.snapshots) expect(s.balance_error_hl).toBeLessThanOrEqual(BALANCE_TOLERANCE_HL);
  // Shared packaging capacity never exceeded.
  for (const s of r.snapshots) expect(s.packaged_total_today).toBeLessThanOrEqual(cfg.packaging_capacity_hl_per_day + 1e-9);
  // Max batches/day respected.
  for (const s of r.snapshots) expect(s.brews_started_today.length).toBeLessThanOrEqual(cfg.max_batches_per_day);
  // No overlap of occupancy+cleaning in the same tank; capacity respected; unavailability respected.
  for (const t of cfg.tanks) {
    const iv = r.batches
      .filter((b) => b.tank_id === t.id)
      .map((b) => ({ s: b.start_day ?? 0, e: b.clean_until, b }))
      .sort((a, b) => a.s - b.s);
    for (let i = 1; i < iv.length; i++) expect(iv[i].s).toBeGreaterThanOrEqual(iv[i - 1].e);
    for (const x of iv) {
      expect(x.b.volume_hl).toBeLessThanOrEqual(t.capacity_hl + 1e-12);
      if (!x.b.initial) for (const w of t.unavailable) expect(x.s < w.end_day && w.start_day < x.e).toBe(false);
    }
  }
  // Deliveries never before due day; on-time flag consistent.
  for (const o of r.orders) {
    for (const sh of o.shipments) {
      expect(sh.day).toBeGreaterThanOrEqual(o.due_day);
      expect(sh.on_time).toBe(sh.day <= o.due_day);
      const lotsSum = sh.lots.reduce((a, l) => a + l.quantity_hl, 0);
      expect(Math.abs(lotsSum - sh.quantity_hl)).toBeLessThan(1e-9);
    }
  }
  // Snapshot tank volume never exceeds capacity.
  for (const s of r.snapshots) for (const ts of s.tanks) expect(ts.volume_hl).toBeLessThanOrEqual(ts.capacity_hl + 1e-12);
}

