import path from 'node:path';

import { canonicalizeWindowsPath, toDisplayPath, windowsPathKey } from './pathing';
import type { ProjectContext, ProjectSource } from './types';

interface BuildProjectContextOptions {
  source?: ProjectSource;
  addedAt?: string | null;
}

export function buildProjectContext(root: string, options: BuildProjectContextOptions = {}): ProjectContext {
  if (!root) {
    throw new Error('Project root is required to build project context.');
  }

  const normalizedRoot = canonicalizeWindowsPath(root);
  return {
    key: windowsPathKey(normalizedRoot),
    root: normalizedRoot,
    displayPath: toDisplayPath(normalizedRoot),
    name: path.basename(normalizedRoot),
    source: options.source ?? 'local',
    addedAt: options.addedAt ?? null,
  };
}
