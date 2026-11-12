import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneLabel } from '../SceneLabel';
import * as THREE from 'three';
import { TANK, TANK_TOP_Y } from '../layout';
import { getMaterials, liquidMaterial, textTexture } from '../materials';
import { Selectable, SelectionRing } from '../Hall';
import { T } from '../../i18n/strings';
import type { TankDayState } from '../../simulation/types';
import { prefersReducedMotion } from '../navigation/input';

const STATUS_COLOR: Record<string, string> = { occupied: '#2467FF', cleaning: '#19A7CE', unavailable: '#D7342B', idle: '#8A96A3' };
const noRay = () => null;

/** Height of the liquid surface for a fill fraction, computed from the real cone + cylinder volume. */
export function liquidLevel(fill: number): { coneH: number; cylH: number } {
  const r = 1; // radius cancels out
  const vCone = (Math.PI * r * r * TANK.coneHeight) / 3;
  const vCyl = Math.PI * r * r * TANK.bodyHeight;
  const v = Math.max(0, Math.min(1, fill)) * (vCone + vCyl);
  if (v <= vCone) return { coneH: TANK.coneHeight * Math.cbrt(v / vCone), cylH: 0 };
  return { coneH: TANK.coneHeight, cylH: (v - vCone) / (Math.PI * r * r) };
}

let stripeTex: THREE.CanvasTexture | null = null;
function barrierTexture() {
  if (stripeTex) return stripeTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : '#D7342B';
    g.beginPath();
    g.moveTo(i * 16, 0);
    g.lineTo(i * 16 + 16, 0);
    g.lineTo(i * 16, 32);
    g.lineTo(i * 16 - 16, 32);
    g.fill();
  }
  stripeTex = new THREE.CanvasTexture(c);
  stripeTex.wrapS = THREE.RepeatWrapping;
  stripeTex.repeat.set(6, 1);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  return stripeTex;
}

export interface FermenterProps {
  tankId: string;
  x: number;
  z: number;
  state: TankDayState | null;
  productIndex: number;
  productLabel: string | null;
  inspect: boolean;
  showLabel: boolean;
  animateIn: boolean;
  reduced: boolean;
  /** Raises every other label so neighbouring tanks' labels do not overlap. */
  labelLift?: number;
}

