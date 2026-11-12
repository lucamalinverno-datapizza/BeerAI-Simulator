import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { appStore, useApp } from '../../state/store';
import { parseMachineId } from '../../state/machines';
import { FIXED_MACHINES, VIEWS, tankFocus, tankSlotPositions, type CameraPose, type FixedMachineId, type Vec3 } from '../layout';
import { cameraBoom, crewPose, exploreView } from '../crew/crew';
import { cameraPose, initKeyboard, key, onMoveKey, prefersReducedMotion } from './input';

type Controls = ComponentRef<typeof OrbitControls>;

interface Tween {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  curTarget: THREE.Vector3;
  t: number;
  start: number;
  dur: number;
  then?: () => void;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Camera navigation: Overview (orbit + zoom + keyboard pan) and Explore (third-person staff control, WASD/arrows,
 * drag-to-orbit or explicit pointer lock, collision-aware follow camera). Guided views and
 * focus are short, interruptible tweens that respect prefers-reduced-motion.
 * Camera movement never touches simulation state.
 */
export function CameraRig({ tankIds }: { tankIds: string[] }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const controls = useRef<Controls>(null);
  const mode = useApp((s) => s.cameraMode);
  const viewRequest = useApp((s) => s.viewRequest);
  const focusRequest = useApp((s) => s.focusRequest);
  const activeCrewId = useApp((s) => s.activeCrewId);
  const scratch = useMemo(() => ({ position: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  const tween = useRef<Tween | null>(null);
  const modeRef = useRef(mode);
  const fps = useRef({ frames: 0, acc: 0 });

  const target = () => controls.current?.target ?? new THREE.Vector3(...VIEWS.overview.target);

  const startTween = (pos: Vec3 | THREE.Vector3, tgt: Vec3 | THREE.Vector3, then?: () => void) => {
    const toPos = pos instanceof THREE.Vector3 ? pos.clone() : new THREE.Vector3(...pos);
    const toTarget = tgt instanceof THREE.Vector3 ? tgt.clone() : new THREE.Vector3(...tgt);
    if (prefersReducedMotion()) {
      camera.position.copy(toPos);
      target().copy(toTarget);
      camera.lookAt(toTarget);
      controls.current?.update();
      tween.current = null;
      then?.();
      return;
    }
    const fromTarget = modeRef.current === 'explore' && !controls.current?.enabled ? camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(6)) : target().clone();
    // Wall-clock based so it completes in 0.75 s even when frames are throttled (background tab, slow GPU).
    tween.current = { fromPos: camera.position.clone(), toPos, fromTarget, toTarget, curTarget: fromTarget.clone(), t: 0, start: performance.now(), dur: 0.75, then };
  };

  const cancelTween = () => {
    const tw = tween.current;
    if (!tw) return;
    tween.current = null;
    if (modeRef.current === 'overview') {
      target().copy(tw.curTarget);
      controls.current?.update();
    }
  };

  // Projection helper for diagnostics/automated checks (read-only).
  useEffect(() => {
    cameraPose.project = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z).project(camera);
      const r = gl.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, inFront: v.z < 1 };
    };
    return () => {
      cameraPose.project = null;
    };
  }, [camera, gl]);

