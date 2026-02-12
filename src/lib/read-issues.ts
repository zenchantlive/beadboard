import fs from 'node:fs/promises';
import path from 'node:path';

import { parseIssuesJsonl } from './parser';
import { canonicalizeWindowsPath } from './pathing';
import type { BeadIssue } from './types';

export interface ReadIssuesOptions {
  projectRoot?: string;
  includeTombstones?: boolean;
}

export function resolveIssuesJsonlPath(projectRoot: string = process.cwd()): string {
  const absolute = path.resolve(projectRoot, '.beads', 'issues.jsonl');
  return canonicalizeWindowsPath(absolute);
}

export async function readIssuesFromDisk(options: ReadIssuesOptions = {}): Promise<BeadIssue[]> {
  const issuesPath = resolveIssuesJsonlPath(options.projectRoot);

  try {
    const jsonl = await fs.readFile(issuesPath, 'utf8');
    return parseIssuesJsonl(jsonl, {
      includeTombstones: options.includeTombstones ?? false,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}
