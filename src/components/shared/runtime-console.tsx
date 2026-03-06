'use client';

import { TerminalSquare } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { RuntimeConsoleEvent } from '../../lib/embedded-runtime';

export interface RuntimeConsoleProps {
  events: RuntimeConsoleEvent[];
}

function statusTone(status?: RuntimeConsoleEvent['status']): string {
  if (status === 'failed' || status === 'blocked') return 'text-red-300';
  if (status === 'completed') return 'text-emerald-300';
  if (status === 'planning' || status === 'launching') return 'text-amber-300';
  return 'text-cyan-200';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RuntimeConsole({ events }: RuntimeConsoleProps) {
  return (
    <section
      className="border-t border-[var(--border-strong)] bg-[var(--surface-elevated)]"
      data-testid="runtime-console"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Runtime Console</p>
          <p className="text-xs text-[var(--text-secondary)]">Live orchestrator and worker telemetry</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
          <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
          {events.length} event{events.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid max-h-44 gap-2 overflow-y-auto px-4 py-3 custom-scrollbar">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-2"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn('font-mono text-[10px] uppercase tracking-[0.12em]', statusTone(event.status))}>
                  {event.kind}
                </span>
                {event.actorLabel ? (
                  <span className="truncate text-[11px] text-[var(--text-tertiary)]">{event.actorLabel}</span>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-[var(--text-tertiary)]">{formatTimestamp(event.timestamp)}</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{event.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{event.detail}</p>
          </article>
        ))}
        {events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-4 text-sm text-[var(--text-tertiary)]">
            No runtime events yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
