import { randomUUID } from 'node:crypto';
import type { ActivityEvent, ActivityEventKind } from './activity';
import type { BeadIssueWithProject, BeadDependency } from './types';

/**
 * Compares two snapshots of BeadIssueWithProject arrays and returns a list of ActivityEvents
 * representing the differences.
 */
export function diffSnapshots(
  previous: BeadIssueWithProject[] | null,
  current: BeadIssueWithProject[]
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const prevMap = new Map<string, BeadIssueWithProject>();
  if (previous) {
    previous.forEach((issue) => prevMap.set(issue.id, issue));
  }

  const now = new Date().toISOString();

  current.forEach((curr) => {
    const prev = prevMap.get(curr.id);

    if (!prev) {
      // 1. Issue Created
      events.push(createEvent('created', curr, now));
      return;
    }

    // 2. Status Changes
    if (prev.status !== curr.status) {
      if (curr.status === 'closed') {
        events.push(createEvent('closed', curr, now, { from: prev.status, to: 'closed', message: curr.close_reason || undefined }));
      } else if (prev.status === 'closed') {
        events.push(createEvent('reopened', curr, now, { from: 'closed', to: curr.status }));
      } else {
        events.push(createEvent('status_changed', curr, now, { field: 'status', from: prev.status, to: curr.status }));
      }
    }

    // 3. Property Changes
    if (prev.title !== curr.title) {
      events.push(createEvent('title_changed', curr, now, { field: 'title', from: prev.title, to: curr.title }));
    }

    if (prev.priority !== curr.priority) {
      events.push(createEvent('priority_changed', curr, now, { field: 'priority', from: prev.priority, to: curr.priority }));
    }

    if (prev.description !== curr.description) {
      events.push(createEvent('description_changed', curr, now, { field: 'description', from: prev.description, to: curr.description }));
    }

    if (prev.issue_type !== curr.issue_type) {
      events.push(createEvent('type_changed', curr, now, { field: 'issue_type', from: prev.issue_type, to: curr.issue_type }));
    }

    if (prev.assignee !== curr.assignee) {
      events.push(createEvent('assignee_changed', curr, now, { field: 'assignee', from: prev.assignee, to: curr.assignee }));
    }

    if (prev.due_at !== curr.due_at) {
      events.push(createEvent('due_date_changed', curr, now, { field: 'due_at', from: prev.due_at, to: curr.due_at }));
    }

    if (prev.estimated_minutes !== curr.estimated_minutes) {
      events.push(createEvent('estimate_changed', curr, now, { field: 'estimated_minutes', from: prev.estimated_minutes, to: curr.estimated_minutes }));
    }

    // 4. Collection Changes (Labels)
    if (!areArraysEqual(prev.labels, curr.labels)) {
      events.push(createEvent('labels_changed', curr, now, { 
        field: 'labels', 
        from: prev.labels.join(','), 
        to: curr.labels.join(',') 
      }));
    }

    // 5. Collection Changes (Dependencies)
    diffDependencies(prev.dependencies, curr.dependencies).forEach(kindAndTarget => {
      events.push(createEvent(kindAndTarget.kind, curr, now, { to: kindAndTarget.target }));
    });
  });

  return events;
}

/**
 * Helper to create an ActivityEvent with standard fields.
 */
function createEvent(
  kind: ActivityEventKind,
  issue: BeadIssueWithProject,
  timestamp: string,
  payload: ActivityEvent['payload'] = {}
): ActivityEvent {
  return {
    id: randomUUID(),
    kind,
    beadId: issue.id,
    beadTitle: issue.title,
    projectId: issue.project.key,
    projectName: issue.project.name,
    timestamp,
    actor: issue.assignee || issue.owner || issue.created_by,
    payload,
  };
}

/**
 * Shallow equality check for string arrays (labels).
 */
function areArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}

/**
 * Detects added and removed dependencies.
 */
function diffDependencies(
  prev: BeadDependency[],
  curr: BeadDependency[]
): { kind: 'dependency_added' | 'dependency_removed', target: string }[] {
  const changes: { kind: 'dependency_added' | 'dependency_removed', target: string }[] = [];
  
  const prevTargets = new Set(prev.map(d => d.target));
  const currTargets = new Set(curr.map(d => d.target));

  curr.forEach(d => {
    if (!prevTargets.has(d.target)) {
      changes.push({ kind: 'dependency_added', target: d.target });
    }
  });

  prev.forEach(d => {
    if (!currTargets.has(d.target)) {
      changes.push({ kind: 'dependency_removed', target: d.target });
    }
  });

  return changes;
}
