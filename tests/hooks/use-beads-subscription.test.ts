import { describe, it } from 'node:test';
import assert from 'node:assert';
// We need a DOM environment to test hooks that use EventSource/fetch
// Since we are running in Node, we can't easily test the hook's effect logic without a heavy setup (JSDOM).
// But we can verify the module loads.

describe('useBeadsSubscription', () => {
  it('should load the module without error', async () => {
    try {
      await import('../../src/hooks/use-beads-subscription');
      assert.ok(true, 'Module loaded');
    } catch (err) {
      assert.fail(err as Error);
    }
  });
});
