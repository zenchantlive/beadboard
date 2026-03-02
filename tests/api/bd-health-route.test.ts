import test from 'node:test';
import assert from 'node:assert/strict';

import { GET as healthGet } from '../../src/app/api/bd/health/route';

test('bd health route returns setup guidance when bd is missing from PATH', async () => {
  const previousPath = process.env.PATH;
  const previousPathAlt = process.env.Path;
  process.env.PATH = '';
  process.env.Path = '';

  try {
    const response = await healthGet(new Request('http://localhost/api/bd/health?projectRoot=C:/repo/test'));
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.error.classification, 'not_found');
    assert.equal(typeof body.error.message, 'string');
    assert.equal(String(body.error.message).includes('bd command not found in PATH'), true);
  } finally {
    if (previousPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = previousPath;
    }
    if (previousPathAlt === undefined) {
      delete process.env.Path;
    } else {
      process.env.Path = previousPathAlt;
    }
  }
});
