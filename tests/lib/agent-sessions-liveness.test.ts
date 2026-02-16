import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { registerAgent } from '../../src/lib/agent-registry';
import { getAgentLivenessMap } from '../../src/lib/agent-sessions';
import type { ActivityEvent } from '../../src/lib/activity';

async function withTempProject(run: (projectRoot: string) => Promise<void>): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-liveness-test-'));
  execSync('bd init --prefix bb --force', { cwd: tempDir, stdio: 'ignore' });

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

test('getAgentLivenessMap prefers telemetry over bead metadata', async () => {
  await withTempProject(async (projectRoot) => {
    const agentId = 'telemetry-agent';
    const regResult = await registerAgent({ name: agentId, role: 'infra' }, { projectRoot });
    assert.equal(regResult.ok, true, `Failed to register agent: ${regResult.error?.message}`);
    
    // Verify bead exists on disk
    const issues = execSync('bd list --label gt:agent --json', { cwd: projectRoot, encoding: 'utf8' });
    console.log('Registered agents:', issues);

    // 1. No heartbeats in stream -> use metadata
    const livenessMap1 = await getAgentLivenessMap(projectRoot, []);
    console.log('Liveness Map 1:', livenessMap1);
    assert.equal(livenessMap1[agentId], 'active');

    // 2. Add an old heartbeat to stream (2 hours ago)
    // Metadata is fresh (just registered), so it should fallback to metadata and stay active.
    const wayOldTime = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    const wayOldHeartbeat: ActivityEvent = {
      id: randomUUID(),
      kind: 'heartbeat',
      beadId: `bb-${agentId}`,
      beadTitle: `Agent: ${agentId}`,
      projectId: projectRoot,
      projectName: 'test',
      timestamp: wayOldTime,
      actor: agentId,
      payload: { message: 'running' }
    };

    const livenessMap2 = await getAgentLivenessMap(projectRoot, [wayOldHeartbeat]);
    assert.equal(livenessMap2[agentId], 'active', 'Should fallback to fresh metadata if telemetry is ancient');

    // 3. Fresh heartbeat should stay active
    const nowTime = new Date().toISOString();
    const freshHeartbeat: ActivityEvent = {
      id: randomUUID(),
      kind: 'heartbeat',
      beadId: `bb-${agentId}`,
      beadTitle: `Agent: ${agentId}`,
      projectId: projectRoot,
      projectName: 'test',
      timestamp: nowTime,
      actor: agentId,
      payload: { message: 'running' }
    };

    const livenessMap3 = await getAgentLivenessMap(projectRoot, [freshHeartbeat]);
    assert.equal(livenessMap3[agentId], 'active');
  });
});
