import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneLabel } from '../SceneLabel';
import * as THREE from 'three';
import { BREWHOUSE, CONTROL_ROOM, FIXED_MACHINES, HALL, PACKAGING, SHIPPING, WAREHOUSE } from '../layout';
import { getMaterials, liquidColor, textTexture } from '../materials';
import { Selectable, SelectionRing } from '../Hall';
import { FORKLIFT } from '../navigation/obstacles';
import type { DaySnapshot, ScenarioConfig, SimulationResult } from '../../simulation/types';
import { fmtNum } from '../../app/format';
import { prefersReducedMotion } from '../navigation/input';

const noRay = () => null;

// =============================================================================================
// Brewhouse
// =============================================================================================
export function Brewhouse({ snap, result, showLabel }: { snap: DaySnapshot | null; result: SimulationResult | null; showLabel: boolean }) {
  const m = getMaterials();
  const p = BREWHOUSE.platform;
  const brewing = (snap?.brews_started_today.length ?? 0) > 0;
  const steam = useRef<THREE.Group>(null);
  const kettle = BREWHOUSE.vessels[2];
  const steamMats = useMemo(() => Array.from({ length: 8 }, () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false })), []);
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: brewing ? '#18a058' : '#8A96A3', emissive: brewing ? '#18a058' : '#000000', emissiveIntensity: 1.2 }), [brewing]);

  useFrame(({ clock }) => {
    if (!steam.current) return;
    steam.current.visible = brewing;
    if (!brewing) return;
    steam.current.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.35 + i / steam.current!.children.length) % 1;
      c.position.y = t * 3.2;
      c.position.x = Math.sin(t * 6 + i) * 0.25;
      const s = 0.25 + t * 0.7;
      c.scale.setScalar(s);
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
    });
  });

  const started = snap?.brews_started_today.map((id) => result?.batches.find((b) => b.id === id)).filter(Boolean) ?? [];
  const cx = (p.minX + p.maxX) / 2;
  const cz = (p.minZ + p.maxZ) / 2;
  const railPosts = useMemo(() => {
    const pts: [number, number][] = [];
    for (let x = p.minX; x <= p.maxX + 0.01; x += 1.5) {
      pts.push([x, p.minZ]);
      pts.push([x, p.maxZ]);
    }
    for (let z = p.minZ + 1.5; z < p.maxZ; z += 1.5) {
      pts.push([p.minX, z]);
      pts.push([p.maxX, z]);
    }
    return pts;
  }, [p.minX, p.maxX, p.minZ, p.maxZ]);

  return (
    <group>
      <Selectable id="brewhouse">
        {/* platform */}
        <mesh position={[cx, p.height / 2, cz]} material={m.steelDark} castShadow receiveShadow>
          <boxGeometry args={[p.maxX - p.minX, p.height, p.maxZ - p.minZ]} />
        </mesh>
        {/* stairs */}
        {[0, 1, 2].map((k) => (
          <mesh key={k} position={[p.maxX + 0.35 + k * 0.35, p.height - (k + 1) * 0.28 + 0.14, cz]} material={m.steelDark} castShadow>
            <boxGeometry args={[0.35, 0.28, 1.6]} />
          </mesh>
        ))}
        {/* railing */}
        {railPosts.map(([x, z], i) => (
          <mesh key={i} position={[x, p.height + 0.55, z]} material={m.yellow}>
            <cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
          </mesh>
        ))}
        {[
          [cx, p.minZ, p.maxX - p.minX, 0],
          [cx, p.maxZ, p.maxX - p.minX, 0],
          [p.minX, cz, p.maxZ - p.minZ, 1],
          [p.maxX, cz, p.maxZ - p.minZ, 1],
        ].map(([x, z, len, rot], i) => (
          <mesh key={i} position={[x, p.height + 1.1, z]} rotation={[0, rot ? Math.PI / 2 : 0, Math.PI / 2]} material={m.yellow}>
            <cylinderGeometry args={[0.04, 0.04, len, 6]} />
          </mesh>
        ))}
        {/* vessels */}
        {BREWHOUSE.vessels.map((v) => (
          <group key={v.name} position={[v.x, p.height, v.z]}>
            <mesh position={[0, 0.25, 0]} material={m.steelDark}>
              <cylinderGeometry args={[v.r * 0.85, v.r * 0.85, 0.5, 24]} />
            </mesh>
            <mesh position={[0, 0.5 + v.h / 2, 0]} material={v.copper ? m.copper : m.steel} castShadow receiveShadow>
              <cylinderGeometry args={[v.r, v.r, v.h, 40]} />
            </mesh>
            <mesh position={[0, 0.5 + v.h, 0]} scale={[1, 0.45, 1]} material={v.copper ? m.copper : m.steel} castShadow>
              <sphereGeometry args={[v.r, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            {v.name === 'Kettle' && (
              <mesh position={[0, 0.5 + v.h + 0.4 + 2.8, 0]} material={m.copper} castShadow>
                <cylinderGeometry args={[0.28, 0.35, 5.6, 16]} />
              </mesh>
            )}
            {v.name !== 'Kettle' && (
              <mesh position={[0, 0.5 + v.h + v.r * 0.45 + 0.3, 0]} material={m.steelDark}>
                <cylinderGeometry args={[0.12, 0.12, 0.6, 10]} />
              </mesh>
            )}
            <mesh position={[0, 0.5 + v.h * 0.55, v.r + 0.02]} material={m.darkPanel}>
              <boxGeometry args={[0.6, 0.35, 0.04]} />
            </mesh>
          </group>
        ))}
        {/* connecting pipes between vessels */}
        {[
          [BREWHOUSE.vessels[0], BREWHOUSE.vessels[1]],
          [BREWHOUSE.vessels[1], BREWHOUSE.vessels[3]],
          [BREWHOUSE.vessels[3], BREWHOUSE.vessels[2]],
        ].map(([a, b], i) => {
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const len = Math.hypot(dx, dz);
          return (
            <mesh key={i} position={[(a.x + b.x) / 2, p.height + 1.0, (a.z + b.z) / 2]} rotation={[Math.PI / 2, 0, -Math.atan2(dx, dz)]} material={m.steel}>
              <cylinderGeometry args={[0.07, 0.07, len, 10]} />
            </mesh>
          );
        })}
        {/* control cabinet + status light */}
        <mesh position={[p.maxX - 1, p.height + 0.9, p.maxZ - 0.5]} material={m.machineBody} castShadow>
          <boxGeometry args={[1.4, 1.8, 0.5]} />
        </mesh>
        <mesh position={[p.maxX - 1, p.height + 0.9, p.maxZ - 0.24]} material={m.darkPanel}>
          <boxGeometry args={[1.0, 0.6, 0.02]} />
        </mesh>
        <mesh position={[p.maxX - 1, p.height + 2.0, p.maxZ - 0.5]} material={lightMat}>
          <cylinderGeometry args={[0.09, 0.09, 0.25, 12]} />
        </mesh>
        <mesh position={[cx, 2.5, cz]} visible={false}>
          <boxGeometry args={[p.maxX - p.minX, 5, p.maxZ - p.minZ]} />
        </mesh>
      </Selectable>
      <group ref={steam} position={[kettle.x, p.height + 0.5 + kettle.h + 6.3, kettle.z]}>
        {steamMats.map((mat, i) => (
          <mesh key={i} material={mat} raycast={noRay}>
            <sphereGeometry args={[0.5, 10, 8]} />
          </mesh>
        ))}
      </group>
      <SelectionRing center={FIXED_MACHINES.brewhouse.center} radius={FIXED_MACHINES.brewhouse.ringRadius} id="brewhouse" />
      {showLabel && (
        <SceneLabel position={[cx, 6.4, cz + 2]}>
          <div className={`scene-label ${brewing ? 'status-occupied' : ''}`}>
            <div className="scene-label-title">Brewhouse</div>
            <div className="scene-label-line">
              {started.length ? `Brewing today: ${started.map((b) => `${b!.id} → ${b!.tank_id} (${b!.product_id})`).join(', ')}` : 'No batch started today'}
            </div>
          </div>
        </SceneLabel>
      )}
    </group>
  );
}

// =============================================================================================
// Packaging line with abstract buffer
// =============================================================================================
const BOTTLES = 34;
export function PackagingLine({ snap, cfg, showLabel, reduced }: { snap: DaySnapshot | null; cfg: ScenarioConfig; showLabel: boolean; reduced: boolean }) {
  const m = getMaterials();
  const c = PACKAGING.conveyor;
  const b = PACKAGING.buffer;
  const active = (snap?.packaged_total_today ?? 0) > 1e-9;
  const util = cfg.packaging_capacity_hl_per_day > 0 ? (snap?.packaged_total_today ?? 0) / cfg.packaging_capacity_hl_per_day : 0;
  const activeProduct = cfg.products.findIndex((p) => (snap?.packaged_today[p.id] ?? 0) > 1e-9);
  const bottleMesh = useRef<THREE.InstancedMesh>(null);
  const carousel = useRef<THREE.Mesh>(null);
  const offset = useRef(0);
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9a23a', roughness: 0.4, metalness: 0.6 }), []);
  useEffect(() => {
    capMat.color.set(liquidColor(Math.max(0, activeProduct)));
  }, [activeProduct, capMat]);
  const bottleGeo = useMemo(() => {
    const body = new THREE.CylinderGeometry(0.075, 0.075, 0.26, 10);
    body.translate(0, 0.13, 0);
    return body;
  }, []);
  const bottleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a3212', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.95 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    const mesh = bottleMesh.current;
    if (!mesh) return;
    mesh.visible = active;
    if (!active) return;
    const reducedMotion = prefersReducedMotion();
    if (!reducedMotion) offset.current = (offset.current + dt * (0.4 + 1.6 * util)) % 1;
    const len = c.maxX - c.minX - 0.4;
    for (let i = 0; i < BOTTLES; i++) {
      const t = (i / BOTTLES + offset.current) % 1;
      dummy.position.set(c.minX + 0.2 + t * len, c.height + 0.02, c.z + (i % 2 ? 0.14 : -0.14));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (carousel.current && !reducedMotion) carousel.current.rotation.y += dt * (0.5 + 2 * util);
  });

  const rollers = useMemo(() => {
    const n = Math.floor((c.maxX - c.minX) / 0.5);
    const geo = new THREE.CylinderGeometry(0.05, 0.05, c.width, 8);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.InstancedMesh(geo, m.steel, n);
    const mat4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      mat4.makeTranslation(c.minX + 0.25 + i * 0.5, c.height - 0.08, c.z);
      mesh.setMatrixAt(i, mat4);
    }
    return mesh;
  }, [c.maxX, c.minX, c.width, c.height, c.z, m.steel]);

  const bufferLabel = cfg.products.map((p) => `${p.id} ${fmtNum(snap?.buffer[p.id] ?? 0)}`).join(' · ');
  const machine = (x: number, w: number, d: number, h: number, accent = true) => (
    <group position={[x, 0, c.z]}>
      <mesh position={[0, h / 2, 0]} material={m.machineBody} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {accent && (
        <mesh position={[0, h - 0.12, 0]} material={m.machineAccent}>
          <boxGeometry args={[w + 0.02, 0.18, d + 0.02]} />
        </mesh>
      )}
    </group>
  );

  return (
    <group>
      <Selectable id="packaging">
        {/* abstract pre-packaging buffer (bright beer tank) */}
        <group position={[b.x, 0, b.z]}>
          <mesh position={[0, 0.35, 0]} material={m.steelDark}>
            <cylinderGeometry args={[b.r * 0.8, b.r * 0.8, 0.7, 20]} />
          </mesh>
          <mesh position={[0, 0.7 + b.h / 2, 0]} material={m.steel} castShadow receiveShadow>
            <cylinderGeometry args={[b.r, b.r, b.h, reduced ? 24 : 40]} />
          </mesh>
          <mesh position={[0, 0.7 + b.h, 0]} scale={[1, 0.35, 1]} material={m.steel}>
            <sphereGeometry args={[b.r, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.7 + b.h * 0.6, b.r + 0.02]}>
            <planeGeometry args={[1.2, 0.36]} />
            <meshBasicMaterial map={textTexture(['BUFFER'], { width: 256, height: 80, bg: '#111F2D', fg: '#fff' })} />
          </mesh>
        </group>
        {/* conveyor */}
        <mesh position={[(c.minX + c.maxX) / 2, c.height - 0.25, c.z]} material={m.steelDark} castShadow receiveShadow>
          <boxGeometry args={[c.maxX - c.minX, 0.12, c.width + 0.14]} />
        </mesh>
        <mesh position={[(c.minX + c.maxX) / 2, c.height - 0.01, c.z]} material={m.rubber} receiveShadow>
          <boxGeometry args={[c.maxX - c.minX, 0.03, c.width]} />
        </mesh>
        {[c.width / 2 + 0.06, -c.width / 2 - 0.06].map((dz) => (
          <mesh key={dz} position={[(c.minX + c.maxX) / 2, c.height + 0.08, c.z + dz]} material={m.steel}>
            <boxGeometry args={[c.maxX - c.minX, 0.05, 0.03]} />
          </mesh>
        ))}
        {Array.from({ length: Math.floor((c.maxX - c.minX) / 1.6) + 1 }, (_, i) => c.minX + 0.1 + i * 1.6).map((x) => (
          <mesh key={x} position={[x, (c.height - 0.3) / 2, c.z]} material={m.steelDark}>
            <boxGeometry args={[0.08, c.height - 0.3, c.width]} />
          </mesh>
        ))}
        <primitive object={rollers} />
        {/* filler with glass hood and carousel */}
        {machine(PACKAGING.filler.x, PACKAGING.filler.w, PACKAGING.filler.d, 1.0)}
        <mesh position={[PACKAGING.filler.x, 1.0 + 0.75, c.z]} material={m.glass}>
          <boxGeometry args={[PACKAGING.filler.w, 1.5, PACKAGING.filler.d]} />
        </mesh>
        <mesh ref={carousel} position={[PACKAGING.filler.x, 1.15, c.z]} material={m.steel} castShadow>
          <cylinderGeometry args={[0.85, 0.85, 0.25, 24]} />
        </mesh>
        <mesh position={[PACKAGING.filler.x, 2.55, c.z]} material={m.machineBody}>
          <boxGeometry args={[PACKAGING.filler.w, 0.12, PACKAGING.filler.d]} />
        </mesh>
        {/* labeler, case packer */}
        {machine(PACKAGING.labeler.x, PACKAGING.labeler.w, PACKAGING.labeler.d, PACKAGING.labeler.h)}
        <mesh position={[PACKAGING.labeler.x, PACKAGING.labeler.h + 0.25, c.z]} rotation-x={Math.PI / 2} material={m.whiteLine}>
          <cylinderGeometry args={[0.35, 0.35, 0.12, 20]} />
        </mesh>
        {machine(PACKAGING.packer.x, PACKAGING.packer.w, PACKAGING.packer.d, PACKAGING.packer.h)}
        {/* HMI pedestal */}
        <group position={[14.1, 0, -5.7]}>
          <mesh position={[0, 0.6, 0]} material={m.steelDark}>
            <boxGeometry args={[0.15, 1.2, 0.15]} />
          </mesh>
          <mesh position={[0, 1.35, 0]} rotation-x={-0.4} material={m.darkPanel}>
            <boxGeometry args={[0.7, 0.45, 0.06]} />
          </mesh>
        </group>
        {/* transfer pipe buffer → filler */}
        <mesh position={[b.x + 1, 1.3, (b.z + c.z) / 2]} rotation-x={Math.PI / 2} material={m.steel}>
          <cylinderGeometry args={[0.06, 0.06, Math.abs(c.z - b.z) - 0.4, 8]} />
        </mesh>
        <mesh position={[22, 2.5, -10.5]} visible={false}>
          <boxGeometry args={[14, 5, 9]} />
        </mesh>
      </Selectable>
      <instancedMesh ref={bottleMesh} args={[bottleGeo, bottleMat, BOTTLES]} raycast={noRay} visible={false} castShadow={false} />
      <SelectionRing center={FIXED_MACHINES.packaging.center} radius={FIXED_MACHINES.packaging.ringRadius} id="packaging" />
      {showLabel && (
        <>
          <SceneLabel position={[b.x, 5.6, b.z]}>
            <div className="scene-label">
              <div className="scene-label-title">Buffer (abstract)</div>
              <div className="scene-label-line">{`${bufferLabel} hL`}</div>
            </div>
          </SceneLabel>
          <SceneLabel position={[23, 3.4, c.z]}>
            <div className={`scene-label ${active ? 'status-occupied' : ''}`}>
              <div className="scene-label-title">Packaging line</div>
              <div className="scene-label-line">{`${fmtNum(snap?.packaged_total_today ?? 0)} / ${fmtNum(cfg.packaging_capacity_hl_per_day)} hL today`}</div>
            </div>
          </SceneLabel>
        </>
      )}
    </group>
  );
}

