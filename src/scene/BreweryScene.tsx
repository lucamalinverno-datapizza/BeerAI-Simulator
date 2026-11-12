import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useSim } from '../panels/common';
import { useApp } from '../state/store';
import { nextTankId } from '../state/machines';
import { Hall } from './Hall';
import { FermenterTank, TankSlot } from './machines/FermenterTank';
import { Brewhouse, ControlRoom, PackagingLine, ShippingDock, Warehouse } from './machines/Equipment';
import { FlowPulse, Piping, brewPath, releasePath } from './machines/Piping';
import { CameraRig } from './navigation/CameraRig';
import { MAX_TANKS, TANK_SLOTS, tankSlotPositions } from './layout';
import { BreweryCrew } from './crew/BreweryCrew';

/** Local image-based lighting generated at runtime (no HDR download). */
function LocalEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    scene.background = new THREE.Color('#dfe6ee');
    scene.fog = new THREE.Fog('#dfe6ee', 90, 190);
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      room.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Lights({ shadows }: { shadows: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const s = sun.current;
    if (!s) return;
    s.shadow.camera.left = -38;
    s.shadow.camera.right = 38;
    s.shadow.camera.top = 30;
    s.shadow.camera.bottom = -30;
    s.shadow.camera.near = 5;
    s.shadow.camera.far = 120;
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.04;
    s.shadow.camera.updateProjectionMatrix();
    s.target.position.set(0, 0, 0);
    s.target.updateMatrixWorld();
  }, []);
  return (
    <>
      <hemisphereLight args={['#f2f6ff', '#8d9196', 0.75]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        ref={sun}
        position={[22, 42, 26]}
        intensity={2.1}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-30, 25, -20]} intensity={0.45} />
    </>
  );
}

/** Equipment reads the displayed engine snapshot; staff navigation is an independent visual layer. */
export function BreweryScene() {
  const { result, cfg, snap } = useSim();
  const quality = useApp((s) => s.quality);
  const inspect = useApp((s) => s.inspectTanks);
  const showLabels = useApp((s) => s.showLabels);
  const reduced = quality === 'reduced';
  const tankIds = cfg.tanks.slice(0, MAX_TANKS).map((t) => t.id);
  const positions = tankSlotPositions(tankIds);
  const productIndex = (pid: string | null | undefined) => Math.max(0, cfg.products.findIndex((p) => p.id === pid));
  const productName = (pid: string | null | undefined) => cfg.products.find((p) => p.id === pid)?.name ?? null;
  // Tanks present at first render do not animate in; tanks added later (e.g. F5 in S3) do.
  const initialTanks = useRef<Set<string> | null>(null);
  if (initialTanks.current === null && result) initialTanks.current = new Set(tankIds);
  const slotId = nextTankId(cfg);
  const slotPos = slotId ? TANK_SLOTS[tankIds.length] : null;
  const pipePositions = useMemo(() => [...positions.values()], [tankIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <LocalEnvironment />
      <Lights shadows={!reduced} />
      <Hall />
      <Brewhouse snap={snap} result={result} showLabel={showLabels} />
      {tankIds.map((id, i) => {
        const [x, z] = positions.get(id)!;
        const st = snap?.tanks.find((t) => t.tank_id === id) ?? null;
        return (
          <FermenterTank
            key={id}
            tankId={id}
            x={x}
            z={z}
            state={st}
            productIndex={productIndex(st?.product_id)}
            productLabel={productName(st?.product_id)}
            inspect={inspect}
            showLabel={showLabels}
            animateIn={!!initialTanks.current && !initialTanks.current.has(id)}
            reduced={reduced}
            labelLift={i % 2 === 1 ? 1.15 : 0}
          />
        );
      })}
      {slotId && slotPos && <TankSlot slotId={slotId} x={slotPos[0]} z={slotPos[1]} showLabel={showLabels} />}
      <Piping tankPositions={pipePositions} />
      {result &&
        snap &&
        snap.brews_started_today.map((bid) => {
          const b = result.batches.find((x) => x.id === bid);
          const p = b && positions.get(b.tank_id);
          return p ? <FlowPulse key={`brew-${bid}`} points={brewPath(p[0], p[1])} productIndex={productIndex(b!.product_id)} /> : null;
        })}
      {result &&
        snap &&
        snap.released_today.map((bid) => {
          const b = result.batches.find((x) => x.id === bid);
          const p = b && positions.get(b.tank_id);
          return p ? <FlowPulse key={`rel-${bid}`} points={releasePath(p[0], p[1])} productIndex={productIndex(b!.product_id)} /> : null;
        })}
      <PackagingLine snap={snap} cfg={cfg} showLabel={showLabels} reduced={reduced} />
      <Warehouse snap={snap} cfg={cfg} showLabel={showLabels} />
      <ShippingDock snap={snap} result={result} showLabel={showLabels} />
      <ControlRoom showLabel={showLabels} />
      <BreweryCrew tankIds={tankIds} />
      <CameraRig tankIds={tankIds} />
    </>
  );
}
