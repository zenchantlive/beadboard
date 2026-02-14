import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { registerAgent, heartbeatAgent } from '../../src/lib/agent-registry';
import { reserveAgentScope } from '../../src/lib/agent-reservations';

async function withTempUserProfile(run: () => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-takeover-'));
  process.env.USERPROFILE = tempDir;

  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previous;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test('takeover rules based on owner liveness', async () => {
  await withTempUserProfile(async () => {
    // T=0: Register Owner
    const t0 = '2026-02-14T10:00:00.000Z';
    await registerAgent({ name: 'owner', role: 'infra' }, { now: () => t0 });
    
    // T=1: Owner reserves scope
    const t1 = '2026-02-14T10:01:00.000Z';
    await reserveAgentScope(
      { agent: 'owner', scope: 'src/lib', bead: 'bb-1' },
      { now: () => t1 }
    );

    // T=2: Invader tries takeover while Owner is ACTIVE (1 min since last seen)
    const t2 = '2026-02-14T10:02:00.000Z';
    await registerAgent({ name: 'invader', role: 'infra' }, { now: () => t2 });
    
    const activeTakeover = await reserveAgentScope(
      { agent: 'invader', scope: 'src/lib', bead: 'bb-2', takeoverStale: true },
      { now: () => t2 }
    );
    assert.equal(activeTakeover.ok, false);
    assert.equal(activeTakeover.error?.code, 'RESERVATION_CONFLICT');
    assert.match(activeTakeover.error?.message || '', /already reserved by.*owner/);

    // T=17: Owner is now STALE (16 mins since last seen at T=1)
    const t17 = '2026-02-14T10:17:00.000Z';
    
    // Takeover without flag fails
    const staleNoFlag = await reserveAgentScope(
      { agent: 'invader', scope: 'src/lib', bead: 'bb-2', takeoverStale: false },
      { now: () => t17 }
    );
    assert.equal(staleNoFlag.ok, false);
    assert.equal(staleNoFlag.error?.code, 'RESERVATION_STALE_FOUND');

    // Takeover with flag succeeds
    const staleWithFlag = await reserveAgentScope(
      { agent: 'invader', scope: 'src/lib', bead: 'bb-2', takeoverStale: true },
      { now: () => t17 }
    );
    assert.equal(staleWithFlag.ok, true);
    assert.equal(staleWithFlag.data?.agent_id, 'invader');
  });
});

test('takeover succeeds when owner is EVICTED', async () => {
    await withTempUserProfile(async () => {
      const t0 = '2026-02-14T10:00:00.000Z';
      await registerAgent({ name: 'owner', role: 'infra' }, { now: () => t0 });
      await reserveAgentScope({ agent: 'owner', scope: 'src/lib', bead: 'bb-1' }, { now: () => t0 });
  
      // T=31: Owner is EVICTED (31 mins since last seen)
      const t31 = '2026-02-14T10:31:00.000Z';
      await registerAgent({ name: 'invader', role: 'infra' }, { now: () => t31 });
  
      const evictedTakeover = await reserveAgentScope(
        { agent: 'invader', scope: 'src/lib', bead: 'bb-2', takeoverStale: true },
        { now: () => t31 }
      );
      assert.equal(evictedTakeover.ok, true);
      assert.equal(evictedTakeover.data?.agent_id, 'invader');
    });
  });
