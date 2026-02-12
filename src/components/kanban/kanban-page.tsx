'use client';

import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { KanbanFilterOptions, KanbanStatus } from '../../lib/kanban';
import { buildKanbanColumns, buildKanbanStats, filterKanbanIssues } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';
import { applyOptimisticStatus, planStatusTransition } from '../../lib/writeback';

import { KanbanBoard } from './kanban-board';
import { KanbanControls } from './kanban-controls';
import { KanbanDetail } from './kanban-detail';

interface KanbanPageProps {
  issues: BeadIssue[];
  projectRoot: string;
}

type MutationOperation = 'create' | 'update' | 'close' | 'reopen' | 'comment';

interface MutationErrorResponse {
  error?: { message?: string };
}

async function postMutation(operation: MutationOperation, body: Record<string, unknown>) {
  const response = await fetch(`/api/beads/${operation}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { ok: boolean; error?: { message?: string } };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error?.message ?? `${operation} failed`);
  }
}

async function fetchIssues(projectRoot: string): Promise<BeadIssue[]> {
  const response = await fetch(`/api/beads/read?projectRoot=${encodeURIComponent(projectRoot)}`, {
    cache: 'no-store',
  });
  const payload = (await response.json()) as { ok: boolean; issues?: BeadIssue[] } & MutationErrorResponse;
  if (!response.ok || !payload.ok || !payload.issues) {
    throw new Error(payload.error?.message ?? 'Failed to refresh issues');
  }
  return payload.issues;
}

export function KanbanPage({ issues, projectRoot }: KanbanPageProps) {
  const [localIssues, setLocalIssues] = useState<BeadIssue[]>(issues);
  const [filters, setFilters] = useState<KanbanFilterOptions>({
    query: '',
    type: '',
    priority: '',
    showClosed: true,
  });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<KanbanStatus | null>('open');
  const [desktopDetailMinimized, setDesktopDetailMinimized] = useState(false);
  const [pendingIssueIds, setPendingIssueIds] = useState<Set<string>>(new Set());
  const [mutationError, setMutationError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);

  const filteredIssues = useMemo(() => filterKanbanIssues(localIssues, filters), [localIssues, filters]);
  const columns = useMemo(() => buildKanbanColumns(filteredIssues), [filteredIssues]);
  const stats = useMemo(() => buildKanbanStats(filteredIssues), [filteredIssues]);

  const selectedIssue = useMemo(() => filteredIssues.find((issue) => issue.id === selectedIssueId) ?? null, [filteredIssues, selectedIssueId]);
  const showDesktopDetail = Boolean(selectedIssue) && !desktopDetailMinimized;

  const refreshIssues = useCallback(async (options: { silent?: boolean } = {}) => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    try {
      const reconciled = await fetchIssues(projectRoot);
      setLocalIssues(reconciled);
    } catch (error) {
      if (!options.silent) {
        throw error;
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [projectRoot]);

  useEffect(() => {
    const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
    const onIssues = () => {
      void refreshIssues({ silent: true });
    };

    source.addEventListener('issues', onIssues as EventListener);

    return () => {
      source.removeEventListener('issues', onIssues as EventListener);
      source.close();
    };
  }, [projectRoot, refreshIssues]);

  const mutateStatus = async (issue: BeadIssue, targetStatus: KanbanStatus) => {
    const steps = planStatusTransition(issue, targetStatus);
    if (steps.length === 0) {
      return;
    }

    setMutationError(null);
    const previous = localIssues;
    setPendingIssueIds((value) => new Set(value).add(issue.id));
    setLocalIssues((current) => applyOptimisticStatus(current, issue.id, targetStatus));

    try {
      for (const step of steps) {
        await postMutation(step.operation, {
          projectRoot,
          ...step.payload,
        });
      }

      await refreshIssues();
    } catch (error) {
      setLocalIssues(previous);
      setMutationError(error instanceof Error ? error.message : 'Mutation failed');
    } finally {
      setPendingIssueIds((value) => {
        const next = new Set(value);
        next.delete(issue.id);
        return next;
      });
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 rounded-2xl border border-border-soft bg-surface/90 px-4 py-4 shadow-card backdrop-blur md:px-5">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-muted">BeadBoard</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-strong sm:text-3xl">Kanban Dashboard</h1>
        <p className="mt-2 text-sm text-text-muted">Tracer Bullet 1 from live `.beads/issues.jsonl` on Windows-native paths.</p>
      </header>
      <KanbanControls filters={filters} stats={stats} onFiltersChange={setFilters} />
      {mutationError ? (
        <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{mutationError}</div>
      ) : null}
      <section
        className={`mt-3 overflow-hidden rounded-2xl border border-border-soft bg-surface/82 shadow-card ${
          showDesktopDetail ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]' : ''
        }`}
      >
        <motion.div layout className="p-2.5 sm:p-3">
          <KanbanBoard
            columns={columns}
            selectedIssueId={selectedIssue?.id ?? null}
            pendingIssueIds={pendingIssueIds}
            activeStatus={activeStatus}
            onActivateStatus={setActiveStatus}
            onMoveIssue={mutateStatus}
            onSelect={(issue) => {
              setSelectedIssueId(issue.id);
              setDesktopDetailMinimized(false);
              setMobileDetailOpen(true);
            }}
          />
        </motion.div>
        {showDesktopDetail ? (
          <div className="hidden border-t border-border-soft bg-surface/72 p-3 lg:block lg:border-l lg:border-t-0">
            <aside className="rounded-xl border border-border-soft bg-surface/78 p-3">
              <div className="mb-2 flex items-center justify-end gap-2 border-b border-border-soft pb-2">
                <button
                  type="button"
                  onClick={() => setDesktopDetailMinimized(true)}
                  className="rounded-md border border-border-soft bg-surface-muted/70 px-2 py-1 text-xs text-text-body"
                >
                  Minimize
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIssueId(null)}
                  className="rounded-md border border-border-soft bg-surface-muted/70 px-2 py-1 text-xs text-text-muted"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
                <KanbanDetail issue={selectedIssue} framed={false} />
              </div>
            </aside>
          </div>
        ) : null}
      </section>

      {mobileDetailOpen && selectedIssue ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close details"
            onClick={() => setMobileDetailOpen(false)}
          />
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-x-3 bottom-3 top-20 overflow-y-auto rounded-2xl border border-border-soft bg-surface/95 p-3 shadow-panel"
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="rounded-lg border border-border-soft bg-surface-muted/70 px-3 py-1 text-xs font-semibold text-text-body"
              >
                Close
              </button>
            </div>
            <KanbanDetail issue={selectedIssue} framed={false} />
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}
