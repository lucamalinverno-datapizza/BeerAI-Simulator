import { useId, useMemo, useState } from 'react';
import { T } from '../i18n/strings';
import type { OrderResult, ScenarioConfig, SimulationResult } from '../simulation/types';
import { describeEvent, fmtHl, fmtNum, productName } from '../app/format';

export const PRODUCT_UI_COLORS = ['#2467FF', '#0B7A75', '#8A5CF6', '#B5651D', '#C2185B'];
export const productColor = (cfg: ScenarioConfig, pid: string | null | undefined): string => {
  const i = cfg.products.findIndex((p) => p.id === pid);
  return PRODUCT_UI_COLORS[(i < 0 ? 0 : i) % PRODUCT_UI_COLORS.length];
};

export function ProductLegend({ cfg }: { cfg: ScenarioConfig }) {
  return (
    <div className="legend">
      {cfg.products.map((p) => (
        <span key={p.id} className="legend-item">
          <span className="swatch" style={{ background: productColor(cfg, p.id) }} aria-hidden="true" />
          {p.name}
        </span>
      ))}
      <span className="legend-item">
        <span className="swatch swatch-cip" aria-hidden="true" /> Cleaning
      </span>
      <span className="legend-item">
        <span className="swatch swatch-unavail" aria-hidden="true" /> Unavailable
      </span>
    </div>
  );
}

