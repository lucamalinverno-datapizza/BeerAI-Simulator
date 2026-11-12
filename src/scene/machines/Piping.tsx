import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK, TANK_TOP_Y, type Vec3 } from '../layout';
import { getMaterials, liquidColor } from '../materials';
import { prefersReducedMotion } from '../navigation/input';

const noRay = () => null;
const HEADER_Y = 8.6;
const BACK_Z = -12.9;
const BREW_RISER: Vec3 = [-17.6, 1.6, -7.7];
const BUFFER_IN: Vec3[] = [
  [12.5, 0.55, BACK_Z],
  [12.5, 5.0, BACK_Z],
  [17.2, 5.0, BACK_Z],
  [17.2, 5.0, -13.6],
  [17.2, 4.75, -13.6],
];

export function brewPath(x: number, z: number): Vec3[] {
  return [BREW_RISER, [BREW_RISER[0], HEADER_Y, BREW_RISER[2]], [BREW_RISER[0], HEADER_Y, BACK_Z], [x, HEADER_Y, BACK_Z], [x, HEADER_Y, z], [x, TANK_TOP_Y + 0.75, z]];
}
export function releasePath(x: number, z: number): Vec3[] {
  return [[x, TANK.legHeight - 0.15, z], [x, 0.55, z], [x, 0.55, BACK_Z], ...BUFFER_IN];
}

function PipeRun({ points, radius = 0.08, material }: { points: Vec3[]; radius?: number; material: THREE.Material }) {
  const segs = useMemo(() => {
    const out: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector3(...points[i]);
      const b = new THREE.Vector3(...points[i + 1]);
      const len = a.distanceTo(b);
      if (len < 1e-4) continue;
      const dir = b.clone().sub(a).normalize();
      out.push({ pos: a.clone().add(b).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), len });
    }
    return out;
  }, [points]);
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} position={s.pos} quaternion={s.quat} material={material} raycast={noRay}>
          <cylinderGeometry args={[radius, radius, s.len, 10]} />
        </mesh>
      ))}
      {points.slice(1, -1).map((p, i) => (
        <mesh key={`j${i}`} position={p} material={material} raycast={noRay}>
          <sphereGeometry args={[radius * 1.25, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/** Static process piping + catwalk behind the fermenters (illustrative, not a P&ID). */
export function Piping({ tankPositions }: { tankPositions: [number, number][] }) {
  const m = getMaterials();
  const xs = tankPositions.map(([x]) => x);
  const maxX = Math.max(11, ...xs);
  const minX = Math.min(-11, ...xs);
  const header: Vec3[] = [BREW_RISER, [BREW_RISER[0], HEADER_Y, BREW_RISER[2]], [BREW_RISER[0], HEADER_Y, BACK_Z], [maxX, HEADER_Y, BACK_Z]];
  const manifold: Vec3[] = [[minX, 0.55, BACK_Z], ...BUFFER_IN];
  return (
    <group>
      <PipeRun points={header} radius={0.1} material={m.steel} />
      <PipeRun points={manifold} radius={0.09} material={m.steel} />
      {tankPositions.map(([x, z]) => (
        <group key={`${x},${z}`}>
          <PipeRun points={[[x, HEADER_Y, BACK_Z], [x, HEADER_Y, z], [x, TANK_TOP_Y + 0.75, z]]} radius={0.06} material={m.steel} />
          <PipeRun points={[[x, TANK.legHeight - 0.25, z], [x, 0.55, z], [x, 0.55, BACK_Z]]} radius={0.06} material={m.steel} />
        </group>
      ))}
      {/* pipe supports */}
      {[-15, -10, -5, 0, 5, 10].map((x) => (
        <mesh key={x} position={[x, HEADER_Y / 2, BACK_Z - 0.35]} material={m.column} castShadow raycast={noRay}>
          <boxGeometry args={[0.16, HEADER_Y, 0.16]} />
        </mesh>
      ))}
      {/* catwalk */}
      <mesh position={[0, 6.2, -13.9]} material={m.steelDark} castShadow receiveShadow raycast={noRay}>
        <boxGeometry args={[24, 0.1, 1.2]} />
      </mesh>
      <mesh position={[0, 7.25, -13.32]} rotation-z={Math.PI / 2} material={m.yellow} raycast={noRay}>
        <cylinderGeometry args={[0.035, 0.035, 24, 6]} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => -12 + i * 2).map((x) => (
        <mesh key={x} position={[x, 6.7, -13.32]} material={m.yellow} raycast={noRay}>
          <cylinderGeometry args={[0.025, 0.025, 1.05, 6]} />
        </mesh>
      ))}
      {[-12, -6, 0, 6, 12].map((x) => (
        <mesh key={`p${x}`} position={[x, 3.1, -14.4]} material={m.column} raycast={noRay}>
          <boxGeometry args={[0.12, 6.2, 0.12]} />
        </mesh>
      ))}
    </group>
  );
}

/** Illustrative pulses for events of the displayed day (brew → tank, tank → buffer). Not fluid dynamics. */
export function FlowPulse({ points, productIndex }: { points: Vec3[]; productIndex: number }) {
  const group = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const pts = points.map((p) => new THREE.Vector3(...p));
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return { pts, lens, total: lens[lens.length - 1] };
  }, [points]);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: liquidColor(productIndex), emissive: liquidColor(productIndex), emissiveIntensity: 2.2, toneMapped: false }),
    [productIndex],
  );
  const at = (d: number, out: THREE.Vector3) => {
    const { pts, lens } = curve;
    for (let i = 1; i < pts.length; i++) {
      if (d <= lens[i]) {
        const t = (d - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
        return out.lerpVectors(pts[i - 1], pts[i], t);
      }
    }
    return out.copy(pts[pts.length - 1]);
  };
  useFrame(({ clock }) => {
    if (!group.current) return;
    const still = prefersReducedMotion();
    group.current.children.forEach((c, i) => {
      const phase = still ? i / 5 : (clock.elapsedTime * 7) / curve.total + i / 5;
      at((phase % 1) * curve.total, c.position);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} material={mat} raycast={noRay}>
          <sphereGeometry args={[0.15, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}
