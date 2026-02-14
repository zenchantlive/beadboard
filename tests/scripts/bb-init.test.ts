import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const projectRoot = path.resolve(__dirname, '../../');
const initScript = path.join(projectRoot, 'scripts', 'bb-init.mjs');

async function withTempRegistry(run: (tempDir: string) => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-init-lease-'));
  process.env.USERPROFILE = tempDir;

  // Initialize a fake git repo
  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  await fs.writeFile(path.join(tempDir, 'dummy'), 'data');
  execSync('git add dummy && git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });

  try {
    await run(tempDir);
  } finally {
    process.env.USERPROFILE = previous;
    // Cleanup with retries for Windows
    for (let i = 0; i < 5; i++) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
}

test('LEASE: bb-init --register updates liveness and starts lease', async () => {
  await withTempRegistry(async (tempDir) => {
    const agentId = 'lease-agent';
    const cmd = `node ${initScript} --register ${agentId} --role backend --json`;
    
    const out = execSync(cmd, { 
      cwd: tempDir, 
      encoding: 'utf8',
      env: { ...process.env, BB_REPO: projectRoot }
    });
    const result = JSON.parse(out);

    assert.equal(result.ok, true);
    assert.equal(result.lease.status, 'active');

    // Verify Registry Entry exists and has a timestamp
    const agentFile = path.join(tempDir, '.beadboard', 'agent', 'agents', `${agentId}.json`);
    const agentData = JSON.parse(await fs.readFile(agentFile, 'utf8'));
    assert.equal(agentData.agent_id, agentId);
    assert.ok(agentData.last_seen_at);
  });
});

test('LEASE: activity-lease command works via CLI', async () => {
  await withTempRegistry(async (tempDir) => {
    const agentId = 'cli-agent';
    // Register
    execSync(`node ${initScript} --register ${agentId} --role test --json`, { 
      cwd: tempDir,
      env: { ...process.env, BB_REPO: projectRoot }
    });

    const agentFile = path.join(tempDir, '.beadboard', 'agent', 'agents', `${agentId}.json`);
    const firstSeen = JSON.parse(await fs.readFile(agentFile, 'utf8')).last_seen_at;

    // Extend lease
    await new Promise(r => setTimeout(r, 100)); // Ensure clock tick
    const bbPath = path.join(projectRoot, 'tools', 'bb.ts');
    execSync(`npx tsx ${bbPath} agent activity-lease --agent ${agentId} --json`, { 
      cwd: tempDir,
      env: { ...process.env, BB_REPO: projectRoot }
    });

    const secondSeen = JSON.parse(await fs.readFile(agentFile, 'utf8')).last_seen_at;
    assert.notEqual(firstSeen, secondSeen, 'Lease extension should update last_seen_at');
  });
});