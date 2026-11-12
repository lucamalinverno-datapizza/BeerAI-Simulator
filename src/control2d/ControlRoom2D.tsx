import { T } from '../i18n/strings';
import { appStore, useApp } from '../state/store';
import { machineList, tankMachineId } from '../state/machines';
import { useSim } from '../panels/common';
import { MachinePanelContent, machineTitle } from '../panels/PanelHost';
import { KpiCards, ComparePanel, AssumptionsPanel, DiagnosticsPanel } from '../panels/GeneralPanels';
import { EventLog, OrdersTable, ProductLegend, TimelineGantt } from '../panels/charts';
import { TopBar, Toasts, usePlayback } from '../app/Chrome';

/**
 * 2D control room: same engine, presets, store and panels as the 3D brewery, without WebGL.
 * Used inside the app ("2D control room") and as the standalone fallback HTML.
 */
export function ControlRoom2D({ standalone = false }: { standalone?: boolean }) {
  usePlayback(standalone); // inside the 3D app, App already drives playback
  const { result, cfg, day } = useSim();
  const selected = useApp((s) => s.selectedId) ?? 'control';
  const playing = useApp((s) => s.playing);
  const onlyLate = useApp((s) => s.ordersFilterLate);
  const webglIssue = useApp((s) => s.webglIssue);
  const st = appStore.getState();
  const H = result?.config.horizon_day ?? 0;
  const list = machineList(cfg);
  const effectiveSel = list.some((m) => m.id === selected) ? selected : 'control';

  return (
    <div className="app app-2d" data-testid="control-room-2d">
      <TopBar is2d standalone={standalone} />
      {standalone && (
        <div className="banner banner-info">
          Standalone 2D fallback — no WebGL or server needed. Same engine and presets as the 3D brewery (compiled from the same sources).
        </div>
      )}
      {webglIssue && !standalone && (
        <div className="banner banner-warn" role="alert">
          {webglIssue === 'unavailable' ? T.webgl.unavailable : webglIssue === 'lost' ? T.webgl.lost : T.webgl.crashed}
        </div>
      )}
      <main className="grid-2d">
        <section className="col-left" aria-label="Equipment">
          <h2 className="h2">{T.nav.equipment}</h2>
          <ul className="equipment equipment-2d">
            {list.map((m) => (
              <li key={m.id}>
                <button type="button" className={`equip-btn ${effectiveSel === m.id ? 'equip-active' : ''}`} aria-current={effectiveSel === m.id ? 'true' : undefined} onClick={() => st.select(m.id)} data-testid={`equip2d-${m.id}`}>
                  {m.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="card">
            <h2 className="h2" data-testid="panel-title-2d">
              {machineTitle(effectiveSel)}
            </h2>
            {effectiveSel === 'control' ? <p className="muted small">General results are shown on the right. Select a machine to edit its inputs.</p> : <MachinePanelContent id={effectiveSel} />}
          </div>
        </section>
        <section className="col-right" aria-label="Results">
          {result ? (
            <>
              <div className="card">
                <KpiCards result={result} />
              </div>
              <div className="card time-card">
                <div className="time-controls" role="group" aria-label="Simulated time">
                  <button type="button" className="btn btn-primary btn-play" onClick={() => st.setPlaying(!playing)}>
                    {playing ? `❚❚ ${T.btn.pause}` : `▶ ${T.btn.play}`}
                  </button>
                  <label className="day-label" htmlFor="day-slider-2d">
                    {T.day} <strong>{day}</strong> / {H}
                  </label>
                  <input id="day-slider-2d" className="day-slider" type="range" min={0} max={H} value={day} onChange={(e) => st.setDay(Number(e.target.value))} />
                </div>
                <ProductLegend cfg={result.config} />
                <TimelineGantt result={result} day={day} onSelectTank={(id) => st.select(tankMachineId(id))} />
              </div>
              <div className="card">
                <div className="section-head">
                  <h2 className="h2">{T.panel.orders}</h2>
                  <button type="button" className="btn btn-sm" aria-pressed={onlyLate} onClick={() => st.setOrdersFilterLate(!onlyLate)}>
                    {onlyLate ? T.btn.showAll : T.btn.whoIsLate}
                  </button>
                </div>
                <OrdersTable result={result} day={day} onlyLate={onlyLate} />
              </div>
              <details className="card" open={false}>
                <summary className="h2">{T.compare.title}</summary>
                <ComparePanel />
              </details>
              <details className="card">
                <summary className="h2">{T.panel.eventLog}</summary>
                <EventLog result={result} day={day} />
              </details>
              <details className="card">
                <summary className="h2">{T.assumptions.title}</summary>
                <AssumptionsPanel />
              </details>
              <details className="card">
                <summary className="h2">{T.diag.title}</summary>
                <DiagnosticsPanel />
              </details>
            </>
          ) : (
            <p>{T.noResult}</p>
          )}
        </section>
      </main>
      <Toasts />
    </div>
  );
}
