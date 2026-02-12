import type { BeadIssue, BeadStatus } from './types';

export type MutationStep =
  | { operation: 'close'; payload: { id: string; reason?: string } }
  | { operation: 'reopen'; payload: { id: string; reason?: string } }
  | { operation: 'update'; payload: { id: string; status: 'open' | 'in_progress' | 'blocked' | 'deferred' } };

function isBoardStatus(status: BeadStatus): status is 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed' {
  return ['open', 'in_progress', 'blocked', 'deferred', 'closed'].includes(status);
}

export function planStatusTransition(
  issue: Pick<BeadIssue, 'id' | 'status'>,
  targetStatus: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed',
): MutationStep[] {
  if (!isBoardStatus(issue.status) || issue.status === targetStatus) {
    return [];
  }

  if (targetStatus === 'closed') {
    return [{ operation: 'close', payload: { id: issue.id, reason: 'Moved to closed via board drag-and-drop' } }];
  }

  if (issue.status === 'closed') {
    if (targetStatus === 'open') {
      return [{ operation: 'reopen', payload: { id: issue.id, reason: 'Moved from closed via board drag-and-drop' } }];
    }

    return [
      { operation: 'reopen', payload: { id: issue.id, reason: 'Moved from closed via board drag-and-drop' } },
      { operation: 'update', payload: { id: issue.id, status: targetStatus } },
    ];
  }

  return [{ operation: 'update', payload: { id: issue.id, status: targetStatus } }];
}

export function applyOptimisticStatus(
  issues: BeadIssue[],
  issueId: string,
  targetStatus: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed',
  atIso: string = new Date().toISOString(),
): BeadIssue[] {
  return issues.map((issue) => {
    if (issue.id !== issueId) {
      return issue;
    }

    return {
      ...issue,
      status: targetStatus,
      updated_at: atIso,
      closed_at: targetStatus === 'closed' ? atIso : null,
    };
  });
}
