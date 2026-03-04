#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = new Set();
  const values = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.add(key);
      continue;
    }
    values[key] = next;
    i += 1;
  }

  return { args, values };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return false;
  }
  await fs.rm(filePath, { force: true });
  return true;
}

async function main() {
  const { args, values } = parseArgs(process.argv.slice(2));
  const apply = args.has('apply');
  const fixGitIndexLock = args.has('fix-git-index-lock');
  const projectRoot = values['project-root'] ? path.resolve(values['project-root']) : process.cwd();

  const actions = [];
  const warnings = [];

  const lockPath = path.join(projectRoot, '.git', 'index.lock');
  const lockExists = await pathExists(lockPath);

  if (fixGitIndexLock && lockExists) {
    if (apply) {
      const removed = await removeIfExists(lockPath);
      actions.push({
        id: 'fix-git-index-lock',
        attempted: true,
        applied: removed,
        target: lockPath,
      });
    } else {
      actions.push({
        id: 'fix-git-index-lock',
        attempted: true,
        applied: false,
        target: lockPath,
      });
      warnings.push('Dry-run mode enabled. Re-run with --apply to perform fixes.');
    }
  } else if (fixGitIndexLock && !lockExists) {
    actions.push({
      id: 'fix-git-index-lock',
      attempted: true,
      applied: false,
      target: lockPath,
      note: 'No index.lock found.',
    });
  }

  if (!fixGitIndexLock && lockExists) {
    warnings.push('Stale git index.lock detected. Use --fix-git-index-lock to target it.');
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        mode: apply ? 'apply' : 'dry-run',
        project_root: projectRoot,
        actions,
        warnings,
      },
      null,
      2,
    )}\n`,
  );
}

void main();
