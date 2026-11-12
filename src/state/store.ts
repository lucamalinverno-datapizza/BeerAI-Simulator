/**
 * Shared application state (Zustand).
 * Separation (brief §9): editable `draft` configuration → explicit run → `result` (with run ID) → scene/panels.
 * Results of superseded runs are discarded.
 */
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { T } from '../i18n/strings';
import { getRunner } from '../simulation/runner';
import { simulate } from '../simulation/engine';
import type { Kpis, ScenarioConfig, SimulationResult, ValidationIssue } from '../simulation/types';
import { validateConfig } from '../simulation/validate';
import { PRESETS, buildPreset, type PresetId } from '../scenarios/presets';
import { configHash, configToJson, importConfigJson } from '../scenarios/io';
import type { ViewName } from '../scene/layout';
import { loadJson, saveJson } from './persist';
import { parseMachineId, type MachineId } from './machines';
import type { CrewId } from '../scene/crew/crew';

export type PanelKind = 'machine' | 'control' | 'compare' | 'assumptions' | 'diagnostics';
export type CameraMode = 'overview' | 'explore';
export type Quality = 'normal' | 'reduced';
export type AppMode = '3d' | '2d';

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  config: ScenarioConfig;
}

export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

export interface AppState {
  // Scenario & results
  draft: ScenarioConfig;
  draftHash: string;
  draftIssues: ValidationIssue[];
  activePreset: PresetId | null;
  sourceLabel: string;
  result: SimulationResult | null;
  resultHash: string | null;
  latestRunId: number;
  completedRunId: number;
  running: boolean;
  lastRun: { ms: number; via: string; at: string } | null;
  runIssues: ValidationIssue[] | null;
  restoreAvailable: boolean;

  // Time
  currentDay: number;
  playing: boolean;
  speed: number;

  // Selection & panels
  selectedId: MachineId | null;
  panel: PanelKind | null;
  timelineOpen: boolean;
  ordersFilterLate: boolean;

  // 3D view
  mode: AppMode;
  cameraMode: CameraMode;
  activeCrewId: CrewId;
  pointerLocked: boolean;
  viewRequest: { view: ViewName; nonce: number } | null;
  focusRequest: number;
  quality: Quality;
  inspectTanks: boolean;
  showLabels: boolean;
  webglIssue: 'unavailable' | 'lost' | 'crashed' | null;

  // Saved scenarios & comparison
  saved: SavedScenario[];
  compareKeys: string[];

  toasts: Toast[];
}

export interface AppActions {
  updateDraft: (mutate: (c: ScenarioConfig) => void) => void;
  replaceDraft: (c: ScenarioConfig, sourceLabel: string, preset: PresetId | null) => void;
  runSimulation: () => Promise<void>;
  loadPreset: (id: PresetId) => Promise<void>;
  resetToBaseline: () => Promise<void>;
  saveScenario: (name?: string) => SavedScenario;
  deleteSaved: (id: string) => void;
  importJsonText: (text: string, fileName?: string) => Promise<boolean>;
  exportJson: () => { fileName: string; text: string };
  restoreSession: () => void;

