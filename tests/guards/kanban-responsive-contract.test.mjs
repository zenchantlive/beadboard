import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), 'utf8');
}

test('kanban board uses expandable vertical swimlanes', async () => {
  const board = await read('src/components/kanban/kanban-board.tsx');

  assert.match(board, /aria-expanded/);
  assert.match(board, /onActivateStatus/);
  assert.match(board, /max-h-\[50vh\]/);
});

test('kanban page defines mobile detail drawer behavior', async () => {
  const page = await read('src/components/kanban/kanban-page.tsx');

  assert.match(page, /fixed inset-0/);
  assert.match(page, /lg:hidden/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(22rem,26rem\)\]/);
  assert.match(page, /lg:border-l/);
});

test('kanban controls use fluid full-width sizing on small viewports', async () => {
  const controls = await read('src/components/kanban/kanban-controls.tsx');

  assert.match(controls, /w-full/);
  assert.match(controls, /sm:w-/);
});
