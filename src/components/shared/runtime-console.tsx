'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TerminalSquare, Square } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { RuntimeConsoleEvent } from '../../lib/embedded-runtime';

export interface RuntimeConsoleProps {
  events: RuntimeConsoleEvent[];
  activeWorkerIds?: readonly string[];
  daemonStatus?: string | null;
  projectRoot?: string;
}

function statusTone(status?: RuntimeConsoleEvent['status']): string {
  if (status === 'failed' || status === 'blocked') return 'text-red-300';
  if (status === 'completed') return 'text-emerald-300';
  if (status === 'planning' || status === 'launching') return 'text-amber-300';
  return 'text-cyan-200';
}

function isWorkerEvent(event: RuntimeConsoleEvent): boolean {
  return (
    event.kind === 'worker.spawned' ||
    event.kind === 'worker.updated' ||
    event.kind === 'worker.completed' ||
    event.kind === 'worker.failed'
  );
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function RuntimeConsole({ events, activeWorkerIds = [], daemonStatus, projectRoot }: RuntimeConsoleProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [stoppingWorkers, setStoppingWorkers] = useState<Set<string>>(new Set());

  const activeWorkerIdSet = useMemo(() => new Set(activeWorkerIds), [activeWorkerIds]);

  const handleStopWorker = async (workerId: string) => {
    if (!projectRoot || stoppingWorkers.has(workerId)) return;

    setStoppingWorkers((prev) => new Set(prev).add(workerId));
    try {
      await fetch('/api/swarm/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      });
    } finally {
      setStoppingWorkers((prev) => {
        const next = new Set(prev);
        next.delete(workerId);
        return next;
      });
    }
  };

  return (
    <section
      className="border-t border-[var(--border-strong)] bg-[var(--surface-elevated)]"
      data-testid="runtime-console"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2">
        <div className="flex items-center gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Runtime Console</p>
            <p className="text-xs text-[var(--text-secondary)]">Live orchestrator and worker telemetry</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
            <TerminalSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {daemonStatus ? `daemon ${daemonStatus} · ` : ''}{events.length} event{events.length === 1 ? '' : 's'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(!isMinimized)}
          className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
          title={isMinimized ? 'Expand console' : 'Minimize console'}
          aria-label={isMinimized ? 'Expand console' : 'Minimize console'}
        >
          {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!isMinimized && (
        <div className="grid max-h-44 gap-2 overflow-y-auto px-4 py-3 custom-scrollbar">
          {events.map((event) => {
            const workerId = typeof event.metadata?.workerId === 'string' ? event.metadata.workerId : null;
            const isActive = workerId ? activeWorkerIdSet.has(workerId) : false;
            const isStopping = workerId ? stoppingWorkers.has(workerId) : false;

            return (
              <article
                key={event.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isWorkerEvent(event) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-indigo-300" title="Worker Agent Event">
                        Worker
                      </span>
                    )}
                    <span className={cn('font-mono text-[10px] uppercase tracking-[0.12em]', statusTone(event.status))}>
                      {event.kind}
                    </span>
                    {event.actorLabel ? (
                      <span className="truncate text-[11px] text-[var(--text-tertiary)]">{event.actorLabel}</span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isActive && workerId && projectRoot ? (
                      <button
                        type="button"
                        onClick={() => handleStopWorker(workerId)}
                        disabled={isStopping}
                        className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        title={`Stop worker ${workerId}`}
                        aria-label={`Stop worker ${workerId}`}
                      >
                        <Square size={8} aria-hidden="true" />
                        {isStopping ? 'Stopping' : 'Stop'}
                      </button>
                    ) : null}
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{formatTimestamp(event.timestamp)}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{event.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{event.detail}</p>
              </article>
            );
          })}
          {events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--surface-quaternary)] px-3 py-4 text-sm text-[var(--text-tertiary)]">
              No runtime events yet.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
