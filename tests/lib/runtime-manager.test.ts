import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimePaths, normalizeVersion } from '../../src/lib/runtime-manager';

test('normalizeVersion supports semver and rejects empty', () => {
  assert.equal(normalizeVersion('1.2.3'), '1.2.3');
  assert.throws(() => normalizeVersion(''));
});

test('getRuntimePaths builds ~/.beadboard/runtime/<version> layout', () => {
  const p = getRuntimePaths('/tmp/home', '1.2.3');
  assert.match(p.runtimeRoot, /[/\\]runtime[/\\]1\.2\.3$/);
  assert.match(p.shimDir, /\.beadboard[/\\]bin$/);
});
