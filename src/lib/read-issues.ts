import path from 'node:path';

import { parseIssuesJsonl } from './parser';
import { canonicalizeWindowsPath } from './pathing';
import { readTextFileWithRetry } from './read-text-retry';
import { buildProjectContext } from './project-context';
import type { BeadIssueWithProject, ProjectSource } from './types';

export interface ReadIssuesOptions {
  projectRoot?: string;
  includeTombstones?: boolean;
  projectSource?: ProjectSource;
  projectAddedAt?: string | null;
}

export function resolveIssuesJsonlPathCandidates(projectRoot: string = process.cwd()): string[] {
  const baseDir = path.resolve(projectRoot, '.beads');
  const primary = path.join(baseDir, 'issues.jsonl');
  const fallback = path.join(baseDir, 'issues.jsonl.new');
  return [primary, fallback];
}

export function resolveIssuesJsonlPath(projectRoot: string = process.cwd()): string {
  return resolveIssuesJsonlPathCandidates(projectRoot)[0];
}

export async function readIssuesFromDisk(options: ReadIssuesOptions = {}): Promise<BeadIssueWithProject[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const candidates = resolveIssuesJsonlPathCandidates(projectRoot);
  const project = buildProjectContext(projectRoot, {
    source: options.projectSource ?? 'local',
    addedAt: options.projectAddedAt ?? null,
  });

  for (const issuesPath of candidates) {
    try {
      const jsonl = await readTextFileWithRetry(issuesPath);
      return parseIssuesJsonl(jsonl, {
        includeTombstones: options.includeTombstones ?? false,
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
