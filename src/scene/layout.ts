/**
 * Illustrative plant layout (metres). Pure data shared by the 3D scene, collisions, minimap and camera views.
 * Not a measured plant. Hall spans x ∈ [-30, 30], z ∈ [-18, 18]; y is up. North = -z.
 */
export type Vec3 = [number, number, number];

export const HALL = { minX: -30, maxX: 30, minZ: -18, maxZ: 18, height: 10.5, wall: 0.3 };
export const EYE_HEIGHT = 1.7;
export const PLAYER_RADIUS = 0.4;

export type ViewName = 'overview' | 'brewhouse' | 'fermentation' | 'packaging' | 'warehouse' | 'shipping' | 'control';
export const VIEW_ORDER: ViewName[] = ['overview', 'brewhouse', 'fermentation', 'packaging', 'warehouse', 'shipping', 'control'];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export const VIEWS: Record<ViewName, CameraPose> = {
  overview: { position: [-1, 44, 40], target: [-4, 0, 1.5] },
  brewhouse: { position: [-11, 10, 3], target: [-22.5, 2, -10.5] },
  fermentation: { position: [1.5, 9, 9], target: [0, 3.6, -10] },
  packaging: { position: [21, 8.5, 5], target: [22, 1.4, -9.5] },
  warehouse: { position: [7, 9.5, 17], target: [20, 2, 6.5] },
  shipping: { position: [13, 13, 39], target: [21, 1, 15.5] },
  control: { position: [-20.9, 2.7, 16.8], target: [-26.2, 1.25, 10.2] },
};

export interface Zone {
  id: ViewName;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const ZONES: Zone[] = [
  { id: 'brewhouse', label: 'BREWHOUSE', minX: -29.5, maxX: -15, minZ: -17.5, maxZ: -3 },
  { id: 'fermentation', label: 'FERMENTATION', minX: -13, maxX: 13, minZ: -17.5, maxZ: -2 },
  { id: 'packaging', label: 'PACKAGING', minX: 15, maxX: 29.5, minZ: -17.5, maxZ: -3 },
  { id: 'warehouse', label: 'WAREHOUSE', minX: 12, maxX: 29.5, minZ: 2.5, maxZ: 11.5 },
  { id: 'shipping', label: 'SHIPPING', minX: 12, maxX: 29.5, minZ: 12, maxZ: 17.5 },
  { id: 'control', label: 'CONTROL ROOM', minX: -29.5, maxX: -20, minZ: 6, maxZ: 17.5 },
];

// ---- Fermenters ---------------------------------------------------------------
export const TANK = { radius: 1.35, legHeight: 1.0, coneHeight: 1.4, bodyHeight: 4.6, domeHeight: 0.45 };
export const TANK_TOP_Y = TANK.legHeight + TANK.coneHeight + TANK.bodyHeight + TANK.domeHeight;

/** Fixed tank slots: F1–F5 on the first row, extra tanks on a second row. */
export const TANK_SLOTS: [number, number][] = [
  [-10, -11],
  [-5, -11],
  [0, -11],
  [5, -11],
  [10, -11],
  [-7.5, -5],
  [-2.5, -5],
  [2.5, -5],
];
export const MAX_TANKS = TANK_SLOTS.length;

/** Slot index for a tank: tanks are placed in configuration order. */
export function tankSlotPositions(tankIds: string[]): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  tankIds.slice(0, MAX_TANKS).forEach((id, i) => m.set(id, TANK_SLOTS[i]));
  return m;
}

// ---- Fixed equipment ------------------------------------------------------------
export const BREWHOUSE = {
  platform: { minX: -28.5, maxX: -16.5, minZ: -16.5, maxZ: -4.5, height: 0.9 },
  vessels: [
    { name: 'Mash tun', x: -25.5, z: -13.3, r: 1.55, h: 2.6, copper: true },
    { name: 'Lauter tun', x: -19.8, z: -13.3, r: 1.7, h: 2.2, copper: false },
    { name: 'Kettle', x: -25.5, z: -7.7, r: 1.65, h: 2.9, copper: true },
    { name: 'Whirlpool', x: -19.8, z: -7.7, r: 1.4, h: 2.6, copper: false },
  ],
  center: [-22.5, 0, -10.5] as Vec3,
};

export const PACKAGING = {
  buffer: { x: 17.2, z: -13.6, r: 1.15, h: 3.6 },
  conveyor: { minX: 15.6, maxX: 28.8, z: -8, width: 0.8, height: 0.95 },
  filler: { x: 19.2, z: -8, w: 2.6, d: 2.4, h: 2.5 },
  labeler: { x: 22.6, z: -8, w: 1.7, d: 1.7, h: 1.9 },
  packer: { x: 25.6, z: -8, w: 2.1, d: 2.0, h: 2.1 },
  center: [22, 0, -10] as Vec3,
};

export const WAREHOUSE = {
  racks: [
    { product: 0, minX: 13, maxX: 27.5, z: 4.6 },
    { product: 1, minX: 13, maxX: 27.5, z: 8.4 },
  ],
  rackDepth: 1.2,
  bays: 5,
  levels: 3,
  palletsPerBay: 2,
  hlPerPallet: 2,
  center: [20, 0, 6.5] as Vec3,
};

export const SHIPPING = {
  doors: [17.5, 24.5],
  doorWidth: 3.6,
  doorHeight: 4.4,
  center: [21, 0, 15] as Vec3,
};

export const CONTROL_ROOM = {
  minX: -29.7,
  maxX: -20,
  minZ: 6,
  maxZ: 17.7,
  height: 3.2,
  doorZ: [9.6, 11.4] as [number, number],
  desk: { x: -25.2, z: 11, w: 3.4, d: 1.0 },
  center: [-24.8, 0, 11.5] as Vec3,
};

export const ENTRANCE = { x: -11, z: 16.5 };

// ---- Selectable machines -------------------------------------------------------------
export type FixedMachineId = 'control' | 'brewhouse' | 'packaging' | 'warehouse' | 'shipping';

export interface MachinePlacement {
  center: Vec3;
  ringRadius: number;
  focus: CameraPose;
}

export const FIXED_MACHINES: Record<FixedMachineId, MachinePlacement> = {
  control: { center: CONTROL_ROOM.center, ringRadius: 2.6, focus: { position: [-20.9, 2.7, 16.8], target: [-26.2, 1.25, 10.2] } },
  brewhouse: { center: BREWHOUSE.center, ringRadius: 7.2, focus: VIEWS.brewhouse },
  packaging: { center: PACKAGING.center, ringRadius: 7, focus: VIEWS.packaging },
  warehouse: { center: WAREHOUSE.center, ringRadius: 8, focus: VIEWS.warehouse },
  shipping: { center: SHIPPING.center, ringRadius: 6, focus: VIEWS.shipping },
};

export function tankFocus(x: number, z: number): CameraPose {
  return { position: [x + 2.6, 4.8, z + 8.2], target: [x, 3.6, z] };
}
