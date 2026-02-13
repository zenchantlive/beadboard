import type { BeadIssue } from './types';

export const KANBAN_STATUSES = ['ready', 'in_progress', 'blocked', 'closed'] as const;

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export type KanbanColumns = Record<KanbanStatus, BeadIssue[]>;

export interface KanbanFilterOptions {
  query?: string;
  type?: string;
  priority?: string;
  showClosed?: boolean;
  epicId?: string;
}

export interface KanbanStats {
  total: number;
  ready: number;
  active: number;
  blocked: number;
  done: number;
  p0: number;
}

export type BoardMutationStatus = 'open' | 'in_progress' | 'blocked' | 'closed';

export interface BlockedTreeNode {
  id: string;
  title: string;
  level: number;
}

export interface ExecutionChecklistItem {
  key: 'owner_assigned' | 'no_open_blockers' | 'quality_signal' | 'execution_compatible';
  label: string;
  passed: boolean;
}

function isReviewStatus(status: string): boolean {
  return status.toLowerCase().includes('review');
}

function issueSort(a: BeadIssue, b: BeadIssue): number {
  const priorityDiff = a.priority - b.priority;
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return b.updated_at.localeCompare(a.updated_at);
}

export function hasOpenBlockers(issues: BeadIssue[], targetId: string): boolean {
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const target = issueById.get(targetId);
  if (!target) {
    return false;
  }

  return target.dependencies.some((dep) => {
    if (dep.type !== 'blocks') {
      return false;
    }
    const blocker = issueById.get(dep.target);
    return blocker ? blocker.status !== 'closed' : false;
  });
}

function hasQualitySignal(issue: BeadIssue): boolean {
  const description = issue.description?.trim() ?? '';
  if (description.length > 0) {
    return true;
  }

  if (issue.labels.some((label) => label.toLowerCase().includes('accept'))) {
    return true;
  }

  const acceptance = issue.metadata.acceptance;
  if (typeof acceptance === 'string') {
    return acceptance.trim().length > 0;
  }
  if (Array.isArray(acceptance)) {
    return acceptance.length > 0;
  }

  return false;
}

function deriveBlockedIds(issues: BeadIssue[]): Set<string> {
  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const blockedIds = new Set<string>();

  for (const issue of issues) {
    if (issue.status === 'closed') continue;
    const hasOpenBlocker = issue.dependencies.some((dep) => {
      if (dep.type !== 'blocks') return false;
      const blocker = issueById.get(dep.target);
      return blocker ? blocker.status !== 'closed' : false;
    });
    if (hasOpenBlocker) {
      blockedIds.add(issue.id);
    }
  }

  return blockedIds;
}

function laneForIssue(issue: BeadIssue, blockedIds: Set<string>): KanbanStatus {
  if (issue.status === 'closed') {
    return 'closed';
  }
  if (issue.status === 'blocked' || blockedIds.has(issue.id)) {
    return 'blocked';
  }
  if (issue.status === 'in_progress' || isReviewStatus(issue.status)) {
    return 'in_progress';
  }
  return 'ready';
}

