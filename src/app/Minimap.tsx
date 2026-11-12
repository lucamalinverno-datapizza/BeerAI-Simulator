import { useEffect, useRef } from 'react';
import { T } from '../i18n/strings';
import { HALL, ZONES, tankSlotPositions, MAX_TANKS } from '../scene/layout';
import { cameraPose } from '../scene/navigation/input';
import { appStore, useApp } from '../state/store';
import { useSim } from '../panels/common';
import { tankMachineId } from '../state/machines';
import { crewPose, crewPoses } from '../scene/crew/crew';

const S = 4; // px per metre
const W = (HALL.maxX - HALL.minX) * S;
const H = (HALL.maxZ - HALL.minZ) * S;
const px = (x: number) => (x - HALL.minX) * S;
const pz = (z: number) => (z - HALL.minZ) * S;
const STATUS_FILL: Record<string, string> = { occupied: '#2467FF', cleaning: '#19A7CE', unavailable: '#D7342B', idle: '#ffffff' };

/** Small hall map: departments (click = guided view), tanks (click = select), live camera marker. */
export function Minimap() {
  const marker = useRef<SVGGElement>(null);
  const people = useRef<SVGGElement>(null);
  const { cfg, snap } = useSim();
  const selected = useApp((s) => s.selectedId);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (marker.current) {
        const st = appStore.getState();
        const actor = st.cameraMode === 'explore' ? crewPose(st.activeCrewId) : cameraPose;
        const x = Math.max(HALL.minX - 6, Math.min(HALL.maxX + 6, actor.x));
        const z = Math.max(HALL.minZ - 6, Math.min(HALL.maxZ + 8, actor.z));
        marker.current.setAttribute('transform', `translate(${px(x)} ${pz(z)}) rotate(${(-cameraPose.yaw * 180) / Math.PI + 180})`);
        people.current?.querySelectorAll('circle').forEach((dot, i) => {
          const p = crewPoses[i];
          dot.setAttribute('cx', String(px(p.x)));
          dot.setAttribute('cy', String(pz(p.z)));
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const positions = tankSlotPositions(cfg.tanks.slice(0, MAX_TANKS).map((t) => t.id));
  return (
    <div className="minimap">
      <div className="rail-title">{T.nav.map}</div>
      <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} role="group" aria-label={T.nav.map}>
        <rect x={0} y={0} width={W} height={H} fill="#F5F8FC" stroke="#111F2D" strokeWidth={2} />
        {ZONES.map((z) => (
          <g key={z.id} className="minimap-zone" role="button" tabIndex={0} aria-label={`Go to ${z.label.toLowerCase()}`}
            onClick={() => appStore.getState().requestView(z.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                appStore.getState().requestView(z.id);
              }
            }}
          >
            <rect x={px(z.minX)} y={pz(z.minZ)} width={(z.maxX - z.minX) * S} height={(z.maxZ - z.minZ) * S} fill="#EDF3FF" stroke="#D5DDE5" />
            <text x={px((z.minX + z.maxX) / 2)} y={pz(z.maxZ) - 5} fontSize="9" textAnchor="middle" fill="#526170">
              {z.label}
            </text>
          </g>
        ))}
        {[...positions.entries()].map(([id, [x, z]]) => {
          const st = snap?.tanks.find((t) => t.tank_id === id)?.status ?? 'idle';
          const isSel = selected === tankMachineId(id);
          return (
            <g key={id} className="minimap-tank" onClick={() => appStore.getState().select(tankMachineId(id))}>
              <circle cx={px(x)} cy={pz(z)} r={6} fill={STATUS_FILL[st]} stroke={isSel ? '#2467FF' : '#111F2D'} strokeWidth={isSel ? 3 : 1.2} />
              <text x={px(x)} y={pz(z) + 16} fontSize="8" textAnchor="middle" fill="#111F2D">
                {id}
              </text>
            </g>
          );
        })}
        <g ref={people} pointerEvents="none">
          {crewPoses.map((p) => <circle key={p.id} cx={px(p.x)} cy={pz(p.z)} r={2.5} fill="#2467ff" stroke="white" strokeWidth={1} />)}
        </g>
        <g ref={marker} pointerEvents="none">
          <path d="M0 -9 L6 6 L0 3 L-6 6 Z" fill="#D7342B" stroke="#fff" strokeWidth={1} />
        </g>
      </svg>
    </div>
  );
}
