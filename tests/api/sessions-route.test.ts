import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GET } from '../../src/app/api/sessions/route';

describe('Sessions API Route', () => {
  it('should return a successful feed response', async () => {
    const request = new Request('http://localhost/api/sessions');
    const response = await GET(request);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.ok, true);
    assert.ok(Array.isArray(body.feed), 'Feed should be an array');
  });

  it('should handle projectRoot query param', async () => {
    const projectRoot = encodeURIComponent(process.cwd());
    const request = new Request(`http://localhost/api/sessions?projectRoot=${projectRoot}`);
    const response = await GET(request);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.ok, true);
  });
});
