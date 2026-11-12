import { useEffect, useRef } from 'react';
import { T } from '../i18n/strings';
import { appStore, useApp } from '../state/store';
import { parseMachineId } from '../state/machines';
import { BrewhousePanel, PackagingPanel, ShippingPanel, SlotPanel, TankPanel, WarehousePanel } from './MachinePanels';
import { AssumptionsPanel, ComparePanel, ControlPanel, DiagnosticsPanel } from './GeneralPanels';

export function machineTitle(id: string): string {
  const m = parseMachineId(id);
  switch (m.kind) {
    case 'tank':
      return T.machines.tank(m.ref!);
    case 'slot':
      return T.machines.slot(m.ref!);
    case 'control':
      return T.machines.control;
    case 'brewhouse':
      return T.machines.brewhouse;
    case 'packaging':
      return T.machines.packaging;
    case 'warehouse':
      return T.machines.warehouse;
    case 'shipping':
      return T.machines.shipping;
  }
}

export function MachinePanelContent({ id }: { id: string }) {
  const m = parseMachineId(id);
  switch (m.kind) {
    case 'tank':
      return <TankPanel tankId={m.ref!} />;
    case 'slot':
      return <SlotPanel tankId={m.ref!} />;
    case 'control':
      return <ControlPanel />;
    case 'brewhouse':
      return <BrewhousePanel />;
    case 'packaging':
      return <PackagingPanel />;
    case 'warehouse':
      return <WarehousePanel />;
    case 'shipping':
      return <ShippingPanel />;
  }
}

/** Contextual right-hand drawer: real HTML panels over the 3D view. */
export function PanelHost() {
  const panel = useApp((s) => s.panel);
  const selectedId = useApp((s) => s.selectedId);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const key = panel === 'machine' ? `machine:${selectedId}` : panel;
  useEffect(() => {
    // Keep keyboard focus predictable: move it to the panel heading when a panel opens.
    if (key) headingRef.current?.focus({ preventScroll: true });
  }, [key]);

  if (!panel || (panel === 'machine' && !selectedId)) return null;

  let title = '';
  let content: React.ReactNode = null;
  if (panel === 'machine' && selectedId) {
    title = machineTitle(selectedId);
    content = <MachinePanelContent id={selectedId} />;
  } else if (panel === 'control') {
    title = T.btn.controlPanel;
    content = <ControlPanel />;
  } else if (panel === 'compare') {
    title = T.compare.title;
    content = <ComparePanel />;
  } else if (panel === 'assumptions') {
    title = T.assumptions.title;
    content = <AssumptionsPanel />;
  } else if (panel === 'diagnostics') {
    title = T.diag.title;
    content = <DiagnosticsPanel />;
  }
  const wide = panel === 'compare' || panel === 'control' || (panel === 'machine' && (selectedId === 'control' || selectedId === 'shipping'));

  return (
    <aside className={`drawer ${wide ? 'drawer-wide' : ''}`} aria-label={title} data-testid="panel">
      <header className="drawer-head">
        <h2 ref={headingRef} tabIndex={-1} data-testid="panel-title">
          {title}
        </h2>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => appStore.getState().openPanel(null)} aria-label={`${T.btn.close} panel`}>
          {T.btn.close} ✕
        </button>
      </header>
      <div className="drawer-scroll">{content}</div>
    </aside>
  );
}
