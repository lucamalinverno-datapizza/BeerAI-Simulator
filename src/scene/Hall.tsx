import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { HALL, SHIPPING, ZONES, CONTROL_ROOM } from './layout';
import { getMaterials, textTexture } from './materials';
import { appStore, useApp } from '../state/store';

/** Clickable group: identifies the machine for raycasts (mouse, pointer lock) and opens its panel. */
export function Selectable({ id, children, position, rotation }: { id: string; children: ReactNode; position?: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group
      position={position}
      rotation={rotation}
      userData={{ machineId: id }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (document.pointerLockElement) return; // handled by the crosshair raycast
        if (e.delta > 6) return; // it was a drag (orbit / look), not a click
        e.stopPropagation();
        appStore.getState().select(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover.set(id);
      }}
      onPointerOut={() => hover.clear(id)}
    >
      {children}
    </group>
  );
}

/** Hover state kept outside React state to avoid re-rendering the scene on every pointer move. */
export const hover = {
  id: null as string | null,
  set(id: string) {
    this.id = id;
    document.body.style.cursor = 'pointer';
  },
  clear(id: string) {
    if (this.id === id) {
      this.id = null;
      document.body.style.cursor = '';
    }
  },
};

/** Selection ring on the floor (word + colour + motion; also mirrored in the panel title). */
export function SelectionRing({ center, radius, id }: { center: [number, number, number]; radius: number; id: string }) {
  const selected = useApp((s) => s.selectedId === id);
  const ref = useRef<THREE.Mesh>(null);
  const hoverRef = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2467FF', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }), []);
  const hmat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), []);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.visible = selected;
      if (selected) mat.opacity = 0.6 + 0.3 * Math.sin(clock.elapsedTime * 3);
    }
    if (hoverRef.current) hoverRef.current.visible = !selected && hover.id === id;
  });
  const noRay = () => null;
  return (
    <group position={[center[0], 0.03, center[2]]}>
      <mesh ref={ref} rotation-x={-Math.PI / 2} material={mat} raycast={noRay} visible={false}>
        <ringGeometry args={[radius, radius + 0.22, 64]} />
      </mesh>
      <mesh ref={hoverRef} rotation-x={-Math.PI / 2} material={hmat} raycast={noRay} visible={false}>
        <ringGeometry args={[radius, radius + 0.1, 64]} />
      </mesh>
    </group>
  );
}

function Wall({ from, to, height = HALL.height, bottom = 0 }: { from: [number, number]; to: [number, number]; height?: number; bottom?: number }) {
  const m = getMaterials();
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  // Plane faces +z by default; rotate so its front faces the hall interior (dollhouse effect from outside).
  const angle = Math.atan2(dx, dz) - Math.PI / 2;
  return (
    <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation={[0, angle, 0]}>
      <mesh position={[0, bottom + (height - bottom) / 2, 0]} material={m.wall} receiveShadow userData={{ passThrough: true }}>
        <planeGeometry args={[len, height - bottom]} />
      </mesh>
      {bottom === 0 && (
        <mesh position={[0, 0.6, 0.02]} material={m.wallBand} userData={{ passThrough: true }}>
          <planeGeometry args={[len, 1.2]} />
        </mesh>
      )}
    </group>
  );
}

