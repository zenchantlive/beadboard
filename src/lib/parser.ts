import type { BeadDependency, BeadIssue, ParseableBeadIssue } from './types';

export interface ParseIssuesOptions {
  includeTombstones?: boolean;
}

function normalizeDependencies(value: unknown): BeadDependency[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const dep = item as { type?: unknown; target?: unknown; depends_on_id?: unknown };
      if (typeof dep.type !== 'string') {
        return null;
      }

      const target = typeof dep.target === 'string' ? dep.target : typeof dep.depends_on_id === 'string' ? dep.depends_on_id : null;
      if (!target) {
        return null;
      }

      const normalizedType = dep.type === 'parent-child' ? 'parent' : dep.type;

      return {
        type: normalizedType as BeadDependency['type'],
        target,
      };
    })
    .filter((dep): dep is BeadDependency => dep !== null);
}

function normalizeIssue(raw: ParseableBeadIssue): BeadIssue {
  return {
    id: raw.id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : null,
    status: (raw.status ?? 'open') as BeadIssue['status'],
    priority: typeof raw.priority === 'number' ? raw.priority : 2,
    issue_type: (raw.issue_type ?? 'task') as BeadIssue['issue_type'],
    assignee: typeof raw.assignee === 'string' ? raw.assignee : null,
    owner: typeof raw.owner === 'string' ? raw.owner : null,
    labels: Array.isArray(raw.labels) ? raw.labels.filter((x): x is string => typeof x === 'string') : [],
    dependencies: normalizeDependencies(raw.dependencies),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : '',
    closed_at: typeof raw.closed_at === 'string' ? raw.closed_at : null,
    close_reason: typeof raw.close_reason === 'string' ? raw.close_reason : null,
    closed_by_session: typeof raw.closed_by_session === 'string' ? raw.closed_by_session : null,
    created_by: typeof raw.created_by === 'string' ? raw.created_by : null,
    due_at: typeof raw.due_at === 'string' ? raw.due_at : null,
    estimated_minutes: typeof raw.estimated_minutes === 'number' ? raw.estimated_minutes : null,
    external_ref: typeof raw.external_ref === 'string' ? raw.external_ref : null,
    metadata: typeof raw.metadata === 'object' && raw.metadata !== null ? (raw.metadata as Record<string, unknown>) : {},
  };
}

/**
 * Parses a JSONL (JSON Lines) string containing Bead issues.
 * 
 * @param text - The JSONL text to parse, with one JSON object per line
 * @param options - Parse options
 * @param options.includeTombstones - Whether to include tombstoned issues (default: false)
 * @returns Array of parsed and normalized BeadIssue objects
 * 
 * @remarks
 * - Skips blank lines and malformed JSON
 * - Applies default values for missing optional fields
 * - Normalizes dependencies to use `target` field
 * - Filters out tombstoned issues by default
 */
export function parseIssuesJsonl(text: string, options: ParseIssuesOptions = {}): BeadIssue[] {
  const includeTombstones = options.includeTombstones ?? false;
  const issues: BeadIssue[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as ParseableBeadIssue;
      if (!parsed.id || !parsed.title) {
        continue;
      }

      const normalized = normalizeIssue(parsed);
      if (!includeTombstones && normalized.status === 'tombstone') {
        continue;
      }

      issues.push(normalized);
    } catch {
      // Skip malformed lines to keep parser resilient against partial writes.
      continue;
    }
  }

  return issues;
}
