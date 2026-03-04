import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Skip on Windows - ESM path handling issues with tsx loader
if (process.platform === 'win32') {
  test.skip('bb-mail integration contract: send -> inbox -> read -> ack lifecycle', () => {
    console.log('Skipping bb-mail integration test on Windows - ESM path handling limitation');
  });
} else {

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve('.');
const shimPath = path.resolve('skills/beadboard-driver/scripts/bb-mail-shim.mjs');

async function withTempDir(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-mail-it-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function randomAgent(base) {
  return `${base}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`.toLowerCase();
}

async function writeBbProxy(binDir) {
  const shimPath = path.resolve('skills/beadboard-driver/scripts/bb-mail-shim.mjs');
  const cliPath = path.resolve('src/cli/beadboard-cli.ts');
  const tsxLoader = path.resolve('node_modules/tsx/dist/loader.mjs');

  await fs.mkdir(binDir, { recursive: true });

  const bbPath = path.join(binDir, 'bb');
  await fs.writeFile(
    bbPath,
    `#!/usr/bin/env sh\nexec node --import "${tsxLoader}" "${cliPath}" "$@"\n`,
    'utf8',
  );
  await fs.chmod(bbPath, 0o755);

  if (process.platform === 'win32') {
    const bbCmdPath = path.join(binDir, 'bb.cmd');
    await fs.writeFile(
      bbCmdPath,
      `@echo off\r\nnode --import "${tsxLoader}" "${cliPath}" %*\r\n`,
      'utf8',
    );
  }
}

async function runBb(args, env) {
  // Run bb CLI via the proxy script (handles Windows/Unix differences)
  // On Windows, .cmd files require shell: true when using execFile
  const bbCmd = process.platform === 'win32' ? 'bb.cmd' : 'bb';
  // Extract binDir from PATH
  const binDir = env.PATH.split(path.delimiter)[0];
  const bbPath = path.join(binDir, bbCmd);
  const options = { cwd: repoRoot, env };
  if (process.platform === 'win32') {
    options.shell = true;
  }
  const { stdout } = await execFileAsync(bbPath, args, options);
  return stdout;
}

test('bb-mail integration contract: send -> inbox -> read -> ack lifecycle', async () => {
  await withTempDir(async (root) => {
    const binDir = path.join(root, 'bin');
    const homeDir = path.join(root, 'home');
    await writeBbProxy(binDir);

    const sender = randomAgent('maf8-sender');
    const recipient = randomAgent('maf8-recipient');

    const baseEnv = {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
      HOME: homeDir,
      USERPROFILE: homeDir,
    };

    const senderRegRaw = await runBb(['agent', 'register', '--name', sender, '--role', 'ui', '--json'], baseEnv);
    const senderReg = JSON.parse(senderRegRaw);
    assert.equal(senderReg.ok, true);

    const recipientRegRaw = await runBb(['agent', 'register', '--name', recipient, '--role', 'graph', '--json'], baseEnv);
    const recipientReg = JSON.parse(recipientRegRaw);
    assert.equal(recipientReg.ok, true);

    await execFileAsync(
      process.execPath,
      [
        shimPath,
        'send',
        '--to',
        recipient,
        '--bead',
        'beadboard-maf.8',
        '--category',
        'HANDOFF',
        '--subject',
        'Contract handoff',
        '--body',
        'Please validate and ack.',
      ],
      {
        cwd: repoRoot,
        env: { ...baseEnv, BB_AGENT: sender },
      },
    );

    const inboxResult = await execFileAsync(process.execPath, [shimPath, 'inbox', '--state', 'unread', '--limit', '10'], {
      cwd: repoRoot,
      env: { ...baseEnv, BB_AGENT: recipient },
    });

    const messageMatch = inboxResult.stdout.match(/\[([^\]]+)\]/);
    assert.ok(messageMatch, `expected message id in inbox output, got: ${inboxResult.stdout}`);
    const messageId = messageMatch[1];

    await execFileAsync(process.execPath, [shimPath, 'read', messageId], {
      cwd: repoRoot,
      env: { ...baseEnv, BB_AGENT: recipient },
    });

    await execFileAsync(process.execPath, [shimPath, 'ack', messageId], {
      cwd: repoRoot,
      env: { ...baseEnv, BB_AGENT: recipient },
    });

    const ackedRaw = await runBb(['agent', 'inbox', '--agent', recipient, '--state', 'acked', '--limit', '25', '--json'], baseEnv);
    const acked = JSON.parse(ackedRaw);

    assert.equal(acked.ok, true);
    assert.ok(Array.isArray(acked.data));
    assert.ok(acked.data.some((message) => message.message_id === messageId && message.state === 'acked'));
  });
});

} // end else block (non-Windows)
