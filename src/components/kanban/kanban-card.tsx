'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { DragEvent } from 'react';

import { hasOpenBlockers } from '../../lib/kanban';
import type { BeadIssue } from '../../lib/types';

import { Chip } from '../shared/chip';
import { statusBorder, statusDotColor, statusGradient } from '../shared/status-utils';

interface KanbanCardProps {
  issue: BeadIssue;
  issues?: BeadIssue[];
  parentEpic?: { id: string; title: string } | null;
  graphBaseHref: string;
  selected: boolean;
  pending?: boolean;
  draggable?: boolean;
  onNativeDragStart?: (issue: BeadIssue, event: DragEvent<HTMLElement>) => void;
  onSelect: (issue: BeadIssue) => void;
}

function titleColor(status: string): string {
  return status === 'closed' ? 'text-text-muted/70' : 'text-text-strong/95';
}

export function KanbanCard({
  issue,
  issues = [],
  parentEpic = null,
  graphBaseHref,
  selected,
  pending = false,
  draggable = false,
  onNativeDragStart,
  onSelect,
}: KanbanCardProps) {
  const blockerCount = issues.length > 0 ? (hasOpenBlockers(issues, issue.id) ? 
    issue.dependencies.filter(d => d.type === 'blocks').filter(d => {
      const blocker = issues.find(i => i.id === d.target);
      return blocker && blocker.status !== 'closed';
    }).length : 0) : 0;

  const selectedClass = selected
    ? 'ring-1 ring-amber-200/20 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.88),0_0_26px_rgba(251,191,36,0.14)]'
    : 'shadow-[0_18px_38px_-18px_rgba(0,0,0,0.82),0_6px_18px_-10px_rgba(0,0,0,0.72)] hover:shadow-[0_24px_52px_-16px_rgba(0,0,0,0.9),0_10px_26px_-10px_rgba(0,0,0,0.78)]';

  const graphDetailHref = parentEpic
    ? (() => {
        const url = new URL(graphBaseHref, 'http://localhost');
        url.searchParams.set('epic', parentEpic.id);
        url.searchParams.set('task', issue.id);
        url.searchParams.set('tab', 'tasks');
        return `${url.pathname}${url.search}`;
      })()
    : null;

  return (
    <motion.article
      layout
      transition={{ duration: 0.18, ease: 'easeOut' }}
      draggable={draggable}
      onDragStartCapture={(event) => onNativeDragStart?.(issue, event)}
      onClick={() => onSelect(issue)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(issue);
        }
      }}
      className={`w-full cursor-pointer rounded-xl border ${statusBorder(issue.status)} ${statusGradient(issue.status)} px-3.5 py-3 text-left transition duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${selectedClass} ${
        pending ? 'opacity-70' : ''
      }`}
    >
      {/* ID row with status dot */}
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(issue.status)} shadow-[0_0_6px_currentColor]`} />
        <span className="system-data text-[11px] text-text-muted/60">{issue.id}</span>
      </div>

      {/* Title */}
      <div className={`ui-text mt-2 text-sm font-semibold leading-5 break-words ${titleColor(issue.status)}`}>
        {issue.title}
      </div>

      {/* Labels/Tags row */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {issue.labels.slice(0, 3).map((label) => (
          <Chip key={`${issue.id}-${label}`}>{label}</Chip>
        ))}
        {blockerCount > 0 && (
          <Chip tone="status">{blockerCount} Blocker{blockerCount > 1 ? 's' : ''}</Chip>
        )}
      </div>

      {parentEpic ? (
        <div className="mt-2.5">
          <Link
            href={graphDetailHref ?? graphBaseHref}
            className="system-data inline-flex items-center gap-1 rounded border border-white/8 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-text-muted/80 hover:text-text-body hover:bg-white/[0.08]"
            onClick={(event) => event.stopPropagation()}
          >
            {parentEpic.title}
          </Link>
        </div>
      ) : null}

      {pending ? <div className="ui-text mt-2 text-[11px] font-medium text-amber-200">Saving…</div> : null}
    </motion.article>
  );
}
