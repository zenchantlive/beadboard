#!/usr/bin/env node

/**
 * bb-init.mjs - Agent Session Bootstrapper (Passive Version)
 * 
 * Part of Operative Protocol v1 (bb-u6f.6.3)
 * 
 * Responsibility:
 * 1. Resolve bb.ps1 path.
 * 2. Identify agent (adopt or register).
 */

import { parseArgs } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';

function log(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}
`);
}

function error(code, message) {
  log({ ok: false, error: { code, message } });
  process.exit(1);
}

async function getUncommittedChanges(projectRoot) {
  try {
    const out = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf8' });
    return out.split('\n')
      .filter(Boolean)
      .map(line => line.slice(3).trim())
      .filter(p => !p.startsWith('.beadboard') && !p.startsWith('.beads'));
  } catch {
    return [];
  }
}

async function resolveBbPath() {
  const envRepo = process.env.BB_REPO;
  if (envRepo) {
    const p = path.join(envRepo, 'bb.ps1');
    try {
      await fs.access(p);
      return p;
    } catch {}
  }

  const local = path.join(process.cwd(), 'bb.ps1');
  try {
    await fs.access(local);
    return local;
  } catch {}

  const tsEntry = path.join(process.cwd(), 'tools', 'bb.ts');
  try {
    await fs.access(tsEntry);
    return `npx tsx ${tsEntry}`;
  } catch {}

  return null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      'non-interactive': { type: 'boolean' },
      adopt: { type: 'string' },
      register: { type: 'string' },
      role: { type: 'string' },
      json: { type: 'boolean' }
    }
  });

  const isNonInteractive = values['non-interactive'];
  const projectRoot = process.cwd();
  const bbPath = await resolveBbPath();

  if (!bbPath) {
    error('BB_NOT_FOUND', 'Could not resolve bb.ps1 or tools/bb.ts');
  }

  let agentId = values.adopt || values.register;
  let mode = values.adopt ? 'adopt' : (values.register ? 'register' : 'auto');

  if (mode === 'auto' && isNonInteractive) {
    error('AMBIGUOUS_SESSION', 'In non-interactive mode, --adopt or --register is required.');
  }

  if (mode === 'adopt') {
    const changes = await getUncommittedChanges(projectRoot);
    if (changes.length === 0 && isNonInteractive) {
      error('ADOPTION_REJECTED', 'No evidence (uncommitted changes) to support identity adoption.');
    }
  }

  try {
    const bbExec = bbPath.includes('npx tsx') ? bbPath : `powershell.exe -NoProfile -Command "& '${bbPath}'"`;
    
    if (mode === 'register') {
      const role = values.role || 'agent';
      execSync(`${bbExec} agent register --name ${agentId} --role ${role} --json`, { stdio: 'ignore' });
    } else {
      // For adoption or auto, we just do a heartbeat to show we are alive
      execSync(`${bbExec} agent heartbeat --agent ${agentId} --json`, { stdio: 'ignore' });
    }

    log({
      ok: true,
      agent_id: agentId,
      mode,
      heartbeat: { status: 'passive', note: 'Heartbeat managed via passive command side-effects' },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    error('INIT_FAILED', err.message);
  }
}

main();
