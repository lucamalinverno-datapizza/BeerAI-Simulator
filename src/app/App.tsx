import { useEffect, useState } from 'react';
import { T } from '../i18n/strings';
import { appStore, useApp } from '../state/store';
import { PanelHost } from '../panels/PanelHost';
import { ControlRoom2D } from '../control2d/ControlRoom2D';
import { BottomBar, NavRail, Toasts, TopBar, usePlayback } from './Chrome';
import { Viewport, webglAvailable } from './Viewport';

export function App() {
  usePlayback();
  const mode = useApp((s) => s.mode);
  const webglIssue = useApp((s) => s.webglIssue);
  const locked = useApp((s) => s.pointerLocked);
  const cameraMode = useApp((s) => s.cameraMode);
  const [glOk] = useState(() => webglAvailable());

  useEffect(() => {
    if (!glOk) {
      appStore.getState().setWebglIssue('unavailable');
      appStore.getState().setMode('2d');
    }
  }, [glOk]);

  // Context lost and not restored quickly → switch to the 2D control room with the same data.
  useEffect(() => {
    if (webglIssue !== 'lost') return;
    const id = setTimeout(() => {
      if (appStore.getState().webglIssue === 'lost') appStore.getState().setMode('2d');
    }, 4000);
    return () => clearTimeout(id);
  }, [webglIssue]);

  if (!glOk) return <ControlRoom2D />;

  // The 3D app stays mounted (render loop paused) while the 2D control room is shown:
  // switching back is instant and keeps the camera; no WebGL context churn.
  return (
    <>
      {mode === '2d' && <ControlRoom2D />}
      <div className="app app-3d" hidden={mode === '2d'} aria-hidden={mode === '2d'}>
      <TopBar />
      <div className="stage">
        <Viewport />
        <NavRail />
        <PanelHost />
        {cameraMode === 'explore' && locked && <div className="crosshair" aria-hidden="true" />}
        {webglIssue && (
          <div className="banner banner-warn banner-float" role="alert">
            {webglIssue === 'lost' ? T.webgl.lost : T.webgl.crashed}{' '}
            <button type="button" className="btn btn-sm" onClick={() => appStore.getState().setMode('2d')}>
              {T.btn.control2d}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.location.reload()}>
              {T.btn.tryAgain3d}
            </button>
          </div>
        )}
      </div>
      <BottomBar />
      {mode === '3d' && <Toasts />}
      </div>
    </>
  );
}