/** Cylindro-conical stainless fermenter. Visual level = volume / capacity from the engine snapshot. */
export function FermenterTank({ tankId, x, z, state, productIndex, productLabel, inspect, showLabel, animateIn, reduced, labelLift = 0 }: FermenterProps) {
  const m = getMaterials();
  const R = TANK.radius;
  const yCone = TANK.legHeight;
  const yBody = TANK.legHeight + TANK.coneHeight;
  const yTop = yBody + TANK.bodyHeight;
  const status = state?.status ?? 'idle';
  const fill = state && state.capacity_hl > 0 ? state.volume_hl / state.capacity_hl : 0;
  const level = liquidLevel(fill);
  const shell = inspect ? m.steelGhost : m.steel;
  const liquid = liquidMaterial(productIndex);
  const group = useRef<THREE.Group>(null);
  const born = useRef(performance.now());
  const beacon = useMemo(() => new THREE.MeshStandardMaterial({ color: STATUS_COLOR[status], emissive: STATUS_COLOR[status], emissiveIntensity: 1.4 }), [status]);
  const plate = useMemo(() => textTexture([tankId], { width: 256, height: 128, bg: '#111F2D', fg: '#ffffff', font: '700 84px Poppins, "Helvetica Neue", Arial, sans-serif' }), [tankId]);

  useFrame(() => {
    if (!group.current) return;
    if (animateIn && !prefersReducedMotion()) {
      const t = Math.min(1, (performance.now() - born.current) / 700);
      const k = 1 - Math.pow(1 - t, 3);
      group.current.scale.setScalar(0.001 + 0.999 * k);
    } else group.current.scale.setScalar(1);
  });

  const radial = reduced ? 24 : 48;
  const sightY0 = yCone + 0.25;
  const sightY1 = yTop - 0.25;
  const surfaceY = yCone + level.coneH + level.cylH;
  const sightLiquid = Math.max(0, Math.min(sightY1, surfaceY) - sightY0);

  const progress = state?.time_progress;
  return (
    <group position={[x, 0, z]}>
      <group ref={group}>
        <Selectable id={`tank:${tankId}`}>
          {/* legs */}
          {[0, 1, 2, 3].map((k) => {
            const a = Math.PI / 4 + (k * Math.PI) / 2;
            return (
              <mesh key={k} position={[Math.cos(a) * R * 0.78, (TANK.legHeight + 0.5) / 2, Math.sin(a) * R * 0.78]} material={m.steel} castShadow>
                <cylinderGeometry args={[0.07, 0.08, TANK.legHeight + 0.5, 10]} />
              </mesh>
            );
          })}
          {/* cone, body, dome */}
          <mesh position={[0, yCone + TANK.coneHeight / 2, 0]} material={shell} castShadow={!inspect} receiveShadow>
            <cylinderGeometry args={[R, 0.16, TANK.coneHeight, radial, 1, true]} />
          </mesh>
          <mesh position={[0, yBody + TANK.bodyHeight / 2, 0]} material={shell} castShadow={!inspect} receiveShadow>
            <cylinderGeometry args={[R, R, TANK.bodyHeight, radial, 1, true]} />
          </mesh>
          <mesh position={[0, yTop, 0]} scale={[1, TANK.domeHeight / R, 1]} material={shell} castShadow={!inspect}>
            <sphereGeometry args={[R, radial, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {/* cooling jacket bands */}
          {!inspect &&
            [0.18, 0.5, 0.82].map((f) => (
              <mesh key={f} position={[0, yBody + TANK.bodyHeight * f, 0]} material={m.insulation}>
                <cylinderGeometry args={[R + 0.02, R + 0.02, 0.42, radial, 1, true]} />
              </mesh>
            ))}
          {/* outlet valve */}
          <mesh position={[0, yCone - 0.12, 0]} material={m.steelDark}>
            <cylinderGeometry args={[0.1, 0.1, 0.3, 12]} />
          </mesh>
          <mesh position={[0.16, yCone - 0.18, 0]} rotation-z={Math.PI / 2} material={m.yellow}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
          </mesh>
          {/* manway + CIP pipe on top */}
          <mesh position={[0.45, yTop + TANK.domeHeight * 0.55, 0]} material={m.steelDark}>
            <cylinderGeometry args={[0.24, 0.24, 0.14, 16]} />
          </mesh>
          <mesh position={[0, yTop + TANK.domeHeight + 0.35, 0]} material={m.steel}>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
          </mesh>
          {/* sight glass with real level */}
          <mesh position={[0, (sightY0 + sightY1) / 2, R + 0.12]} material={m.glass}>
            <cylinderGeometry args={[0.05, 0.05, sightY1 - sightY0, 8]} />
          </mesh>
          {sightLiquid > 0.01 && (
            <mesh position={[0, sightY0 + sightLiquid / 2, R + 0.12]} material={liquid}>
              <cylinderGeometry args={[0.035, 0.035, sightLiquid, 8]} />
            </mesh>
          )}
          {/* name plate */}
          <mesh position={[0, yBody + TANK.bodyHeight * 0.68, R + 0.035]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshBasicMaterial map={plate} />
          </mesh>
          {/* status beacon */}
          <mesh position={[-0.5, yTop + TANK.domeHeight * 0.5 + 0.12, 0]} material={beacon}>
            <cylinderGeometry args={[0.1, 0.1, 0.22, 12]} />
          </mesh>
          {/* liquid (visible in inspect mode; level = volume / capacity, it does not shrink while fermenting) */}
          {inspect && fill > 0 && (
            <group>
              <mesh position={[0, yCone + level.coneH / 2, 0]} scale={[(R * 0.97 * level.coneH) / TANK.coneHeight, level.coneH, (R * 0.97 * level.coneH) / TANK.coneHeight]} material={liquid} raycast={noRay}>
                <cylinderGeometry args={[1, 0.02, 1, 32]} />
              </mesh>
              {level.cylH > 0 && (
                <mesh position={[0, yBody + level.cylH / 2, 0]} scale={[R * 0.97, level.cylH, R * 0.97]} material={liquid} raycast={noRay}>
                  <cylinderGeometry args={[1, 1, 1, 32]} />
                </mesh>
              )}
            </group>
          )}
          {/* cleaning: CIP ring */}
          {status === 'cleaning' && (
            <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} raycast={noRay}>
              <ringGeometry args={[R + 0.15, R + 0.45, 48]} />
              <meshBasicMaterial color="#19A7CE" transparent opacity={0.7} />
            </mesh>
          )}
          {/* unavailable: barrier tape */}
          {status === 'unavailable' && (
            <group>
              <mesh position={[0, 0.95, 0]} raycast={noRay}>
                <cylinderGeometry args={[R + 0.7, R + 0.7, 0.12, 40, 1, true]} />
                <meshBasicMaterial map={barrierTexture()} side={THREE.DoubleSide} />
              </mesh>
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <mesh key={k} position={[Math.cos((k * Math.PI) / 3) * (R + 0.7), 0.5, Math.sin((k * Math.PI) / 3) * (R + 0.7)]} material={m.yellow} raycast={noRay}>
                  <cylinderGeometry args={[0.04, 0.06, 1, 8]} />
                </mesh>
              ))}
            </group>
          )}
          {/* invisible pick volume so the whole tank is easy to click */}
          <mesh position={[0, TANK_TOP_Y / 2, 0]} visible={false}>
            <cylinderGeometry args={[R + 0.1, R + 0.1, TANK_TOP_Y, 12]} />
          </mesh>
        </Selectable>
      </group>
      <SelectionRing center={[0, 0, 0]} radius={R + 0.55} id={`tank:${tankId}`} />
      {showLabel && (
        <SceneLabel position={[0, TANK_TOP_Y + 1.0 + labelLift, 0]}>
          <div className={`scene-label status-${status}`} data-testid={`label-tank-${tankId}`}>
            <div className="scene-label-title">
              {tankId} <span className="scene-label-status">{`${T.tankStatusIcon[status]} ${T.tankStatus[status]}`}</span>
            </div>
            {state && state.batch_id && status === 'occupied' && (
              <div className="scene-label-line">
                {`${productLabel ?? ''} · ${state.batch_id} · ${state.volume_hl.toLocaleString('en-US')}/${state.capacity_hl.toLocaleString('en-US')}`}
              </div>
            )}
            {state && status === 'occupied' && (
              <div className="scene-label-line">{progress !== null && progress !== undefined ? `out d${state.ready_day} · ${Math.round(progress * 100)}% time` : `out d${state.ready_day}`}</div>
            )}
            {state && status === 'cleaning' && <div className="scene-label-line">{`free from day ${state.clean_until}`}</div>}
          </div>
        </SceneLabel>
      )}
    </group>
  );
}

