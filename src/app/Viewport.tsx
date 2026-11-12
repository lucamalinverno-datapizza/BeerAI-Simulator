import { Component, Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { BreweryScene } from '../scene/BreweryScene';
import { appStore, useApp } from '../state/store';
import { setCanvasElement } from '../scene/navigation/input';
import { VIEWS } from '../scene/layout';

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('3D scene failed', err);
    appStore.getState().setWebglIssue('crashed');
    appStore.getState().setMode('2d');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Single WebGL viewport. Quality profile limits internal resolution and shadows. */
export function Viewport() {
  const quality = useApp((s) => s.quality);
  const paused = useApp((s) => s.mode === '2d');
  const dprCap = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const dpr: number | [number, number] = quality === 'reduced' ? Math.min(0.85, dprCap) : [1, Math.min(1.5, dprCap)];
  return (
    <div className="viewport" data-testid="viewport">
      <SceneErrorBoundary>
        <Canvas
          shadows={quality === 'normal' ? { type: THREE.PCFSoftShadowMap } : false}
          dpr={dpr}
          frameloop={paused ? 'never' : 'always'}
          camera={{ fov: 50, near: 0.1, far: 400, position: VIEWS.overview.position }}
          gl={{ antialias: quality === 'normal', powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 0.92;
            setCanvasElement(gl.domElement);
            gl.domElement.setAttribute('aria-label', '3D brewery view. Use the guided views and equipment list for keyboard access.');
            gl.domElement.setAttribute('role', 'img');
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              appStore.getState().setWebglIssue('lost');
            });
            gl.domElement.addEventListener('webglcontextrestored', () => appStore.getState().setWebglIssue(null));
          }}
        >
          <Suspense fallback={null}>
            <BreweryScene />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