// =============================================================================================
// Warehouse: racks with pallets proportional to packaged stock (1 pallet ≈ 2 hL, illustrative)
// =============================================================================================
export function Warehouse({ snap, cfg, showLabel }: { snap: DaySnapshot | null; cfg: ScenarioConfig; showLabel: boolean }) {
  const m = getMaterials();
  const W = WAREHOUSE;
  const slotsPerRack = W.bays * W.levels * W.palletsPerBay;
  const rackGeo = useMemo(() => {
    const uprights: THREE.Matrix4[] = [];
    const beams: THREE.Matrix4[] = [];
    for (const r of W.racks) {
      const bayW = (r.maxX - r.minX) / W.bays;
      for (let i = 0; i <= W.bays; i++) {
        for (const dz of [-W.rackDepth / 2, W.rackDepth / 2]) uprights.push(new THREE.Matrix4().makeTranslation(r.minX + i * bayW, 2.7, r.z + dz));
      }
      for (let i = 0; i < W.bays; i++) {
        for (let l = 1; l <= W.levels; l++) {
          for (const dz of [-W.rackDepth / 2, W.rackDepth / 2]) beams.push(new THREE.Matrix4().makeTranslation(r.minX + (i + 0.5) * bayW, l * 1.75 - 0.05, r.z + dz));
        }
      }
    }
    const up = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 5.4, 0.1), m.rackUpright, uprights.length);
    uprights.forEach((mm, i) => up.setMatrixAt(i, mm));
    const bayW = (W.racks[0].maxX - W.racks[0].minX) / W.bays;
    const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(bayW - 0.1, 0.14, 0.06), m.rackBeam, beams.length);
    beams.forEach((mm, i) => bm.setMatrixAt(i, mm));
    up.castShadow = bm.castShadow = true;
    return { up, bm };
  }, [W, m.rackUpright, m.rackBeam]);

  return (
    <group>
      <Selectable id="warehouse">
        <primitive object={rackGeo.up} />
        <primitive object={rackGeo.bm} />
        {W.racks.map((r, ri) => {
          const product = cfg.products[r.product];
          const stock = product ? snap?.finished_stock[product.id] ?? 0 : 0;
          const filled = Math.min(slotsPerRack, Math.ceil(stock / W.hlPerPallet - 1e-9));
          return <PalletRack key={ri} rackIndex={ri} filled={filled} productIndex={r.product} />;
        })}
        {/* forklift */}
        <group position={[FORKLIFT.x, 0, FORKLIFT.z]} rotation-y={FORKLIFT.rot}>
          <mesh position={[0, 0.65, 0]} material={m.yellow} castShadow>
            <boxGeometry args={[1.1, 0.9, 1.8]} />
          </mesh>
          <mesh position={[0, 1.45, 0.25]} material={m.darkPanel}>
            <boxGeometry args={[1.0, 0.7, 0.9]} />
          </mesh>
          <mesh position={[0, 1.4, -1.0]} material={m.steelDark} castShadow>
            <boxGeometry args={[0.9, 2.6, 0.12]} />
          </mesh>
          {[-0.3, 0.3].map((dx) => (
            <mesh key={dx} position={[dx, 0.12, -1.6]} material={m.steelDark}>
              <boxGeometry args={[0.12, 0.05, 1.1]} />
            </mesh>
          ))}
          {[
            [-0.55, 0.6],
            [0.55, 0.6],
            [-0.55, -0.6],
            [0.55, -0.6],
          ].map(([dx, dz], i) => (
            <mesh key={i} position={[dx, 0.25, dz]} rotation-z={Math.PI / 2} material={m.tire}>
              <cylinderGeometry args={[0.25, 0.25, 0.2, 14]} />
            </mesh>
          ))}
        </group>
        <mesh position={[20, 2.7, 6.5]} visible={false}>
          <boxGeometry args={[15, 5.4, 5.5]} />
        </mesh>
      </Selectable>
      <SelectionRing center={FIXED_MACHINES.warehouse.center} radius={FIXED_MACHINES.warehouse.ringRadius} id="warehouse" />
      {showLabel &&
        W.racks.map((r, ri) => {
          const product = cfg.products[r.product];
          if (!product) return null;
          return (
            <SceneLabel key={ri} position={[r.minX - 0.6, 6.0, r.z]}>
              <div className="scene-label">
                <div className="scene-label-title">{`${product.name} stock`}</div>
                <div className="scene-label-line">{`${fmtNum(snap?.finished_stock[product.id] ?? 0)} hL packaged`}</div>
              </div>
            </SceneLabel>
          );
        })}
    </group>
  );
}

