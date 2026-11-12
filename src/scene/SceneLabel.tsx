import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const tmp = new THREE.Vector3();

/**
 * HTML label anchored in 3D. Its on-screen size follows distance but is clamped, so labels stay
 * readable in the overview and never become huge up close. Purely visual (pointer-events: none).
 */
export function SceneLabel({ position, children, k = 16, min = 0.42, max = 1.0, hideBeyond = 95 }: { position: [number, number, number]; children: ReactNode; k?: number; min?: number; max?: number; hideBeyond?: number }) {
  const anchor = useRef<THREE.Group>(null);
  const inner = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    if (!anchor.current || !inner.current) return;
    anchor.current.getWorldPosition(tmp);
    const d = camera.position.distanceTo(tmp);
    const s = Math.max(min, Math.min(max, k / Math.max(d, 0.1)));
    inner.current.style.transform = `scale(${s.toFixed(3)})`;
    inner.current.style.visibility = d > hideBeyond || d < 1.2 ? 'hidden' : 'visible';
  });
  return (
    <group ref={anchor} position={position}>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div ref={inner} style={{ transformOrigin: 'center bottom' }}>
          {children}
        </div>
      </Html>
    </group>
  );
}
