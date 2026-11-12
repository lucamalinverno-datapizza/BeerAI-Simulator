import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/fonts';
import './app/styles.css';
import { App } from './app/App';
import { setRunner } from './simulation/runner';
import { createWorkerRunner } from './simulation/workerRunner';
import { appStore, bootstrap } from './state/store';
import { cameraPose } from './scene/navigation/input';
import { crewPoses } from './scene/crew/crew';

setRunner(createWorkerRunner());
void bootstrap();

// Read-only diagnostic hook (state, results, camera pose) for automated checks and the optional diagnostics view.
declare global {
  interface Window {
    __BEERAI__?: unknown;
    render_game_to_text?: () => string;
  }
}
window.__BEERAI__ = { getState: () => appStore.getState(), cameraPose, crewPoses };
window.render_game_to_text = () => JSON.stringify({
  coordinates: 'metres, +Y up, +X east, +Z south; avatar feet at Y=0',
  camera: { x: cameraPose.x, y: cameraPose.y, z: cameraPose.z, mode: cameraPose.mode },
  controlled: appStore.getState().cameraMode === 'explore' ? appStore.getState().activeCrewId : null,
  staff: crewPoses.map(({ id, x, z, heading, speed }) => ({ id, x, y: 0, z, heading, speed })),
  day: appStore.getState().currentDay,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