/** Industrial hall: floor, walls (visible from inside only), roof trusses, columns, lights, markings, signs. */
export function Hall() {
  const m = getMaterials();
  const W = HALL.maxX - HALL.minX;
  const D = HALL.maxZ - HALL.minZ;
  const noRay = () => null;

  const trussXs = [-20, -10, 0, 10, 20];
  const columnPositions = useMemo(() => {
    const p: [number, number][] = [];
    for (let x = -30; x <= 30; x += 10) {
      p.push([x, HALL.minZ + 0.25]);
      p.push([x, HALL.maxZ - 0.25]);
    }
    for (let z = -9; z <= 9; z += 9) {
      p.push([HALL.minX + 0.25, z]);
      p.push([HALL.maxX - 0.25, z]);
    }
    return p;
  }, []);

  const columnsMesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.42, HALL.height, 0.42);
    const mesh = new THREE.InstancedMesh(geo, m.column, columnPositions.length);
    const mat4 = new THREE.Matrix4();
    columnPositions.forEach(([x, z], i) => {
      mat4.makeTranslation(x, HALL.height / 2, z);
      mesh.setMatrixAt(i, mat4);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [columnPositions, m.column]);

  const lamps = useMemo(() => {
    // Downward-facing discs: visible from the floor, invisible from the overview above the roof line.
    const geo = new THREE.CircleGeometry(0.55, 20);
    geo.rotateX(Math.PI / 2);
    const pos: [number, number][] = [];
    for (const x of [-25, -15, -5, 5, 15, 25]) for (const z of [-11, 0, 11]) pos.push([x, z]);
    const mesh = new THREE.InstancedMesh(geo, m.lampEmissive, pos.length);
    const mat4 = new THREE.Matrix4();
    pos.forEach(([x, z], i) => {
      mat4.makeTranslation(x, 9.4, z);
      mesh.setMatrixAt(i, mat4);
    });
    mesh.raycast = noRay;
    return mesh;
  }, [m.lampEmissive]);

  // South wall segments with two dock door openings.
  const d0 = SHIPPING.doors[0];
  const d1 = SHIPPING.doors[1];
  const hw = SHIPPING.doorWidth / 2;
  const southSegments: [number, number][] = [
    [HALL.maxX, d1 + hw],
    [d1 - hw, d0 + hw],
    [d0 - hw, HALL.minX],
  ];

  return (
    <group>
      {/* Exterior ground */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 8]} material={m.asphalt} receiveShadow userData={{ passThrough: true }}>
        <planeGeometry args={[220, 200]} />
      </mesh>
      {/* Hall floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} material={m.concrete} receiveShadow userData={{ passThrough: true }}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* Plinth outlines the building footprint from outside */}
      {[
        [0, HALL.minZ, W + 0.6, 0.6],
        [0, HALL.maxZ, W + 0.6, 0.6],
        [HALL.minX, 0, 0.6, D],
        [HALL.maxX, 0, 0.6, D],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.2, z]} material={m.wallBand} receiveShadow castShadow userData={{ passThrough: true }}>
          <boxGeometry args={[w, 0.4, d]} />
        </mesh>
      ))}

      {/* Walls (inward-facing planes) */}
      <Wall from={[HALL.minX, HALL.minZ]} to={[HALL.maxX, HALL.minZ]} />
      <Wall from={[HALL.maxX, HALL.minZ]} to={[HALL.maxX, HALL.maxZ]} />
      <Wall from={[HALL.minX, HALL.maxZ]} to={[HALL.minX, HALL.minZ]} />
      {southSegments.map(([a, b], i) => (
        <Wall key={i} from={[a, HALL.maxZ]} to={[b, HALL.maxZ]} />
      ))}
      {[d0, d1].map((x, i) => (
        <group key={i}>
          <Wall from={[x + hw, HALL.maxZ]} to={[x - hw, HALL.maxZ]} bottom={SHIPPING.doorHeight} />
          {/* roll-up door, partly open */}
          <mesh position={[x, SHIPPING.doorHeight - 0.6, HALL.maxZ - 0.12]} material={m.dockDoor} castShadow raycast={noRay}>
            <boxGeometry args={[SHIPPING.doorWidth + 0.2, 1.2, 0.12]} />
          </mesh>
          <mesh position={[x, 0.02, HALL.maxZ - 1.2]} rotation-x={-Math.PI / 2} material={m.steelDark} receiveShadow raycast={noRay}>
            <planeGeometry args={[SHIPPING.doorWidth - 0.4, 2.2]} />
          </mesh>
        </group>
      ))}
      {/* Personnel door */}
      <mesh position={[-11, 1.15, HALL.maxZ - 0.04]} rotation-y={Math.PI} raycast={noRay}>
        <planeGeometry args={[1.4, 2.3]} />
        <meshStandardMaterial color="#2467FF" roughness={0.6} />
      </mesh>
      {/* High window band (daylight look) */}
      {[HALL.minZ + 0.05, HALL.maxZ - 0.05].map((z, i) => (
        <mesh key={i} position={[0, 8.2, z]} rotation-y={i === 0 ? 0 : Math.PI} raycast={noRay}>
          <planeGeometry args={[W - 4, 1.4]} />
          <meshBasicMaterial color="#e9f2fb" />
        </mesh>
      ))}

      {/* Ceiling visible from below only + trusses (hidden when looking from above the roof line) */}
      <RoofGroup>
      <mesh rotation-x={Math.PI / 2} position={[0, HALL.height + 1.2, 0]} material={m.ceiling} raycast={noRay}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {trussXs.map((x) => (
        <group key={x} position={[x, HALL.height, 0]}>
          <mesh material={m.truss} raycast={noRay}>
            <boxGeometry args={[0.22, 0.28, D]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} material={m.truss} position={[0, 0.6, (s * D) / 4]} rotation-x={s * 0.066} raycast={noRay}>
              <boxGeometry args={[0.2, 0.22, D / 2]} />
            </mesh>
          ))}
          {Array.from({ length: 9 }, (_, i) => -D / 2 + 2 + i * 4).map((z) => (
            <mesh key={z} material={m.truss} position={[0, 0.5, z]} rotation-x={0.6} raycast={noRay}>
              <boxGeometry args={[0.08, 1.2, 0.08]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-9, 0, 9].map((z) => (
        <mesh key={z} position={[0, HALL.height + 0.7, z]} material={m.truss} raycast={noRay}>
          <boxGeometry args={[W, 0.16, 0.16]} />
        </mesh>
      ))}
      <primitive object={lamps} />
      </RoofGroup>
      <primitive object={columnsMesh} />

      {/* Floor markings */}
      {[-1.6, 2.8].map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.012, z]} material={m.safetyLine} raycast={noRay}>
          <planeGeometry args={[W - 1.5, 0.14]} />
        </mesh>
      ))}
      {ZONES.map((zn) => (
        <ZoneMarking key={zn.id} minX={zn.minX} maxX={zn.maxX} minZ={zn.minZ} maxZ={zn.maxZ} label={zn.label} isControl={zn.id === 'control'} />
      ))}
      {/* Zone signs mounted high on the walls (never in front of the machines) */}
      {ZONES.filter((z) => z.id === 'brewhouse' || z.id === 'fermentation' || z.id === 'packaging').map((zn) => (
        <WallSign key={zn.id} position={[(zn.minX + zn.maxX) / 2, 9.2, HALL.minZ + 0.06]} rotationY={0} label={zn.label} />
      ))}
      {ZONES.filter((z) => z.id === 'warehouse' || z.id === 'shipping').map((zn) => (
        <WallSign key={zn.id} position={[HALL.maxX - 0.06, 8.6, (zn.minZ + zn.maxZ) / 2]} rotationY={-Math.PI / 2} label={zn.label} />
      ))}
      <WallSign position={[(CONTROL_ROOM.minX + CONTROL_ROOM.maxX) / 2, 4.0, CONTROL_ROOM.minZ - 0.06]} rotationY={Math.PI} label="CONTROL ROOM" small />
    </group>
  );
}

