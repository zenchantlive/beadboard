'use client';

import { AnimatePresence } from 'framer-motion';

import { KANBAN_STATUSES } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

import { KanbanCard } from './kanban-card';

interface KanbanBoardProps {
  columns: Record<(typeof KANBAN_STATUSES)[number], BeadIssue[]>;
  selectedIssueId: string | null;
  onSelect: (issue: BeadIssue) => void;
}

const STATUS_META: Record<(typeof KANBAN_STATUSES)[number], { label: string; dot: string }> = {
  open: { label: 'Open', dot: 'bg-sky-300' },
  in_progress: { label: 'In Progress', dot: 'bg-amber-300' },
  blocked: { label: 'Blocked', dot: 'bg-rose-300' },
  deferred: { label: 'Deferred', dot: 'bg-slate-300' },
  closed: { label: 'Done', dot: 'bg-emerald-300' },
};

export function KanbanBoard({ columns, selectedIssueId, onSelect }: KanbanBoardProps) {
  return (
    <section className="grid min-w-[980px] grid-cols-5 gap-3 xl:min-w-0 xl:grid-cols-5">
      {KANBAN_STATUSES.map((status) => (
        <div key={status} className="rounded-2xl border border-border-soft bg-surface-muted/55 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <strong className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-body">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
              {STATUS_META[status].label}
            </strong>
            <span className="font-mono text-xs text-text-muted">{columns[status].length}</span>
          </div>
          <div className="grid gap-2">
            <AnimatePresence initial={false}>
              {columns[status].map((issue) => (
                <KanbanCard key={issue.id} issue={issue} selected={selectedIssueId === issue.id} onSelect={onSelect} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </section>
  );
}
