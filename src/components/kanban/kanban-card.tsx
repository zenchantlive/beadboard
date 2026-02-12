'use client';

import { motion } from 'framer-motion';
import type { DragEvent } from 'react';

import type { BeadIssue } from '../../lib/types';

import { Chip } from '../shared/chip';

interface KanbanCardProps {
  issue: BeadIssue;
  selected: boolean;
  pending?: boolean;
  draggable?: boolean;
  onNativeDragStart?: (issue: BeadIssue, event: DragEvent<HTMLButtonElement>) => void;
  onSelect: (issue: BeadIssue) => void;
}

function priorityClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'border-rose-300/45 bg-rose-500/20 text-rose-50';
    case 1:
      return 'border-amber-300/40 bg-amber-500/20 text-amber-50';
    case 2:
      return 'border-teal-300/40 bg-teal-500/20 text-teal-50';
    case 3:
      return 'border-slate-300/35 bg-slate-500/22 text-slate-50';
    default:
      return 'border-slate-400/35 bg-slate-600/20 text-slate-50';
  }
}

export function KanbanCard({ issue, selected, pending = false, draggable = false, onNativeDragStart, onSelect }: KanbanCardProps) {
  const selectedClass = selected
    ? 'border-amber-200/60 bg-surface-raised shadow-card ring-1 ring-amber-200/20'
    : 'border-border-soft bg-surface/95 shadow-[0_6px_18px_rgba(4,8,17,0.5)] hover:border-border-strong hover:bg-surface-raised/95';

  return (
    <motion.button
      layout
      transition={{ duration: 0.18, ease: 'easeOut' }}
      type="button"
      draggable={draggable}
      onDragStartCapture={(event) => onNativeDragStart?.(issue, event)}
      onClick={() => onSelect(issue)}
      className={`w-full cursor-pointer rounded-2xl border px-3 py-2.5 text-left transition ${selectedClass} ${
        pending ? 'opacity-70' : ''
      }`}
    >
      <div className="font-mono text-[11px] text-text-muted break-all">{issue.id}</div>
      <div className="mt-1 text-sm font-semibold leading-5 text-text-strong break-words">{issue.title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-1 font-mono text-[11px] font-semibold ${priorityClass(issue.priority)}`}
        >
          P{issue.priority}
        </span>
        <Chip>{issue.issue_type}</Chip>
        <Chip tone="status">deps {issue.dependencies.length}</Chip>
      </div>
      <div className="mt-2 break-words font-mono text-xs text-amber-100/90">
        {issue.assignee ? `@${issue.assignee}` : 'unassigned'}
      </div>
      {issue.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {issue.labels.slice(0, 3).map((label) => (
            <Chip key={`${issue.id}-${label}`}>#{label}</Chip>
          ))}
        </div>
      ) : null}
      {pending ? <div className="mt-2 text-[11px] font-medium text-amber-200">Saving…</div> : null}
    </motion.button>
  );
}
