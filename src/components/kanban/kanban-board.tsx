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

const STATUS_COLUMN_CLASS: Record<(typeof KANBAN_STATUSES)[number], string> = {
  open: 'bg-sky-500/10',
  in_progress: 'bg-amber-500/10',
  blocked: 'bg-rose-500/10',
  deferred: 'bg-slate-500/10',
  closed: 'bg-emerald-500/10',
};

export function KanbanBoard({ columns, selectedIssueId, onSelect }: KanbanBoardProps) {
  return (
    <section className="flex min-w-fit snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
      {KANBAN_STATUSES.map((status) => (
        <div
          key={status}
          className={`w-[clamp(17rem,24vw,22rem)] shrink-0 snap-start rounded-2xl border border-border-soft ${STATUS_COLUMN_CLASS[status]} p-2.5`}
        >
          <div className="mb-2 flex items-center justify-between">
            <strong className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-body">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />
              {STATUS_META[status].label}
            </strong>
            <span className="font-mono text-xs text-text-muted">{columns[status].length}</span>
          </div>
          <div className="grid h-[clamp(24rem,60vh,48rem)] content-start gap-2 overflow-y-auto pr-1">
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
