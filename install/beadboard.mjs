#!/usr/bin/env node

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function getRuntimeMetadata() {
  const installHome = process.env.BB_INSTALL_HOME || process.env.HOME || process.env.USERPROFILE || '';
  const version = (process.env.BB_RUNTIME_VERSION || '0.1.0').trim();
  const runtimeRoot =
    process.env.BB_RUNTIME_ROOT || path.join(installHome, '.beadboard', 'runtime', version);
  const shimTarget = process.env.BB_SHIM_TARGET || __filename;
  const installMode =
    process.env.BB_INSTALL_MODE ||
    (__dirname.includes(`${path.sep}.beadboard${path.sep}runtime${path.sep}`)
      ? 'runtime-managed'
      : 'repo-shim');
  return { runtimeRoot, shimTarget, installMode };
}

function parseArgs(argv) {
  const args = [...argv];
  const jsonIndex = args.indexOf('--json');
  const json = jsonIndex !== -1;
  if (json) args.splice(jsonIndex, 1);
  return {
    command: args[0] || 'help',
    json,
  };
}

function output(payload, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  if (payload.ok === false) {
    process.stderr.write(`${payload.error}\n`);
    return;
  }
  if (payload.command === 'status') {
    const statusLines = [
      'BeadBoard status',
      `Running: ${payload.running ? 'yes' : 'no'}`,
      `URL: ${payload.url}`,
      `Port: ${payload.port}`,
      `Install Mode: ${payload.installMode}`,
      `Runtime Root: ${payload.runtimeRoot}`,
      `Shim Target: ${payload.shimTarget}`,
      `bd Available: ${payload.bd?.available ? 'yes' : 'no'}`,
      `bd Path: ${payload.bd?.path || '(not found)'}`,
      `Project CWD: ${payload.bd?.project?.cwd || process.cwd()}`,
      `.beads Dir: ${payload.bd?.project?.hasBeadsDir ? 'yes' : 'no'}`,
      `.beads DB: ${payload.bd?.project?.hasBeadsDb ? 'yes' : 'no'}`,
    ];
    process.stdout.write(`${statusLines.join('\n')}\n`);
    return;
  }
  if (payload.command === 'open') {
    process.stdout.write(`Open ${payload.url}\n`);
    return;
  }
  if (payload.command === 'start') {
    process.stdout.write('Starting BeadBoard dev server...\n');
    return;
  }
  process.stdout.write('Usage: beadboard <start|open|status> [--json]\n');
}

function getPort() {
  const value = Number.parseInt(process.env.BB_PORT || '3000', 10);
  return Number.isFinite(value) ? value : 3000;
}

function splitPathVariable(value) {
  if (!value) return [];
  return value.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean);
}

function resolveBdPath() {
  const pathEntries = splitPathVariable(process.env.PATH || '');
  const candidates =
    process.platform === 'win32'
      ? ['bd.cmd', 'bd.exe', 'bd.ps1', 'bd.bat', 'bd']
      : ['bd'];
  for (const dir of pathEntries) {
    for (const candidate of candidates) {
      const fullPath = path.join(dir, candidate);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }
  return null;
}

function getBdDiagnostics() {
  const beadsDir = path.resolve(process.cwd(), '.beads');
  const dbPath = path.join(beadsDir, 'beads.db');
  const bdPath = resolveBdPath();
  return {
    available: Boolean(bdPath),
    path: bdPath,
    project: {
      cwd: process.cwd(),
      hasBeadsDir: fs.existsSync(beadsDir),
      hasBeadsDb: fs.existsSync(dbPath),
    },
  };
}

function statusRequest(port) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path: '/',
        timeout: 1200,
      },
      (res) => {
        res.resume();
        resolve({ running: true, statusCode: res.statusCode || 200 });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ running: false, statusCode: null });
    });
    req.on('error', () => resolve({ running: false, statusCode: null }));
  });
}

function openUrl(url) {
  if (process.env.BB_OPEN_NOOP === '1') return;

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
}

async function main() {
  const { command, json } = parseArgs(process.argv.slice(2));
  const port = getPort();
  const url = `http://127.0.0.1:${port}`;
  const runtime = getRuntimeMetadata();

  if (command === 'start') {
    const startRoot = fs.existsSync(runtime.runtimeRoot) ? runtime.runtimeRoot : repoRoot;
    const child = spawn('npm', ['run', 'dev'], {
      cwd: startRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    output({ ok: true, command: 'start' }, json);
    return;
  }

  if (command === 'open') {
    openUrl(url);
    output({ ok: true, command: 'open', url }, json);
    return;
  }

  if (command === 'status') {
    const probe = await statusRequest(port);
    const payload = {
      ok: true,
      command: 'status',
      running: probe.running,
      statusCode: probe.statusCode,
      url,
      port,
      runtimeRoot: runtime.runtimeRoot,
      installMode: runtime.installMode,
      shimTarget: runtime.shimTarget,
      bd: getBdDiagnostics(),
    };
    output(payload, json);
    process.exit(probe.running ? 0 : 1);
    return;
  }

  output({ ok: true, command: 'help' }, json);
}

void main();