/** Gantt timeline per tank: batches (residence), cleaning and unavailability, with the displayed day. */
export function TimelineGantt({
  result,
  day,
  onlyTank,
  onSelectTank,
  compact = false,
}: {
  result: SimulationResult;
  day: number;
  onlyTank?: string;
  onSelectTank?: (tankId: string) => void;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const cfg = result.config;
  const H = cfg.horizon_day;
  const tanks = onlyTank ? cfg.tanks.filter((t) => t.id === onlyTank) : cfg.tanks;
  const left = 46;
  const right = 14;
  const W = 1000;
  const rowH = compact ? 24 : 30;
  const top = 18;
  const Hpx = top + tanks.length * rowH + 22;
  const span = Math.max(1, H + 1);
  const x = (d: number) => left + (Math.min(Math.max(d, 0), span) / span) * (W - left - right);
  const ticks: number[] = [];
  const step = H <= 14 ? 1 : H <= 30 ? 5 : 7;
  for (let d = 0; d <= H; d += step) ticks.push(d);

  return (
    <svg className="gantt" viewBox={`0 0 ${W} ${Hpx}`} role="img" aria-label={`Tank timeline, days 0 to ${H}, current day ${day}`} preserveAspectRatio="none">
      <defs>
        <pattern id={`cip-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#E3EAF2" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#9AA8B6" strokeWidth="2" />
        </pattern>
        <pattern id={`un-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#FBE3E1" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#D7342B" strokeWidth="3" />
        </pattern>
      </defs>
      {ticks.map((d) => (
        <g key={d}>
          <line x1={x(d)} x2={x(d)} y1={top - 4} y2={Hpx - 20} stroke="#D5DDE5" strokeWidth={1} />
          <text x={x(d)} y={Hpx - 6} fontSize="11" textAnchor="middle" fill="#526170">
            {d}
          </text>
        </g>
      ))}
      {tanks.map((t, i) => {
        const y = top + i * rowH;
        const batches = result.batches.filter((b) => b.tank_id === t.id);
        return (
          <g key={t.id} className={onSelectTank ? 'gantt-row clickable' : 'gantt-row'} onClick={() => onSelectTank?.(t.id)}>
            <text x={6} y={y + rowH / 2 + 4} fontSize="12" fontWeight="600" fill="#111F2D">
              {t.id}
            </text>
            <rect x={left} y={y + 3} width={W - left - right} height={rowH - 6} fill="#F5F8FC" />
            {t.unavailable.map((w, k) => (
              <rect key={`u${k}`} x={x(w.start_day)} y={y + 3} width={Math.max(1, x(w.end_day) - x(w.start_day))} height={rowH - 6} fill={`url(#un-${uid})`}>
                <title>{`${t.id} unavailable [${w.start_day}, ${w.end_day})`}</title>
              </rect>
            ))}
            {batches.map((b) => {
              const s = b.start_day ?? 0;
              const x0 = x(s);
              const x1 = x(b.ready_day);
              const c0 = x(b.ready_day);
              const c1 = x(b.clean_until);
              const label = `${b.id} ${b.product_id}`;
              return (
                <g key={b.id}>
                  <rect x={x0} y={y + 3} width={Math.max(1, x1 - x0)} height={rowH - 6} rx={3} fill={productColor(cfg, b.product_id)}>
                    <title>{`${b.id} · ${productName(cfg, b.product_id)} · ${fmtHl(b.volume_hl)} · ${b.start_day === null ? 'initial' : `start ${b.start_day}`} → ready ${b.ready_day}${b.beyond_horizon ? ' (beyond horizon)' : ''}`}</title>
                  </rect>
                  {x1 - x0 > 46 && (
                    <text x={x0 + 5} y={y + rowH / 2 + 4} fontSize="11" fill="#fff" fontWeight="600" pointerEvents="none">
                      {label}
                    </text>
                  )}
                  {b.clean_until > b.ready_day && c1 > c0 && (
                    <rect x={c0} y={y + 3} width={Math.max(1, c1 - c0)} height={rowH - 6} fill={`url(#cip-${uid})`}>
                      <title>{`${t.id} cleaning [${b.ready_day}, ${b.clean_until})`}</title>
                    </rect>
                  )}
                  {b.beyond_horizon && (
                    <text x={W - right + 2} y={y + rowH / 2 + 4} fontSize="11" fill="#526170">
                      ›
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      <line x1={x(day) + (x(day + 1) - x(day)) / 2} x2={x(day) + (x(day + 1) - x(day)) / 2} y1={top - 8} y2={Hpx - 20} stroke="#111F2D" strokeWidth={2} />
      <text x={x(day) + (x(day + 1) - x(day)) / 2 + 4} y={top - 8} fontSize="11" fill="#111F2D" fontWeight="600">
        {`${T.day} ${day}`}
      </text>
    </svg>
  );
}

export function DailyBarChart({
  values,
  day,
  capacity,
  label,
  color = '#2467FF',
}: {
  values: number[];
  day: number;
  capacity?: number;
  label: string;
  color?: string;
}) {
  const W = 400;
  const Hh = 110;
  const pad = 22;
  const max = Math.max(1, capacity ?? 0, ...values);
  const bw = (W - pad - 6) / Math.max(1, values.length);
  const y = (v: number) => Hh - 16 - (v / max) * (Hh - 28);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={label}>
      <line x1={pad} x2={W - 4} y1={Hh - 16} y2={Hh - 16} stroke="#D5DDE5" />
      {values.map((v, i) => (
        <rect key={i} x={pad + i * bw + 0.5} y={y(v)} width={Math.max(1, bw - 1)} height={Hh - 16 - y(v)} fill={i === day ? '#111F2D' : color} opacity={i === day ? 1 : 0.85}>
          <title>{`Day ${i}: ${fmtHl(v)}`}</title>
        </rect>
      ))}
      {capacity !== undefined && (
        <>
          <line x1={pad} x2={W - 4} y1={y(capacity)} y2={y(capacity)} stroke="#D7342B" strokeDasharray="4 3" />
          <text x={W - 6} y={y(capacity) - 3} fontSize="10" textAnchor="end" fill="#D7342B">
            capacity {fmtNum(capacity)}
          </text>
        </>
      )}
      <text x={pad} y={Hh - 3} fontSize="10" fill="#526170">
        0
      </text>
      <text x={W - 4} y={Hh - 3} fontSize="10" fill="#526170" textAnchor="end">
        {values.length - 1}
      </text>
      <text x={2} y={12} fontSize="10" fill="#526170">
        {fmtNum(max)}
      </text>
    </svg>
  );
}

export function LineChart({
  series,
  day,
  label,
}: {
  series: { name: string; color: string; values: number[] }[];
  day: number;
  label: string;
}) {
  const W = 400;
  const Hh = 120;
  const pad = 26;
  const n = Math.max(1, ...series.map((s) => s.values.length));
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad - 6);
  const y = (v: number) => Hh - 16 - (v / max) * (Hh - 28);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={label}>
      <line x1={pad} x2={W - 4} y1={Hh - 16} y2={Hh - 16} stroke="#D5DDE5" />
      <line x1={x(day)} x2={x(day)} y1={8} y2={Hh - 16} stroke="#111F2D" strokeWidth={1.5} />
      {series.map((s) => (
        <polyline
          key={s.name}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
          points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        />
      ))}
      <text x={2} y={12} fontSize="10" fill="#526170">
        {fmtNum(max)}
      </text>
      <text x={pad} y={Hh - 3} fontSize="10" fill="#526170">
        0
      </text>
      <text x={W - 4} y={Hh - 3} fontSize="10" fill="#526170" textAnchor="end">
        {n - 1}
      </text>
    </svg>
  );
}

function orderOutcome(o: OrderResult): string {
  if (o.status === 'on_time') return 'complete on due day';
  if (o.status === 'late') return `+${o.delay_days} d (${fmtHl(o.late_hl)} late)`;
  if (o.status === 'open_late') return `${fmtHl(o.remaining_hl)} missing · ${o.open_delay_age_days} d overdue`;
  return 'after horizon';
}

/** Accessible order table with partial shipments, delays and lot traceability. */
export function OrdersTable({
  result,
  day,
  onlyLate = false,
  editable = false,
  onDelete,
}: {
  result: SimulationResult;
  day: number;
  onlyLate?: boolean;
  editable?: boolean;
  onDelete?: (orderId: string) => void;
}) {
  const rows = useMemo(
    () => [...result.orders].sort((a, b) => a.due_day - b.due_day || (a.id < b.id ? -1 : 1)).filter((o) => !onlyLate || o.status === 'late' || o.status === 'open_late'),
    [result, onlyLate],
  );
  return (
    <div className="table-wrap">
      <table className="table" data-testid="orders-table">
        <caption className="sr-only">Orders with deliveries, on-time volume and delays</caption>
        <thead>
          <tr>
            <th scope="col">{T.table.id}</th>
            <th scope="col">{T.table.customer}</th>
            <th scope="col">{T.table.product}</th>
            <th scope="col" className="num">{T.table.qty}</th>
            <th scope="col" className="num">{T.table.due}</th>
            <th scope="col" className="num">{`By day ${day}`}</th>
            <th scope="col" className="num">{T.table.onTime}</th>
            <th scope="col">{T.table.status}</th>
            <th scope="col">{T.table.shipments}</th>
            {editable && <th scope="col"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={editable ? 10 : 9}>No orders to show.</td>
            </tr>
          )}
          {rows.map((o) => {
            const byDay = o.shipments.filter((s) => s.day <= day).reduce((a, s) => a + s.quantity_hl, 0);
            return (
              <tr key={o.id} data-order={o.id} className={`row-${o.status}`}>
                <th scope="row">{o.id}</th>
                <td>{o.customer}</td>
                <td>{o.product_id}</td>
                <td className="num">{fmtNum(o.quantity_hl)}</td>
                <td className="num">{o.due_day}</td>
                <td className="num">{fmtNum(byDay)}</td>
                <td className="num">{fmtNum(o.on_time_hl)}</td>
                <td>
                  <span className={`pill pill-order-${o.status}`}>
                    <span aria-hidden="true">{T.orderStatusIcon[o.status]}</span> {T.orderStatus[o.status]}
                  </span>
                  <div className="muted small">{orderOutcome(o)}</div>
                </td>
                <td className="small">
                  {o.shipments.length === 0
                    ? T.none
                    : o.shipments.map((s, k) => (
                        <div key={k} className={s.on_time ? '' : 'late-text'}>
                          {`d${s.day}: ${fmtNum(s.quantity_hl)}`}
                          <span className="muted">{` ← ${s.lots.map((l) => `${l.lot_id}${s.lots.length > 1 ? ` ${fmtNum(l.quantity_hl)}` : ''}`).join(', ')}`}</span>
                        </div>
                      ))}
                </td>
                {editable && (
                  <td>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => onDelete?.(o.id)} aria-label={`${T.btn.deleteOrder} ${o.id}`}>
                      {T.btn.deleteOrder}
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EventLog({ result, day }: { result: SimulationResult; day: number }) {
  const [type, setType] = useState('all');
  const [query, setQuery] = useState('');
  const [upToDay, setUpToDay] = useState(true);
  const cfg = result.config;
  const id = useId();
  const q = query.trim().toUpperCase();
  const events = result.events.filter(
    (e) =>
      (type === 'all' || e.type === type) &&
      (!upToDay || e.day <= day) &&
      (!q || [e.batch_id, e.tank_id, e.order_id, e.product_id, e.trigger_order_id].some((v) => v && v.toUpperCase().includes(q))),
  );
  return (
    <div className="eventlog">
      <div className="eventlog-filters">
        <label htmlFor={`${id}-t`} className="sr-only">
          Event type
        </label>
        <select id={`${id}-t`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">{T.panel.allEvents}</option>
          <option value="brew">Brew</option>
          <option value="brew_blocked">Brew blocked</option>
          <option value="release">Release</option>
          <option value="cleaning_done">Cleaning done</option>
          <option value="package">Package</option>
          <option value="deliver">Deliver</option>
          <option value="order_completed">Order completed</option>
        </select>
        <label htmlFor={`${id}-q`} className="sr-only">
          Filter by order, lot, tank or product
        </label>
        <input id={`${id}-q`} type="search" placeholder="Order, lot, tank…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="check">
          <input type="checkbox" checked={upToDay} onChange={(e) => setUpToDay(e.target.checked)} /> up to day {day}
        </label>
      </div>
      <ol className="eventlog-list" aria-label={T.panel.eventLog}>
        {events.length === 0 && <li className="muted">No events.</li>}
        {events.slice(-400).map((e) => (
          <li key={e.seq} className={`ev ev-${e.type}`}>
            <span className="ev-day">d{e.day}</span> {describeEvent(e, cfg)}
          </li>
        ))}
      </ol>
    </div>
  );
}
