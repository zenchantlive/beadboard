import test from 'node:test';
import assert from 'node:assert/strict';

import { parseIssuesJsonl } from '../../src/lib/parser';

test('parseIssuesJsonl applies defaults and preserves priority 0', () => {
  const input = [
    JSON.stringify({ id: 'bb-1', title: 'One', priority: 0 }),
    JSON.stringify({ id: 'bb-2', title: 'Two' }),
  ].join('\n');

  const result = parseIssuesJsonl(input);

  assert.equal(result.length, 2);
  assert.equal(result[0].priority, 0);
  assert.equal(result[0].status, 'open');
  assert.equal(result[0].issue_type, 'task');
  assert.equal(result[1].priority, 2);
});

test('parseIssuesJsonl skips malformed and blank lines', () => {
  const input = ['   ', '{bad json', JSON.stringify({ id: 'bb-3', title: 'Three' })].join('\n');

  const result = parseIssuesJsonl(input);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'bb-3');
});

test('parseIssuesJsonl filters tombstones by default', () => {
  const input = [
    JSON.stringify({ id: 'bb-4', title: 'Live', status: 'open' }),
    JSON.stringify({ id: 'bb-5', title: 'Gone', status: 'tombstone' }),
  ].join('\n');

  const result = parseIssuesJsonl(input);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'bb-4');
});

test('parseIssuesJsonl can include tombstones when requested', () => {
  const input = [
    JSON.stringify({ id: 'bb-4', title: 'Live', status: 'open' }),
    JSON.stringify({ id: 'bb-5', title: 'Gone', status: 'tombstone' }),
  ].join('\n');

  const result = parseIssuesJsonl(input, { includeTombstones: true });

  assert.equal(result.length, 2);
});
