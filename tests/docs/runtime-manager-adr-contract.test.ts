import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('runtime manager ADR exists and declares runtime home strategy', async () => {
  const raw = await fs.readFile(path.resolve('docs/adr/2026-03-03-runtime-manager-global-install.md'), 'utf8');
  assert.match(raw, /~\/\.beadboard\/runtime/i);
  assert.match(raw, /npm i -g beadboard/i);
  assert.match(raw, /legacy repo-bound shim migration/i);
});
