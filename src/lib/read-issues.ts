import fs from 'node:fs/promises';
import path from 'node:path';

import { parseIssuesJsonl } from './parser';
import { canonicalizeWindowsPath } from './pathing';
import type { BeadIssue } from './types';

export interface ReadIssuesOptions {
  projectRoot?: string;
  includeTombstones?: boolean;
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

export async function readIssuesFromDisk(options: ReadIssuesOptions = {}): Promise<BeadIssue[]> {
  const candidates = resolveIssuesJsonlPathCandidates(options.projectRoot);

  for (const issuesPath of candidates) {
    try {
      const jsonl = await fs.readFile(issuesPath, 'utf8');
      return parseIssuesJsonl(jsonl, {
        includeTombstones: options.includeTombstones ?? false,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }

      throw error;
    }
  }

  return [];
}
