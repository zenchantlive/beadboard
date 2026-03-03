import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const workflowPath = path.resolve('.github/workflows/installer-smoke.yml');

test('installer smoke CI workflow exists', async () => {
  const raw = await fs.readFile(workflowPath, 'utf8');
  assert.match(raw, /name:\s*Installer Smoke/i);
});

test('installer smoke CI includes ubuntu and windows jobs', async () => {
  const raw = await fs.readFile(workflowPath, 'utf8');
  assert.match(raw, /ubuntu-latest/i);
  assert.match(raw, /windows-latest/i);
  assert.match(raw, /beadboard doctor --json/i);
});