/** Empty, marked slot where an extra fermenter can be added (e.g. F5 before S3). */
export function TankSlot({ slotId, x, z, showLabel }: { slotId: string; x: number; z: number; showLabel: boolean }) {
  const m = getMaterials();
  return (
    <group position={[x, 0, z]}>
      <Selectable id={`slot:${slotId}`}>
        <mesh position={[0, 0.06, 0]} material={m.steelDark} receiveShadow>
          <cylinderGeometry args={[TANK.radius + 0.2, TANK.radius + 0.25, 0.12, 40]} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.13, 0]}>
          <ringGeometry args={[TANK.radius - 0.1, TANK.radius + 0.1, 40]} />
          <meshBasicMaterial color="#e8b10a" />
        </mesh>
        <mesh position={[0, 0.6, 0]} visible={false}>
          <cylinderGeometry args={[TANK.radius, TANK.radius, 1.2, 12]} />
        </mesh>
      </Selectable>
      <SelectionRing center={[0, 0, 0]} radius={TANK.radius + 0.55} id={`slot:${slotId}`} />
      {showLabel && (
        <SceneLabel position={[0, 1.4, 0]}>
          <div className="scene-label scene-label-muted">{`${slotId} · empty slot`}</div>
        </SceneLabel>
      )}
    </group>
  );
}
