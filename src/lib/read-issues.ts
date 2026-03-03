import path from 'node:path';

import { buildProjectContext } from './project-context';
import { readIssuesViaDolt } from './read-issues-dolt';
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
  return [
    path.join(baseDir, 'issues.jsonl'),
    path.join(baseDir, 'issues.jsonl.new'),
  ];
}

export function resolveIssuesJsonlPath(projectRoot: string = process.cwd()): string {
  return resolveIssuesJsonlPathCandidates(projectRoot)[0];
}

export async function readIssuesFromDisk(options: ReadIssuesOptions = {}): Promise<BeadIssueWithProject[]> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const project = buildProjectContext(projectRoot, {
    source: options.projectSource ?? 'local',
    addedAt: options.projectAddedAt ?? null,
  });

  // Dolt-only: throw if unreachable
  const viaDolt = await readIssuesViaDolt(projectRoot, options);
  if (viaDolt !== null) {
    return viaDolt.map((issue) => ({ ...issue, project }));
  }

  // No fallback - fail fast to indicate Dolt is not running
  throw new Error('Dolt unreachable - ensure Dolt is running: bd dolt start');
}
