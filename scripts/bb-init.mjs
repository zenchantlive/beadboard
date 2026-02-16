#!/usr/bin/env node

/**
 * bb-init.mjs - Agent Session Bootstrapper (Lease-Based)
 * 
 * Part of Operative Protocol v1 (bb-u6f.6.3)
 * 
 * Responsibility:
 * 1. Resolve bb.ps1 path.
 * 2. Identify agent (adopt or register).
 * 3. Start the initial activity lease.
 * 
 * Note: No background processes are spawned. Liveness is maintained
 * via passive side-effects of CLI commands (Activity-based model).
 */

import { parseArgs } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
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
  
  const tsEntry = path.join(process.cwd(), 'tools', 'bb.ts');
  try {
    await fs.access(tsEntry);
    return `npx tsx ${tsEntry}`;
  } catch {}

  if (envRepo) {
    const p = path.join(envRepo, 'bb.ps1');
    try {
      await fs.access(p);
      return p;
    } catch {}
    
    const envTs = path.join(envRepo, 'tools', 'bb.ts');
    try {
      await fs.access(envTs);
      return `npx tsx ${envTs}`;
    } catch {}
  }

  return null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      'non-interactive': { type: 'boolean' },
      adopt: { type: 'string' },
      register: { type: 'string' },
      role: { type: 'string' },
      json: { type: 'boolean' },
      'project-root': { type: 'string' }
    }
  });

  const isNonInteractive = values['non-interactive'];
  const projectRoot = values['project-root'] || process.cwd();
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
    
    // Compose environment fingerprint (Rig)
    const rigId = `${os.platform()}-${os.arch()}-${os.hostname()}`;

    const env = { ...process.env, BD_DB: path.join(projectRoot, '.beads', 'beads.db') };

    if (mode === 'register') {
      const role = values.role || 'agent';
      execSync(`${bbExec} agent register --name ${agentId} --role ${role} --rig ${rigId} --json`, { stdio: 'ignore', cwd: projectRoot, env });
    } else {
      // Start/Extend the lease to show we are now active
      execSync(`${bbExec} agent activity-lease --agent ${agentId} --json`, { stdio: 'ignore', cwd: projectRoot, env });
    }

    log({
      ok: true,
      agent_id: agentId,
      mode,
      lease: { status: 'active', note: 'Activity lease started. Liveness maintained via real work.' },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    error('INIT_FAILED', err.message);
  }
}

main();