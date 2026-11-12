import { useState } from 'react';
import { T } from '../i18n/strings';
import { fmtHl, fmtNum, fmtPct, productName } from '../app/format';
import { appStore, useApp } from '../state/store';
import { nextTankId, tankMachineId } from '../state/machines';
import { Bar, KV, NumberField, RunNotice, Section, TankStatusPill, TextField, useSim } from './common';
import { DailyBarChart, LineChart, OrdersTable, TimelineGantt, productColor } from './charts';
import type { ScenarioConfig } from '../simulation/types';

const update = (fn: (c: ScenarioConfig) => void) => appStore.getState().updateDraft(fn);

// ---------------------------------------------------------------------------------------------
export function TankPanel({ tankId }: { tankId: string }) {
  const { result, cfg, snap, day } = useSim();
  const draft = useApp((s) => s.draft);
  const inspect = useApp((s) => s.inspectTanks);
  const draftTank = draft.tanks.find((t) => t.id === tankId);
  const state = snap?.tanks.find((t) => t.tank_id === tankId);
  const util = result?.utilization.find((u) => u.tank_id === tankId);
  const [ws, setWs] = useState(0);
  const [we, setWe] = useState(7);
  const inResult = cfg.tanks.some((t) => t.id === tankId);
  const hasWip = draft.initial_wip.some((w) => w.tank_id === tankId);

  return (
    <div className="panel-body" data-testid={`panel-tank-${tankId}`}>
      {state && result && inResult ? (
        <Section title={T.panel.snapshotOfDay(day)}>
          <div className="row-between">
            <TankStatusPill status={state.status} />
            <span className="muted small">{`${T.panel.capacity}: ${fmtHl(state.capacity_hl)}`}</span>
          </div>
          <KV
            rows={[
              [T.panel.product, state.product_id ? `${productName(cfg, state.product_id)} (${state.product_id})` : T.none],
              [T.panel.lot, state.batch_id ?? T.none],
              [T.panel.volume, state.status === 'occupied' ? fmtHl(state.volume_hl) : fmtHl(0)],
              [T.panel.started, state.start_day === null ? (state.batch_id ? T.panel.unknownStart : T.none) : `day ${state.start_day}`],
              [T.panel.releaseDay, state.ready_day === null ? T.none : `day ${state.ready_day}`],
              [T.panel.cleaningUntil, state.clean_until === null ? 'now' : `day ${state.clean_until}`],
              [T.panel.daysToRelease, state.days_to_release === null ? T.none : String(state.days_to_release)],
            ]}
          />
          <div className="meter-label">{T.panel.fill}</div>
          <Bar value={state.capacity_hl > 0 ? state.volume_hl / state.capacity_hl : 0} label={T.panel.fill} tone="amber" />
          <div className="meter-label">{T.panel.timeProgress}</div>
          {state.time_progress === null ? (
            <div className="muted small">{state.status === 'occupied' ? 'Initial batch: start before day 0 not tracked.' : T.none}</div>
          ) : (
            <Bar value={state.time_progress} label={T.panel.timeProgress} />
          )}
          <label className="check mt">
            <input type="checkbox" checked={inspect} onChange={(e) => appStore.getState().setInspectTanks(e.target.checked)} /> Inspect contents (x-ray tanks)
          </label>
          <p className="muted small">{T.panel.inspectNote}</p>
        </Section>
      ) : (
        <div className="notice">This tank is not in the displayed result yet — press Run simulation.</div>
      )}

      {result && inResult && (
        <Section title={T.panel.batchesInTank}>
          <TimelineGantt result={result} day={day} onlyTank={tankId} compact />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{T.panel.lot}</th>
                  <th scope="col">{T.table.product}</th>
                  <th scope="col" className="num">{T.table.start}</th>
                  <th scope="col" className="num">{T.table.ready}</th>
                  <th scope="col" className="num">{T.table.free}</th>
                  <th scope="col" className="num">hL</th>
                </tr>
              </thead>
              <tbody>
                {result.batches
                  .filter((b) => b.tank_id === tankId)
                  .map((b) => (
                    <tr key={b.id}>
                      <th scope="row">
                        {b.id}
                        {b.initial && <span className="muted small"> ({T.panel.initialBatch})</span>}
                      </th>
                      <td>{b.product_id}</td>
                      <td className="num">{b.start_day ?? '<0'}</td>
                      <td className="num">
                        {b.ready_day}
                        {b.beyond_horizon && <span className="muted small"> ›H</span>}
                      </td>
                      <td className="num">{b.clean_until}</td>
                      <td className="num">{fmtNum(b.volume_hl)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {util && (
            <p className="small">
              {`${T.panel.utilization}: residence ${util.residence_days} d · cleaning ${util.cleaning_days} d · unavailable ${util.unavailable_days} d · idle ${util.idle_days} d — of ${util.window_days} tank-days (${fmtPct(util.residence_share)} residence).`}
            </p>
          )}
        </Section>
      )}

      {draftTank && (
        <Section title={T.panel.inputs}>
          <NumberField
            label={T.panel.capacityHl}
            value={draftTank.capacity_hl}
            min={0}
            step={1}
            testId={`tank-${tankId}-capacity`}
            onCommit={(v) =>
              update((c) => {
                const t = c.tanks.find((x) => x.id === tankId);
                if (t) t.capacity_hl = v;
              })
            }
          />
          <div className="subhead">{T.panel.unavailability}</div>
          {draftTank.unavailable.length === 0 && <p className="muted small">None.</p>}
          <ul className="plain">
            {draftTank.unavailable.map((w, i) => (
              <li key={i} className="row-between">
                <span>{`[${w.start_day}, ${w.end_day})${w.note ? ` — ${w.note}` : ''}`}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  aria-label={`${T.btn.remove} unavailability ${w.start_day}–${w.end_day}`}
                  onClick={() =>
                    update((c) => {
                      const t = c.tanks.find((x) => x.id === tankId);
                      if (t) t.unavailable.splice(i, 1);
                    })
                  }
                >
                  {T.btn.remove}
                </button>
              </li>
            ))}
          </ul>
          <div className="inline-fields">
            <NumberField label={T.panel.startDay} value={ws} min={0} integer onCommit={setWs} testId={`tank-${tankId}-unavail-start`} />
            <NumberField label={T.panel.endDay} value={we} min={1} integer onCommit={setWe} testId={`tank-${tankId}-unavail-end`} />
          </div>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!(we > ws)}
            onClick={() =>
              update((c) => {
                const t = c.tanks.find((x) => x.id === tankId);
                if (t) t.unavailable.push({ start_day: ws, end_day: we });
              })
            }
          >
            {T.btn.addWindow}
          </button>
          <p className="muted small">{T.panel.residenceNote}</p>
          {!hasWip && (
            <button
              type="button"
              className="btn btn-sm btn-danger-ghost mt"
              onClick={() => {
                update((c) => {
                  c.tanks = c.tanks.filter((t) => t.id !== tankId);
                });
                appStore.getState().select(null);
              }}
            >
              {T.btn.removeTank}
            </button>
          )}
          <RunNotice />
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function SlotPanel({ tankId }: { tankId: string }) {
  const draft = useApp((s) => s.draft);
  const exists = draft.tanks.some((t) => t.id === tankId);
  const [cap, setCap] = useState(draft.batch_volume_hl);
  return (
    <div className="panel-body" data-testid={`panel-slot-${tankId}`}>
      <p>{T.panel.slotEmpty}</p>
      <p className="muted small">{T.panel.slotAddHelp}</p>
      {exists ? (
        <>
          <div className="notice">{`${tankId} is in the draft configuration. Run the simulation to see it in the hall.`}</div>
          <RunNotice />
        </>
      ) : (
        <>
          <NumberField label={T.panel.capacityHl} value={cap} min={0} onCommit={setCap} testId="slot-capacity" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={nextTankId(draft) === null}
            onClick={() => {
              update((c) => {
                c.tanks.push({ id: tankId, capacity_hl: cap, unavailable: [] });
              });
              appStore.getState().select(tankMachineId(tankId));
            }}
          >
            {`${T.btn.addTank} ${tankId}`}
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function BrewhousePanel() {
  const { result, cfg, snap, day } = useSim();
  const draft = useApp((s) => s.draft);
  const started = result?.batches.filter((b) => !b.initial) ?? [];
  const blockedDays = new Set(result?.events.filter((e) => e.type === 'brew_blocked').map((e) => e.day) ?? []);
  return (
    <div className="panel-body" data-testid="panel-brewhouse">
      {result && snap && (
        <Section title={T.panel.snapshotOfDay(day)}>
          <KV
            rows={[
              [
                T.panel.brewsToday,
                snap.brews_started_today.length
                  ? snap.brews_started_today
                      .map((id) => {
                        const b = result.batches.find((x) => x.id === id)!;
                        return `${id} → ${b.tank_id} (${b.product_id})`;
                      })
                      .join(', ')
                  : 'none',
              ],
              [T.kpi.newBrew, `${result.kpis.batches_started} batches · ${fmtHl(result.kpis.new_brew_hl)}`],
              [T.panel.blockedDays, blockedDays.size ? [...blockedDays].join(', ') : 'none'],
            ]}
          />
        </Section>
      )}
      {result && (
        <Section title={T.panel.brewsStarted}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{T.panel.lot}</th>
                  <th scope="col" className="num">{T.table.day}</th>
                  <th scope="col">{T.table.tank}</th>
                  <th scope="col">{T.table.product}</th>
                  <th scope="col" className="num">{T.table.ready}</th>
                  <th scope="col">Trigger</th>
                </tr>
              </thead>
              <tbody>
                {started.length === 0 && (
                  <tr>
                    <td colSpan={6}>No new batches.</td>
                  </tr>
                )}
                {started.map((b) => (
                  <tr key={b.id} className={b.start_day === day ? 'row-current' : ''}>
                    <th scope="row">{b.id}</th>
                    <td className="num">{b.start_day}</td>
                    <td>{b.tank_id}</td>
                    <td>{b.product_id}</td>
                    <td className="num">{b.ready_day}</td>
                    <td>{result.events.find((e) => e.type === 'brew' && e.batch_id === b.id)?.trigger_order_id ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      <Section title={T.panel.process}>
        <NumberField label={T.panel.maxBatches} value={draft.max_batches_per_day} min={0} integer testId="max-batches" onCommit={(v) => update((c) => void (c.max_batches_per_day = v))} />
        <NumberField label={T.panel.batchVolume} value={draft.batch_volume_hl} min={0.001} step={1} testId="batch-volume" onCommit={(v) => update((c) => void (c.batch_volume_hl = v))} />
        <NumberField label={T.panel.cleaningDays} value={draft.cleaning_days} min={0} integer testId="cleaning-days" onCommit={(v) => update((c) => void (c.cleaning_days = v))} />
        <NumberField label={T.panel.horizon} value={draft.horizon_day} min={0} max={365} integer testId="horizon" onCommit={(v) => update((c) => void (c.horizon_day = v))} />
      </Section>
      <Section title={T.panel.recipes}>
        {draft.products.map((p) => (
          <div key={p.id} className="recipe-row">
            <span className="swatch" style={{ background: productColor(cfg, p.id) }} aria-hidden="true" />
            <NumberField
              label={`${p.name} (${p.id}) — ${T.panel.residenceDays}`}
              value={p.residence_days}
              min={1}
              integer
              testId={`residence-${p.id}`}
              onCommit={(v) =>
                update((c) => {
                  const x = c.products.find((q) => q.id === p.id);
                  if (x) x.residence_days = v;
                })
              }
            />
          </div>
        ))}
        <RunNotice />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function PackagingPanel() {
  const { result, cfg, snap, day } = useSim();
  const draft = useApp((s) => s.draft);
  const perDay = result?.snapshots.map((s) => s.packaged_total_today) ?? [];
  const totalPackaged = result?.packaging.reduce((a, p) => a + p.quantity_hl, 0) ?? 0;
  return (
    <div className="panel-body" data-testid="panel-packaging">
      <Section title={T.panel.inputs}>
        <NumberField
          label={T.panel.packagingCapacity}
          value={draft.packaging_capacity_hl_per_day}
          min={0}
          step={5}
          testId="packaging-capacity"
          onCommit={(v) => update((c) => void (c.packaging_capacity_hl_per_day = v))}
        />
        <RunNotice />
      </Section>
      {result && snap && (
        <Section title={T.panel.snapshotOfDay(day)}>
          <KV
            rows={[
              [T.panel.capacity, `${fmtNum(cfg.packaging_capacity_hl_per_day)} hL/day (simulated)`],
              ...cfg.products.map((p): [string, string] => [`${T.panel.bufferNow} · ${p.name}`, fmtHl(snap.buffer[p.id] ?? 0)]),
              ...cfg.products.map((p): [string, string] => [`${T.panel.packagedToday} · ${p.name}`, fmtHl(snap.packaged_today[p.id] ?? 0)]),
              ['Buffer lots (FIFO)', snap.buffer_lots.length ? snap.buffer_lots.map((l) => `${l.lot_id} ${fmtNum(l.quantity_hl)}`).join(', ') : 'empty'],
              ['Total packaged in horizon', fmtHl(totalPackaged)],
            ]}
          />
          <div className="meter-label">{T.panel.capacityUsed}</div>
          <Bar value={cfg.packaging_capacity_hl_per_day > 0 ? snap.packaged_total_today / cfg.packaging_capacity_hl_per_day : 0} label={T.panel.capacityUsed} />
          <div className="meter-label">{T.panel.packagedPerDay}</div>
          <DailyBarChart values={perDay} day={day} capacity={cfg.packaging_capacity_hl_per_day} label={T.panel.packagedPerDay} />
          <p className="muted small">{T.panel.bufferNote}</p>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function WarehousePanel() {
  const { result, cfg, snap, day } = useSim();
  const draft = useApp((s) => s.draft);
  return (
    <div className="panel-body" data-testid="panel-warehouse">
      {result && snap && (
        <Section title={T.panel.snapshotOfDay(day)}>
          <KV
            rows={[
              ...cfg.products.map((p): [string, string] => [`${T.panel.stockNow} · ${p.name}`, fmtHl(snap.finished_stock[p.id] ?? 0)]),
              ...cfg.products.map((p): [string, string] => [
                `${T.panel.stockLots} · ${p.id}`,
                (snap.stock_lots[p.id] ?? []).map((l) => `${l.lot_id} ${fmtNum(l.quantity_hl)}`).join(', ') || 'empty',
              ]),
            ]}
          />
          <div className="meter-label">{T.panel.stockOverTime}</div>
          <LineChart
            day={day}
            label={T.panel.stockOverTime}
            series={cfg.products.map((p) => ({ name: p.name, color: productColor(cfg, p.id), values: result.snapshots.map((s) => s.finished_stock[p.id] ?? 0) }))}
          />
          <p className="muted small">{T.panel.palletNote}</p>
        </Section>
      )}
      <Section title={T.panel.inputs}>
        {draft.products.map((p) => (
          <NumberField
            key={p.id}
            label={`${T.panel.initialStock} · ${p.name}`}
            value={draft.initial_finished_stock_hl[p.id] ?? 0}
            min={0}
            testId={`initial-stock-${p.id}`}
            onCommit={(v) => update((c) => void (c.initial_finished_stock_hl[p.id] = v))}
          />
        ))}
        <RunNotice />
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function ShippingPanel() {
  const { result, cfg, snap, day } = useSim();
  const draft = useApp((s) => s.draft);
  const onlyLate = useApp((s) => s.ordersFilterLate);
  const nextId = (() => {
    let i = draft.orders.length + 1;
    const used = new Set(draft.orders.map((o) => o.id));
    while (used.has(`O${String(i).padStart(2, '0')}`)) i++;
    return `O${String(i).padStart(2, '0')}`;
  })();
  const [form, setForm] = useState({ customer: 'Festival', product: draft.products[0]?.id ?? 'A', qty: 40, due: 21 });

  return (
    <div className="panel-body" data-testid="panel-shipping">
      {result && snap && (
        <Section title={`${T.panel.shipmentsToday} · day ${day}`}>
          {snap.shipments_today.length === 0 ? (
            <p className="muted">{T.panel.noShipmentsToday}</p>
          ) : (
            <ul className="plain">
              {snap.shipments_today.map((s, i) => {
                const o = result.orders.find((x) => x.id === s.order_id)!;
                return (
                  <li key={i}>
                    <strong>{s.order_id}</strong> {o.customer} — {fmtHl(s.quantity_hl)} {productName(cfg, o.product_id)}{' '}
                    <span className={s.on_time ? 'ok-text' : 'late-text'}>{s.on_time ? '✓ on due day' : `! ${s.day - o.due_day} d late`}</span>
                    <span className="muted small">{` ← ${s.lots.map((l) => l.lot_id).join(', ')}`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}
      {result && (
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
      )}
      <Section title={T.panel.inputs}>
        <div className="table-wrap">
          <table className="table table-edit">
            <caption className="sr-only">Editable orders (draft)</caption>
            <thead>
              <tr>
                <th scope="col">{T.table.id}</th>
                <th scope="col">{T.table.customer}</th>
                <th scope="col">{T.table.product}</th>
                <th scope="col">{T.table.qty}</th>
                <th scope="col">{T.table.due}</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {draft.orders.map((o) => (
                <tr key={o.id}>
                  <th scope="row">{o.id}</th>
                  <td>
                    <input
                      aria-label={`${o.id} customer`}
                      value={o.customer}
                      onChange={(e) => update((c) => void (c.orders.find((x) => x.id === o.id)!.customer = e.target.value))}
                    />
                  </td>
                  <td>
                    <select aria-label={`${o.id} product`} value={o.product_id} onChange={(e) => update((c) => void (c.orders.find((x) => x.id === o.id)!.product_id = e.target.value))}>
                      {draft.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <InlineNumber label={`${o.id} quantity hL`} value={o.quantity_hl} min={0.000001} onCommit={(v) => update((c) => void (c.orders.find((x) => x.id === o.id)!.quantity_hl = v))} />
                  </td>
                  <td>
                    <InlineNumber label={`${o.id} due day`} value={o.due_day} min={0} integer onCommit={(v) => update((c) => void (c.orders.find((x) => x.id === o.id)!.due_day = v))} />
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm btn-ghost" aria-label={`${T.btn.deleteOrder} ${o.id}`} onClick={() => update((c) => void (c.orders = c.orders.filter((x) => x.id !== o.id)))}>
                      {T.btn.deleteOrder}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="subhead">{T.panel.addOrderTitle}</div>
        <div className="inline-fields">
          <TextField label={T.panel.customer} value={form.customer} onCommit={(v) => setForm({ ...form, customer: v })} testId="new-order-customer" />
          <div className="field">
            <label htmlFor="new-order-product">{T.panel.product}</label>
            <select id="new-order-product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
              {draft.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="inline-fields">
          <NumberField label={T.panel.quantity} value={form.qty} min={0.000001} onCommit={(v) => setForm({ ...form, qty: v })} testId="new-order-qty" />
          <NumberField label={T.panel.dueDay} value={form.due} min={0} integer onCommit={(v) => setForm({ ...form, due: v })} testId="new-order-due" />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!(form.qty > 0)}
          onClick={() =>
            update((c) => {
              c.orders.push({ id: nextId, customer: form.customer || 'Customer', product_id: form.product, quantity_hl: form.qty, due_day: form.due });
            })
          }
        >
          {`${T.btn.addOrder} ${nextId}`}
        </button>
        <RunNotice />
      </Section>
    </div>
  );
}

function InlineNumber({ label, value, onCommit, min, integer }: { label: string; value: number; onCommit: (v: number) => void; min?: number; integer?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(value);
  const n = Number(shown);
  const invalid = shown.trim() === '' || !Number.isFinite(n) || (integer && !Number.isInteger(n)) || (min !== undefined && n < min);
  return (
    <input
      className="input-num"
      type="number"
      aria-label={label}
      aria-invalid={invalid}
      value={shown}
      onFocus={() => setText(String(value))}
      onBlur={() => setText(null)}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(v) && (!integer || Number.isInteger(v)) && (min === undefined || v >= min)) onCommit(v);
      }}
    />
  );
}
