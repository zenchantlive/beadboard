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
  assert.match(board, /showClosed/, 'board should accept showClosed control');
  assert.match(board, /status !== 'closed' \|\| showClosed/, 'done lane should be hidden when showClosed is false');
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
  assert.match(controls, /ui-field/, 'controls should use shared dark field styling');
  assert.match(controls, /ui-select/, 'selects should use shared dark select styling');
  assert.match(controls, /Next Actionable/);
  assert.match(controls, /nextActionableFeedback/);
});

test('kanban detail includes execution checklist rendering', async () => {
  const detail = await read('src/components/kanban/kanban-detail.tsx');

  assert.match(detail, /Execution checklist/i);
  assert.match(detail, /Summary/i);
  assert.match(detail, /Task metadata/i);
  assert.match(detail, /Timeline/i);
  assert.match(detail, /Edit fields/i);
  assert.match(detail, /Save changes/i);
  assert.match(detail, /projectRoot\?/i);
});
