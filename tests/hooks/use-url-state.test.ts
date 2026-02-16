import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseUrlState, buildUrlParams } from '../../src/hooks/use-url-state';

function createMockSearchParams(params: Record<string, string | null> = {}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      sp.set(key, value);
    }
  }
  return sp;
}

describe('useUrlState', () => {
  describe('parseUrlState', () => {
    it('should return defaults for empty params', () => {
      const sp = createMockSearchParams({});
      const state = parseUrlState(sp);
      assert.deepStrictEqual(state, {
        view: 'social',
        taskId: null,
        swarmId: null,
        panel: 'closed',
        graphTab: 'flow',
      });
    });

    it('should parse view=social', () => {
      const sp = createMockSearchParams({ view: 'social' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
    });

    it('should parse view=graph', () => {
      const sp = createMockSearchParams({ view: 'graph' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'graph');
    });

    it('should parse view=swarm', () => {
      const sp = createMockSearchParams({ view: 'swarm' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'swarm');
    });

    it('should fall back to default for invalid view values', () => {
      const sp = createMockSearchParams({ view: 'invalid' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
    });

    it('should parse task id', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-buff.1' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
      assert.strictEqual(state.taskId, 'bb-buff.1');
    });

    it('should parse swarm id', () => {
      const sp = createMockSearchParams({ view: 'swarm', swarm: 'bb-buff' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'swarm');
      assert.strictEqual(state.swarmId, 'bb-buff');
    });

    it('should parse panel state', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-buff.1', panel: 'open' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.panel, 'open');
    });

    it('should parse graphTab', () => {
      const sp = createMockSearchParams({ view: 'graph', task: 'bb-buff.1', graphTab: 'flow' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.graphTab, 'flow');
    });

    it('should fall back to default for invalid panel values', () => {
      const sp = createMockSearchParams({ panel: 'invalid' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.panel, 'closed');
    });

    it('should fall back to default for invalid graphTab values', () => {
      const sp = createMockSearchParams({ graphTab: 'invalid' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.graphTab, 'flow');
    });
  });

  describe('buildUrlParams', () => {
    it('should build URL with view param', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, { view: 'social' });
      assert.strictEqual(url, '/?view=social');
    });

    it('should add task param', () => {
      const sp = createMockSearchParams({ view: 'social' });
      const url = buildUrlParams(sp, { task: 'bb-buff.1' });
      assert.strictEqual(url, '/?view=social&task=bb-buff.1');
    });

    it('should remove param when null', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-buff.1' });
      const url = buildUrlParams(sp, { task: null });
      assert.strictEqual(url, '/?view=social');
    });

    it('should toggle panel', () => {
      const sp = createMockSearchParams({ view: 'social', panel: 'closed' });
      const url = buildUrlParams(sp, { panel: 'open' });
      assert.strictEqual(url, '/?view=social&panel=open');
    });

    it('should return root for empty params', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, {});
      assert.strictEqual(url, '/');
    });

    it('should clear all selection params', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-buff.1', swarm: 'buff', panel: 'open', graphTab: 'flow' });
      const url = buildUrlParams(sp, { task: null, swarm: null, panel: null, graphTab: null });
      assert.strictEqual(url, '/?view=social');
    });
  });

  describe('module import', () => {
    it('should load the module without error', async () => {
      try {
        await import('../../src/hooks/use-url-state');
        assert.ok(true, 'Module loaded');
      } catch (err) {
        assert.fail(err as Error);
      }
    });
  });
});
