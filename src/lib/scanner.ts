import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { canonicalizeWindowsPath, toDisplayPath, windowsPathKey } from './pathing';
import { listProjects } from './registry';

export type ScanMode = 'default' | 'full-drive';

export interface ScannerProject {
  root: string;
  key: string;
  displayPath: string;
}

export interface ScanStats {
  scannedDirectories: number;
  ignoredDirectories: number;
  skippedDirectories: number;
  elapsedMs: number;
}

export interface ScanOptions {
  mode?: ScanMode;
  maxDepth?: number;
  roots?: string[];
  ignoreDirectories?: string[];
}

export interface ScanResult {
  mode: ScanMode;
  roots: string[];
  projects: ScannerProject[];
  stats: ScanStats;
}

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_IGNORE_DIRECTORIES = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  'artifacts',
  'logs',
  '.worktrees', // TODO: confirm whether worktrees should be scan targets.
  'worktrees',
  '.agents',
  '.kimi',
  '.zenflow',
  '.gemini',
  'appdata',
];

const DEFAULT_IGNORE_PATH_FRAGMENTS = [
  '\\go\\pkg\\mod\\',
  '\\.agents\\skills\\',
  '\\.kimi\\skills\\',
  '\\.gemini\\skills\\',
  '\\.zenflow\\worktrees\\',
];

function userProfileRoot(): string {
  return process.env.USERPROFILE?.trim() || os.homedir();
}

function toCanonicalRoot(input: string): string {
  return canonicalizeWindowsPath(input);
}

function shouldSkipFsError(error: NodeJS.ErrnoException): boolean {
  return error.code === 'ENOENT' || error.code === 'ENOTDIR' || error.code === 'EACCES' || error.code === 'EPERM';
}

async function ensureDirectoryExists(input: string): Promise<string | null> {
  try {
    const stat = await fs.stat(input);
    return stat.isDirectory() ? input : null;
  } catch (error) {
    if (shouldSkipFsError(error as NodeJS.ErrnoException)) {
      return null;
    }
    throw error;
  }
}

async function fileExists(input: string): Promise<boolean> {
  try {
    const stat = await fs.stat(input);
    return stat.isFile();
  } catch (error) {
    if (shouldSkipFsError(error as NodeJS.ErrnoException)) {
      return false;
    }
    throw error;
  }
}

async function resolveFullDriveRoots(): Promise<string[]> {
  const candidates = ['C:\\', 'D:\\'];
  const roots: string[] = [];

  for (const candidate of candidates) {
    const existing = await ensureDirectoryExists(candidate);
    if (existing) {
      roots.push(existing);
    }
  }

  return roots;
}

export async function resolveScanRoots(options: ScanOptions = {}): Promise<string[]> {
  const mode: ScanMode = options.mode ?? 'default';
  const registryProjects = await listProjects();
  const roots = [
    userProfileRoot(),
    ...registryProjects.map((project) => project.path),
    ...(options.roots ?? []),
  ];

  if (mode === 'full-drive') {
    roots.push(...(await resolveFullDriveRoots()));
  }

  const seen = new Set<string>();
  const normalizedRoots: string[] = [];

  for (const root of roots) {
    const normalized = toCanonicalRoot(root);
    const key = windowsPathKey(normalized);
    if (seen.has(key)) {
      continue;
    }

    const existing = await ensureDirectoryExists(normalized);
    if (!existing) {
      continue;
    }

    seen.add(key);
    normalizedRoots.push(existing);
  }

  return normalizedRoots;
}

function buildIgnoreSet(additional: string[] = []): Set<string> {
  return new Set(
    [...DEFAULT_IGNORE_DIRECTORIES, ...additional].map((entry) => entry.trim().toLowerCase()).filter(Boolean),
  );
}

function shouldIgnorePath(dir: string): boolean {
  const normalized = toCanonicalRoot(dir).toLowerCase();
  return DEFAULT_IGNORE_PATH_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function shouldIgnoreDirectoryName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized.startsWith('beadboard-read-') ||
    normalized.startsWith('beadboard-watch-') ||
    normalized.startsWith('skills-')
  );
}

function recordProject(projects: Map<string, ScannerProject>, root: string): void {
  const normalized = toCanonicalRoot(root);
  const key = windowsPathKey(normalized);
  if (!projects.has(key)) {
    projects.set(key, {
      root: normalized,
      key,
      displayPath: toDisplayPath(normalized),
    });
  }
}

async function scanRoot(
  root: string,
  maxDepth: number,
  ignoreSet: Set<string>,
  projects: Map<string, ScannerProject>,
  stats: ScanStats,
): Promise<void> {
  const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (current.depth > 0 && shouldIgnorePath(current.dir)) {
      stats.ignoredDirectories += 1;
      continue;
    }

    stats.scannedDirectories += 1;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(current.dir, { withFileTypes: true });
    } catch (error) {
      if (shouldSkipFsError(error as NodeJS.ErrnoException)) {
        stats.skippedDirectories += 1;
        continue;
      }
      throw error;
    }

    let hasBeads = false;
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (entry.name === '.beads') {
        hasBeads = true;
        continue;
      }

      const entryName = entry.name.toLowerCase();
      if (ignoreSet.has(entryName) || shouldIgnoreDirectoryName(entryName)) {
        stats.ignoredDirectories += 1;
        continue;
      }

      if (current.depth < maxDepth) {
        queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
      }
    }

    if (hasBeads) {
      const issuesPath = path.join(current.dir, '.beads', 'issues.jsonl');
      const fallbackIssuesPath = path.join(current.dir, '.beads', 'issues.jsonl.new');
      const [primaryExists, fallbackExists] = await Promise.all([fileExists(issuesPath), fileExists(fallbackIssuesPath)]);

      if (primaryExists || fallbackExists) {
        recordProject(projects, current.dir);
      }
    }
  }
}

export async function scanForProjects(options: ScanOptions = {}): Promise<ScanResult> {
  const mode: ScanMode = options.mode ?? 'default';
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const ignoreSet = buildIgnoreSet(options.ignoreDirectories);
  const roots = await resolveScanRoots(options);
  const projects = new Map<string, ScannerProject>();
  const stats: ScanStats = {
    scannedDirectories: 0,
    ignoredDirectories: 0,
    skippedDirectories: 0,
    elapsedMs: 0,
  };
  const start = Date.now();

  for (const root of roots) {
    await scanRoot(root, maxDepth, ignoreSet, projects, stats);
  }

  stats.elapsedMs = Date.now() - start;

  return {
    mode,
    roots,
    projects: Array.from(projects.values()),
    stats,
  };
}
