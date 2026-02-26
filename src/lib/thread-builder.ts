import type { BeadIssue } from './types';
import type { ThreadItem } from '../components/shared/thread-view';

/**
 * Build thread items from a bead's history and metadata.
 * This creates a timeline of status changes, close events, etc.
 */
export function buildThreadItemsFromBead(issue: BeadIssue | null): ThreadItem[] {
  if (!issue) return [];

  const items: ThreadItem[] = [];

  // Creation event
  items.push({
    id: `${issue.id}-created`,
    type: 'status_change',
    from: 'none',
    to: issue.status,
    timestamp: new Date(issue.created_at),
  });

  // If closed, add close event
  if (issue.closed_at && issue.status === 'closed') {
    items.push({
      id: `${issue.id}-closed`,
      type: 'status_change',
      from: issue.status,
      to: 'closed',
      timestamp: new Date(issue.closed_at),
    });

    // Close reason as a comment if present
    if (issue.close_reason) {
      items.push({
        id: `${issue.id}-close-reason`,
        type: 'comment',
        author: issue.closed_by_session || 'system',
        content: issue.close_reason,
        timestamp: new Date(issue.closed_at),
      });
    }
  }

  // Updated event (if significantly different from created)
  const created = new Date(issue.created_at).getTime();
  const updated = new Date(issue.updated_at).getTime();
  if (updated > created + 60000) { // More than 1 minute difference
    items.push({
      id: `${issue.id}-updated`,
      type: 'comment',
      author: 'system',
      content: `Last updated`,
      timestamp: new Date(issue.updated_at),
    });
  }

  // Sort by timestamp
  items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return items;
}

/**
 * Build thread items for a swarm (epic) showing aggregate info
 */
export function buildThreadItemsForSwarm(
  epicIssue: BeadIssue | null,
  childIssues: BeadIssue[]
): ThreadItem[] {
  if (!epicIssue) return [];

  const items: ThreadItem[] = [];

  // Epic creation
  items.push({
    id: `${epicIssue.id}-created`,
    type: 'status_change',
    from: 'none',
    to: epicIssue.status,
    timestamp: new Date(epicIssue.created_at),
  });

  // Summary of children
  const completed = childIssues.filter(i => i.status === 'closed').length;
  const inProgress = childIssues.filter(i => i.status === 'in_progress').length;

  if (childIssues.length > 0) {
    items.push({
      id: `${epicIssue.id}-summary`,
      type: 'comment',
      author: 'system',
      content: `${childIssues.length} tasks: ${completed} closed, ${inProgress} in progress`,
      timestamp: new Date(),
    });
  }

  return items;
}
