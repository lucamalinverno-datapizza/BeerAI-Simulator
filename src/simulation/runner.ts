import { simulate } from './engine';
import { ConfigError } from './validate';
import type { ScenarioConfig, SimulationResult, ValidationIssue } from './types';

export type RunResponse =
  | { runId: number; ok: true; result: SimulationResult; ms: number; via: 'worker' | 'main-thread' }
  | { runId: number; ok: false; issues: ValidationIssue[]; ms: number; via: 'worker' | 'main-thread' };

export interface Runner {
  kind: 'worker' | 'main-thread';
  run(config: ScenarioConfig, runId: number): Promise<RunResponse>;
}

/** Executes the engine and packages the response (shared by the worker and the main-thread runner). */
export function executeRun(config: ScenarioConfig, runId: number, via: 'worker' | 'main-thread'): RunResponse {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const elapsed = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  try {
    const result = simulate(config);
    return { runId, ok: true, result, ms: elapsed(), via };
  } catch (err) {
    const issues = err instanceof ConfigError ? err.issues : [{ path: '$', message: String((err as Error)?.message ?? err) }];
    return { runId, ok: false, issues, ms: elapsed(), via };
  }
}

/** Main-thread runner: used by the standalone 2D fallback (file://, no workers) and as worker fallback. */
export function createMainThreadRunner(): Runner {
  return {
    kind: 'main-thread',
    run: (config, runId) =>
      new Promise((resolve) => {
        setTimeout(() => resolve(executeRun(config, runId, 'main-thread')), 0);
      }),
  };
}

let current: Runner = createMainThreadRunner();
export const setRunner = (r: Runner): void => {
  current = r;
};
export const getRunner = (): Runner => current;
