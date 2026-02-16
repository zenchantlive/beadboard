import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'swarm-simple-'));
  execSync('git init', { cwd: tempDir, stdio: 'ignore' });
  await fs.writeFile(path.join(tempDir, 'dummy'), 'data');
  execSync('git add . && git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });
  execSync('bd init --prefix bb- --force', { cwd: tempDir, stdio: 'ignore' });
  execSync('bd migrate --update-repo-id', { cwd: tempDir, stdio: 'ignore' });

  try {
    await run(tempDir);
  } finally {
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

test('basic bd update label works', async () => {
  await withTempProject(async (projectRoot) => {
    // Create a simple issue
    execSync('bd create --title "Test Issue" --id bb-test-issue', { cwd: projectRoot, stdio: 'ignore' });
    
    // Update with label
    execSync('bd update bb-test-issue --add-label swarm:test-123', { cwd: projectRoot, stdio: 'ignore' });
    execSync('bd admin flush', { cwd: projectRoot, stdio: 'ignore' });
    
    // Verify
    const showOut = execSync('bd show bb-test-issue --json', { cwd: projectRoot, encoding: 'utf8' });
    const issue = JSON.parse(showOut);
    const swarmLabel = issue.labels?.find((l: string) => l.startsWith('swarm:'));
    assert.ok(swarmLabel, 'Should have swarm label');
    assert.equal(swarmLabel, 'swarm:test-123');
  });
});

test('registerAgent and add label via bd update', async () => {
  await withTempProject(async (projectRoot) => {
    const { registerAgent } = await import('../../src/lib/agent-registry');
    
    const regResult = await registerAgent({ name: 'label-test-agent', role: 'tester' }, { projectRoot });
    assert.equal(regResult.ok, true, 'Register should succeed');
    
    // Add label directly via bd
    execSync('bd update bb-label-test-agent --add-label swarm:direct-test', { cwd: projectRoot, stdio: 'ignore' });
    execSync('bd admin flush', { cwd: projectRoot, stdio: 'ignore' });
    
    // Verify
    const showOut = execSync('bd show bb-label-test-agent --json', { cwd: projectRoot, encoding: 'utf8' });
    const agent = JSON.parse(showOut);
    console.log('Agent labels:', agent.labels);
    const swarmLabel = agent.labels?.find((l: string) => l.startsWith('swarm:'));
    assert.ok(swarmLabel, 'Agent should have swarm label');
  });
});
