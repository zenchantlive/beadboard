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

/**
 * Write issues to disk using BD audit record when available.
 * This ensures all writes go through the BD audit system for watcher/SSE parity.
 */
export async function writeIssuesToDisk(
  issues: BeadIssueWithProject[],
  options: ReadIssuesOptions = {}
): Promise<void> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const issuesJson = JSON.stringify(issues, null, 2);

  try {
    const { execFileSync } = await import('child_process');
    execFileSync('bd', ['audit', 'record', '--stdin'], {
      input: issuesJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    const issuesPath = resolveIssuesJsonlPath(projectRoot);
    const { writeFile } = await import('node:fs/promises');
    await writeFile(issuesPath, issuesJson, 'utf8');
  }
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
