import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { canonicalizeWindowsPath, toDisplayPath, windowsPathKey } from './pathing';

export interface RegistryProject {
  path: string;
  key: string;
}

interface RegistryDocument {
  version: 1;
  projects: RegistryProject[];
}

export class RegistryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryValidationError';
  }
}

function userProfileRoot(): string {
  return process.env.USERPROFILE?.trim() || os.homedir();
}

export function registryFilePath(): string {
  return path.join(userProfileRoot(), '.beadboard', 'projects.json');
}

function ensureWindowsAbsolutePath(input: string): string {
  const normalized = canonicalizeWindowsPath(input.trim());
  if (!/^[A-Za-z]:\\/.test(normalized)) {
    throw new RegistryValidationError('Project path must be a Windows absolute path (e.g. C:\\Repos\\Project).');
  }

  return normalized;
}

function normalizeProject(input: string): RegistryProject {
  const normalized = ensureWindowsAbsolutePath(input);
  return {
    path: toDisplayPath(normalized),
    key: windowsPathKey(normalized),
  };
}

function normalizeProjects(input: unknown): RegistryProject[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: RegistryProject[] = [];

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const candidate = item as { path?: unknown };
    if (typeof candidate.path !== 'string') {
      continue;
    }

    try {
      const project = normalizeProject(candidate.path);
      if (!seen.has(project.key)) {
        seen.add(project.key);
        normalized.push(project);
      }
    } catch {
      continue;
    }
  }

  return normalized;
}

async function readRegistryDocument(): Promise<RegistryDocument> {
  const filePath = registryFilePath();

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as { projects?: unknown };
    return {
      version: 1,
      projects: normalizeProjects(parsed.projects),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 1, projects: [] };
    }

    throw error;
  }
}

async function writeRegistryDocument(document: RegistryDocument): Promise<void> {
  const filePath = registryFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
}

export async function listProjects(): Promise<RegistryProject[]> {
  const document = await readRegistryDocument();
  return document.projects;
}

export async function addProject(projectPath: string): Promise<{ added: boolean; projects: RegistryProject[] }> {
  const document = await readRegistryDocument();
  const project = normalizeProject(projectPath);

  if (document.projects.some((entry) => entry.key === project.key)) {
    return { added: false, projects: document.projects };
  }

  document.projects.push(project);
  await writeRegistryDocument(document);
  return { added: true, projects: document.projects };
}

export async function removeProject(projectPath: string): Promise<{ removed: boolean; projects: RegistryProject[] }> {
  const document = await readRegistryDocument();
  const project = normalizeProject(projectPath);
  const nextProjects = document.projects.filter((entry) => entry.key !== project.key);

  if (nextProjects.length === document.projects.length) {
    return { removed: false, projects: document.projects };
  }

  const nextDocument: RegistryDocument = {
    version: 1,
    projects: nextProjects,
  };

  await writeRegistryDocument(nextDocument);
  return { removed: true, projects: nextDocument.projects };
}
