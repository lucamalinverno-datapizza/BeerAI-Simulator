import { useMemo } from 'react';
import { T } from '../i18n/strings';
import { fmtErr, fmtHl, fmtNum, fmtPct } from '../app/format';
import { PRESETS, buildPreset } from '../scenarios/presets';
import { configToJson } from '../scenarios/io';
import { appStore, computeForCompare, selectStale, useApp } from '../state/store';
import type { ScenarioConfig, SimulationResult } from '../simulation/types';
import { ExportJsonButton, ImportJsonButton, SaveScenarioButton, Section, useSim, RunNotice } from './common';
import { EventLog, OrdersTable, ProductLegend, TimelineGantt } from './charts';
import { tankMachineId } from '../state/machines';

export function KpiCards({ result, compact = false }: { result: SimulationResult; compact?: boolean }) {
  const k = result.kpis;
  const items: [string, string, string?][] = [
    [T.kpi.service, fmtPct(k.service_level), `${fmtNum(k.on_time_hl)} / ${fmtNum(k.demand_hl)} hL on time`],
    [T.kpi.ordersOnTime, `${k.orders_complete_on_time}/${k.orders_due}`, `${k.orders_late_or_open} late or open`],
    [T.kpi.demand, fmtHl(k.demand_hl), 'due within horizon'],
    [T.kpi.delivered, fmtHl(k.delivered_hl), `${fmtHl(k.late_hl)} delivered late`],
    [T.kpi.onTime, fmtHl(k.on_time_hl), 'shipped by due day'],
    [T.kpi.backlog, fmtHl(k.final_backlog_hl), 'due demand − delivered'],
  ];
  return (
    <div className={compact ? 'kpis kpis-compact' : 'kpis'} data-testid="kpi-cards">
      {items.map(([label, value, sub]) => (
        <div key={label} className="kpi" data-kpi={label}>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">{value}</div>
          {sub && <div className="kpi-sub">{sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function ControlPanel() {
  const { result, day } = useSim();
  const stale = useApp(selectStale);
  const sourceLabel = useApp((s) => s.sourceLabel);
  const draft = useApp((s) => s.draft);
  const restoreAvailable = useApp((s) => s.restoreAvailable);
  const onlyLate = useApp((s) => s.ordersFilterLate);
  const lastRun = useApp((s) => s.lastRun);
  const runId = useApp((s) => s.completedRunId);
  return (
    <div className="panel-body" data-testid="panel-control">
      <Section title={T.panel.scenarioInfo}>
        <p>
          <strong>{sourceLabel}</strong>
          {draft.description && <span className="muted"> — {draft.description}</span>}
        </p>
        <p className={stale ? 'stale-text small' : 'ok-text small'}>
          {stale ? `⟳ ${T.staleShort}` : `✓ ${T.upToDate}`}
          {lastRun && ` · run #${runId} · ${lastRun.ms.toFixed(1)} ms (${lastRun.via})`}
        </p>
        <RunNotice />
        <div className="btn-row">
          <SaveScenarioButton className="btn btn-sm" />
          <ExportJsonButton className="btn btn-sm" />
          <ImportJsonButton className="btn btn-sm" />
          <button type="button" className="btn btn-sm" onClick={() => appStore.getState().openPanel('compare')}>
            {T.btn.compareScenarios}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => appStore.getState().openPanel('assumptions')}>
            {T.btn.assumptions}
          </button>
          {restoreAvailable && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => appStore.getState().restoreSession()}>
              {T.btn.restoreSession}
            </button>
          )}
        </div>
      </Section>
      {result ? (
        <>
          <Section title={T.panel.kpis}>
            <KpiCards result={result} />
            <p className={result.balance_ok ? 'ok-text small' : 'late-text small'}>
              {result.balance_ok ? `✓ ${T.balanceOk(fmtErr(result.max_balance_error_hl))}` : `✕ ${T.balanceFail(fmtErr(result.max_balance_error_hl))}`}
            </p>
          </Section>
          <Section
            title={T.panel.orders}
            actions={
              <button type="button" className="btn btn-sm" aria-pressed={onlyLate} onClick={() => appStore.getState().setOrdersFilterLate(!onlyLate)}>
                {onlyLate ? T.btn.showAll : T.btn.whoIsLate}
              </button>
            }
          >
            <OrdersTable result={result} day={day} onlyLate={onlyLate} />
          </Section>
          <Section title={T.btn.timeline}>
            <ProductLegend cfg={result.config} />
            <TimelineGantt result={result} day={day} onSelectTank={(id) => appStore.getState().select(tankMachineId(id))} />
          </Section>
          <Section title={T.panel.eventLog}>
            <EventLog result={result} day={day} />
          </Section>
        </>
      ) : (
        <p>{T.noResult}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
interface CompareColumn {
  key: string;
  label: string;
  config: ScenarioConfig;
}

export function ComparePanel() {
  const saved = useApp((s) => s.saved);
  const keys = useApp((s) => s.compareKeys);
  const result = useApp((s) => s.result);
  const sourceLabel = useApp((s) => s.sourceLabel);

  const options: CompareColumn[] = useMemo(() => {
    const o: CompareColumn[] = [];
    if (result) o.push({ key: 'current', label: `${T.compare.current}: ${sourceLabel}`, config: result.config });
    for (const p of PRESETS) o.push({ key: `preset:${p.id}`, label: `${p.id} · ${p.name}`, config: buildPreset(p.id) });
    for (const s of saved) o.push({ key: `saved:${s.id}`, label: s.name, config: s.config });
    return o;
  }, [result, saved, sourceLabel]);

  const effectiveKeys = keys.length ? keys : ['preset:S1', 'preset:S2', 'preset:S3'];
  const columns = effectiveKeys.map((k) => options.find((o) => o.key === k)).filter((x): x is CompareColumn => !!x);
  const runs = useMemo(() => columns.map((c) => ({ col: c, ...computeForCompare(c.config) })), [columns.map((c) => c.key + JSON.stringify(c.config)).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: string) => {
    const cur = effectiveKeys;
    appStore.getState().setCompareKeys(cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].slice(-4));
  };

  const allOrderIds = [...new Set(runs.flatMap((r) => r.result?.orders.map((o) => o.id) ?? []))].sort();
  const productIds = [...new Set(runs.flatMap((r) => r.col.config.products.map((p) => p.id)))];

  const inputRows: [string, (c: ScenarioConfig) => string][] = [
    [T.compare.tanks, (c) => `${c.tanks.length}: ${c.tanks.map((t) => `${t.id} ${fmtNum(t.capacity_hl)}${t.unavailable.length ? ` ⛔[${t.unavailable.map((w) => `${w.start_day}-${w.end_day}`).join(',')})` : ''}`).join(', ')}`],
    [T.compare.packaging, (c) => fmtNum(c.packaging_capacity_hl_per_day)],
    [T.compare.orders, (c) => `${c.orders.length} / ${fmtNum(c.orders.reduce((a, o) => a + o.quantity_hl, 0))} hL`],
    [T.compare.maxBatches, (c) => String(c.max_batches_per_day)],
    [T.compare.residence, (c) => c.products.map((p) => `${p.id} ${p.residence_days}`).join(' · ')],
    ['Batch hL · cleaning d · horizon', (c) => `${fmtNum(c.batch_volume_hl)} · ${c.cleaning_days} · ${c.horizon_day}`],
    ['Initial stock', (c) => Object.entries(c.initial_finished_stock_hl).map(([k, v]) => `${k} ${fmtNum(v)}`).join(' · ')],
  ];

  const kpiRows: [string, (r: SimulationResult) => string][] = [
    [T.kpi.demand, (r) => fmtHl(r.kpis.demand_hl)],
    [T.kpi.delivered, (r) => fmtHl(r.kpis.delivered_hl)],
    [T.kpi.onTime, (r) => fmtHl(r.kpis.on_time_hl)],
    [T.kpi.service, (r) => fmtPct(r.kpis.service_level)],
    [T.kpi.ordersOnTime, (r) => `${r.kpis.orders_complete_on_time}/${r.kpis.orders_due}`],
    [T.kpi.backlog, (r) => fmtHl(r.kpis.final_backlog_hl)],
    [T.kpi.late, (r) => fmtHl(r.kpis.late_hl)],
    [T.kpi.maxDelay, (r) => `${r.kpis.max_delay_days} d`],
    [T.kpi.newBrew, (r) => `${r.kpis.batches_started} · ${fmtHl(r.kpis.new_brew_hl)}`],
    ...productIds.map((p): [string, (r: SimulationResult) => string] => [`Final stock ${p}`, (r) => fmtHl(r.kpis.final_stock[p] ?? 0)]),
  ];

  return (
    <div className="panel-body" data-testid="panel-compare">
      <p className="muted small">{T.compare.help}</p>
      <fieldset className="compare-picker">
        <legend>Scenarios to compare</legend>
        {options.map((o) => (
          <label key={o.key} className="check">
            <input type="checkbox" checked={effectiveKeys.includes(o.key)} onChange={() => toggle(o.key)} /> {o.label}
          </label>
        ))}
        {saved.length === 0 && <p className="muted small">{T.compare.noSaved}</p>}
      </fieldset>
      {saved.length > 0 && (
        <details className="mt">
          <summary>{T.compare.saved}</summary>
          <ul className="plain">
            {saved.map((s) => (
              <li key={s.id} className="row-between">
                <span>{s.name}</span>
                <span>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => appStore.getState().replaceDraft(s.config, `Saved · ${s.name}`, null)}>
                    Load
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => appStore.getState().deleteSaved(s.id)}>
                    {T.btn.deleteSaved}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="table-wrap">
        <table className="table compare-table" data-testid="compare-table">
          <caption className="sr-only">Scenario comparison</caption>
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {runs.map((r) => (
                <th key={r.col.key} scope="col">
                  {r.col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="group-row">
              <th colSpan={runs.length + 1} scope="colgroup">
                {T.compare.inputs}
              </th>
            </tr>
            {inputRows.map(([label, f]) => {
              const vals = runs.map((r) => f(r.col.config));
              const differs = new Set(vals).size > 1;
              return (
                <tr key={label} className={differs ? 'diff-row' : ''}>
                  <th scope="row">
                    {label}
                    {differs && <span className="sr-only"> (differs)</span>}
                  </th>
                  {vals.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              );
            })}
            <tr className="group-row">
              <th colSpan={runs.length + 1} scope="colgroup">
                {T.compare.results}
              </th>
            </tr>
            {kpiRows.map(([label, f]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {runs.map((r, i) => (
                  <td key={i} className="num">
                    {r.result ? f(r.result) : 'invalid'}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="group-row">
              <th colSpan={runs.length + 1} scope="colgroup">
                {T.compare.perOrder}
              </th>
            </tr>
            {allOrderIds.map((oid) => (
              <tr key={oid}>
                <th scope="row">{oid}</th>
                {runs.map((r, i) => {
                  const o = r.result?.orders.find((x) => x.id === oid);
                  if (!o) return <td key={i} className="muted">—</td>;
                  const txt =
                    o.status === 'on_time'
                      ? `✓ d${o.completion_day}`
                      : o.status === 'late'
                        ? `! +${o.delay_days} d (${fmtNum(o.late_hl)} hL late)`
                        : o.status === 'open_late'
                          ? `✕ ${fmtNum(o.remaining_hl)} hL missing`
                          : '… after horizon';
                  return (
                    <td key={i} className={o.status === 'on_time' ? 'ok-text' : 'late-text'}>
                      {txt}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Added resources are counterfactual (available from day 0, no purchase/installation time). The heuristic is not an optimiser.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function AssumptionsPanel() {
  return (
    <div className="panel-body" data-testid="panel-assumptions">
      <p>{T.assumptions.intro}</p>
      <ol className="assumptions">
        {T.assumptions.items.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ol>
    </div>
  );
}

export function DiagnosticsPanel() {
  const result = useApp((s) => s.result);
  const draft = useApp((s) => s.draft);
  const lastRun = useApp((s) => s.lastRun);
  const runId = useApp((s) => s.completedRunId);
  const latest = useApp((s) => s.latestRunId);
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  return (
    <div className="panel-body" data-testid="panel-diagnostics">
      <Section title={T.diag.runInfo}>
        <pre className="code small">{json({ engine: result?.engine_version, displayed_run: runId, latest_requested_run: latest, last_run: lastRun, balance_ok: result?.balance_ok, max_balance_error_hl: result?.max_balance_error_hl })}</pre>
      </Section>
      <Section title={T.diag.config}>
        <pre className="code small" data-testid="diag-config">{configToJson(draft)}</pre>
      </Section>
      {result && (
        <>
          <Section title={T.diag.kpis}>
            <pre className="code small" data-testid="diag-kpis">{json(result.kpis)}</pre>
          </Section>
          <Section title={T.diag.events}>
            <pre className="code small code-scroll">{json(result.events)}</pre>
          </Section>
        </>
      )}
    </div>
  );
}
