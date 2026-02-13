'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { KanbanFilterOptions, KanbanStatus } from '../../lib/kanban';
import {
  buildBlockedByTree,
  buildKanbanColumns,
  buildKanbanStats,
  filterKanbanIssues,
  findIssueLane,
  laneToMutationStatus,
  pickNextActionableIssue,
} from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';
import type { ProjectScopeOption } from '../../lib/project-scope';
import { applyOptimisticStatus, planStatusTransition } from '../../lib/writeback';

import { KanbanBoard } from './kanban-board';
import { KanbanControls } from './kanban-controls';
import { KanbanDetail } from './kanban-detail';
import { ProjectScopeControls } from '../shared/project-scope-controls';

interface KanbanPageProps {
  issues: BeadIssue[];
  projectRoot: string;
  projectScopeKey: string;
  projectScopeOptions: ProjectScopeOption[];
  projectScopeMode: 'single' | 'aggregate';
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

export function KanbanPage({
  issues,
  projectRoot,
  projectScopeKey,
  projectScopeOptions,
  projectScopeMode,
}: KanbanPageProps) {
  const [localIssues, setLocalIssues] = useState<BeadIssue[]>(issues);
  const [filters, setFilters] = useState<KanbanFilterOptions>({
    query: '',
    type: '',
    priority: '',
    showClosed: true,
  });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState<KanbanStatus | null>('ready');
  const [desktopDetailMinimized, setDesktopDetailMinimized] = useState(false);
  const [nextActionableFeedback, setNextActionableFeedback] = useState<string | null>(null);
  const [pendingIssueIds, setPendingIssueIds] = useState<Set<string>>(new Set());
  const [mutationError, setMutationError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);

  const filteredIssues = useMemo(() => filterKanbanIssues(localIssues, filters), [localIssues, filters]);
  const columns = useMemo(() => buildKanbanColumns(filteredIssues), [filteredIssues]);
  const stats = useMemo(() => buildKanbanStats(filteredIssues), [filteredIssues]);
  const parentEpicByIssueId = useMemo(() => {
    const epicById = new Map(
      localIssues.filter((issue) => issue.issue_type === 'epic').map((epic) => [epic.id, epic]),
    );
    const map = new Map<string, { id: string; title: string }>();

    for (const issue of localIssues) {
      if (issue.issue_type === 'epic') {
        continue;
      }
      const parentDep = issue.dependencies.find((dependency) => dependency.type === 'parent');
      const inferredParent = issue.id.includes('.') ? issue.id.split('.')[0] : null;
      const parentEpicId = parentDep?.target ?? inferredParent;
      if (!parentEpicId) {
        continue;
      }
      const parentEpic = epicById.get(parentEpicId);
      if (!parentEpic) {
        continue;
      }
      map.set(issue.id, { id: parentEpic.id, title: parentEpic.title });
    }

    return map;
  }, [localIssues]);

  const selectedIssue = useMemo(() => filteredIssues.find((issue) => issue.id === selectedIssueId) ?? null, [filteredIssues, selectedIssueId]);
  const activeScope = useMemo(
    () => projectScopeOptions.find((option) => option.key === projectScopeKey) ?? projectScopeOptions[0] ?? null,
    [projectScopeKey, projectScopeOptions],
  );
  const graphHref = useMemo(() => {
    const params = new URLSearchParams();
    if (projectScopeMode !== 'single') {
      params.set('mode', projectScopeMode);
    }
    if (projectScopeKey !== 'local') {
      params.set('project', projectScopeKey);
    }
    const query = params.toString();
    return query ? `/graph?${query}` : '/graph';
  }, [projectScopeKey, projectScopeMode]);
  const allowMutations = projectScopeMode === 'single';
  const blockedTree = useMemo(
    () => buildBlockedByTree(filteredIssues, selectedIssue?.id ?? null, { maxNodes: 8 }),
    [filteredIssues, selectedIssue?.id],
  );
  const nextActionableIssue = useMemo(
    () => pickNextActionableIssue(columns, filteredIssues),
    [columns, filteredIssues],
  );
  const showDesktopDetail = Boolean(selectedIssue) && !desktopDetailMinimized;
  const focusIssueFromDetailLink = useCallback(
    (issueId: string) => {
      setSelectedIssueId(issueId);
      setDesktopDetailMinimized(false);
      const lane = findIssueLane(columns, issueId);
      setActiveStatus(lane ?? 'ready');
    },
    [columns],
  );

  const selectIssueWithDetailBehavior = useCallback((issueId: string, lane: KanbanStatus = 'ready') => {
    setSelectedIssueId(issueId);
    setActiveStatus(lane);
    setDesktopDetailMinimized(false);
    setMobileDetailOpen(true);
  }, []);

  const handleNextActionable = useCallback(() => {
    if (!nextActionableIssue) {
      setNextActionableFeedback('No ready issue available for current filters.');
      return;
    }
    setNextActionableFeedback(null);
    selectIssueWithDetailBehavior(nextActionableIssue.id, 'ready');
  }, [nextActionableIssue, selectIssueWithDetailBehavior]);

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
    if (!allowMutations) {
      return;
    }
    const source = new EventSource(`/api/events?projectRoot=${encodeURIComponent(projectRoot)}`);
    const onIssues = () => {
      void refreshIssues({ silent: true });
    };

    source.addEventListener('issues', onIssues as EventListener);

    return () => {
      source.removeEventListener('issues', onIssues as EventListener);
      source.close();
    };
  }, [allowMutations, projectRoot, refreshIssues]);

  const mutateStatus = async (issue: BeadIssue, targetStatus: KanbanStatus) => {
    if (!allowMutations) {
      return;
    }
    const mutationStatus = laneToMutationStatus(targetStatus);
    const steps = planStatusTransition(issue, mutationStatus);
    if (steps.length === 0) {
      return;
    }

    setMutationError(null);
    const previous = localIssues;
    setPendingIssueIds((value) => new Set(value).add(issue.id));
    setLocalIssues((current) => applyOptimisticStatus(current, issue.id, mutationStatus));

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
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-text-strong sm:text-3xl">Kanban Dashboard</h1>
          <Link href={graphHref} className="rounded-lg border border-border-soft bg-surface-muted/70 px-2.5 py-1 text-xs text-text-body hover:bg-surface-raised">
            Open Graph
          </Link>
        </div>
        <p className="mt-2 text-sm text-text-muted">Tracer Bullet 1 from live `.beads/issues.jsonl` on Windows-native paths.</p>
        {activeScope ? (
          <p className="mt-2 text-xs text-text-muted">
            Scope:{' '}
            <span className="rounded-md border border-border-soft bg-surface-muted/50 px-2 py-0.5 font-mono text-[11px] text-text-body">
              {activeScope.source === 'local' ? 'local workspace' : activeScope.displayPath}
            </span>
          </p>
        ) : null}
        <div className="mt-3">
          <ProjectScopeControls
            projectScopeKey={projectScopeKey}
            projectScopeMode={projectScopeMode}
            projectScopeOptions={projectScopeOptions}
          />
        </div>
        {!allowMutations ? (
          <p className="mt-2 text-xs text-amber-200/90">Aggregate mode is read-only. Switch to single project mode to edit status/details.</p>
        ) : null}
      </header>
      <KanbanControls
        filters={filters}
        stats={stats}
        onFiltersChange={setFilters}
        onNextActionable={handleNextActionable}
        nextActionableFeedback={nextActionableFeedback}
      />
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
            parentEpicByIssueId={parentEpicByIssueId}
            graphBaseHref={graphHref}
            showClosed={Boolean(filters.showClosed)}
            selectedIssueId={selectedIssue?.id ?? null}
            pendingIssueIds={pendingIssueIds}
            activeStatus={activeStatus}
            onActivateStatus={setActiveStatus}
            onMoveIssue={mutateStatus}
            onSelect={(issue) => {
              const lane = findIssueLane(columns, issue.id) ?? 'ready';
              selectIssueWithDetailBehavior(issue.id, lane);
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
                <KanbanDetail
                  issue={selectedIssue}
                  issues={filteredIssues}
                  framed={false}
                  blockedTree={blockedTree}
                  onSelectBlockedIssue={focusIssueFromDetailLink}
                  projectRoot={allowMutations ? projectRoot : undefined}
                  onIssueUpdated={() => refreshIssues()}
                />
              </div>
            </aside>
          </div>
        ) : null}
      </section>

      {mobileDetailOpen && selectedIssue ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close details"
            onClick={() => setMobileDetailOpen(false)}
          />
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-x-3 bottom-3 top-20 overflow-y-auto rounded-2xl border border-border-soft bg-surface/98 p-3 shadow-panel backdrop-blur-2xl"
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
            <KanbanDetail
              issue={selectedIssue}
              issues={filteredIssues}
              framed={false}
              blockedTree={blockedTree}
              onSelectBlockedIssue={focusIssueFromDetailLink}
              projectRoot={allowMutations ? projectRoot : undefined}
              onIssueUpdated={() => refreshIssues()}
            />
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}
