import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { T } from '../i18n/strings';
import { snapshotAt } from '../simulation/engine';
import type { DaySnapshot, ScenarioConfig, SimulationResult, TankStatus } from '../simulation/types';
import { appStore, selectStale, useApp } from '../state/store';

/** Result + configuration actually simulated + snapshot of the displayed day. */
export function useSim(): { result: SimulationResult | null; cfg: ScenarioConfig; snap: DaySnapshot | null; day: number } {
  const result = useApp((s) => s.result);
  const draft = useApp((s) => s.draft);
  const day = useApp((s) => s.currentDay);
  const cfg = result?.config ?? draft;
  const snap = result ? snapshotAt(result, day) : null;
  return { result, cfg, snap, day: snap?.day ?? day };
}

export function Section({ title, children, actions, id }: { title: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section className="section" aria-labelledby={id}>
      <div className="section-head">
        <h3 id={id}>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div key={k} className="kv-row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bar({ value, label, tone = 'blue' }: { value: number; label: string; tone?: 'blue' | 'navy' | 'amber' }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className={`bar-fill tone-${tone}`} style={{ width: `${v * 100}%` }} />
      <span className="bar-text">{Math.round(v * 100)}%</span>
    </div>
  );
}

export function TankStatusPill({ status }: { status: TankStatus }) {
  return (
    <span className={`pill pill-${status}`}>
      <span aria-hidden="true">{T.tankStatusIcon[status]}</span> {T.tankStatus[status]}
    </span>
  );
}

/**
 * Numeric input that edits the draft. Keeps local text while typing; commits only finite numbers
 * (integers when `integer`). Invalid text is flagged and never sent to the engine.
 */
export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  integer = false,
  testId,
  suffix,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  testId?: string;
  suffix?: string;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  const parsed = text.trim() === '' ? Number.NaN : Number(text);
  const invalid =
    !Number.isFinite(parsed) || (integer && !Number.isInteger(parsed)) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          aria-invalid={invalid}
          data-testid={testId}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setText(String(value));
          }}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            const n = t.trim() === '' ? Number.NaN : Number(t);
            const ok = Number.isFinite(n) && (!integer || Number.isInteger(n)) && (min === undefined || n >= min) && (max === undefined || n <= max);
            if (ok && n !== value) onCommit(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {invalid && <span className="field-error">{integer ? 'Enter a whole number' : 'Enter a number'}{min !== undefined ? ` ≥ ${min}` : ''}</span>}
    </div>
  );
}

export function TextField({ label, value, onCommit, testId }: { label: string; value: string; onCommit: (v: string) => void; testId?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" value={value} data-testid={testId} onChange={(e) => onCommit(e.target.value)} />
    </div>
  );
}

/** Stale / invalid notice with a Run button, shown in every panel that edits inputs. */
export function RunNotice() {
  const stale = useApp(selectStale);
  const issues = useApp((s) => s.draftIssues);
  const running = useApp((s) => s.running);
  if (issues.length > 0) {
    return (
      <div className="notice notice-error" role="alert">
        <strong>{T.invalid}</strong>
        <ul>
          {issues.slice(0, 6).map((i, k) => (
            <li key={k}>
              <code>{i.path}</code> — {i.message}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (!stale) return null;
  return (
    <div className="notice notice-stale" role="status">
      <span>
        <span aria-hidden="true">⟳ </span>
        {T.stale}
      </span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => void appStore.getState().runSimulation()} disabled={running}>
        {running ? T.btn.running : T.btn.runSimulation}
      </button>
    </div>
  );
}

export function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Visible "Import JSON" button backed by a local file picker (no fetch of adjacent files). */
export function ImportJsonButton({ className = 'btn' }: { className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        {T.btn.importJson}
      </button>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Scenario JSON file"
        data-testid="import-file"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const text = await f.text();
          await appStore.getState().importJsonText(text, f.name);
          e.target.value = '';
        }}
      />
    </>
  );
}

export function ExportJsonButton({ className = 'btn' }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const { fileName, text } = appStore.getState().exportJson();
        downloadText(fileName, text);
      }}
    >
      {T.btn.exportJson}
    </button>
  );
}

export function SaveScenarioButton({ className = 'btn' }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => appStore.getState().saveScenario()}>
      {T.btn.saveScenario}
    </button>
  );
}