function PalletRack({ rackIndex, filled, productIndex }: { rackIndex: number; filled: number; productIndex: number }) {
  const m = getMaterials();
  const W = WAREHOUSE;
  const r = W.racks[rackIndex];
  const slots = useMemo(() => {
    const s: [number, number, number][] = [];
    const bayW = (r.maxX - r.minX) / W.bays;
    for (let l = 0; l < W.levels; l++) {
      for (let i = 0; i < W.bays; i++) {
        for (let k = 0; k < W.palletsPerBay; k++) s.push([r.minX + i * bayW + (k + 0.5) * (bayW / W.palletsPerBay), l * 1.75 + 0.02, r.z]);
      }
    }
    return s;
  }, [r, W]);
  const base = useRef<THREE.InstancedMesh>(null);
  const load = useRef<THREE.InstancedMesh>(null);
  const loadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: liquidColor(productIndex), roughness: 0.55, metalness: 0.05 }), [productIndex]);
  const baseGeo = useMemo(() => new THREE.BoxGeometry(1.1, 0.14, 1.0), []);
  const loadGeo = useMemo(() => new THREE.BoxGeometry(1.0, 1.0, 0.92), []);
  useEffect(() => {
    const mat4 = new THREE.Matrix4();
    slots.forEach(([x, y, z], i) => {
      mat4.makeTranslation(x, y + 0.07, z);
      base.current?.setMatrixAt(i, mat4);
      mat4.makeTranslation(x, y + 0.64, z);
      load.current?.setMatrixAt(i, mat4);
    });
    if (base.current) {
      base.current.count = filled;
      base.current.instanceMatrix.needsUpdate = true;
    }
    if (load.current) {
      load.current.count = filled;
      load.current.instanceMatrix.needsUpdate = true;
    }
  }, [slots, filled]);
  return (
    <group>
      <instancedMesh ref={base} args={[baseGeo, m.wood, slots.length]} castShadow />
      <instancedMesh ref={load} args={[loadGeo, loadMat, slots.length]} castShadow />
    </group>
  );
}