function ZoneMarking({ minX, maxX, minZ, maxZ, label, isControl }: { minX: number; maxX: number; minZ: number; maxZ: number; label: string; isControl: boolean }) {
  const m = getMaterials();
  const noRay = () => null;
  const w = maxX - minX;
  const d = maxZ - minZ;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const tex = useMemo(() => textTexture([label], { width: 1024, height: 128, fg: 'rgba(255,255,255,0.9)', font: '700 84px Poppins, "Helvetica Neue", Arial, sans-serif' }), [label]);
  const t = 0.1;
  return (
    <group>
      {[
        [cx, minZ, w, t],
        [cx, maxZ, w, t],
        [minX, cz, t, d],
        [maxX, cz, t, d],
      ].map(([x, z, ww, dd], i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[x, 0.011, z]} material={m.whiteLine} raycast={noRay}>
          <planeGeometry args={[ww, dd]} />
        </mesh>
      ))}
      {!isControl && (
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0.013, maxZ - 0.9]} raycast={noRay}>
          <planeGeometry args={[Math.min(w - 1, 9), 1.1]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function WallSign({ position, rotationY, label, small = false }: { position: [number, number, number]; rotationY: number; label: string; small?: boolean }) {
  const tex = useMemo(() => textTexture([label], { width: 1024, height: 192, bg: '#111F2D', fg: '#ffffff', font: '600 96px Poppins, "Helvetica Neue", Arial, sans-serif' }), [label]);
  const noRay = () => null;
  const w = small ? 3.2 : 6.2;
  return (
    <mesh position={position} rotation-y={rotationY} raycast={noRay}>
      <planeGeometry args={[w, w * 0.1875]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

/** Roof structure: visible from inside the hall, hidden when the camera is above the roof (overview). */
function RoofGroup({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y < HALL.height + 1.5;
  });
  return <group ref={ref}>{children}</group>;
}
