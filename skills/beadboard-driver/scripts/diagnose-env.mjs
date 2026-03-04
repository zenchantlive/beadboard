#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { findCommandInPath, resolveBbPath } from './lib/driver-lib.mjs';

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const timestamp = new Date().toISOString();
  const cwd = process.cwd();
  const gitIndexLock = path.join(cwd, '.git', 'index.lock');

  const findings = [];
  const recommendations = [];

  const bdPath = await findCommandInPath('bd');
  const bb = await resolveBbPath();
  const hasGitIndexLock = await pathExists(gitIndexLock);

  if (!bdPath) {
    findings.push({
      code: 'BD_NOT_FOUND',
      severity: 'high',
      message: 'bd command not found in PATH.',
    });
    recommendations.push(
      'Install BeadBoard tooling from https://github.com/zenchantlive/beadboard or add bd executable directory to PATH.',
    );
  }

  if (!bb.ok) {
    findings.push({
      code: 'BB_NOT_FOUND',
      severity: 'high',
      message: bb.reason,
    });
    if (bb.remediation) {
      recommendations.push(bb.remediation);
    }
  }

  if (hasGitIndexLock) {
    findings.push({
      code: 'GIT_INDEX_LOCK_PRESENT',
      severity: 'medium',
      message: `Potential stale git lock detected at ${gitIndexLock}`,
    });
    recommendations.push('Run heal-common-issues.mjs with --apply --fix-git-index-lock if no git process is active.');
  }

  const payload = {
    ok: findings.filter((item) => item.severity === 'high').length === 0,
    timestamp,
    environment: {
      cwd,
      project_root: cwd,
      platform: process.platform,
      node_version: process.version,
    },
    tools: {
      bd: { available: Boolean(bdPath), path: bdPath || null },
      bb,
    },
    findings,
    recommendations,
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

void main();
