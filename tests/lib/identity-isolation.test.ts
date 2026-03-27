import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIssuesJsonl } from '../../src/lib/parser';

test('parseIssuesJsonl filters out gt:agent beads', () => {
  const jsonl = [
    JSON.stringify({ id: 'bb-1', title: 'Real Mission', status: 'open', labels: [] }),
    JSON.stringify({ id: 'bb-agent', title: 'Agent Persona', status: 'open', labels: ['gt:agent'] }),
    JSON.stringify({ id: 'bb-runtime', title: 'Agent: coder/task-beadboard-kqi.3', status: 'deferred', issue_type: 'task', labels: ['agent-lifecycle:runtime-instance'] }),
  ].join('\n');

  const issues = parseIssuesJsonl(jsonl);
  assert.equal(issues.length, 1, 'Should only find 1 issue');
  assert.equal(issues[0].id, 'bb-1');
  assert.ok(!issues.find(i => i.id === 'bb-agent'), 'Should have filtered the agent persona');
  assert.ok(!issues.find(i => i.id === 'bb-runtime'), 'Should have filtered runtime-instance beads too');
});
