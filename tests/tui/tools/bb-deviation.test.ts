import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviationTool } from '../../../src/tui/tools/bb-deviation';
import { listRuntimeEvents, embeddedPiDaemon } from '../../../src/lib/embedded-daemon';

test('createDeviationTool returns tool definition and executes successfully', async () => {
  const tool = createDeviationTool('/test/project');
  assert.equal(tool.name, 'bb_record_deviation');
  assert.equal(typeof tool.execute, 'function');

  // clear events for test project
  embeddedPiDaemon.resetForTests();

  const result = await tool.execute('call_1', {
    reason: 'Need extra backend help',
    deviation_type: 'extra_worker',
    details: 'The API is more complex than expected',
  });

  if (result.isError) {
    console.error('Test failed with result:', result);
  }

  assert.equal(result.isError, undefined);
  assert.match(String(result.content[0].text), /Deviation recorded/);

  const events = embeddedPiDaemon.listEvents('/test/project');
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'deviation');
  assert.match(String(events[0].detail), /Need extra backend help/);
});
