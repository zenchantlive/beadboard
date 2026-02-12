import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), 'utf8');
}

test('kanban board uses intentional horizontal scroll affordances', async () => {
  const board = await read('src/components/kanban/kanban-board.tsx');

  assert.match(board, /snap-x/);
  assert.match(board, /overflow-x-auto/);
});

test('kanban page defines mobile detail drawer behavior', async () => {
  const page = await read('src/components/kanban/kanban-page.tsx');

  assert.match(page, /fixed inset-0/);
  assert.match(page, /lg:hidden/);
});

test('kanban controls use fluid full-width sizing on small viewports', async () => {
  const controls = await read('src/components/kanban/kanban-controls.tsx');

  assert.match(controls, /w-full/);
  assert.match(controls, /sm:w-/);
});
