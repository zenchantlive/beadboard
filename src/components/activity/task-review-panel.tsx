'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AgentState } from '../../lib/agent';
import type { BeadIssue } from '../../lib/types';
import { buildThreadItemsFromBead } from '../../lib/thread-builder';
import { buildUrlParams } from '../../hooks/use-url-state';
import { TaskAssignedAgentContext } from './task-assigned-agent-context';
import { StatusBadge } from '../shared/status-badge';
import { ThreadView } from '../shared/thread-view';

type ReviewAction = 'accept' | 'reopen' | null;

interface TaskReviewPanelProps {
  taskId: string;
  issue: BeadIssue;
  agentStates: readonly AgentState[];
  projectRoot: string;
  actor?: string;
  onClose: () => void;
}

async function postReviewMutation(
  endpoint: '/api/beads/comment' | '/api/beads/reopen',
  payload: {
    projectRoot: string;
    id: string;
    actor?: string;
    reason?: string;
    text?: string;
  },
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: { message?: string } } | null;
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error?.message ?? 'Review action failed');
  }
}

export function TaskReviewPanel({ taskId, issue, agentStates, projectRoot, actor, onClose }: TaskReviewPanelProps) {
  const [pendingAction, setPendingAction] = useState<ReviewAction>(null);
  const threadItems = useMemo(() => buildThreadItemsFromBead(issue), [issue]);
  const closeReason = issue.close_reason?.trim();
  const evidenceSummary = closeReason ?? issue.description?.trim() ?? 'No close reason recorded.';

  const handleAction = async (action: Exclude<ReviewAction, null>) => {
    if (!projectRoot || !issue?.id || pendingAction) {
      return;
    }

    setPendingAction(action);

    try {
      const endpoint = action === 'accept' ? '/api/beads/comment' : '/api/beads/reopen';
      await postReviewMutation(endpoint, {
        projectRoot,
        id: issue.id,
        ...(action === 'accept'
          ? { text: 'Accepted in review' }
          : { reason: 'Reopened from review' }),
        ...(actor?.trim() ? { actor: actor.trim() } : {}),
      });
      if (action === 'accept') {
        const nextUrl = buildUrlParams(new URLSearchParams(window.location.search), {
          task: null,
          right: null,
          panel: null,
          drawer: null,
        });
        window.history.pushState(null, '', nextUrl);
        return;
      }

      onClose();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section className="flex h-full flex-col overflow-hidden bg-[var(--surface-primary)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            Review Task
          </span>
          <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] text-[10px] text-[var(--text-secondary)]">
            {issue.status}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--alpha-white-low)] hover:text-[var(--text-primary)]"
          aria-label="Close review"
          title="Close review"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-3 py-3">
          <TaskAssignedAgentContext
            taskId={taskId}
            agentStates={agentStates}
            issue={issue}
          />

          <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{issue.title}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Completed task evidence from bead notes and close metadata.
                </p>
              </div>
              <StatusBadge status={issue.status} size="sm" />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]">
                #{issue.id}
              </Badge>
              <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]">
                {issue.issue_type}
              </Badge>
              {issue.assignee ? (
                <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]">
                  @{issue.assignee}
                </Badge>
              ) : null}
            </div>

            <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                Completion Evidence
              </div>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {evidenceSummary}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-quaternary)] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Bead Notes</p>
              <Badge className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[10px] text-[var(--text-secondary)]">
                {threadItems.length} items
              </Badge>
            </div>
            <ThreadView items={threadItems} variant="stack" currentUser="you" />
          </section>
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => void handleAction('accept')}
            disabled={pendingAction !== null}
            className="h-9 flex-1 rounded-full bg-[var(--accent-success)] px-4 text-[var(--text-inverse)] hover:brightness-110"
          >
            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
            {pendingAction === 'accept' ? 'Accepting…' : 'Accept'}
          </Button>
          <Button
            type="button"
            onClick={() => void handleAction('reopen')}
            disabled={pendingAction !== null}
            className="h-9 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-tertiary)] px-4 text-[var(--text-primary)] hover:bg-[var(--surface-quaternary)]"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            {pendingAction === 'reopen' ? 'Reopening…' : 'Reopen'}
          </Button>
        </div>
      </footer>
    </section>
  );
}