// =============================================================================================
// Shipping dock: trucks appear on delivery days (illustrative), with the actual shipments
// =============================================================================================
export function ShippingDock({ snap, result, showLabel }: { snap: DaySnapshot | null; result: SimulationResult | null; showLabel: boolean }) {
  const m = getMaterials();
  const shipments = snap?.shipments_today ?? [];
  const groups = [shipments.filter((_, i) => i % 2 === 0), shipments.filter((_, i) => i % 2 === 1)];
  const day = snap?.day ?? 0;
  return (
    <group>
      <Selectable id="shipping">
        {/* staging lanes */}
        {SHIPPING.doors.map((x) => (
          <group key={x}>
            <mesh rotation-x={-Math.PI / 2} position={[x, 0.012, 14.4]} material={m.safetyLine}>
              <planeGeometry args={[SHIPPING.doorWidth, 0.1]} />
            </mesh>
            {/* bumpers outside */}
            {[-1.3, 1.3].map((dx) => (
              <mesh key={dx} position={[x + dx, 0.9, HALL.maxZ + 0.2]} material={m.rubber}>
                <boxGeometry args={[0.3, 0.5, 0.25]} />
              </mesh>
            ))}
          </group>
        ))}
        {groups.map((g, i) => {
          const hl = g.reduce((a, s) => a + s.quantity_hl, 0);
          const pallets = Math.min(8, Math.ceil(hl / 2 - 1e-9));
          return (
            <group key={i}>
              {Array.from({ length: pallets }, (_, k) => (
                <group key={k} position={[SHIPPING.doors[i] - 1.2 + (k % 3) * 1.2, 0, 15.6 - Math.floor(k / 3) * 1.2]}>
                  <mesh position={[0, 0.07, 0]} material={m.wood} castShadow>
                    <boxGeometry args={[1.0, 0.14, 1.0]} />
                  </mesh>
                  <mesh position={[0, 0.6, 0]} castShadow>
                    <boxGeometry args={[0.9, 0.9, 0.9]} />
                    <meshStandardMaterial color="#d8dde3" roughness={0.6} />
                  </mesh>
                </group>
              ))}
              {g.length > 0 && <Truck key={`${day}-${i}`} x={SHIPPING.doors[i]} label={g.map((s) => `${s.order_id} ${fmtNum(s.quantity_hl)} hL`).join(' · ')} />}
            </group>
          );
        })}
        <mesh position={[21, 2, 15]} visible={false}>
          <boxGeometry args={[15, 4, 5]} />
        </mesh>
      </Selectable>
      <SelectionRing center={FIXED_MACHINES.shipping.center} radius={FIXED_MACHINES.shipping.ringRadius} id="shipping" />
      {showLabel && (
        <SceneLabel position={[21, 5.6, 15]}>
          <div className={`scene-label ${shipments.length ? 'status-occupied' : ''}`}>
            <div className="scene-label-title">Shipping</div>
            {shipments.length === 0 && <div className="scene-label-line">No shipments today</div>}
            {shipments.slice(0, 4).map((s, i) => {
              const o = result?.orders.find((x) => x.id === s.order_id);
              return (
                <div key={i} className="scene-label-line">
                  {`${s.order_id} ${o?.customer ?? ''} · ${fmtNum(s.quantity_hl)} hL ${s.on_time ? '✓' : `! +${s.day - (o?.due_day ?? s.day)}d`}`}
                </div>
              );
            })}
          </div>
        </SceneLabel>
      )}
    </group>
  );
}

