'use client';

import type { RuntimeConsoleEvent, RuntimeInstance } from '../../lib/embedded-runtime';

export interface OrchestratorPanelProps {
  orchestrator: RuntimeInstance;
  thread: RuntimeConsoleEvent[];
}

export function OrchestratorPanel({ orchestrator, thread }: OrchestratorPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="orchestrator-panel">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Main Orchestrator</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{orchestrator.label}</p>
            <p className="text-xs text-[var(--text-secondary)]">Long-lived project control plane for Pi launches</p>
          </div>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-cyan-200">
            {orchestrator.status}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        <div className="space-y-2">
          {thread.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[var(--text-primary)]">{event.title}</p>
                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{event.kind}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{event.detail}</p>
            </div>
          ))}
          {thread.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-4 text-sm text-[var(--text-tertiary)]">
              No orchestrator messages yet.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
