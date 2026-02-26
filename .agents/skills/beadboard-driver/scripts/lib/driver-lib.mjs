import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function homeRoot() {
  return process.env.BB_SKILL_HOME || os.homedir();
}

function cacheFilePath() {
  return path.join(homeRoot(), '.beadboard', 'skill-config.json');
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readCache() {
  const filePath = cacheFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeCache(payload) {
  const filePath = cacheFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `${JSON.stringify({ ...payload, updated_at: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  );
}

function splitPathVariable(value) {
  if (!value) {
    return [];
  }
  return value.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean);
}

async function findCommandInPath(commandName) {
  const pathEntries = splitPathVariable(process.env.PATH || '');
  const candidateNames =
    process.platform === 'win32'
      ? [`${commandName}.cmd`, `${commandName}.exe`, `${commandName}.ps1`, `${commandName}.bat`, commandName]
      : [commandName];

  for (const entry of pathEntries) {
    for (const candidate of candidateNames) {
      const fullPath = path.join(entry, candidate);
      if (await pathExists(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

async function validateRepoPath(repoPath) {
  if (!repoPath || !(await pathExists(repoPath))) {
    return { ok: false, reason: 'BB_REPO does not exist.' };
  }

  const bbPath = path.join(repoPath, 'bb.ps1');
  if (!(await pathExists(bbPath))) {
    return { ok: false, reason: 'BB_REPO is set, but bb.ps1 was not found at BB_REPO\\bb.ps1.' };
  }

  return { ok: true, bbPath };
}

async function discoverBbPath() {
  const configuredRoots = splitPathVariable(process.env.BB_SEARCH_ROOTS || '');
  const roots = configuredRoots.length > 0 ? configuredRoots : [process.cwd(), path.join(homeRoot(), 'codex'), homeRoot()];
  const maxDepth = 4;

  for (const root of roots) {
    if (!(await pathExists(root))) {
      continue;
    }

    const queue = [{ dir: root, depth: 0 }];
    while (queue.length > 0) {
      const current = queue.shift();
      const candidate = path.join(current.dir, 'bb.ps1');
      if (await pathExists(candidate)) {
        return candidate;
      }
      if (current.depth >= maxDepth) {
        continue;
      }
      let entries = [];
      try {
        entries = await fs.readdir(current.dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
        }
      }
    }
  }

  return null;
}

async function resolveBbPath() {
  const cache = await readCache();
  const envRepo = (process.env.BB_REPO || '').trim();

  if (envRepo) {
    const validated = await validateRepoPath(envRepo);
    if (!validated.ok) {
      return {
        ok: false,
        source: 'env',
        resolved_path: null,
        reason: validated.reason,
        remediation: 'Set BB_REPO to your BeadBoard repo root, e.g. `$env:BB_REPO="C:\\path\\to\\beadboard"`.',
      };
    }

    let reason = 'Resolved from BB_REPO.';
    if (cache.bb_path && cache.bb_path !== validated.bbPath) {
      reason = 'Resolved from BB_REPO; cache mismatch detected and cache updated.';
    }
    await writeCache({ bb_path: validated.bbPath, source: 'env' });
    return { ok: true, source: 'env', resolved_path: validated.bbPath, reason, remediation: null };
  }

  const globalBb = await findCommandInPath('bb');
  if (globalBb) {
    await writeCache({ bb_path: globalBb, source: 'global' });
    return {
      ok: true,
      source: 'global',
      resolved_path: globalBb,
      reason: 'Resolved from PATH.',
      remediation: null,
    };
  }

  if (cache.bb_path && (await pathExists(cache.bb_path))) {
    return {
      ok: true,
      source: 'cache',
      resolved_path: cache.bb_path,
      reason: 'Resolved from cached bb path.',
      remediation: null,
    };
  }

  const discovered = await discoverBbPath();
  if (discovered) {
    await writeCache({ bb_path: discovered, source: 'discovery' });
    return {
      ok: true,
      source: 'discovery',
      resolved_path: discovered,
      reason: 'Resolved by filesystem discovery and cached.',
      remediation: null,
    };
  }

  return {
    ok: false,
    source: 'none',
    resolved_path: null,
    reason: 'Unable to find bb command or bb.ps1.',
    remediation:
      'Set BB_REPO to your BeadBoard repo root, or install a global bb command, then retry.',
  };
}

export { cacheFilePath, findCommandInPath, resolveBbPath };
