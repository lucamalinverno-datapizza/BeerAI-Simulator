import { T } from '../i18n/strings';
import type { ScenarioConfig } from '../simulation/types';
import { MAX_TANKS, TANK_SLOTS } from '../scene/layout';

export type MachineKind = 'control' | 'brewhouse' | 'tank' | 'slot' | 'packaging' | 'warehouse' | 'shipping';

/** Stable selectable IDs: 'control', 'brewhouse', 'tank:F1', 'slot:F5', 'packaging', 'warehouse', 'shipping'. */
export type MachineId = string;

export interface MachineEntry {
  id: MachineId;
  kind: MachineKind;
  label: string;
  tankId?: string;
}

export const tankMachineId = (tankId: string): MachineId => `tank:${tankId}`;

export function parseMachineId(id: MachineId): { kind: MachineKind; ref?: string } {
  if (id.startsWith('tank:')) return { kind: 'tank', ref: id.slice(5) };
  if (id.startsWith('slot:')) return { kind: 'slot', ref: id.slice(5) };
  return { kind: id as MachineKind };
}

/** Next free fermenter ID (F5, F6, …) for the empty slot. */
export function nextTankId(config: ScenarioConfig): string | null {
  if (config.tanks.length >= MAX_TANKS) return null;
  const used = new Set(config.tanks.map((t) => t.id));
  for (let i = 1; i <= TANK_SLOTS.length + 20; i++) {
    const id = `F${i}`;
    if (!used.has(id)) return id;
  }
  return null;
}

/** Accessible equipment list, in plant order. Tanks follow the given (result) configuration. */
export function machineList(config: ScenarioConfig): MachineEntry[] {
  const list: MachineEntry[] = [
    { id: 'control', kind: 'control', label: T.machines.control },
    { id: 'brewhouse', kind: 'brewhouse', label: T.machines.brewhouse },
  ];
  for (const t of config.tanks.slice(0, MAX_TANKS)) list.push({ id: tankMachineId(t.id), kind: 'tank', label: T.machines.tank(t.id), tankId: t.id });
  const next = nextTankId(config);
  if (next) list.push({ id: `slot:${next}`, kind: 'slot', label: T.machines.slot(next), tankId: next });
  list.push({ id: 'packaging', kind: 'packaging', label: T.machines.packaging });
  list.push({ id: 'warehouse', kind: 'warehouse', label: T.machines.warehouse });
  list.push({ id: 'shipping', kind: 'shipping', label: T.machines.shipping });
  return list;
}
