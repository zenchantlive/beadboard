import { canonicalizeWindowsPath, toDisplayPath, windowsPathKey } from './pathing';

export interface ProjectScopeRegistryEntry {
  path: string;
}

export interface ProjectScopeOption {
  key: string;
  root: string;
  displayPath: string;
  source: 'local' | 'registry';
}

export type ProjectScopeMode = 'single' | 'aggregate';

export interface ResolveProjectScopeInput {
  currentProjectRoot: string;
  registryProjects: ProjectScopeRegistryEntry[];
  requestedProjectKey?: string | null;
  requestedMode?: string | null;
}

export interface ResolvedProjectScope {
  mode: ProjectScopeMode;
  selected: ProjectScopeOption;
  readRoots: string[];
  options: ProjectScopeOption[];
}

function normalizeRequestedKey(input?: string | null): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

function buildLocalOption(currentProjectRoot: string): ProjectScopeOption {
  const root = canonicalizeWindowsPath(currentProjectRoot);
  return {
    key: 'local',
    root,
    displayPath: toDisplayPath(root),
    source: 'local',
  };
}

function buildRegistryOptions(registryProjects: ProjectScopeRegistryEntry[]): ProjectScopeOption[] {
  const seen = new Set<string>();
  const options: ProjectScopeOption[] = [];

  for (const project of registryProjects) {
    const root = canonicalizeWindowsPath(project.path);
    const key = windowsPathKey(root);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push({
      key,
      root,
      displayPath: toDisplayPath(root),
      source: 'registry',
    });
  }

  return options;
}

function normalizeMode(input?: string | null): ProjectScopeMode {
  if (input === 'aggregate') {
    return 'aggregate';
  }
  return 'single';
}

export function resolveProjectScope(input: ResolveProjectScopeInput): ResolvedProjectScope {
  const local = buildLocalOption(input.currentProjectRoot);
  const registry = buildRegistryOptions(input.registryProjects);
  const options = [local, ...registry];
  const requestedKey = normalizeRequestedKey(input.requestedProjectKey);
  const mode = normalizeMode(input.requestedMode);
  const readRoots =
    mode === 'aggregate' ? options.map((option) => option.root) : [local.root];

  if (!requestedKey || requestedKey === 'local') {
    return { mode, selected: local, readRoots, options };
  }

  const selected = options.find((option) => option.key === requestedKey);
  const resolvedSelected = selected ?? local;
  const resolvedReadRoots =
    mode === 'aggregate' ? readRoots : [resolvedSelected.root];

  return {
    mode,
    selected: resolvedSelected,
    readRoots: resolvedReadRoots,
    options,
  };
}
