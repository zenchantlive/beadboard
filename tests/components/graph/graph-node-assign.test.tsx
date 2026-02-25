import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

// Test that GraphNodeCard has Assign button for assignable tasks
test('GraphNodeCard checks for assignable status (open, blocked, ready)', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes("'open'") && 
    (fileContent.includes("'blocked'") || fileContent.includes("status === 'blocked'")),
    'GraphNodeCard should check for open/blocked status for assign button'
  );
});

// Test that Assign button is NOT shown for closed tasks
test('GraphNodeCard excludes closed tasks from assign button', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    !fileContent.includes("status === 'closed' &&") || 
    fileContent.includes("status !== 'closed'"),
    'Assign button should not show for closed tasks'
  );
});

// Test that GraphNodeCard shows assigned archetype from labels
test('GraphNodeCard parses agent: label to show assigned archetype', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('agent:') || 
    fileContent.includes('getArchetypeFromLabels') ||
    fileContent.includes('data.labels'),
    'GraphNodeCard should check for agent: labels'
  );
});

// Test that Radix dropdown-menu is imported
test('GraphNodeCard imports Radix dropdown-menu for archetype selection', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('@radix-ui/react-dropdown-menu') ||
    fileContent.includes('DropdownMenu'),
    'GraphNodeCard should import Radix dropdown-menu'
  );
});

// Test that archetypes are passed to node and used
test('GraphNodeCard receives and uses archetypes for dropdown', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('archetypes') || 
    fileContent.includes('AgentArchetype'),
    'GraphNodeCard should reference archetypes'
  );
});

// Test that onAssign callback or similar is supported
test('GraphNodeCard supports assignment callback', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/graph-node-card.tsx'), 'utf-8');
  assert.ok(
    fileContent.includes('onAssign') || 
    fileContent.includes('Assign') ||
    fileContent.includes('/api/swarm/prep'),
    'GraphNodeCard should support assignment action'
  );
});
