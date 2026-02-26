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
    it('returns defaults for empty params', () => {
      const state = parseUrlState(createMockSearchParams({}));
      assert.deepStrictEqual(state, {
        view: 'social',
        taskId: null,
        swarmId: null,
        agentId: null,
        epicId: null,
        leftPanel: 'open',
        rightPanel: 'open',
        blockedOnly: false,
        panel: 'open',
        drawer: 'closed',
        graphTab: 'flow',
      });
    });

    it('parses all core identifiers', () => {
      const state = parseUrlState(
        createMockSearchParams({
          view: 'activity',
          task: 'bb-vt.1.2',
          swarm: 'bb-vt',
          agent: 'codex',
          epic: 'bb-vt',
        }),
      );

      assert.strictEqual(state.view, 'activity');
      assert.strictEqual(state.taskId, 'bb-vt.1.2');
      assert.strictEqual(state.swarmId, 'bb-vt');
      assert.strictEqual(state.agentId, 'codex');
      assert.strictEqual(state.epicId, 'bb-vt');
    });

    it('parses explicit left/right panel params', () => {
      const state = parseUrlState(createMockSearchParams({ left: 'closed', right: 'open' }));
      assert.strictEqual(state.leftPanel, 'closed');
      assert.strictEqual(state.rightPanel, 'open');
      assert.strictEqual(state.panel, 'open');
    });

    it('uses legacy panel param when right is absent', () => {
      const state = parseUrlState(createMockSearchParams({ panel: 'closed' }));
      assert.strictEqual(state.rightPanel, 'closed');
      assert.strictEqual(state.panel, 'closed');
    });

    it('prefers right param over legacy panel when both are present', () => {
      const state = parseUrlState(createMockSearchParams({ right: 'open', panel: 'closed' }));
      assert.strictEqual(state.rightPanel, 'open');
      assert.strictEqual(state.panel, 'open');
    });

    it('falls back to defaults for invalid panel params', () => {
      const state = parseUrlState(createMockSearchParams({ left: 'invalid', right: 'invalid', panel: 'invalid' }));
      assert.strictEqual(state.leftPanel, 'open');
      assert.strictEqual(state.rightPanel, 'open');
      assert.strictEqual(state.panel, 'open');
    });

    it('parses blocked filter state', () => {
      assert.strictEqual(parseUrlState(createMockSearchParams({ blocked: '1' })).blockedOnly, true);
      assert.strictEqual(parseUrlState(createMockSearchParams({ blocked: 'true' })).blockedOnly, true);
      assert.strictEqual(parseUrlState(createMockSearchParams({ blocked: '0' })).blockedOnly, false);
    });

    it('falls back to default for invalid view and graph tab values', () => {
      const state = parseUrlState(createMockSearchParams({ view: 'invalid', graphTab: 'invalid' }));
      assert.strictEqual(state.view, 'social');
      assert.strictEqual(state.graphTab, 'flow');
    });
  });

  describe('buildUrlParams', () => {
    it('builds URL with view param', () => {
      const url = buildUrlParams(createMockSearchParams({}), { view: 'social' });
      assert.strictEqual(url, '/?view=social');
    });

    it('adds task param', () => {
      const url = buildUrlParams(createMockSearchParams({ view: 'social' }), { task: 'bb-vt.2.1' });
      assert.strictEqual(url, '/?view=social&task=bb-vt.2.1');
    });

    it('removes params when value is null', () => {
      const url = buildUrlParams(createMockSearchParams({ view: 'social', task: 'bb-vt.2.1' }), { task: null });
      assert.strictEqual(url, '/?view=social');
    });

    it('supports dual right/panel sync updates', () => {
      const url = buildUrlParams(createMockSearchParams({ view: 'social' }), { right: 'open', panel: 'open' });
      assert.strictEqual(url, '/?view=social&right=open&panel=open');
    });

    it('returns root for empty params', () => {
      const url = buildUrlParams(createMockSearchParams({}), {});
      assert.strictEqual(url, '/');
    });

    it('clears selection params and keeps view', () => {
      const url = buildUrlParams(
        createMockSearchParams({ view: 'social', task: 'bb-vt.2.1', swarm: 'bb-vt', right: 'open', panel: 'open' }),
        { task: null, swarm: null, right: 'closed', panel: 'closed' },
      );
      assert.strictEqual(url, '/?view=social&right=closed&panel=closed');
    });
  });

  describe('module import', () => {
    it('loads the module without error', async () => {
      await import('../../src/hooks/use-url-state');
      assert.ok(true);
    });
  });
});
