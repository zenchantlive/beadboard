import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { registerAgent } from '../../src/lib/agent-registry';

const projectRoot = path.resolve(__dirname, '../../');
const initScript = path.join(projectRoot, 'scripts', 'bb-init.mjs');

async function withTempRegistry(run: (tempDir: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-init-lease-'));
  
  // Initialize a fake git repo first
  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  await fs.writeFile(path.join(tempDir, 'dummy'), 'data');
  execSync('git add dummy && git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });

  // Initialize bd rig with explicit prefix
  execSync('bd init --prefix bb- --force', { cwd: tempDir, stdio: 'ignore' });
  execSync('bd migrate --update-repo-id', { cwd: tempDir, stdio: 'ignore' });

  // Create a dummy issue to force a flush
  execSync('bd create --title "Warmup" --id bb-warmup', { cwd: tempDir, stdio: 'ignore' });
  execSync('bd admin flush', { cwd: tempDir, stdio: 'ignore' });

  try {
    await run(tempDir);
  } finally {
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

test('REGISTRY: registerAgent includes rig fingerprint', async () => {
  await withTempRegistry(async (projectRoot) => {
    const agentId = 'direct-agent';
    const rigId = 'test-rig-123';
    
    const result = await registerAgent({
      name: agentId,
      role: 'tester',
      rig: rigId
    }, { projectRoot });

    assert.equal(result.ok, true, `registerAgent failed: ${result.error?.message}`);
    assert.equal(result.data?.rig, rigId);

    // Verify persistence via bd list
    const listOut = execSync('bd list --all --json', { cwd: projectRoot, encoding: 'utf8' });
    const agents = JSON.parse(listOut);
    const agentData = agents.find((a: { id: string }) => a.id.includes(agentId));
    
    assert.ok(agentData, `Agent ${agentId} should exist in list`);
    const rigLabel = agentData.labels?.find((l: string) => l.startsWith('rig:'));
    assert.ok(rigLabel, `Rig fingerprint should be present in labels`);
    assert.equal(rigLabel, `rig:${rigId}`);
  });
});
test('FINGERPRINT: bb-init --register includes rig fingerprint', async () => {
  await withTempRegistry(async (tempDir) => {
    const agentId = 'fingerprint-agent';
    const cmd = `node ${initScript} --register ${agentId} --role test --project-root ${tempDir} --json`;
    
    execSync(cmd, { 
      cwd: tempDir, 
      env: { ...process.env, BB_REPO: projectRoot, BD_NO_DAEMON: 'false' }
    });

    // Verify Registry Entry exists via bd list
    const listOut = execSync('bd list --all --json', { cwd: tempDir, encoding: 'utf8' });
    const agents = JSON.parse(listOut);
    const agentData = agents.find((a: { id: string }) => a.id.includes(agentId));
    
    // Check for fingerprint fields
    assert.ok(agentData, `Agent ${agentId} should exist in list`);
    const rigLabel = agentData.labels?.find((l: string) => l.startsWith('rig:'));
    assert.ok(rigLabel, 'Rig fingerprint should be present in labels');
    const rigValue = rigLabel?.split(':')[1];
    assert.ok(rigValue?.includes(os.platform()), `Rig ${rigValue} should include platform ${os.platform()}`);
  });
});