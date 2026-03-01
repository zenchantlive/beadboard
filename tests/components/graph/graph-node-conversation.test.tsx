import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

const NODE_CARD = path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx');
const RIGHT_PANEL = path.join(process.cwd(), 'src/components/activity/contextual-right-panel.tsx');
const SHELL = path.join(process.cwd(), 'src/components/shared/unified-shell.tsx');
const WORKFLOW_GRAPH = path.join(process.cwd(), 'src/components/shared/workflow-graph.tsx');
const PAGE = path.join(process.cwd(), 'src/app/page.tsx');

// ── GraphNodeCard: conversation icon ────────────────────────────────────────

test('GraphNodeCard - has MessageSquare conversation icon', async () => {
  const src = await fs.readFile(NODE_CARD, 'utf-8');
  assert.ok(src.includes('MessageSquare'), 'must import and render MessageSquare');
});

test('GraphNodeCard - does NOT use useUrlState (ReactFlow context/timing issues)', async () => {
  const src = await fs.readFile(NODE_CARD, 'utf-8');
  assert.ok(
    !src.includes('useUrlState'),
    'GraphNodeCard must NOT call useUrlState — hooks inside ReactFlow node renderers have context issues; use prop-threading through data instead'
  );
});

test('GraphNodeCard - reads onConversationOpen callback from node data', async () => {
  const src = await fs.readFile(NODE_CARD, 'utf-8');
  assert.ok(
    src.includes('onConversationOpen'),
    'GraphNodeCard must read onConversationOpen from data (not from hooks)'
  );
  assert.ok(
    src.includes('onConversationOpen?.(id)') || src.includes('onConversationOpen(id)'),
    'onConversationOpen must be called with the node id on icon click'
  );
});

test('GraphNodeCard - stops event propagation on icon click', async () => {
  const src = await fs.readFile(NODE_CARD, 'utf-8');
  assert.ok(
    src.includes('stopPropagation'),
    'must call e.stopPropagation() to prevent ReactFlow from swallowing the click'
  );
});

test('GraphNodeCard - highlights icon when selectedTaskId matches this node', async () => {
  const src = await fs.readFile(NODE_CARD, 'utf-8');
  assert.ok(
    src.includes('selectedTaskId') || src.includes('isConvOpen'),
    'must use selectedTaskId from data for icon highlight, not local URL state'
  );
});

// ── WorkflowGraph: threads callbacks into node data ─────────────────────────

test('WorkflowGraph - passes onConversationOpen into node data', async () => {
  const src = await fs.readFile(WORKFLOW_GRAPH, 'utf-8');
  assert.ok(
    src.includes('onConversationOpen'),
    'WorkflowGraph must pass onConversationOpen into node data so GraphNodeCard can call it without hooks'
  );
});

test('WorkflowGraph - passes selectedTaskId into node data for icon highlight', async () => {
  const src = await fs.readFile(WORKFLOW_GRAPH, 'utf-8');
  assert.ok(
    src.includes('selectedTaskId'),
    'WorkflowGraph must pass selectedTaskId into node data so GraphNodeCard can highlight the active conversation icon'
  );
});

// ── ContextualRightPanel: back button wired ──────────────────────────────────

test('ContextualRightPanel - task branch onClose is NOT a no-op', async () => {
  const src = await fs.readFile(RIGHT_PANEL, 'utf-8');
  const hasNoOp = /onClose=\{.*\(\)\s*=>\s*\{\s*\}\s*\}/.test(src);
  assert.ok(
    !hasNoOp,
    'onClose must not be a no-op () => {} — the back button in ThreadDrawer would do nothing'
  );
});

test('ContextualRightPanel - task branch onClose clears taskId', async () => {
  const src = await fs.readFile(RIGHT_PANEL, 'utf-8');
  assert.ok(
    src.includes('setTaskId(null)') || src.includes('clearSelection'),
    'onClose must call setTaskId(null) so the back button navigates back to the activity feed'
  );
});

test('ContextualRightPanel - swarm branch onClose clears swarmId', async () => {
  const src = await fs.readFile(RIGHT_PANEL, 'utf-8');
  assert.ok(
    src.includes('setSwarmId(null)') || src.includes('clearSelection'),
    'SwarmIdBranch onClose must call setSwarmId(null)'
  );
});

test('ContextualRightPanel - taskId if-branch appears before epicId if-branch', async () => {
  const src = await fs.readFile(RIGHT_PANEL, 'utf-8');
  const taskIfIdx = src.indexOf('if (taskId)');
  const epicIfIdx = src.indexOf('if (epicId)');
  assert.ok(taskIfIdx !== -1, 'must have an if (taskId) branch');
  assert.ok(epicIfIdx !== -1, 'must have an if (epicId) branch');
  assert.ok(
    taskIfIdx < epicIfIdx,
    'if (taskId) check must come before if (epicId) check — task conversation takes priority over epic feed when user clicks conversation icon in graph'
  );
});

// ── UnifiedShell: right panel always visible ─────────────────────────────────

test('UnifiedShell - right panel NOT gated behind panel === open', async () => {
  const src = await fs.readFile(SHELL, 'utf-8');
  const hasGate = /panel\s*===\s*['"]open['"]\s*&&\s*[\s\S]{0,60}<div[^>]*rightWidth/.test(src);
  assert.ok(!hasGate, 'Right panel div must render unconditionally');
});

test('UnifiedShell - passes taskId to ContextualRightPanel', async () => {
  const src = await fs.readFile(SHELL, 'utf-8');
  assert.ok(src.includes('taskId={taskId}'), 'must pass taskId so right panel shows conversation on selection');
});

// ── page.tsx: Suspense boundary for useSearchParams ──────────────────────────

test('page.tsx - wraps UnifiedShell in Suspense for useSearchParams', async () => {
  const src = await fs.readFile(PAGE, 'utf-8');
  assert.ok(
    src.includes('Suspense'),
    'page.tsx must wrap UnifiedShell in <Suspense> — without it, useSearchParams updates from deep components (like inside ReactFlow nodes) may not propagate correctly'
  );
});
