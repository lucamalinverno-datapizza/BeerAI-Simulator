/** Simple application-level collisions on the floor plane (x, z): circles and axis-aligned boxes. */
export type Obstacle =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number };

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function collides(x: number, z: number, radius: number, obstacles: Obstacle[], bounds: Bounds): boolean {
  if (x - radius < bounds.minX || x + radius > bounds.maxX || z - radius < bounds.minZ || z + radius > bounds.maxZ) return true;
  for (const o of obstacles) {
    if (o.kind === 'circle') {
      const dx = x - o.x;
      const dz = z - o.z;
      const rr = o.r + radius;
      if (dx * dx + dz * dz < rr * rr) return true;
    } else {
      const cx = Math.max(o.minX, Math.min(x, o.maxX));
      const cz = Math.max(o.minZ, Math.min(z, o.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
  }
  return false;
}

/** Moves with sliding: try the full step, then each axis separately. Never ends inside an obstacle. */
export function moveWithCollision(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius: number,
  obstacles: Obstacle[],
  bounds: Bounds,
): { x: number; z: number } {
  // Sub-step long moves so fast frames cannot tunnel through thin walls.
  const len = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(len / (radius * 0.5)));
  let px = x;
  let pz = z;
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps;
    const sz = dz / steps;
    if (!collides(px + sx, pz + sz, radius, obstacles, bounds)) {
      px += sx;
      pz += sz;
    } else if (!collides(px + sx, pz, radius, obstacles, bounds)) {
      px += sx;
    } else if (!collides(px, pz + sz, radius, obstacles, bounds)) {
      pz += sz;
    } else break;
  }
  return { x: px, z: pz };
}

/** Nearest free floor point (spiral search) when equipment is added or a patrol target is blocked. */
export function nearestFree(x: number, z: number, radius: number, obstacles: Obstacle[], bounds: Bounds): { x: number; z: number } {
  const cx = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x));
  const cz = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, z));
  if (!collides(cx, cz, radius, obstacles, bounds)) return { x: cx, z: cz };
  for (let r = 0.5; r < 40; r += 0.5) {
    const n = Math.ceil((2 * Math.PI * r) / 0.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = cx + Math.cos(a) * r;
      const pz = cz + Math.sin(a) * r;
      if (!collides(px, pz, radius, obstacles, bounds)) return { x: px, z: pz };
    }
  }
  return { x: -11, z: 15 };
}
