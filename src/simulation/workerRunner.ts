import { createMainThreadRunner, executeRun, type RunResponse, type Runner } from './runner';
import type { ScenarioConfig } from './types';

/**
 * Web Worker runner. If the worker cannot start (e.g. blocked), it transparently falls back to
 * running the same engine on the main thread, so results are identical either way.
 */
export function createWorkerRunner(): Runner {
  const fallback = createMainThreadRunner();
  let worker: Worker | null = null;
  let broken = false;
  const pending = new Map<number, { config: ScenarioConfig; resolve: (r: RunResponse) => void }>();

  try {
    worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<RunResponse>) => {
      const p = pending.get(e.data.runId);
      if (p) {
        pending.delete(e.data.runId);
        p.resolve(e.data);
      }
    };
    worker.onerror = () => {
      broken = true;
      for (const [runId, p] of pending) p.resolve(executeRun(p.config, runId, 'main-thread'));
      pending.clear();
    };
  } catch {
    broken = true;
  }

  return {
    get kind() {
      return broken || !worker ? 'main-thread' : 'worker';
    },
    run(config, runId) {
      if (broken || !worker) return fallback.run(config, runId);
      return new Promise((resolve) => {
        pending.set(runId, { config, resolve });
        worker!.postMessage({ runId, config });
      });
    },
  } as Runner;
}
