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
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-init-passive-'));
  process.env.USERPROFILE = tempDir;

  // Initialize a fake git repo
  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  await fs.writeFile(path.join(tempDir, 'dummy'), 'data');
  execSync('git add dummy && git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });

  try {
    await run(tempDir);
  } finally {
    process.env.USERPROFILE = previous;
    await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  }
}

test('PASSIVE: bb-init --register updates liveness via side-effect', async (t) => {
  await withTempRegistry(async (tempDir) => {
    const agentId = 'passive-agent';
    const cmd = `node ${initScript} --register ${agentId} --role backend --json`;
    
    const out = execSync(cmd, { 
      cwd: tempDir, 
      encoding: 'utf8',
      env: { ...process.env, BB_REPO: projectRoot }
    });
    const result = JSON.parse(out);

    assert.equal(result.ok, true);
    assert.equal(result.heartbeat.status, 'passive');

    // Verify Registry Entry exists and has a timestamp
    const agentFile = path.join(tempDir, '.beadboard', 'agent', 'agents', `${agentId}.json`);
    const agentData = JSON.parse(await fs.readFile(agentFile, 'utf8'));
    assert.equal(agentData.agent_id, agentId);
    assert.ok(agentData.last_seen_at);
  });
});

test('PASSIVE: bb-init --adopt rejection still works with noise filtering', async (t) => {
  await withTempRegistry(async (tempDir) => {
    const agentId = 'noise-agent';
    
    // Register first
    execSync(`node ${initScript} --register ${agentId} --role test --json`, { 
      cwd: tempDir,
      env: { ...process.env, BB_REPO: projectRoot }
    });

    // Rejects with only .beadboard noise
    try {
      execSync(`node ${initScript} --adopt ${agentId} --non-interactive --json`, { 
        cwd: tempDir, 
        stdio: 'pipe',
        env: { ...process.env, BB_REPO: projectRoot }
      });
      assert.fail('Should have rejected adoption');
    } catch (err: any) {
      const res = JSON.parse(err.stdout.toString());
      assert.equal(res.error.code, 'ADOPTION_REJECTED');
    }

    // Accepts with real change
    await fs.writeFile(path.join(tempDir, 'real.ts'), 'code');
    const adoptOut = execSync(`node ${initScript} --adopt ${agentId} --non-interactive --json`, { 
      cwd: tempDir, 
      env: { ...process.env, BB_REPO: projectRoot }
    });
    assert.equal(JSON.parse(adoptOut).ok, true);
  });
});
