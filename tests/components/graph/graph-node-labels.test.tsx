import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

// Test that GraphNodeData interface includes labels field
test('GraphNodeData interface includes labels field', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  // Check for labels in the interface
  assert.ok(fileContent.includes('labels') && fileContent.includes('GraphNodeData'), 'GraphNodeData interface should include labels field');
});

// Test that GraphNodeData labels is typed as string[]
test('GraphNodeData labels is typed as string array', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  // Check for labels: string[] in the interface
  assert.ok(/labels:\s*string\[\]/.test(fileContent), 'GraphNodeData labels should be typed as string[]');
});

// Test that WorkflowGraph passes issue.labels to node data
test('WorkflowGraph passes issue.labels to node data', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/workflow-graph.tsx'), 'utf-8');
  // Check that issue.labels is passed to node data
  assert.ok(fileContent.includes('labels: issue.labels'), 'WorkflowGraph should pass issue.labels to node data');
});

// Test that WorkflowGraph uses labels from the issue object
test('WorkflowGraph uses labels from issue in node mapping', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/workflow-graph.tsx'), 'utf-8');
  // Check that labels is included in the data object for nodes
  assert.ok(/data:\s*\{[^}]*labels/.test(fileContent), 'WorkflowGraph should include labels in node data object');
});
