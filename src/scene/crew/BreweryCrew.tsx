import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { appStore, useApp } from '../../state/store';
import { key, prefersReducedMotion } from '../navigation/input';
import { CREW, configureCrew, crewPose, exploreView, stepCrew, type CrewId } from './crew';
import { SceneLabel } from '../SceneLabel';

/** Locally built, articulated staff model. +Z is forward; feet remain on the floor. */
function Worker({ id }: { id: CrewId }) {
  const person = CREW.find((c) => c.id === id)!;
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftKnee = useRef<THREE.Group>(null);
  const rightKnee = useRef<THREE.Group>(null);
  const active = useApp((s) => s.cameraMode === 'explore' && s.activeCrewId === id);
  const swing = useRef(0);
  const pointerStart = useRef([0, 0]);
  useFrame((_, dt) => {
    const p = crewPose(id);
    if (!root.current || !body.current) return;
    root.current.position.set(p.x, 0, p.z);
    root.current.rotation.y = p.heading;
    const moving = p.speed > 0.08 && !prefersReducedMotion();
    swing.current = THREE.MathUtils.damp(swing.current, moving ? Math.min(0.75, p.speed * 0.24) : 0, 12, dt);
    const a = Math.sin(p.gait) * swing.current;
    leftArm.current!.rotation.x = a * 0.85;
    rightArm.current!.rotation.x = -a * 0.85;
    leftLeg.current!.rotation.x = -a;
    rightLeg.current!.rotation.x = a;
    leftKnee.current!.rotation.x = Math.max(0, a) * 0.7;
    rightKnee.current!.rotation.x = Math.max(0, -a) * 0.7;
    body.current.position.y = moving ? Math.abs(Math.sin(p.gait)) * 0.035 : 0;
  });
  const navy = '#23394c';
  const trim = '#e5ecdf';
  return (
    <group ref={root} userData={{ avatarId: id }}
      onPointerDown={(e) => { pointerStart.current = [e.clientX, e.clientY]; }}
      onClick={(e) => {
        if (Math.hypot(e.clientX - pointerStart.current[0], e.clientY - pointerStart.current[1]) > 6) return;
        e.stopPropagation();
        appStore.getState().setActiveCrew(id);
        appStore.getState().setCameraMode('explore');
      }}>
      <group ref={body}>
        {/* Work trousers, articulated hips/knees and steel-toe boots. */}
        {([-1, 1] as const).map((side) => (
          <group key={side} ref={side === -1 ? leftLeg : rightLeg} position={[side * 0.14, 0.91, 0]}>
            <mesh position={[0, -0.17, 0]} castShadow><capsuleGeometry args={[0.105, 0.20, 4, 8]} /><meshStandardMaterial color={navy} roughness={0.8} /></mesh>
            <group ref={side === -1 ? leftKnee : rightKnee} position={[0, -0.36, 0]}>
              <mesh position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.09, 0.19, 4, 8]} /><meshStandardMaterial color={navy} /></mesh>
              <mesh position={[0, -0.23, 0.002]}><cylinderGeometry args={[0.094, 0.094, 0.045, 8]} /><meshStandardMaterial color={trim} /></mesh>
              <mesh position={[0, -0.43, 0.065]} castShadow><boxGeometry args={[0.22, 0.16, 0.36]} /><meshStandardMaterial color="#18222b" roughness={0.7} /></mesh>
            </group>
          </group>
        ))}
        <mesh position={[0, 1.23, 0]} castShadow><boxGeometry args={[0.5, 0.61, 0.29]} /><meshStandardMaterial color={person.color} roughness={0.85} /></mesh>
        <mesh position={[0, 0.95, 0]}><boxGeometry args={[0.51, 0.07, 0.31]} /><meshStandardMaterial color={navy} /></mesh>
        {/* Reflective bands front and back, opening and name badge. */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[0, 0, side * 0.15]}>
            <mesh position={[0, 1.15, 0]}><boxGeometry args={[0.51, 0.06, 0.012]} /><meshStandardMaterial color={trim} /></mesh>
            {[-0.16, 0.16].map((x) => <mesh key={x} position={[x, 1.38, 0]}><boxGeometry args={[0.055, 0.31, 0.013]} /><meshStandardMaterial color={trim} /></mesh>)}
          </group>
        ))}
        <mesh position={[0, 1.32, 0.158]}><boxGeometry args={[0.025, 0.39, 0.012]} /><meshStandardMaterial color={navy} /></mesh>
        <mesh position={[0.09, 1.28, 0.162]}><boxGeometry args={[0.075, 0.10, 0.014]} /><meshStandardMaterial color="#f6f8fc" /></mesh>
        {([-1, 1] as const).map((side) => (
          <group key={side} ref={side === -1 ? leftArm : rightArm} position={[side * 0.33, 1.46, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow><capsuleGeometry args={[0.095, 0.15, 4, 8]} /><meshStandardMaterial color={navy} /></mesh>
            <mesh position={[0, -0.36, 0.025]} castShadow><capsuleGeometry args={[0.075, 0.17, 4, 8]} /><meshStandardMaterial color={person.skin} /></mesh>
            <mesh position={[0, -0.51, 0.035]} castShadow><sphereGeometry args={[0.085, 8, 6]} /><meshStandardMaterial color="#e0ddce" /></mesh>
          </group>
        ))}
        <mesh position={[0, 1.59, 0]}><cylinderGeometry args={[0.075, 0.075, 0.16, 8]} /><meshStandardMaterial color={person.skin} /></mesh>
        <mesh position={[0, 1.72, 0.015]} scale={[0.86, 1.12, 0.94]} castShadow><sphereGeometry args={[0.17, 12, 10]} /><meshStandardMaterial color={person.skin} roughness={0.9} /></mesh>
        {/* Eyes and nose make the facing direction legible. */}
        {[-0.065, 0.065].map((x) => <mesh key={x} position={[x, 1.75, 0.164]}><sphereGeometry args={[0.018, 6, 6]} /><meshStandardMaterial color="#17202c" /></mesh>)}
        <mesh position={[0, 1.70, 0.18]}><sphereGeometry args={[0.035, 6, 6]} /><meshStandardMaterial color={person.skin} /></mesh>
        <mesh position={[0, 1.83, 0]} castShadow><sphereGeometry args={[0.193, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={active ? '#2467ff' : person.color} roughness={0.6} /></mesh>
        <mesh position={[0, 1.83, 0.025]}><cylinderGeometry args={[0.224, 0.224, 0.035, 12]} /><meshStandardMaterial color={active ? '#2467ff' : person.color} /></mesh>
      </group>
      {active && <>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]} raycast={() => null}>
          <ringGeometry args={[0.45, 0.52, 40]} /><meshBasicMaterial color="#2467ff" transparent opacity={0.9} depthWrite={false} />
        </mesh>
        <SceneLabel position={[0, 2.35, 0]} k={8} min={0.75} max={1}>
          <div className="avatar-nameplate"><span className="avatar-you">YOU</span> {person.name} <span>{person.role}</span></div>
        </SceneLabel>
      </>}
    </group>
  );
}

export function BreweryCrew({ tankIds }: { tankIds: string[] }) {
  const tankKey = tankIds.join(',');
  useEffect(() => { configureCrew(tankKey.split(',')); }, [tankKey]);
  useFrame((_, delta) => {
    const s = appStore.getState();
    if (s.mode !== '3d') return;
    stepCrew(Math.min(delta, 0.05), s.cameraMode === 'explore' ? s.activeCrewId : null, {
      forward: Number(key('KeyW') || key('ArrowUp')) - Number(key('KeyS') || key('ArrowDown')),
      strafe: Number(key('KeyD') || key('ArrowRight')) - Number(key('KeyA') || key('ArrowLeft')),
      run: key('ShiftLeft') || key('ShiftRight'), yaw: exploreView.yaw,
    });
  }, -2);
  return <group name="Brewery staff">{CREW.map((c) => <Worker key={c.id} id={c.id} />)}</group>;
}
