import { collides, moveWithCollision, nearestFree, type Obstacle } from '../navigation/collision';
import { buildObstacles, WALK_BOUNDS } from '../navigation/obstacles';
import { PLAYER_RADIUS } from '../layout';

type Point = { x: number; z: number };
export const CREW = [
  { id: 'alex', name: 'Alex', role: 'Brewer', color: '#f5b82e', skin: '#c18b62', route: [[-14, -2], [-14, -7], [-11, -7], [-11, -3]] },
  { id: 'maya', name: 'Maya', role: 'Packaging', color: '#ff8b47', skin: '#8e573c', route: [[18, -4], [26, -4], [26, -5], [17, -5]] },
  { id: 'sam', name: 'Sam', role: 'Warehouse', color: '#b3cf46', skin: '#dfac82', route: [[11, 6.5], [25, 6.5], [28.5, 6.5], [28.5, 1], [11, 1]] },
  { id: 'jordan', name: 'Jordan', role: 'Dispatch', color: '#ffb438', skin: '#6e4435', route: [[16, 13], [26, 13], [26, 16], [16, 16]] },
  { id: 'taylor', name: 'Taylor', role: 'Quality', color: '#50babe', skin: '#c48c65', route: [[4, -3], [4, -7], [-6, -7], [-6, -3]] },
  { id: 'riley', name: 'Riley', role: 'Engineering', color: '#699be3', skin: '#e4b68f', route: [[-17, 12], [-17, 3], [-5, 3], [-5, 9]] },
] as const;
export type CrewId = (typeof CREW)[number]['id'];
export interface CrewPose extends Point {
  id: CrewId;
  heading: number;
  speed: number;
  gait: number;
  waypoint: number;
  pause: number;
  path: Point[];
}

/** Spatial animation only: these people do not represent staffing capacity or change engine results. */
export const crewPoses: CrewPose[] = CREW.map((c, i) => ({ id: c.id, x: c.route[0][0], z: c.route[0][1], heading: Math.PI, speed: 0, gait: i, waypoint: 1, pause: i * 0.3, path: [] }));
export const crewPose = (id: CrewId): CrewPose => crewPoses.find((p) => p.id === id)!;
export const exploreView = { yaw: 0, elevation: 0.36, distance: 5.6 };
let obstacles: Obstacle[] = [];

const CELL = 0.8;
const NX = Math.floor((WALK_BOUNDS.maxX - WALK_BOUNDS.minX) / CELL);
const NZ = Math.floor((WALK_BOUNDS.maxZ - WALK_BOUNDS.minZ) / CELL);
const gridPoint = (i: number): Point => ({ x: WALK_BOUNDS.minX + CELL * (i % NX + 0.5), z: WALK_BOUNDS.minZ + CELL * (Math.floor(i / NX) + 0.5) });
let freeCells = new Uint8Array(NX * NZ);

function clearSegment(a: Point, b: Point): boolean {
  // Exact swept-circle check avoids accepting a segment whose samples straddle a tank wall.
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  for (const o of obstacles) {
    if (o.kind !== 'circle') continue;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.z - a.z) * dz) / lengthSq)) : 0;
    if ((a.x + dx * t - o.x) ** 2 + (a.z + dz * t - o.z) ** 2 < (o.r + PLAYER_RADIUS) ** 2 - 1e-8) return false;
  }
  const n = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 0.18));
  for (let i = 0; i <= n; i++) {
    if (collides(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, PLAYER_RADIUS, obstacles, WALK_BOUNDS)) return false;
  }
  return true;
}

/** Grid BFS followed by line-of-sight simplification. No diagonal corner cutting. */
export function findCrewPath(start: Point, goal: Point): Point[] {
  if (clearSegment(start, goal)) return [goal];
  const nearestCell = (p: Point): number => {
    let best = -1;
    let dist = Infinity;
    for (let i = 0; i < freeCells.length; i++) {
      if (!freeCells[i]) continue;
      const q = gridPoint(i);
      const d = (p.x - q.x) ** 2 + (p.z - q.z) ** 2;
      if (d < dist && clearSegment(p, q)) { best = i; dist = d; }
    }
    return best;
  };
  const from = nearestCell(start);
  const to = nearestCell(goal);
  if (from < 0 || to < 0) return [];
  const parent = new Int32Array(freeCells.length).fill(-1);
  parent[from] = from;
  const queue = [from];
  for (let at = 0; at < queue.length && parent[to] < 0; at++) {
    const i = queue[at];
    for (const j of [i - 1, i + 1, i - NX, i + NX]) {
      if (j < 0 || j >= freeCells.length || !freeCells[j] || parent[j] >= 0) continue;
      if (Math.abs(j - i) === 1 && Math.floor(j / NX) !== Math.floor(i / NX)) continue;
      if (!clearSegment(gridPoint(i), gridPoint(j))) continue;
      parent[j] = i;
      queue.push(j);
    }
  }
  if (parent[to] < 0) return [];
  const points = [goal, gridPoint(to)];
  for (let i = to; i !== from;) { i = parent[i]; points.push(gridPoint(i)); }
  points.reverse();
  const out: Point[] = [];
  let anchor = start;
  for (let i = 0; i < points.length;) {
    let furthest = i;
    for (let j = i + 1; j < points.length && clearSegment(anchor, points[j]); j++) furthest = j;
    out.push(points[furthest]);
    anchor = points[furthest];
    i = furthest + 1;
  }
  return out;
}

