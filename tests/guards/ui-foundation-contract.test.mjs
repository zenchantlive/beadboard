import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), 'utf8');
}

test('layout uses Noto Sans without JetBrains Mono dependency', async () => {
  const layout = await read('src/app/layout.tsx');

  assert.match(layout, /Noto_Sans/, 'should use Noto Sans font family');
  assert.match(layout, /--font-ui/, 'should expose ui font css variable');
  assert.doesNotMatch(layout, /JetBrains_Mono/, 'should not include JetBrains Mono');
  assert.doesNotMatch(layout, /--font-mono/, 'should not expose mono font css variable from layout');
});

test('global stylesheet defines aero chrome foundation tokens and anti-banding layers', async () => {
  const css = await read('src/app/globals.css');

  assert.match(css, /--bg-base:/, 'should define matte base token');
  assert.match(css, /--glass-base:/, 'should define glass surface token');
  assert.match(css, /--edge-top:/, 'should define top chrome edge token');
  assert.match(css, /--font-ui-stack:/, 'should define ui font stack token');
  assert.match(css, /--font-mono-stack:/, 'should define mono font stack token');
  assert.match(css, /font-family:\s*var\(--font-ui-stack\)/, 'body should consume ui font token');
  assert.match(css, /body::before/, 'should define anti-banding grid layer');
  assert.match(css, /body::after/, 'should define anti-banding noise layer');
  assert.match(css, /--status-rdy-glow:/, 'should define ready glow token');
  assert.match(css, /--status-blk-glow:/, 'should define blocked glow token');
  assert.match(css, /--status-wip-glow:/, 'should define in-progress glow token');
  assert.match(css, /--elevation-tight:/, 'should define tight elevation token');
  assert.match(css, /--elevation-ambient:/, 'should define ambient elevation token');
  assert.match(css, /\.glass-panel/, 'should define reusable glass panel primitive');
});

test('kanban and graph surfaces apply semantic typography classes', async () => {
  const kanbanControls = await read('src/components/kanban/kanban-controls.tsx');
  const kanbanCard = await read('src/components/kanban/kanban-card.tsx');
  const graphCardGrid = await read('src/components/graph/task-card-grid.tsx');
  const graphNodeCard = await read('src/components/graph/graph-node-card.tsx');

  assert.match(kanbanControls, /ui-text/, 'kanban controls should use ui-text class');
  assert.match(kanbanCard, /system-data/, 'kanban card should use system-data class for metadata');
  assert.match(graphCardGrid, /ui-text/, 'graph task grid should use ui-text class for prose labels');
  assert.match(graphNodeCard, /system-data/, 'graph node card should use system-data class for machine data');
});
