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
      const { port } = address;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

test('beadboard launcher status --json reports running server', async () => {
  const port = await getFreePort();
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', () => resolve()));

  try {
    const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'status', '--json'], {
      env: { ...process.env, BB_PORT: String(port) },
    });
    const payload = JSON.parse(stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.running, true);
    assert.equal(payload.port, port);
    assert.ok(payload.runtimeRoot);
    assert.ok(payload.installMode);
    assert.ok(payload.shimTarget);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});

test('beadboard launcher open --json supports noop mode', async () => {
  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'open', '--json'], {
    env: { ...process.env, BB_OPEN_NOOP: '1', BB_PORT: '3456' },
  });
  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, 'open');
  assert.match(payload.url, /3456/);
});

test('beadboard launcher start text includes dolt guidance', async () => {
  const { stdout } = await execFileAsync(process.execPath, [launcherPath, 'start'], {
    env: { ...process.env, BB_START_NOOP: '1' },
  });
  assert.match(stdout, /Starting BeadBoard dev server/i);
  assert.match(stdout, /bd dolt start/i);
  assert.match(stdout, /beadboard start --dolt/i);
});

test('beadboard launcher start --dolt runs bd dolt start in cwd', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beadboard-start-dolt-'));
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const logPath = path.join(tmpDir, 'bd.log');
  const fakeBdPath = path.join(binDir, 'bd');
  fs.writeFileSync(
    fakeBdPath,
    '#!/usr/bin/env bash\nprintf "%s|%s\\n" "$PWD" "$*" > "$BB_FAKE_BD_LOG"\n',
    'utf8',
  );
  fs.chmodSync(fakeBdPath, 0o755);

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