function Truck({ x, label }: { x: number; label: string }) {
  const m = getMaterials();
  const ref = useRef<THREE.Group>(null);
  const born = useRef(performance.now());
  const tex = useMemo(() => textTexture(['BeerAI Logistics', label], { width: 1024, height: 256, bg: '#ffffff', fg: '#111F2D' }), [label]);
  useFrame(() => {
    if (!ref.current) return;
    const t = prefersReducedMotion() ? 1 : Math.min(1, (performance.now() - born.current) / 900);
    const k = 1 - Math.pow(1 - t, 3);
    ref.current.position.z = 36 - (36 - 24.3) * k;
  });
  return (
    <group ref={ref} position={[x, 0, 24.3]}>
      {/* trailer (rear at the dock) */}
      <mesh position={[0, 2.25, -0.2]} material={m.truckTrailer} castShadow receiveShadow>
        <boxGeometry args={[2.5, 2.9, 11]} />
      </mesh>
      {[1.26, -1.26].map((dx) => (
        <mesh key={dx} position={[dx, 2.4, -0.2]} rotation-y={dx > 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[9, 2.25]} />
          <meshBasicMaterial map={tex} />
        </mesh>
      ))}
      {/* cab */}
      <mesh position={[0, 1.7, 6.4]} material={m.truckCab} castShadow>
        <boxGeometry args={[2.45, 2.6, 2.2]} />
      </mesh>
      <mesh position={[0, 2.2, 7.52]} material={m.darkPanel}>
        <boxGeometry args={[2.1, 1.0, 0.04]} />
      </mesh>
      {[
        [-1.1, -4],
        [1.1, -4],
        [-1.1, -2.8],
        [1.1, -2.8],
        [-1.1, 4.4],
        [1.1, 4.4],
        [-1.1, 6.6],
        [1.1, 6.6],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.5, dz]} rotation-z={Math.PI / 2} material={m.tire}>
          <cylinderGeometry args={[0.5, 0.5, 0.35, 16]} />
        </mesh>
      ))}
    </group>
  );
}

