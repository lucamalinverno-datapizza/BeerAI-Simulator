import { useEffect, useRef, useState } from 'react';
import { T } from '../i18n/strings';
import { PRESETS } from '../scenarios/presets';
import { appStore, selectStale, useApp } from '../state/store';
import { machineList } from '../state/machines';
import { VIEW_ORDER } from '../scene/layout';
import { cameraPose, requestMouseCapture } from '../scene/navigation/input';
import { ExportJsonButton, ImportJsonButton, SaveScenarioButton, useSim } from '../panels/common';
import { fmtNum, fmtPct } from './format';
import { Minimap } from './Minimap';
import { ProductLegend, TimelineGantt } from '../panels/charts';
import { tankMachineId } from '../state/machines';
import { CREW } from '../scene/crew/crew';

/** Scenario presets + scenario commands (all visible buttons with accessible names). */
export function TopBar({ is2d = false, standalone = false }: { is2d?: boolean; standalone?: boolean }) {
  const active = useApp((s) => s.activePreset);
  const sourceLabel = useApp((s) => s.sourceLabel);
  const stale = useApp(selectStale);
  const running = useApp((s) => s.running);
  const invalid = useApp((s) => s.draftIssues.length > 0);
  const st = appStore.getState();
  return (
    <header className="topbar" data-testid="topbar">
      <div className="brand">
        <div className="brand-title">{T.appTitle}</div>
        <div className="brand-sub">
          {T.appSubtitle} · <span className="tag">{T.syntheticData}</span>
        </div>
      </div>
      <div className="scenario-bar" role="group" aria-label={T.scenarioPresets}>
        <span className="label-muted">{T.scenario}</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip ${active === p.id ? 'chip-active' : ''}`}
            aria-pressed={active === p.id}
            title={`${p.id} · ${p.name} — ${p.change}`}
            aria-label={`Scenario ${p.id}: ${p.name}`}
            data-testid={`preset-${p.id}`}
            onClick={() => void st.loadPreset(p.id)}
          >
            {p.id}
          </button>
        ))}
        <div className="scenario-name" data-testid="scenario-name">
          <span className="scenario-label">{sourceLabel}</span>
          <span className={`status-badge ${invalid ? 'badge-error' : stale ? 'badge-stale' : 'badge-ok'}`} data-testid="result-status">
            {invalid ? '✕ invalid inputs' : running ? '… running' : stale ? `⟳ ${T.staleShort}` : `✓ ${T.upToDate}`}
          </span>
        </div>
      </div>
      <div className="actions" role="group" aria-label="Scenario commands">
        <button type="button" className={`btn btn-primary ${stale && !invalid ? 'btn-attention' : ''}`} onClick={() => void st.runSimulation()} disabled={running} data-testid="run-simulation">
          {running ? T.btn.running : T.btn.runSimulation}
        </button>
        <button type="button" className="btn" onClick={() => void st.resetToBaseline()} data-testid="reset-baseline">
          {T.btn.resetBaseline}
        </button>
        <SaveScenarioButton />
        <button type="button" className="btn" onClick={() => st.openPanel(appStore.getState().panel === 'compare' ? null : 'compare')} data-testid="compare-scenarios">
          {T.btn.compareScenarios}
        </button>
        <ExportJsonButton />
        <ImportJsonButton />
        {!standalone && (
          <button type="button" className="btn btn-outline" onClick={() => st.setMode(is2d ? '3d' : '2d')} data-testid="toggle-2d">
            {is2d ? T.btn.back3d : T.btn.control2d}
          </button>
        )}
      </div>
    </header>
  );
}

/** Left rail: navigation modes, guided views, focus, mouse capture, equipment list, hall map. */
export function NavRail() {
  const mode = useApp((s) => s.cameraMode);
  const locked = useApp((s) => s.pointerLocked);
  const selected = useApp((s) => s.selectedId);
  const activeCrew = useApp((s) => s.activeCrewId);
  const { cfg } = useSim();
  const st = appStore.getState();
  const list = machineList(cfg);
  return (
    <nav className="rail" aria-label={T.nav.title} data-testid="nav-rail">
      <div className="rail-title">{T.nav.title}</div>
      <div className="seg" role="group" aria-label="Camera mode">
        <button type="button" className={`seg-btn ${mode === 'overview' ? 'seg-active' : ''}`} aria-pressed={mode === 'overview'} onClick={() => st.requestView('overview')} data-testid="btn-overview">
          {T.btn.overview}
        </button>
        <button type="button" className={`seg-btn ${mode === 'explore' ? 'seg-active' : ''}`} aria-pressed={mode === 'explore'} onClick={() => st.setCameraMode('explore')} data-testid="btn-explore">
          {T.btn.explore}
        </button>
      </div>
      {mode === 'explore' && (
        <button type="button" className="btn btn-sm btn-block" onClick={() => requestMouseCapture()} disabled={locked} data-testid="btn-capture">
          {locked ? T.btn.releaseMouse : T.btn.captureMouse}
        </button>
      )}
      <p className="rail-help">{mode === 'explore' ? (locked ? T.nav.lockedHelp : T.nav.exploreHelp) : T.nav.overviewHelp}</p>
      <label className="rail-title" htmlFor="staff-member">{T.nav.staffMember}</label>
      <select id="staff-member" className="staff-select" value={activeCrew} data-testid="avatar-select" onChange={(e) => st.setActiveCrew(e.target.value as typeof activeCrew)}>
        {CREW.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.role}</option>)}
      </select>
      {mode === 'overview' && <p className="rail-help">{T.nav.staffHelp}</p>}
      <div className="rail-title">{T.nav.guidedViews}</div>
      <div className="view-grid">
        {VIEW_ORDER.filter((v) => v !== 'overview').map((v) => (
          <button key={v} type="button" className="btn btn-sm" onClick={() => st.requestView(v)} data-testid={`view-${v}`}>
            {T.views[v]}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-block" onClick={() => st.requestFocus()} disabled={!selected} data-testid="btn-focus">
        {T.btn.focusSelected}
      </button>
      <div className="rail-title">{T.nav.equipment}</div>
      <ul className="equipment" aria-label={T.nav.equipment} data-testid="equipment-list">
        {list.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className={`equip-btn ${selected === m.id ? 'equip-active' : ''} ${m.kind === 'slot' ? 'equip-slot' : ''}`}
              aria-current={selected === m.id ? 'true' : undefined}
              onClick={() => st.select(m.id)}
              data-testid={`equip-${m.id}`}
            >
              {m.label}
            </button>
          </li>
        ))}
      </ul>
      <Minimap />
    </nav>
  );
}

const SPEEDS = [0.5, 1, 2, 4];

/** Time controls + KPI strip + view toggles. Playback only changes the displayed day, never the results. */
export function BottomBar() {
  const { result, day } = useSim();
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const quality = useApp((s) => s.quality);
  const inspect = useApp((s) => s.inspectTanks);
  const labels = useApp((s) => s.showLabels);
  const timelineOpen = useApp((s) => s.timelineOpen);
  const st = appStore.getState();
  const H = result?.config.horizon_day ?? 0;
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFps(cameraPose.fps), 1000);
    return () => clearInterval(id);
  }, []);
  const k = result?.kpis;
  return (
    <div className="bottombar" data-testid="bottombar">
      {timelineOpen && result && (
        <div className="timeline-drawer" data-testid="timeline">
          <ProductLegend cfg={result.config} />
          <TimelineGantt result={result} day={day} onSelectTank={(id) => st.select(tankMachineId(id))} />
        </div>
      )}
      <div className="bottom-row">
        <div className="time-controls" role="group" aria-label="Simulated time">
          <button type="button" className="btn btn-primary btn-play" onClick={() => st.setPlaying(!playing)} disabled={!result} data-testid="btn-play">
            {playing ? `❚❚ ${T.btn.pause}` : `▶ ${T.btn.play}`}
          </button>
          <label className="day-label" htmlFor="day-slider">
            {T.day} <strong data-testid="current-day">{day}</strong> / {H}
          </label>
          <input
            id="day-slider"
            className="day-slider"
            type="range"
            min={0}
            max={H}
            step={1}
            value={day}
            onChange={(e) => st.setDay(Number(e.target.value))}
            aria-valuetext={`Day ${day} of ${H}`}
            data-testid="day-slider"
          />
          <label className="speed" htmlFor="speed-select">
            {T.speed}
          </label>
          <select id="speed-select" value={speed} onChange={(e) => st.setSpeed(Number(e.target.value))} data-testid="speed-select">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {`${s}× (${s} day/s)`}
              </option>
            ))}
          </select>
          <button type="button" className={`btn btn-sm ${timelineOpen ? 'btn-on' : ''}`} aria-pressed={timelineOpen} onClick={() => st.setTimelineOpen(!timelineOpen)} data-testid="btn-timeline">
            {T.btn.timeline}
          </button>
        </div>
        {k && (
          <button type="button" className="kpi-strip" onClick={() => st.openPanel('control')} aria-label="Key indicators — open control panel" data-testid="kpi-strip">
            <span>
              <small>{T.kpi.service}</small>
              <strong data-testid="kpi-service">{fmtPct(k.service_level)}</strong>
            </span>
            <span>
              <small>{T.kpi.ordersOnTime}</small>
              <strong data-testid="kpi-orders">{`${k.orders_complete_on_time}/${k.orders_due}`}</strong>
            </span>
            <span>
              <small>On time / demand</small>
              <strong data-testid="kpi-ontime">{`${fmtNum(k.on_time_hl)} / ${fmtNum(k.demand_hl)} hL`}</strong>
            </span>
            <span>
              <small>{T.kpi.backlog}</small>
              <strong data-testid="kpi-backlog">{`${fmtNum(k.final_backlog_hl)} hL`}</strong>
            </span>
          </button>
        )}
        <div className="toggles" role="group" aria-label="View options">
          <button type="button" className="btn btn-sm" onClick={() => st.openPanel('control')} data-testid="btn-control-panel">
            {T.btn.controlPanel}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => st.openPanel('assumptions')} data-testid="btn-assumptions">
            {T.btn.assumptions}
          </button>
          <button type="button" className="btn btn-sm" aria-pressed={inspect} onClick={() => st.setInspectTanks(!inspect)} data-testid="btn-inspect">
            {inspect ? T.btn.inspectOn : T.btn.inspectOff}
          </button>
          <button type="button" className="btn btn-sm" aria-pressed={labels} onClick={() => st.setShowLabels(!labels)}>
            {labels ? T.btn.labelsOn : T.btn.labelsOff}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => st.setQuality(quality === 'normal' ? 'reduced' : 'normal')} data-testid="btn-quality">
            {quality === 'normal' ? T.btn.qualityNormal : T.btn.qualityReduced}
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => st.openPanel('diagnostics')} data-testid="btn-diagnostics">
            {T.btn.diagnostics}
          </button>
          <span className="fps" aria-label="Frames per second">{fps ? `${fps} fps` : ''}</span>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** Advances the displayed day while playing. Independent from the engine (results never change). */
export function usePlayback(enabled = true): void {
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || !enabled) return;
    ref.current = window.setInterval(() => appStore.getState().tick(), 1000 / speed);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [playing, speed, enabled]);
}
