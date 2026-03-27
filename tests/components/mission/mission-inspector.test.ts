import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('MissionInspector includes an explicit guarded bulk-cancel action', async () => {
  const file = await fs.readFile(path.join(process.cwd(), 'src/components/mission/mission-inspector.tsx'), 'utf-8');

  assert.ok(file.includes('Destructive Action'), 'should label the action as destructive');
  assert.ok(file.includes('This stops only the active workers in this swarm'), 'should scope the action to active workers only');
  assert.ok(file.includes('buildSwarmBulkCancelConfirmation'), 'should derive the confirmation phrase from the shared helper');
  assert.ok(file.includes('confirmationPhrase'), 'should require the user to type the explicit confirmation phrase');
  assert.ok(file.includes('/api/swarm/stop-all'), 'should call the bulk stop route');
  assert.ok(file.includes('Stop ${activeWorkerCount} active worker'), 'should present a clear stop-all button label');
});
