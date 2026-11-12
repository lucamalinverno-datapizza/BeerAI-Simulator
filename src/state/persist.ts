/** Optional browser persistence. Everything works without it (private mode, file://, blocked storage). */
const PREFIX = 'beerai.v1.';

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const k = `${PREFIX}probe`;
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export function loadJson<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storageAvailable = (): boolean => storage() !== null;
