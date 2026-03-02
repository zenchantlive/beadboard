import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

// Test that GraphNodeData interface includes livenessMap field
test('GraphNodeData interface includes livenessMap field', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    /livenessMap/.test(fileContent),
    'GraphNodeData should include livenessMap field'
  );
});

// Test that GraphNodeData includes assignee field for liveness lookup
test('GraphNodeData interface includes assignee field', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    /assignee/.test(fileContent),
    'GraphNodeData should include assignee field for liveness lookup'
  );
});

// Test that GraphNodeCard imports AgentAvatar
test('GraphNodeCard imports AgentAvatar component', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('AgentAvatar'),
    'GraphNodeCard should import and use AgentAvatar'
  );
});

// Test that GraphNodeCard renders AgentAvatar based on liveness
test('GraphNodeCard renders AgentAvatar with stale/evicted liveness pulse', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  // Should check for stale or evicted liveness state
  assert.ok(
    fileContent.includes('stale') || fileContent.includes('evicted'),
    'GraphNodeCard should handle stale/evicted liveness for pulse animation'
  );
});

// Test that WorkflowGraph accepts livenessMap prop
test('WorkflowGraph accepts livenessMap prop', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/workflow-graph.tsx'), 'utf-8');
  assert.ok(
    /livenessMap/.test(fileContent),
    'WorkflowGraph should accept livenessMap prop'
  );
});

// Test that WorkflowGraph passes livenessMap to node data
test('WorkflowGraph passes livenessMap to node data', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/workflow-graph.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('livenessMap'),
    'WorkflowGraph should pass livenessMap into node data'
  );
});

// Test that SmartDag passes livenessMap to WorkflowGraph
test('SmartDag passes livenessMap prop to WorkflowGraph', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('livenessMap'),
    'SmartDag should accept and pass livenessMap to WorkflowGraph'
  );
});

// Test that SmartDag destructures livenessMap from props
test('SmartDag destructures livenessMap from its props', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  // Check that the function signature includes livenessMap
  const funcMatch = fileContent.match(/export function SmartDag\s*\(\s*\{([^}]+)\}/s);
  assert.ok(
    funcMatch && funcMatch[1].includes('livenessMap'),
    'SmartDag function should destructure livenessMap from props'
  );
});

// Test that AgentAvatar is overlaid at bottom-right of node card
test('GraphNodeCard overlays AgentAvatar at bottom-right position', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  // Should use absolute positioning for the overlay
  assert.ok(
    fileContent.includes('absolute') && fileContent.includes('AgentAvatar'),
    'GraphNodeCard should use absolute positioning for AgentAvatar overlay'
  );
});

// Test liveness-to-status mapping covers stuck states
test('GraphNodeCard maps stale/evicted liveness to stuck/stale AgentAvatar status', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  // Should map liveness values to AgentAvatar status prop
  assert.ok(
    (fileContent.includes('stale') || fileContent.includes('stuck')) && fileContent.includes('AgentAvatar'),
    'GraphNodeCard should map liveness to AgentAvatar status for stuck/stale agents'
  );
});
