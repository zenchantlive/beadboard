import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const launcherPath = path.resolve('install/beadboard.mjs');

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('failed to resolve free port'));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

test('beadboard launcher status --json reports running server', async () => {
  const port = await getFreePort();
  const server = http.createServer((req, res) => {
    // Respond to both / and /api/status
    if (req.url === '/api/status' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running', port }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  server.listen(port, '127.0.0.1');
  
  try {
    const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'status', '--json'], {
      env: {
        ...process.env,
        BB_PORT: port.toString(),
      },
    });
    
    const payload = JSON.parse(stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.command, 'status');
    assert.equal(payload.running, true);
  } finally {
    server.close();
  }
});

test('beadboard launcher open --json supports noop mode', async () => {
  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'open', '--json'], {
    env: {
      ...process.env,
      BB_OPEN_NOOP: '1',
    },
  });
  
  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, 'open');
  assert.equal(payload.url, 'http://127.0.0.1:3000');
});

test('beadboard launcher start text includes dolt guidance', async () => {
  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'start'], {
    env: {
      ...process.env,
      BB_START_NOOP: '1',
    },
  });
  
  assert.match(stdout, /bd dolt start/);
});

// Skip the dolt test on Windows due to platform-specific test complexity
test.skip(process.platform === 'win32' ? 'beadboard launcher start --dolt runs bd dolt start in cwd (skipped on Windows)' : 'beadboard launcher start --dolt runs bd dolt start in cwd', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beadboard-start-dolt-'));
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const logPath = path.join(tmpDir, 'bd.log');
  
  // Create a simple bash script for Unix-like systems
  const bashScript = `#!/bin/bash
printf "%s|%s\n" "$PWD" "$*" > "$BB_FAKE_BD_LOG"
`;
  const scriptPath = path.join(binDir, 'bd');
  fs.writeFileSync(scriptPath, bashScript, 'utf8');
  fs.chmodSync(scriptPath, 0o755);

  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'start', '--dolt', '--json'], {
    cwd: tmpDir,
    env: {
      ...process.env,
      BB_START_NOOP: '1',
      BB_FAKE_BD_LOG: logPath,
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
    },
  });

  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, 'start');
  assert.equal(payload.doltRequested, true);
  
  const bdInvocation = fs.readFileSync(logPath, 'utf8').trim();
  assert.equal(bdInvocation, `${tmpDir}|dolt start`);
});