// =============================================================================================
// Control room with terminal (opens the general HTML panel; no decorative fake controls)
// =============================================================================================
export function ControlRoom({ showLabel }: { showLabel: boolean }) {
  const m = getMaterials();
  const c = CONTROL_ROOM;
  const screen = useMemo(() => textTexture(['CONTROL TERMINAL', 'Click to open', 'the control panel'], { width: 512, height: 288, bg: '#0f1a26', fg: '#cfe0ff' }), []);
  const wallScreen = useMemo(() => textTexture(['BREWERY CONTROL ROOM', 'Synthetic data', 'Click to open the control panel'], { width: 1536, height: 768, bg: '#0f1a26', fg: '#e6efff' }), []);
  const posts: [number, number][] = [];
  for (let x = c.minX + 1.6; x < c.maxX; x += 1.6) posts.push([x, c.minZ]);
  for (let z = c.minZ; z <= c.maxZ; z += 1.6) if (z < c.doorZ[0] || z > c.doorZ[1]) posts.push([c.maxX, z]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[(c.minX + c.maxX) / 2, 0.015, (c.minZ + c.maxZ) / 2]} receiveShadow raycast={noRay}>
        <planeGeometry args={[c.maxX - c.minX, c.maxZ - c.minZ]} />
        <meshStandardMaterial color="#c9d2db" roughness={0.8} />
      </mesh>
      {/* glass walls */}
      <mesh position={[(c.minX + c.maxX) / 2, c.height / 2, c.minZ]} material={m.glass} raycast={noRay}>
        <boxGeometry args={[c.maxX - c.minX, c.height, 0.06]} />
      </mesh>
      <mesh position={[c.maxX, c.height / 2, (c.minZ + c.doorZ[0]) / 2]} material={m.glass} raycast={noRay}>
        <boxGeometry args={[0.06, c.height, c.doorZ[0] - c.minZ]} />
      </mesh>
      <mesh position={[c.maxX, c.height / 2, (c.doorZ[1] + c.maxZ) / 2]} material={m.glass} raycast={noRay}>
        <boxGeometry args={[0.06, c.height, c.maxZ - c.doorZ[1]]} />
      </mesh>
      {posts.map(([x, z], i) => (
        <mesh key={i} position={[x, c.height / 2, z]} material={m.column} castShadow raycast={noRay}>
          <boxGeometry args={[0.1, c.height, 0.1]} />
        </mesh>
      ))}
      <mesh position={[(c.minX + c.maxX) / 2, c.height, c.minZ]} material={m.column} raycast={noRay}>
        <boxGeometry args={[c.maxX - c.minX, 0.12, 0.14]} />
      </mesh>
      <mesh position={[c.maxX, c.height, (c.minZ + c.maxZ) / 2]} material={m.column} raycast={noRay}>
        <boxGeometry args={[0.14, 0.12, c.maxZ - c.minZ]} />
      </mesh>
      <Selectable id="control">
        <group position={[c.desk.x, 0, c.desk.z]}>
          <mesh position={[0, 0.74, 0]} material={m.machineBody} castShadow receiveShadow>
            <boxGeometry args={[c.desk.w, 0.06, c.desk.d]} />
          </mesh>
          {[-1.5, 1.5].map((dx) => (
            <mesh key={dx} position={[dx, 0.37, 0]} material={m.steelDark}>
              <boxGeometry args={[0.08, 0.74, c.desk.d - 0.1]} />
            </mesh>
          ))}
          {[-1.15, 0, 1.15].map((dx, i) => (
            <group key={dx} position={[dx, 1.28, -0.22]} rotation-y={i === 0 ? 0.28 : i === 2 ? -0.28 : 0}>
              <mesh material={m.darkPanel} castShadow>
                <boxGeometry args={[1.12, 0.66, 0.05]} />
              </mesh>
              <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[1.04, 0.58]} />
                <meshBasicMaterial map={screen} />
              </mesh>
              <mesh position={[0, -0.42, 0]} material={m.steelDark}>
                <boxGeometry args={[0.06, 0.2, 0.06]} />
              </mesh>
            </group>
          ))}
          {/* chair */}
          <group position={[0, 0, 0.9]}>
            <mesh position={[0, 0.48, 0]} material={m.darkPanel}>
              <boxGeometry args={[0.55, 0.08, 0.55]} />
            </mesh>
            <mesh position={[0, 0.85, 0.25]} material={m.darkPanel}>
              <boxGeometry args={[0.55, 0.7, 0.07]} />
            </mesh>
            <mesh position={[0, 0.24, 0]} material={m.steelDark}>
              <cylinderGeometry args={[0.04, 0.04, 0.48, 8]} />
            </mesh>
          </group>
          <mesh position={[0, 1.0, 0]} visible={false}>
            <boxGeometry args={[c.desk.w + 0.4, 2, c.desk.d + 1.6]} />
          </mesh>
        </group>
      </Selectable>
      {/* Wall display: opens the same control panel (not a decorative fake control) */}
      <Selectable id="control">
        <group position={[c.minX + 0.08, 1.9, (c.minZ + c.maxZ) / 2 + 0.6]} rotation-y={Math.PI / 2}>
          <mesh material={m.darkPanel}>
            <boxGeometry args={[4.2, 2.2, 0.08]} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[4.0, 2.0]} />
            <meshBasicMaterial map={wallScreen} />
          </mesh>
        </group>
      </Selectable>
      <SelectionRing center={[c.desk.x, 0, c.desk.z]} radius={2.4} id="control" />
      {showLabel && (
        <SceneLabel position={[c.desk.x, 2.6, c.desk.z]}>
          <div className="scene-label">
            <div className="scene-label-title">Control terminal</div>
            <div className="scene-label-line">Click to open the control panel</div>
          </div>
        </SceneLabel>
      )}
    </group>
  );
}
