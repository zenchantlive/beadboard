import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('bb daemon attachment ADR defines user-owned host-resident model', async () => {
  const raw = await fs.readFile(path.resolve('docs/adr/2026-03-05-bb-daemon-attachment-model.md'), 'utf8');
  assert.match(raw, /user-owned/i);
  assert.match(raw, /host-resident/i);
  assert.match(raw, /frontend attaches to daemon/i);
  assert.match(raw, /not a centralized hosted runtime/i);
});
