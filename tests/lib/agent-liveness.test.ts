import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  registerAgent,
  extendActivityLease,
  deriveLiveness,
  agentFilePath,
} from '../../src/lib/agent-registry';

async function withTempUserProfile(run: () => Promise<void>): Promise<void> {
  const previous = process.env.USERPROFILE;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-agent-liveness-'));
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

test('extendActivityLease updates last_seen_at and increments version', async () => {
  await withTempUserProfile(async () => {
    const start = '2026-02-14T10:00:00.000Z';
    const next = '2026-02-14T10:05:00.000Z';

    await registerAgent(
      { name: 'active-agent', role: 'infra' },
      { now: () => start }
    );

    const result = await extendActivityLease(
      { agent: 'active-agent' },
      { now: () => next }
    );

    assert.equal(result.ok, true);
    assert.equal(result.data?.last_seen_at, next);
    assert.equal(result.data?.version, 2);

    const raw = await fs.readFile(agentFilePath('active-agent'), 'utf8');
    const parsed = JSON.parse(raw);
    assert.equal(parsed.last_seen_at, next);
  });
});

test('deriveLiveness follows threshold rules (15m/30m default)', () => {
  const now = new Date('2026-02-14T12:00:00Z');
  
  // Active: 14 mins ago
  assert.equal(
    deriveLiveness('2026-02-14T11:46:00Z', now),
    'active'
  );

  // Stale: Exactly 15 mins ago
  assert.equal(
    deriveLiveness('2026-02-14T11:45:00Z', now),
    'stale'
  );

  // Stale: 29 mins ago
  assert.equal(
    deriveLiveness('2026-02-14T11:31:00Z', now),
    'stale'
  );

  // Evicted: Exactly 30 mins ago
  assert.equal(
    deriveLiveness('2026-02-14T11:30:00Z', now),
    'evicted'
  );

  // Evicted: 1 hour ago
  assert.equal(
    deriveLiveness('2026-02-14T11:00:00Z', now),
    'evicted'
  );
});

test('deriveLiveness respects custom staleMinutes', () => {
  const now = new Date('2026-02-14T12:00:00Z');
  const customThreshold = 5; // 5m stale, 10m evicted

  assert.equal(deriveLiveness('2026-02-14T11:56:00Z', now, customThreshold), 'active');
  assert.equal(deriveLiveness('2026-02-14T11:55:00Z', now, customThreshold), 'stale');
  assert.equal(deriveLiveness('2026-02-14T11:51:00Z', now, customThreshold), 'stale');
  assert.equal(deriveLiveness('2026-02-14T11:50:00Z', now, customThreshold), 'evicted');
});