  // Initial pose.
  useEffect(() => {
    camera.position.set(...VIEWS.overview.position);
    target().set(...VIEWS.overview.target);
    camera.lookAt(target());
    controls.current?.update();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard + mouse look + pointer lock.
  useEffect(() => {
    const disposeKeys = initKeyboard();
    const offMove = onMoveKey(() => cancelTween());
    const el = gl.domElement;
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const look = (dx: number, dy: number) => {
      exploreView.yaw -= dx * 0.0032;
      exploreView.elevation = Math.max(0.12, Math.min(0.9, exploreView.elevation + dy * 0.0032));
    };
    const onDown = (e: PointerEvent) => {
      cancelTween();
      if (modeRef.current !== 'explore' || document.pointerLockElement === el) return;
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (document.pointerLockElement === el) return;
      if (!dragging || modeRef.current !== 'explore') return;
      look(e.clientX - lx, e.clientY - ly);
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onLockedMove = (e: MouseEvent) => {
      if (document.pointerLockElement === el && modeRef.current === 'explore') look(e.movementX, e.movementY);
    };
    const onLockedClick = () => {
      if (document.pointerLockElement !== el) return;
      // Select whatever is under the crosshair.
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        if (!h.object.visible) continue;
        let avatar: THREE.Object3D | null = h.object;
        while (avatar && !avatar.userData.avatarId) avatar = avatar.parent;
        if (avatar) continue;
        let o: THREE.Object3D | null = h.object;
        while (o && !o.userData.machineId) o = o.parent;
        if (o?.userData.machineId) {
          appStore.getState().select(o.userData.machineId as string);
          return;
        }
        if (!h.object.userData.passThrough) return;
      }
    };
    const onLockChange = () => appStore.getState().setPointerLocked(document.pointerLockElement === el);
    const onWheel = (e: WheelEvent) => {
      cancelTween();
      if (modeRef.current !== 'explore') return;
      e.preventDefault();
      exploreView.distance = Math.max(2.5, Math.min(9, exploreView.distance + e.deltaY * 0.006));
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('mousemove', onLockedMove);
    document.addEventListener('mousedown', onLockedClick);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      disposeKeys();
      offMove();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('mousemove', onLockedMove);
      document.removeEventListener('mousedown', onLockedClick);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [gl, camera, scene]); // eslint-disable-line react-hooks/exhaustive-deps

  const followPose = () => {
    const p = crewPose(appStore.getState().activeCrewId);
    const boom = cameraBoom(p, exploreView.yaw, exploreView.distance);
    scratch.target.set(p.x, 1.25, p.z);
    // Raise the camera near walls to keep the avatar visible with a shorter boom.
    scratch.position.set(p.x + Math.sin(exploreView.yaw) * boom, 1.25 + Math.sin(exploreView.elevation) * exploreView.distance + Math.max(0, 2.3 - boom) * 0.5, p.z + Math.cos(exploreView.yaw) * boom);
    return scratch;
  };

  // Enter the selected staff member at their current position. Re-entering never teleports them.
  useEffect(() => {
    const previousMode = modeRef.current;
    modeRef.current = mode;
    cameraPose.mode = mode;
    if (mode === 'explore') {
      exploreView.yaw = crewPose(activeCrewId).heading - Math.PI;
      const p = followPose();
      startTween(p.position, p.target);
    } else if (previousMode === 'explore') {
      if (document.pointerLockElement) document.exitPointerLock();
      const p = crewPose(activeCrewId);
      startTween([p.x, 10, p.z + 10], [p.x, 1, p.z]);
    }
  }, [mode, activeCrewId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guided views.
  useEffect(() => {
    if (!viewRequest) return;
    const v = VIEWS[viewRequest.view];
    startTween(v.position, v.target);
  }, [viewRequest?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus on selected machine.
  useEffect(() => {
    if (!focusRequest) return;
    const sel = appStore.getState().selectedId;
    if (!sel) return;
    const m = parseMachineId(sel);
    let pose: CameraPose | null = null;
    if (m.kind === 'tank' || m.kind === 'slot') {
      const ids = m.kind === 'slot' ? [...tankIds, m.ref!] : tankIds;
      const p = tankSlotPositions(ids).get(m.ref!);
      if (p) pose = tankFocus(p[0], p[1]);
    } else {
      pose = FIXED_MACHINES[m.kind as FixedMachineId]?.focus ?? null;
    }
    if (pose) startTween(pose.position, pose.target);
  }, [focusRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const tw = tween.current;
    if (tw) {
      tw.t = Math.min(1, (performance.now() - tw.start) / 1000 / tw.dur);
      const k = ease(tw.t);
      camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      tw.curTarget.lerpVectors(tw.fromTarget, tw.toTarget, k);
      camera.lookAt(tw.curTarget);
      if (modeRef.current === 'overview') target().copy(tw.curTarget);
      if (tw.t >= 1) {
        tween.current = null;
        if (modeRef.current === 'overview') controls.current?.update();
        tw.then?.();
      }
    } else if (modeRef.current === 'explore') {
      if (key('KeyQ')) exploreView.yaw += 1.7 * dt;
      if (key('KeyE')) exploreView.yaw -= 1.7 * dt;
      const p = followPose();
      // A constrained boom is applied immediately so smoothing cannot cross a wall.
      camera.position.copy(p.position);
      camera.lookAt(p.target);
    } else {
      // Overview keyboard pan (WASD / arrows) along the ground.
      const fwd = (key('KeyW') || key('ArrowUp') ? 1 : 0) - (key('KeyS') || key('ArrowDown') ? 1 : 0);
      const str = (key('KeyD') || key('ArrowRight') ? 1 : 0) - (key('KeyA') || key('ArrowLeft') ? 1 : 0);
      if ((fwd || str) && controls.current) {
        const t = controls.current.target;
        const dist = camera.position.distanceTo(t);
        const dir = camera.getWorldDirection(new THREE.Vector3());
        dir.y = 0;
        dir.normalize();
        const right = new THREE.Vector3(-dir.z, 0, dir.x);
        const mv = dir.multiplyScalar(fwd).add(right.multiplyScalar(str)).normalize().multiplyScalar(Math.max(4, dist * 0.6) * dt);
        t.add(mv);
        t.x = Math.max(-42, Math.min(42, t.x));
        t.z = Math.max(-32, Math.min(40, t.z));
        camera.position.add(mv);
      }
    }
    // Publish pose for the minimap / diagnostics.
    const d = camera.getWorldDirection(new THREE.Vector3());
    cameraPose.x = camera.position.x;
    cameraPose.y = camera.position.y;
    cameraPose.z = camera.position.z;
    cameraPose.yaw = Math.atan2(d.x, d.z);
    fps.current.frames++;
    fps.current.acc += rawDt;
    if (fps.current.acc >= 0.5) {
      cameraPose.fps = Math.round(fps.current.frames / fps.current.acc);
      fps.current.frames = 0;
      fps.current.acc = 0;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={mode === 'overview'}
      enableDamping
      dampingFactor={0.12}
      minDistance={3}
      maxDistance={95}
      maxPolarAngle={1.45}
      screenSpacePanning={false}
    />
  );
}
