import { BREWHOUSE, CONTROL_ROOM, HALL, PACKAGING, TANK, WAREHOUSE, tankSlotPositions } from '../layout';
import type { Bounds, Obstacle } from './collision';

export const WALK_BOUNDS: Bounds = { minX: HALL.minX + 0.4, maxX: HALL.maxX - 0.4, minZ: HALL.minZ + 0.4, maxZ: HALL.maxZ - 0.4 };

export const FORKLIFT = { x: 14.2, z: 1.2, rot: 0.6 };

export function buildObstacles(tankIds: string[]): Obstacle[] {
  const o: Obstacle[] = [];
  const p = BREWHOUSE.platform;
  o.push({ kind: 'box', minX: p.minX - 0.2, maxX: p.maxX + 0.2, minZ: p.minZ - 0.2, maxZ: p.maxZ + 0.2 });
  // Catwalk, pipes and supports behind the fermenter row.
  o.push({ kind: 'box', minX: -13, maxX: 13, minZ: HALL.minZ, maxZ: -12.6 });
  for (const [, [x, z]] of tankSlotPositions(tankIds)) o.push({ kind: 'circle', x, z, r: TANK.radius + 0.15 });
  const b = PACKAGING.buffer;
  o.push({ kind: 'circle', x: b.x, z: b.z, r: b.r + 0.2 });
  o.push({ kind: 'box', minX: PACKAGING.conveyor.minX - 0.2, maxX: HALL.maxX, minZ: -9.5, maxZ: -6.5 });
  o.push({ kind: 'box', minX: 13.6, maxX: 14.6, minZ: -6.2, maxZ: -5.2 }); // HMI pedestal
  for (const r of WAREHOUSE.racks) o.push({ kind: 'box', minX: r.minX - 0.1, maxX: r.maxX + 0.1, minZ: r.z - WAREHOUSE.rackDepth / 2 - 0.1, maxZ: r.z + WAREHOUSE.rackDepth / 2 + 0.1 });
  o.push({ kind: 'circle', x: FORKLIFT.x, z: FORKLIFT.z, r: 1.3 });
  const c = CONTROL_ROOM;
  o.push({ kind: 'box', minX: c.minX, maxX: c.maxX + 0.1, minZ: c.minZ - 0.1, maxZ: c.minZ + 0.1 }); // north glass wall
  o.push({ kind: 'box', minX: c.maxX - 0.1, maxX: c.maxX + 0.1, minZ: c.minZ, maxZ: c.doorZ[0] }); // east glass wall (north part)
  o.push({ kind: 'box', minX: c.maxX - 0.1, maxX: c.maxX + 0.1, minZ: c.doorZ[1], maxZ: c.maxZ }); // east glass wall (south part)
  o.push({ kind: 'box', minX: c.desk.x - c.desk.w / 2, maxX: c.desk.x + c.desk.w / 2, minZ: c.desk.z - c.desk.d / 2 - 0.5, maxZ: c.desk.z + c.desk.d / 2 });
  return o;
}
