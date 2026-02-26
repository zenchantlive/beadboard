'use client';

import { AnimatePresence } from 'framer-motion';
import type { DragEvent } from 'react';

import { KANBAN_STATUSES, type KanbanStatus } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

import { KanbanCard } from './kanban-card';

interface KanbanBoardProps {
  columns: Record<(typeof KANBAN_STATUSES)[number], BeadIssue[]>;
  parentEpicByIssueId: Map<string, { id: string; title: string }>;
  graphBaseHref: string;
  showClosed: boolean;
  selectedIssueId: string | null;
  pendingIssueIds: Set<string>;
  activeStatus: KanbanStatus | null;
  onActivateStatus: (status: KanbanStatus | null) => void;
  onMoveIssue: (issue: BeadIssue, targetStatus: KanbanStatus) => void;
  onSelect: (issue: BeadIssue) => void;
}

const STATUS_META: Record<(typeof KANBAN_STATUSES)[number], { label: string; dot: string }> = {
  ready: { label: 'Ready', dot: 'bg-sky-300' },
  in_progress: { label: 'In Progress', dot: 'bg-amber-300' },
  blocked: { label: 'Blocked', dot: 'bg-rose-300' },
  closed: { label: 'Done', dot: 'bg-emerald-300' },
};

const STATUS_COLUMN_CLASS: Record<(typeof KANBAN_STATUSES)[number], string> = {
  ready:
    'border-t-2 border-sky-400/40 bg-slate-900/50',
  in_progress:
    'border-t-2 border-amber-400/40 bg-slate-900/50',
  blocked:
    'border-t-2 border-rose-400/40 bg-slate-900/50',
  closed:
    'border-t-2 border-emerald-400/40 bg-slate-900/50',
};

export function KanbanBoard({
  columns,
  parentEpicByIssueId,
  graphBaseHref,
  showClosed,
  selectedIssueId,
  pendingIssueIds,
  activeStatus,
  onActivateStatus,
  onMoveIssue,
  onSelect,
}: KanbanBoardProps) {
  const allIssues = KANBAN_STATUSES.flatMap((status) => columns[status]);
  const visibleStatuses = KANBAN_STATUSES.filter((status) => status !== 'closed' || showClosed);

  const issueLookup = new Map(allIssues.map((issue) => [issue.id, issue]));

  const handleExpandAndSelect = (status: KanbanStatus, issue: BeadIssue) => {
    onActivateStatus(status);
    onSelect(issue);
  };

  const onDragStart = (issue: BeadIssue, sourceLane: KanbanStatus, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData('application/x-bead-id', issue.id);
    event.dataTransfer.setData('application/x-bead-lane', sourceLane);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDropLane = (targetStatus: KanbanStatus, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const issueId = event.dataTransfer.getData('application/x-bead-id');
    const sourceStatus = event.dataTransfer.getData('application/x-bead-lane') as KanbanStatus;
    if (!issueId || !sourceStatus || sourceStatus === targetStatus) {
      return;
    }

    const issue = issueLookup.get(issueId);
    if (!issue) {
      return;
    }

    onMoveIssue(issue, targetStatus);
  };

  return (
    <section className="grid min-h-[58vh] gap-2.5">
      {visibleStatuses.map((status) => (
        <div
          key={status}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onDropLane(status, event)}
          className={`rounded-2xl border border-white/[0.04] ${STATUS_COLUMN_CLASS[status]} p-2.5 transition shadow-[0_24px_52px_-20px_rgba(0,0,0,0.82),0_10px_26px_-14px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)] ${
            activeStatus === status
              ? 'shadow-[0_30px_62px_-18px_rgba(0,0,0,0.86),0_0_0_1px_rgba(125,211,252,0.14)]'
              : 'opacity-95'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={activeStatus === status}
              onClick={() => {
                onActivateStatus(status);
                const firstIssue = columns[status][0];
                if (firstIssue) {
                  onSelect(firstIssue);
                }
              }}
              className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-left"
            >
              <strong className="ui-text inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-body">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
                {STATUS_META[status].label}
              </strong>
              <span className="system-data text-xs text-text-muted">{columns[status].length}</span>
            </button>
            {activeStatus === status ? (
              <button
                type="button"
                aria-label={`Minimize ${STATUS_META[status].label} lane`}
                onClick={() => onActivateStatus(null)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border-soft bg-surface-muted/60 text-sm text-text-muted hover:border-border-strong hover:text-text-body"
              >
                -
              </button>
            ) : null}
          </div>
          {activeStatus === status ? (
            <div className="mt-2 grid max-h-[50vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {columns[status].map((issue) => (
                  <KanbanCard
                    key={issue.id}
                    issue={issue}
                    issues={allIssues}
                    parentEpic={parentEpicByIssueId.get(issue.id) ?? null}
                    graphBaseHref={graphBaseHref}
                    pending={pendingIssueIds.has(issue.id)}
                    selected={selectedIssueId === issue.id}
                    draggable={!pendingIssueIds.has(issue.id)}
                    onNativeDragStart={(dragIssue, event) => onDragStart(dragIssue, status, event)}
                    onSelect={onSelect}
                  />
                ))}
              </AnimatePresence>
              {columns[status].length === 0 ? (
                <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-border-soft/80 bg-surface/35 text-xs text-text-muted">
                  No beads
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {columns[status].slice(0, 6).map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => handleExpandAndSelect(status, issue)}
                  className="max-w-full rounded-lg border border-border-soft bg-gradient-to-b from-surface-muted/50 to-surface-muted/70 px-2 py-1 text-left hover:border-border-strong hover:from-surface-raised/70 hover:to-surface-raised/90 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                  title={issue.title}
                >
                  <div className="system-data text-[10px] text-text-muted">{issue.id}</div>
                  <div className="ui-text line-clamp-1 text-sm font-medium text-text-body">{issue.title}</div>
                </button>
              ))}
              {columns[status].length > 6 ? (
                <button
                  type="button"
                  onClick={() => onActivateStatus(status)}
                  className="rounded-lg border border-border-soft bg-surface/50 px-2 py-1 text-xs text-text-muted hover:bg-surface-muted/70"
                >
                  +{columns[status].length - 6} more
                </button>
              ) : null}
              {columns[status].length === 0 ? (
                <span className="rounded-lg border border-dashed border-border-soft/80 bg-surface/30 px-2 py-1 text-xs text-text-muted">
                  No beads
                </span>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
