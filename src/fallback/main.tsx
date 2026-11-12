import { createRoot } from 'react-dom/client';
import '../app/fonts';
import '../app/styles.css';
import { ControlRoom2D } from '../control2d/ControlRoom2D';
import { setRunner, createMainThreadRunner } from '../simulation/runner';
import { appStore, bootstrap } from '../state/store';

// Standalone 2D fallback: same engine & presets, executed on the main thread (works from file://, no WebGL, no server).
setRunner(createMainThreadRunner());
appStore.getState().setMode('2d');
void bootstrap();
(window as unknown as { __BEERAI__: unknown }).__BEERAI__ = { getState: () => appStore.getState() };

createRoot(document.getElementById('root')!).render(<ControlRoom2D standalone />);
