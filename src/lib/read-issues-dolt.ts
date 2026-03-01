import type { RowDataPacket } from 'mysql2';

import { getDoltConnection, DoltConnectionError } from './dolt-client';
import type { ReadIssuesOptions } from './read-issues';
import type { BeadDependency, BeadIssue, BeadStatus } from './types';

interface IssueRow extends RowDataPacket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  issue_type: string;
  assignee: string | null;
  owner: string | null;
  close_reason: string | null;
  closed_by_session: string | null;
  created_by: string | null;
  estimated_minutes: number | null;
  external_ref: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  closed_at: Date | string | null;
  due_at: Date | string | null;
  labels_concat: string | null;
}

interface DepRow extends RowDataPacket {
  issue_id: string;
  depends_on_id: string;
  type: string;
}

function toIsoString(val: Date | string | null | undefined): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  return val;
}

function normalizeRow(row: IssueRow, deps: BeadDependency[]): BeadIssue {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: (row.status as BeadStatus) ?? 'open',
    priority: typeof row.priority === 'number' ? row.priority : 2,
    issue_type: row.issue_type ?? 'task',
    assignee: row.assignee ?? null,
    templateId: null,
    owner: row.owner ?? null,
    labels: row.labels_concat ? row.labels_concat.split(',').filter(Boolean) : [],
    dependencies: deps,
    created_at: toIsoString(row.created_at) ?? '',
    updated_at: toIsoString(row.updated_at) ?? '',
    closed_at: toIsoString(row.closed_at),
    close_reason: row.close_reason ?? null,
    closed_by_session: row.closed_by_session ?? null,
    created_by: row.created_by ?? null,
    due_at: toIsoString(row.due_at),
    estimated_minutes: typeof row.estimated_minutes === 'number' ? row.estimated_minutes : null,
    external_ref: row.external_ref ?? null,
    metadata: row.metadata ?? {},
  };
}

/**
 * Query Dolt SQL server directly for all issues, joining labels and dependencies.
 * Returns null (never throws) if Dolt is unreachable so the caller can fall back
 * to the issues.jsonl path.
 */
export async function readIssuesViaDolt(
  projectRoot: string,
  options: ReadIssuesOptions = {}
): Promise<BeadIssue[] | null> {
  let pool;
  try {
    pool = await getDoltConnection(projectRoot);
  } catch (err) {
    if (err instanceof DoltConnectionError) {
      return null;
    }
    return null;
  }

  try {
    // Query 1: All issues with comma-separated labels (GROUP_CONCAT avoids N+1)
    const [issueRows] = await pool.execute<IssueRow[]>(
      `SELECT i.*, GROUP_CONCAT(l.label SEPARATOR ',') AS labels_concat
       FROM issues i
       LEFT JOIN labels l ON l.issue_id = i.id
       GROUP BY i.id`
    );

    // Query 2: All dependencies in one shot
    const [depRows] = await pool.execute<DepRow[]>(
      `SELECT issue_id, depends_on_id, type FROM dependencies`
    );

    // Build issue_id → BeadDependency[] lookup
    const depsMap = new Map<string, BeadDependency[]>();
    for (const dep of depRows) {
      const depType: BeadDependency['type'] =
        dep.type === 'parent-child' ? 'parent' : (dep.type as BeadDependency['type']);
      const list = depsMap.get(dep.issue_id) ?? [];
      list.push({ type: depType, target: dep.depends_on_id });
      depsMap.set(dep.issue_id, list);
    }

    return issueRows
      .map((row) => normalizeRow(row, depsMap.get(row.id) ?? []))
      .filter((issue) => {
        if (issue.status === 'tombstone' && !options.includeTombstones) return false;
        if (issue.labels.includes('gt:agent') && !options.skipAgentFilter) return false;
        return true;
      });
  } catch {
    return null;
  }
}
