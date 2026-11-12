/**
 * Keyboard state for camera movement. Keys are ignored while a text field / select is focused,
 * so typing in panels never moves the camera.
 */
const pressed = new Set<string>();

export function isTypingTarget(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(type);
  }
  return false;
}

const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);

let listeners = 0;
const onKeyDown = (e: KeyboardEvent) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === 'Escape') {
    // Esc leaves the focused field/widget so WASD drives the camera again
    // (pointer lock itself is released natively by the browser on Esc).
    (document.activeElement as HTMLElement | null)?.blur?.();
    pressed.clear();
    return;
  }
  if (isTypingTarget(document.activeElement)) return;
  if (MOVE_CODES.has(e.code)) {
    pressed.add(e.code);
    for (const fn of moveListeners) fn();
    if (e.code.startsWith('Arrow') && document.activeElement === document.body) e.preventDefault();
  }
};
const onKeyUp = (e: KeyboardEvent) => pressed.delete(e.code);
const clear = () => pressed.clear();
const onFocusIn = (e: FocusEvent) => {
  if (isTypingTarget(e.target as Element)) pressed.clear();
};

const moveListeners = new Set<() => void>();
/** Notified when a movement key goes down (used to interrupt camera animations). */
export function onMoveKey(fn: () => void): () => void {
  moveListeners.add(fn);
  return () => moveListeners.delete(fn);
}

export function initKeyboard(): () => void {
  if (listeners++ === 0) {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clear);
    document.addEventListener('focusin', onFocusIn);
  }
  return () => {
    if (--listeners === 0) {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('focusin', onFocusIn);
      pressed.clear();
    }
  };
}

export const key = (code: string): boolean => pressed.has(code);
export const anyMoveKey = (): boolean => [...pressed].some((c) => c !== 'ShiftLeft' && c !== 'ShiftRight');

/** Live camera pose for the minimap and tests (mutated every frame, read without React re-renders). */
export const cameraPose = {
  x: 0,
  z: 0,
  yaw: 0,
  y: 0,
  mode: 'overview' as 'overview' | 'explore',
  fps: 0,
  /** Projects a world point to client pixels (diagnostics / automated interaction checks). */
  project: null as null | ((x: number, y: number, z: number) => { x: number; y: number; inFront: boolean }),
};

let canvasEl: HTMLCanvasElement | null = null;
export const setCanvasElement = (c: HTMLCanvasElement | null): void => {
  canvasEl = c;
};
/** Explicit, reversible mouse capture (must be called from a user gesture). */
export function requestMouseCapture(): void {
  try {
    const p = canvasEl?.requestPointerLock() as unknown as Promise<void> | undefined;
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  } catch {
    /* pointer lock unavailable */
  }
}

export const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
