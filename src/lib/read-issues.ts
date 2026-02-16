import path from 'node:path';

import { runBdCommand } from './bridge';
import { parseIssuesJsonl } from './parser';
import { canonicalizeWindowsPath } from './pathing';
import { readTextFileWithRetry } from './read-text-retry';
import { buildProjectContext } from './project-context';
import type { BeadDependency, BeadIssue } from './types';
import type { BeadIssueWithProject, ProjectSource } from './types';

export interface ReadIssuesOptions {
  projectRoot?: string;
  includeTombstones?: boolean;
  projectSource?: ProjectSource;
  projectAddedAt?: string | null;
  preferBd?: boolean;
  skipAgentFilter?: boolean;
}

export function resolveIssuesJsonlPathCandidates(projectRoot: string = process.cwd()): string[] {
  const baseDir = path.resolve(projectRoot, '.beads');
  const primary = canonicalizeWindowsPath(path.join(baseDir, 'issues.jsonl'));
  const fallback = canonicalizeWindowsPath(path.join(baseDir, 'issues.jsonl.new'));
  return [primary, fallback];
}

export function resolveIssuesJsonlPath(projectRoot: string = process.cwd()): string {
  return resolveIssuesJsonlPathCandidates(projectRoot)[0];
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
      return {
        type: dep.type === 'parent-child' ? 'parent' : (dep.type as BeadDependency['type']),
        target,
      };
    })
    .filter((dep): dep is BeadDependency => dep !== null);
}

function normalizeBdIssue(raw: unknown): BeadIssue | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== 'string' || typeof data.title !== 'string') {
    return null;
  }
  return {
    id: data.id,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : null,
    status: typeof data.status === 'string' ? (data.status as BeadIssue['status']) : 'open',
    priority: typeof data.priority === 'number' ? data.priority : 2,
    issue_type: typeof data.issue_type === 'string' ? data.issue_type : 'task',
    assignee: typeof data.assignee === 'string' ? data.assignee : null,
    owner: typeof data.owner === 'string' ? data.owner : null,
    labels: Array.isArray(data.labels) ? data.labels.filter((x): x is string => typeof x === 'string') : [],
    dependencies: normalizeDependencies(data.dependencies),
    created_at: typeof data.created_at === 'string' ? data.created_at : '',
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : '',
    closed_at: typeof data.closed_at === 'string' ? data.closed_at : null,
    close_reason: typeof data.close_reason === 'string' ? data.close_reason : null,
    closed_by_session: typeof data.closed_by_session === 'string' ? data.closed_by_session : null,
    created_by: typeof data.created_by === 'string' ? data.created_by : null,
    due_at: typeof data.due_at === 'string' ? data.due_at : null,
    estimated_minutes: typeof data.estimated_minutes === 'number' ? data.estimated_minutes : null,
    external_ref: typeof data.external_ref === 'string' ? data.external_ref : null,
    metadata: typeof data.metadata === 'object' && data.metadata !== null ? (data.metadata as Record<string, unknown>) : {},
  };
}

async function readIssuesViaBd(options: ReadIssuesOptions, project: ReturnType<typeof buildProjectContext>): Promise<BeadIssueWithProject[] | null> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const command = await runBdCommand({
    projectRoot,
    args: ['list', '--all', '--limit', '0', '--json'],
  });

  if (!command.success) {
    return null;
  }

  try {
    const parsed = JSON.parse(command.stdout) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((issue) => normalizeBdIssue(issue))
      .filter((issue): issue is BeadIssue => issue !== null)
      .filter((issue) => {
        // Exclude tombstones
        if (issue.status === 'tombstone' && !options.includeTombstones) return false;
        // Exclude agent identities from mission lists unless skipping filter (for watcher/diffing)
        if (issue.labels.includes('gt:agent') && !options.skipAgentFilter) return false;
        return true;
      })
      .map((issue) => ({
        ...issue,
        project,
      }));
  } catch {
    return null;
  }
}

export async function readIssuesFromDisk(options: ReadIssuesOptions = {}): Promise<BeadIssueWithProject[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const candidates = resolveIssuesJsonlPathCandidates(projectRoot);
  const project = buildProjectContext(projectRoot, {
    source: options.projectSource ?? 'local',
    addedAt: options.projectAddedAt ?? null,
  });

  if (options.preferBd ?? false) {
    const viaBd = await readIssuesViaBd(options, project);
    if (viaBd) {
      return viaBd;
    }
  }

  for (const issuesPath of candidates) {
    try {
      const jsonl = await readTextFileWithRetry(issuesPath);
      return parseIssuesJsonl(jsonl, {
        includeTombstones: options.includeTombstones ?? false,
        skipAgentFilter: options.skipAgentFilter ?? false,
      }).map((issue) => ({
        ...issue,
        project,
      }));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  return [];
}