export function configureCrew(tankIds: string[]): void {
  obstacles = buildObstacles(tankIds);
  freeCells = Uint8Array.from({ length: NX * NZ }, (_, i) => {
    const p = gridPoint(i);
    return collides(p.x, p.z, PLAYER_RADIUS, obstacles, WALK_BOUNDS) ? 0 : 1;
  });
  for (const p of crewPoses) {
    Object.assign(p, nearestFree(p.x, p.z, PLAYER_RADIUS, obstacles, WALK_BOUNDS));
    p.path = [];
  }
}

export interface CrewInput { forward: number; strafe: number; run: boolean; yaw: number }
const turn = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, t);

export function stepCrew(dt: number, activeId: CrewId | null, input: CrewInput): void {
  for (let i = 0; i < crewPoses.length; i++) {
    const p = crewPoses[i];
    let dx = 0;
    let dz = 0;
    if (p.id === activeId) {
      dx = -Math.sin(input.yaw) * input.forward + Math.cos(input.yaw) * input.strafe;
      dz = -Math.cos(input.yaw) * input.forward - Math.sin(input.yaw) * input.strafe;
      const length = Math.hypot(dx, dz);
      if (length > 0) { dx *= (input.run ? 6 : 3.2) * dt / length; dz *= (input.run ? 6 : 3.2) * dt / length; }
      p.path = []; // resume patrol from this location when control is released
    } else {
      if (p.pause > 0) { p.pause -= dt; p.speed = 0; continue; }
      const route = CREW[i].route;
      if (!p.path.length) {
        const goal = nearestFree(route[p.waypoint][0], route[p.waypoint][1], PLAYER_RADIUS, obstacles, WALK_BOUNDS);
        p.path = findCrewPath(p, goal);
        if (!p.path.length) { p.waypoint = (p.waypoint + 1) % route.length; p.pause = 0.5; continue; }
      }
      const goal = p.path[0];
      const distance = Math.hypot(goal.x - p.x, goal.z - p.z);
      const step = Math.min(distance, (1.05 + i * 0.045) * dt);
      if (distance > 0.001) { dx = (goal.x - p.x) / distance * step; dz = (goal.z - p.z) / distance * step; }
      if (distance <= step + 1e-6) {
        p.path.shift();
        if (!p.path.length) { p.waypoint = (p.waypoint + 1) % route.length; p.pause = 1.0 + i * 0.2; }
      }
    }
    // People wait for each other instead of passing through one another.
    const otherPeople: Obstacle[] = crewPoses.filter((o) => o !== p).map((o) => ({ kind: 'circle', x: o.x, z: o.z, r: 0.28 }));
    const next = moveWithCollision(p.x, p.z, dx, dz, PLAYER_RADIUS, [...obstacles, ...otherPeople], WALK_BOUNDS);
    const travelled = Math.hypot(next.x - p.x, next.z - p.z);
    p.speed = travelled / Math.max(dt, 0.001);
    if (travelled > 0.001) p.heading = turn(p.heading, Math.atan2(next.x - p.x, next.z - p.z), dt * 12);
    p.gait += travelled * 7.5;
    Object.assign(p, next);
    if (p.id !== activeId && travelled < 0.001 && Math.hypot(dx, dz) > 0.001) { p.path = []; p.pause = 0.35; }
  }
}

/** Shorten the follow camera's horizontal boom before it crosses equipment or a hall wall. */
export function cameraBoom(p: Point, yaw: number, distance: number): number {
  let safe = 0.3;
  for (let d = 0.3; d <= distance; d += 0.12) {
    if (collides(p.x + Math.sin(yaw) * d, p.z + Math.cos(yaw) * d, 0.18, obstacles, WALK_BOUNDS)) break;
    safe = d;
  }
  return safe;
}