  setDay: (d: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  tick: () => void;

  select: (id: MachineId | null, openPanel?: boolean) => void;
  openPanel: (p: PanelKind | null) => void;
  setTimelineOpen: (o: boolean) => void;
  setOrdersFilterLate: (v: boolean) => void;

  setMode: (m: AppMode) => void;
  setCameraMode: (m: CameraMode) => void;
  setActiveCrew: (id: CrewId) => void;
  setPointerLocked: (l: boolean) => void;
  requestView: (v: ViewName) => void;
  requestFocus: () => void;
  setQuality: (q: Quality) => void;
  setInspectTanks: (v: boolean) => void;
  setShowLabels: (v: boolean) => void;
  setWebglIssue: (i: AppState['webglIssue']) => void;
  setCompareKeys: (k: string[]) => void;

  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

export type Store = AppState & AppActions;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
let toastSeq = 0;
/** Draft found in browser storage at boot (offered via “Restore last session draft”, never applied silently). */
let restorable: ScenarioConfig | null = null;

function presetLabel(id: PresetId): string {
  const p = PRESETS.find((x) => x.id === id)!;
  return `${p.id} · ${p.name}`;
}

const initialDraft = buildPreset('S0');

export const appStore = createStore<Store>()((set, get) => {
  const setDraftState = (draft: ScenarioConfig, extra: Partial<AppState> = {}) => {
    set({ draft, draftHash: configHash(draft), draftIssues: validateConfig(draft), ...extra });
    saveJson('autosave', draft);
  };

  return {
    draft: initialDraft,
    draftHash: configHash(initialDraft),
    draftIssues: [],
    activePreset: 'S0',
    sourceLabel: presetLabel('S0'),
    result: null,
    resultHash: null,
    latestRunId: 0,
    completedRunId: 0,
    running: false,
    lastRun: null,
    runIssues: null,
    restoreAvailable: false,

    currentDay: 0,
    playing: false,
    speed: 1,

    selectedId: null,
    panel: null,
    timelineOpen: false,
    ordersFilterLate: false,

    mode: '3d',
    cameraMode: 'overview',
    activeCrewId: 'alex',
    pointerLocked: false,
    viewRequest: null,
    focusRequest: 0,
    quality: 'normal',
    inspectTanks: false,
    showLabels: true,
    webglIssue: null,

    saved: loadJson<SavedScenario[]>('saved') ?? [],
    compareKeys: [],
    toasts: [],

    updateDraft: (mutate) => {
      const next = clone(get().draft);
      mutate(next);
      const changed = configHash(next) !== get().draftHash;
      setDraftState(next, changed ? { activePreset: null, sourceLabel: `${get().sourceLabel.replace(/ \(modified\)$/, '')} (${T.modified})` } : {});
    },

    replaceDraft: (c, sourceLabel, preset) => {
      setDraftState(clone(c), { activePreset: preset, sourceLabel });
    },

    runSimulation: async () => {
      const cfg = get().draft;
      const issues = validateConfig(cfg);
      if (issues.length > 0) {
        set({ runIssues: issues });
        get().toast(T.toast.runFailed, 'error');
        return;
      }
      const runId = get().latestRunId + 1;
      set({ latestRunId: runId, running: true });
      const res = await getRunner().run(cfg, runId);
      // Discard results of superseded runs: only the most recent request may land.
      if (res.runId !== get().latestRunId) return;
      if (res.ok) {
        const horizon = res.result.config.horizon_day;
        const sel = get().selectedId;
        let selectedId = sel;
        if (sel) {
          const m = parseMachineId(sel);
          if (m.kind === 'tank' && !res.result.config.tanks.some((t) => t.id === m.ref)) selectedId = null;
        }
        set({
          result: res.result,
          resultHash: configHash(res.result.config),
          completedRunId: runId,
          running: false,
          runIssues: null,
          lastRun: { ms: res.ms, via: res.via, at: new Date().toISOString() },
          currentDay: Math.min(get().currentDay, horizon),
          selectedId,
          panel: selectedId === null && get().panel === 'machine' ? null : get().panel,
        });
      } else {
        set({ running: false, runIssues: res.issues });
        get().toast(T.toast.runFailed, 'error');
      }
    },

    loadPreset: async (id) => {
      setDraftState(buildPreset(id), { activePreset: id, sourceLabel: presetLabel(id) });
      await get().runSimulation();
    },

    resetToBaseline: async () => {
      set({ playing: false, currentDay: 0 });
      await get().loadPreset('S0');
      get().toast(T.toast.reset);
    },

    saveScenario: (name) => {
      const d = get().draft;
      const time = new Date();
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const entry: SavedScenario = {
        id: `SV${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
        name: name?.trim() || `${d.scenario_id} · ${d.name} (${hh}:${mm})`,
        savedAt: time.toISOString(),
        config: clone(d),
      };
      const saved = [...get().saved, entry];
      set({ saved });
      saveJson('saved', saved);
      get().toast(T.toast.saved(entry.name));
      return entry;
    },

    deleteSaved: (id) => {
      const saved = get().saved.filter((s) => s.id !== id);
      set({ saved, compareKeys: get().compareKeys.filter((k) => k !== `saved:${id}`) });
      saveJson('saved', saved);
    },

    importJsonText: async (text, fileName) => {
      const r = importConfigJson(text);
      if (!r.ok) {
        set({ runIssues: r.issues });
        get().toast(T.toast.importFailed, 'error');
        return false;
      }
      setDraftState(r.config, { activePreset: null, sourceLabel: `Imported · ${r.config.name}${fileName ? ` (${fileName})` : ''}` });
      get().toast(T.toast.imported(r.config.name));
      await get().runSimulation();
      return true;
    },

    exportJson: () => {
      const d = get().draft;
      const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'scenario';
      const fileName = `${d.scenario_id || 'scenario'}_${slug}.json`;
      const text = configToJson(d);
      get().toast(T.toast.exported(fileName));
      return { fileName, text };
    },

    restoreSession: () => {
      const auto = restorable;
      if (!auto) return;
      const r = importConfigJson(JSON.stringify(auto));
      if (r.ok) setDraftState(r.config, { activePreset: null, sourceLabel: `Restored · ${r.config.name}`, restoreAvailable: false });
    },

    setDay: (d) => {
      const H = get().result?.config.horizon_day ?? get().draft.horizon_day;
      set({ currentDay: Math.max(0, Math.min(H, Math.round(d))) });
    },
    setPlaying: (p) => {
      const H = get().result?.config.horizon_day ?? 0;
      if (p && get().currentDay >= H) set({ currentDay: 0 });
      set({ playing: p });
    },
    setSpeed: (s) => set({ speed: s }),
    tick: () => {
      const H = get().result?.config.horizon_day ?? 0;
      const d = get().currentDay;
      if (d >= H) set({ playing: false });
      else set({ currentDay: d + 1 });
    },

    select: (id, openPanel = true) => set({ selectedId: id, panel: id && openPanel ? 'machine' : get().panel === 'machine' && !id ? null : get().panel }),
    openPanel: (p) => set({ panel: p }),
    setTimelineOpen: (o) => set({ timelineOpen: o }),
    setOrdersFilterLate: (v) => set({ ordersFilterLate: v }),

    setMode: (m) => set({ mode: m, pointerLocked: false }),
    setCameraMode: (m) => set({ cameraMode: m }),
    setActiveCrew: (id) => set({ activeCrewId: id }),
    setPointerLocked: (l) => set({ pointerLocked: l }),
    requestView: (v) => set({ viewRequest: { view: v, nonce: (get().viewRequest?.nonce ?? 0) + 1 }, cameraMode: 'overview' }),
    requestFocus: () => set({ focusRequest: get().focusRequest + 1, cameraMode: 'overview' }),
    setQuality: (q) => set({ quality: q }),
    setInspectTanks: (v) => set({ inspectTanks: v }),
    setShowLabels: (v) => set({ showLabels: v }),
    setWebglIssue: (i) => set({ webglIssue: i }),
    setCompareKeys: (k) => set({ compareKeys: k.slice(0, 4) }),

    toast: (message, kind = 'info') => {
      const id = ++toastSeq;
      set({ toasts: [...get().toasts.slice(-3), { id, message, kind }] });
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3200);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  };
});

export function useApp<U>(selector: (s: Store) => U): U {
  return useStore(appStore, selector);
}

/** True when the draft differs from the inputs of the displayed result. */
export const selectStale = (s: AppState): boolean => s.result === null || s.draftHash !== s.resultHash;

/** Initial boot: optional URL parameters (?scenario=S3&view=2d&quality=reduced&day=12), restore offer, first run. */
export async function bootstrap(): Promise<void> {
  const st = appStore.getState();
  let preset: PresetId = 'S0';
  try {
    const q = new URLSearchParams(window.location.search);
    const sc = q.get('scenario')?.toUpperCase();
    if (sc && PRESETS.some((p) => p.id === sc)) preset = sc as PresetId;
    if (q.get('quality') === 'reduced') st.setQuality('reduced');
    if (q.get('view') === '2d') st.setMode('2d');
    const auto = loadJson<ScenarioConfig>('autosave');
    if (auto && validateConfig(auto).length === 0 && configHash(auto) !== configHash(buildPreset(preset))) {
      restorable = auto;
      appStore.setState({ restoreAvailable: true });
    }
    await st.loadPreset(preset);
    const day = Number(q.get('day'));
    if (Number.isFinite(day) && day > 0) st.setDay(day);
  } catch {
    await st.loadPreset(preset);
  }
}

/** Results of any configuration computed synchronously (used by the comparison table; engine runs in ~1 ms). */
export function computeForCompare(c: ScenarioConfig): { result: SimulationResult | null; issues: ValidationIssue[] } {
  const issues = validateConfig(c);
  if (issues.length) return { result: null, issues };
  return { result: simulate(c), issues: [] };
}

export type { Kpis };
