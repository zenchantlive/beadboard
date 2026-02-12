import test from 'node:test';
import assert from 'node:assert/strict';

import { scanForDirectIssuesJsonlWrites } from '../../tools/guardrails/no-direct-jsonl-write.mjs';

test('source tree contains no direct write calls targeting .beads/issues.jsonl', () => {
  const violations = scanForDirectIssuesJsonlWrites('src');
  assert.deepEqual(violations, []);
});
