import { executeRun } from './runner';
import type { ScenarioConfig } from './types';

// Minimal worker scope typing (avoids pulling the WebWorker lib next to DOM).
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<{ runId: number; config: ScenarioConfig }>) => void) | null;
  postMessage: (message: unknown) => void;
};

ctx.onmessage = (e) => {
  const { runId, config } = e.data;
  ctx.postMessage(executeRun(config, runId, 'worker'));
};
