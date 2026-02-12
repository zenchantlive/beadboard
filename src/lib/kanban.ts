import type { BeadIssue } from './types';

export const KANBAN_STATUSES = ['open', 'in_progress', 'blocked', 'deferred', 'closed'] as const;

export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export type KanbanColumns = Record<KanbanStatus, BeadIssue[]>;

export interface KanbanFilterOptions {
  query?: string;
  type?: string;
  priority?: string;
  showClosed?: boolean;
}

export interface KanbanStats {
  total: number;
  open: number;
  active: number;
  blocked: number;
  done: number;
  p0: number;
}

function isKanbanStatus(status: string): status is KanbanStatus {
  return KANBAN_STATUSES.includes(status as KanbanStatus);
}

function issueSort(a: BeadIssue, b: BeadIssue): number {
  const priorityDiff = a.priority - b.priority;
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return b.updated_at.localeCompare(a.updated_at);
}

export function filterKanbanIssues(issues: BeadIssue[], filters: KanbanFilterOptions): BeadIssue[] {
  const query = (filters.query ?? '').trim().toLowerCase();
  const type = (filters.type ?? '').trim().toLowerCase();
  const priority = (filters.priority ?? '').trim();
  const showClosed = filters.showClosed ?? false;

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

    return true;
  });
}

export function buildKanbanColumns(issues: BeadIssue[]): KanbanColumns {
  const columns = {
    open: [],
    in_progress: [],
    blocked: [],
    deferred: [],
    closed: [],
  } as KanbanColumns;

  for (const issue of issues) {
    if (isKanbanStatus(issue.status)) {
      columns[issue.status].push(issue);
    }
  }

  for (const status of KANBAN_STATUSES) {
    columns[status].sort(issueSort);
  }

  return columns;
}

export function buildKanbanStats(issues: BeadIssue[]): KanbanStats {
  return {
    total: issues.length,
    open: issues.filter((x) => x.status === 'open').length,
    active: issues.filter((x) => x.status === 'in_progress').length,
    blocked: issues.filter((x) => x.status === 'blocked').length,
    done: issues.filter((x) => x.status === 'closed').length,
    p0: issues.filter((x) => x.priority === 0).length,
  };
}
