import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const readmePath = path.resolve('README.md');

test('README documents installation methods', async () => {
  const raw = await fs.readFile(readmePath, 'utf8');
  assert.match(raw, /npm install -g \./i);
  assert.match(raw, /install\/install\.sh/i);
});

test('README documents beadboard launcher commands', async () => {
  const raw = await fs.readFile(readmePath, 'utf8');
  assert.match(raw, /\bbeadboard start\b/i);
  assert.match(raw, /\bbeadboard --version\b/i);
});
