'use client';

import { motion } from 'framer-motion';

import type { BeadIssue } from '../../lib/types';

import { Chip } from '../shared/chip';

interface KanbanCardProps {
  issue: BeadIssue;
  selected: boolean;
  onSelect: (issue: BeadIssue) => void;
}

function priorityClass(priority: number): string {
  switch (priority) {
    case 0:
      return 'border-rose-300/50 bg-rose-400/20 text-rose-100';
    case 1:
      return 'border-amber-300/40 bg-amber-400/20 text-amber-100';
    case 2:
      return 'border-sky-300/40 bg-sky-400/20 text-sky-100';
    case 3:
      return 'border-slate-300/35 bg-slate-400/20 text-slate-100';
    default:
      return 'border-slate-400/35 bg-slate-500/20 text-slate-100';
  }
}

export function KanbanCard({ issue, selected, onSelect }: KanbanCardProps) {
  const selectedClass = selected
    ? 'border-cyan-300/70 bg-surface-raised/95 shadow-card'
    : 'border-border-soft bg-surface/90 hover:border-border-strong hover:bg-surface-raised/90';

  return (
    <motion.button
      layout
      transition={{ duration: 0.18, ease: 'easeOut' }}
      type="button"
      onClick={() => onSelect(issue)}
      className={`w-full cursor-pointer rounded-2xl border px-3 py-2.5 text-left transition ${selectedClass}`}
    >
      <div className="font-mono text-[11px] text-text-muted">{issue.id}</div>
      <div className="mt-1 text-sm font-semibold leading-5 text-text-strong">{issue.title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center rounded-full border px-2 py-1 font-mono text-[11px] font-semibold ${priorityClass(issue.priority)}`}>
          P{issue.priority}
        </span>
        <Chip>{issue.issue_type}</Chip>
        <Chip tone="status">deps {issue.dependencies.length}</Chip>
      </div>
      <div className="mt-2 truncate font-mono text-xs text-cyan-100/80">
        {issue.assignee ? `@${issue.assignee}` : 'unassigned'}
      </div>
      {issue.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {issue.labels.slice(0, 3).map((label) => (
            <Chip key={`${issue.id}-${label}`}>#{label}</Chip>
          ))}
        </div>
      ) : null}
    </motion.button>
  );
}
