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
  ready: 'bg-sky-500/10',
  in_progress: 'bg-amber-500/10',
  blocked: 'bg-rose-500/10',
  closed: 'bg-emerald-500/10',
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
          className={`rounded-2xl border border-border-soft ${STATUS_COLUMN_CLASS[status]} p-2.5 transition ${
            activeStatus === status ? 'shadow-card' : 'opacity-90'
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
              <strong className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-body">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
                {STATUS_META[status].label}
              </strong>
              <span className="font-mono text-xs text-text-muted">{columns[status].length}</span>
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
                  className="max-w-full rounded-lg border border-border-soft bg-surface-muted/60 px-2 py-1 text-left hover:border-border-strong hover:bg-surface-raised/70"
                  title={issue.title}
                >
                  <div className="font-mono text-[10px] text-text-muted">{issue.id}</div>
                  <div className="line-clamp-1 text-xs font-medium text-text-body">{issue.title}</div>
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
