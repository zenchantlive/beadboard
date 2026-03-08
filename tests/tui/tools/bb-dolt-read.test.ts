import test from 'node:test';
import assert from 'node:assert/strict';
import { createDoltReadTool } from '../../../src/tui/tools/bb-dolt-read';

test('createDoltReadTool returns an AgentTool definition', () => {
  const tool = createDoltReadTool('/fake/project/root');
  assert.equal(tool.name, 'bb_dolt_read_issues');
  assert.equal(typeof tool.execute, 'function');
  assert.ok(tool.parameters);
});

// Since the readIssuesFromDisk function requires Dolt or fails if it is not running,
// we will just verify the schema and tool structure in unit tests, and rely on the
// integration level for deeper Dolt mocking unless we stub it.
test('bb_dolt_read_issues fails cleanly when Dolt is unreachable', async () => {
  const tool = createDoltReadTool('/fake/project/root');
  
  // Try to execute the tool, it should catch the Dolt unreachable error
  const result = await tool.execute('call-1', { limit: 10 }, undefined, undefined, {
    cwd: '/fake/project/root',
    hasUI: false,
    ui: {
      select: async () => null,
      confirm: async () => false,
      input: async () => null,
      notify: () => {},
    },
    exec: async () => ({ stdout: '', stderr: '', code: 0 }),
  });

  assert.equal(result.isError, true);
  assert.match(String(result.content[0].text), /Dolt unreachable/);
});
