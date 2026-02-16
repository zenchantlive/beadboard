import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

async function read(relativePath) {
  return fs.readFile(path.join(ROOT, relativePath), 'utf8');
}

test('graph page defines tabbed layout, epic chips, and mobile fallback', async () => {
  const graphPage = await read('src/components/graph/dependency-graph-page.tsx');

  // Tabbed layout: Tasks and Dependencies tabs
  assert.match(graphPage, /WorkflowTabs/, 'should use WorkflowTabs component');
  assert.match(graphPage, /activeTab/, 'should track active tab state');

  // Epic chip strip replaces sidebar
  assert.match(graphPage, /EpicChipStrip/, 'should use EpicChipStrip component');

  // Mobile panel toggle preserved
  assert.match(graphPage, /Switch to Graph/);
  assert.match(graphPage, /Back to Selection/);

  // Task card grid extracted
  assert.match(graphPage, /TaskCardGrid/, 'should use TaskCardGrid component');

  // Task details drawer
  assert.match(graphPage, /TaskDetailsDrawer/, 'should use TaskDetailsDrawer drawer');
  assert.match(graphPage, /projectRoot=\{projectRoot\}/, 'drawer should receive project root for edits');
  assert.match(graphPage, /onIssueUpdated=\{.*refreshIssues\(\)\}/, 'drawer should trigger refresh after edits');

  // Dependency flow strip
  assert.match(graphPage, /DependencyFlowStrip/, 'should use DependencyFlowStrip component');

  // Graph section with ReactFlow
  assert.match(graphPage, /GraphSection/, 'should use GraphSection component');
  assert.match(graphPage, /ReactFlowProvider/, 'should wrap graph in ReactFlowProvider');

  // Edge options and node types still configured
  assert.match(graphPage, /defaultEdgeOptions/);
  assert.match(graphPage, /nodeTypes/);

  // Actionable node detection
  assert.match(graphPage, /actionableNodeIds/, 'should compute actionable (unblocked) nodes');
  assert.match(graphPage, /ui-field/, 'graph filters should use shared dark field styling');
  assert.match(graphPage, /ui-select/, 'graph select should use shared dark select styling');
});

test('extracted graph section has viewport and legend', async () => {
  const graphSection = await read('src/components/graph/graph-section.tsx');

  assert.match(graphSection, /className=\"workflow-graph-flow\"/, 'graph should have workflow-graph-flow class');
  assert.match(graphSection, /workflow-graph-legend/, 'should have legend');
  assert.match(graphSection, /translateExtent=\{\[/, 'should set translate extent');
  assert.match(graphSection, /defaultEdgeOptions=\{/, 'should pass edge options');
  assert.match(graphSection, /blockerAnalysis/, 'should show blocker stats');
  assert.match(graphSection, /hideClosed/, 'should support hideClosed state in legend');
  assert.match(graphSection, /!hideClosed/, 'done legend should be hidden when closed items are hidden');
  assert.match(graphSection, /Read left to right/, 'legend should include plain directional hint');
  assert.match(graphSection, /Left = blockers/, 'legend should include left/right dependency meaning');
  assert.match(graphSection, /Right = work unblocked by this task/, 'legend should include downstream meaning');
  assert.match(graphSection, /min-h-\[24rem\]/, 'graph container should enforce bounded minimum height');
  assert.match(graphSection, /md:min-h-\[35rem\]/, 'graph container should scale minimum height on desktop');
});

test('graph node card supports tooltips and actionable glow', async () => {
  const nodeCard = await read('src/components/graph/graph-node-card.tsx');

  assert.match(nodeCard, /isActionable/, 'should check actionable state');
  assert.match(nodeCard, /ring-emerald-400/, 'actionable nodes should have green glow');
  assert.match(nodeCard, /node-select-pulse/, 'selected nodes should pulse');
  assert.match(nodeCard, /blockerTooltipLines/, 'should display blocker tooltip');
  assert.match(nodeCard, /isDimmed/, 'should support dimming non-chain nodes');
  assert.match(nodeCard, /Ready to work/, 'actionable tooltip text');
});

test('graph edges expose explicit relation labels', async () => {
  const graphPage = await read('src/components/graph/dependency-graph-page.tsx');
  assert.match(graphPage, /label:\s*'BLOCKS'/, 'edges should include plain-language relation labels');
});