export function filterKanbanIssues(issues: BeadIssue[], filters: KanbanFilterOptions): BeadIssue[] {
  const query = (filters.query ?? '').trim().toLowerCase();
  const type = (filters.type ?? '').trim().toLowerCase();
  const priority = (filters.priority ?? '').trim();
  const showClosed = filters.showClosed ?? false;
  const epicId = filters.epicId?.trim();

  return issues.filter((issue) => {
    if (!showClosed && issue.status === 'closed') {
      return false;
    }

    if (query) {
      const haystack = [issue.id, issue.title, issue.description ?? '', issue.assignee ?? '', issue.labels.join(' ')].join(' ').toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (type && issue.issue_type.toLowerCase() !== type) {
      return false;
    }

    if (priority && String(issue.priority) !== priority) {
      return false;
    }

    if (epicId) {
      // Filter to show only tasks belonging to this epic
      const parentDep = issue.dependencies.find((dep) => dep.type === 'parent');
      const issueEpicId = parentDep?.target ?? (issue.id.includes('.') ? issue.id.split('.')[0] : null);
      if (issueEpicId !== epicId) {
        return false;
      }
    }

    return true;
  });
}

export function buildKanbanColumns(issues: BeadIssue[]): KanbanColumns {
  const columns = {
    ready: [],
    in_progress: [],
    blocked: [],
    closed: [],
  } as KanbanColumns;

  const blockedIds = deriveBlockedIds(issues);
  for (const issue of issues) {
    const lane = laneForIssue(issue, blockedIds);
    if (lane === 'ready' && issue.issue_type === 'epic') {
      continue;
    }
    columns[lane].push(issue);
  }

  for (const status of KANBAN_STATUSES) {
    columns[status].sort(issueSort);
  }

  return columns;
}

export function buildKanbanStats(issues: BeadIssue[]): KanbanStats {
  const columns = buildKanbanColumns(issues);
  return {
    total: issues.length,
    ready: columns.ready.length,
    active: columns.in_progress.length,
    blocked: columns.blocked.length,
    done: columns.closed.length,
    p0: issues.filter((x) => x.priority === 0).length,
  };
}

export function laneToMutationStatus(status: KanbanStatus): BoardMutationStatus {
  switch (status) {
    case 'ready':
      return 'open';
    case 'in_progress':
      return 'in_progress';
    case 'blocked':
      return 'blocked';
    case 'closed':
      return 'closed';
    default:
      return 'open';
  }
}

export function buildBlockedByTree(
  issues: BeadIssue[],
  focusId: string | null,
  options: { maxNodes?: number } = {},
): { total: number; nodes: BlockedTreeNode[] } {
  if (!focusId) {
    return { total: 0, nodes: [] };
  }

  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const blockersByIssue = new Map<string, string[]>();
  for (const issue of issues) {
    const blockers = [
      ...new Set(
        issue.dependencies
          .filter((dep) => dep.type === 'blocks')
          .map((dep) => dep.target),
      ),
    ].sort((a, b) => a.localeCompare(b));
    blockersByIssue.set(issue.id, blockers);
  }

  const maxNodes = Math.max(1, options.maxNodes ?? 12);
  const visited = new Set<string>([focusId]);
  const queued = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [{ id: focusId, level: 0 }];
  const nodes: BlockedTreeNode[] = [];
  let total = 0;

  while (queue.length > 0) {
    const current = queue.shift() as { id: string; level: number };
    const blockers = blockersByIssue.get(current.id) ?? [];
    for (const blockerId of blockers) {
      if (visited.has(blockerId) || queued.has(blockerId)) continue;
      queued.add(blockerId);
      total += 1;
      const blocker = issueById.get(blockerId);
      if (nodes.length < maxNodes) {
        nodes.push({
          id: blockerId,
          title: blocker?.title ?? blockerId,
          level: current.level + 1,
        });
      }
      queue.push({ id: blockerId, level: current.level + 1 });
    }
    visited.add(current.id);
  }

  return { total, nodes };
}

export function findIssueLane(columns: KanbanColumns, issueId: string): KanbanStatus | null {
  for (const status of KANBAN_STATUSES) {
    if (columns[status].some((issue) => issue.id === issueId)) {
      return status;
    }
  }
  return null;
}

export function buildUnblocksCountByIssue(issues: BeadIssue[]): Map<string, number> {
  const unblocksByIssue = new Map<string, number>();
  for (const issue of issues) {
    unblocksByIssue.set(issue.id, 0);
  }

  for (const issue of issues) {
    const uniqueBlockers = new Set(
      issue.dependencies.filter((dep) => dep.type === 'blocks').map((dep) => dep.target),
    );
    for (const blockerId of uniqueBlockers) {
      unblocksByIssue.set(blockerId, (unblocksByIssue.get(blockerId) ?? 0) + 1);
    }
  }
  return unblocksByIssue;
}

export function pickNextActionableIssue(columns: KanbanColumns, issues: BeadIssue[]): BeadIssue | null {
  if (columns.ready.length === 0) {
    return null;
  }

  const unblocksByIssue = buildUnblocksCountByIssue(issues);
  const ranked = [...columns.ready].sort((a, b) => {
    const priorityDiff = a.priority - b.priority;
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const unblocksDiff = (unblocksByIssue.get(b.id) ?? 0) - (unblocksByIssue.get(a.id) ?? 0);
    if (unblocksDiff !== 0) {
      return unblocksDiff;
    }

    const updatedDiff = b.updated_at.localeCompare(a.updated_at);
    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return a.id.localeCompare(b.id);
  });

  return ranked[0] ?? null;
}

export function formatUpdatedRecency(updatedAt: string | null | undefined, nowMs = Date.now()): string {
  if (!updatedAt) {
    return 'updated unknown';
  }

  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) {
    return 'updated unknown';
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - parsed) / 1000));
  if (elapsedSeconds < 60) {
    return 'updated now';
  }
  if (elapsedSeconds < 3600) {
    return `updated ${Math.floor(elapsedSeconds / 60)}m`;
  }
  if (elapsedSeconds < 86400) {
    return `updated ${Math.floor(elapsedSeconds / 3600)}h`;
  }
  if (elapsedSeconds < 604800) {
    return `updated ${Math.floor(elapsedSeconds / 86400)}d`;
  }
  return `updated ${Math.floor(elapsedSeconds / 604800)}w`;
}

export function buildExecutionChecklist(issue: BeadIssue, issues: BeadIssue[]): ExecutionChecklistItem[] {
  const columns = buildKanbanColumns(issues);
  const lane = findIssueLane(columns, issue.id);
  const openBlockers = hasOpenBlockers(issues, issue.id);

  return [
    { key: 'owner_assigned', label: 'Owner assigned', passed: Boolean(issue.owner?.trim()) },
    { key: 'no_open_blockers', label: 'Not blocked by open blockers', passed: !openBlockers },
    { key: 'quality_signal', label: 'Has acceptance or description signal', passed: hasQualitySignal(issue) },
    {
      key: 'execution_compatible',
      label: 'Execution-compatible status (ready or in progress)',
      passed: lane === 'ready' || lane === 'in_progress',
    },
  ];
}
