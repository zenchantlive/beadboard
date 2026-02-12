'use client';

import { AnimatePresence, motion } from 'framer-motion';

import type { BeadIssue } from '../../lib/types';

import { Chip } from '../shared/chip';

interface KanbanDetailProps {
  issue: BeadIssue | null;
  framed?: boolean;
}

export function KanbanDetail({ issue, framed = true }: KanbanDetailProps) {
  const frameClass = framed ? 'rounded-2xl border border-border-soft bg-surface/90 p-4 shadow-panel' : 'p-1';

  return (
    <AnimatePresence mode="wait" initial={false}>
      {issue ? (
        <motion.aside
          key={issue.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={frameClass}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-xs text-text-muted break-all">{issue.id}</div>
              <h2 className="mt-1 text-lg font-semibold leading-7 text-text-strong sm:text-xl">{issue.title}</h2>
            </div>
            <Chip tone="status">{issue.status}</Chip>
          </div>
          {issue.description ? <p className="mt-3 text-sm leading-6 text-text-body break-words">{issue.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone="priority">priority {issue.priority}</Chip>
            <Chip>{issue.issue_type}</Chip>
            <Chip>{issue.assignee ? `@${issue.assignee}` : 'unassigned'}</Chip>
            <Chip>{issue.dependencies.length} dependencies</Chip>
          </div>
          <dl className="mt-4 grid gap-1.5 text-sm text-text-body">
            <div>
              <dt className="inline font-semibold text-text-strong">Created:</dt>{' '}
              <dd className="inline break-all">{issue.created_at || '-'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-text-strong">Updated:</dt>{' '}
              <dd className="inline break-all">{issue.updated_at || '-'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-text-strong">Closed:</dt>{' '}
              <dd className="inline">{issue.closed_at || '-'}</dd>
            </div>
          </dl>
          {issue.labels.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {issue.labels.map((label) => (
                <Chip key={`${issue.id}-${label}`}>#{label}</Chip>
              ))}
            </div>
          ) : null}
        </motion.aside>
      ) : (
        <motion.aside
          key="empty-detail"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={framed ? 'rounded-2xl border border-border-soft bg-surface/80 p-4' : 'p-1'}
        >
          <strong className="text-text-strong">Details</strong>
          <p className="mt-1 text-sm text-text-muted">Select a card to inspect full issue details.</p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
