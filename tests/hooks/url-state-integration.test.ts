import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseUrlState, buildUrlParams } from '../../src/hooks/use-url-state';

/**
 * URL State Integration Tests - bb-ui2.22
 * 
 * These tests verify that all URL patterns correctly restore view state
 * and that the URL state system handles edge cases properly.
 */

function createMockSearchParams(params: Record<string, string | null> = {}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      sp.set(key, value);
    }
  }
  return sp;
}

describe('URL State Integration - bb-ui2.22', () => {
  describe('Valid URL Patterns - Social View', () => {
    it('/?view=social - defaults to social view', () => {
      const sp = createMockSearchParams({ view: 'social' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
      assert.strictEqual(state.taskId, null);
      assert.strictEqual(state.swarmId, null);
      assert.strictEqual(state.panel, 'open');
    });

    it('/?view=social&task=bb-buff.1&panel=open - task selected, panel open', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-buff.1', panel: 'open' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
      assert.strictEqual(state.taskId, 'bb-buff.1');
      assert.strictEqual(state.panel, 'open');
    });

    it('/?view=social&task=bb-ui2.22 - task with dots in ID', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-ui2.22' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.taskId, 'bb-ui2.22');
    });
  });

  describe('Valid URL Patterns - Graph View', () => {
    it('/?view=graph - graph view default', () => {
      const sp = createMockSearchParams({ view: 'graph' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'graph');
      assert.strictEqual(state.graphTab, 'flow');
    });

    it('/?view=graph&task=bb-buff.1 - graph with task selected', () => {
      const sp = createMockSearchParams({ view: 'graph', task: 'bb-buff.1' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'graph');
      assert.strictEqual(state.taskId, 'bb-buff.1');
    });

    it('/?view=graph&graphTab=flow - flow tab selected', () => {
      const sp = createMockSearchParams({ view: 'graph', graphTab: 'flow' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.graphTab, 'flow');
    });

    it('/?view=graph&graphTab=overview - overview tab selected', () => {
      const sp = createMockSearchParams({ view: 'graph', graphTab: 'overview' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.graphTab, 'overview');
    });

    it('/?view=graph&swarm=bb-buff - graph filtered by swarm', () => {
      const sp = createMockSearchParams({ view: 'graph', swarm: 'bb-buff' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'graph');
      assert.strictEqual(state.swarmId, 'bb-buff');
    });
  });

  describe('Deprecated Swarm View Fallback', () => {
    it('/?view=swarm - falls back to social (swarm view deprecated)', () => {
      const sp = createMockSearchParams({ view: 'swarm' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
    });

    it('/?view=swarm&swarm=bb-buff - falls back to social but preserves swarmId', () => {
      const sp = createMockSearchParams({ view: 'swarm', swarm: 'bb-buff' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
      assert.strictEqual(state.swarmId, 'bb-buff');
    });

    it('/?view=swarm&swarm=bb-buff&panel=open - falls back to social with panel open', () => {
      const sp = createMockSearchParams({ view: 'swarm', swarm: 'bb-buff', panel: 'open' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
      assert.strictEqual(state.swarmId, 'bb-buff');
      assert.strictEqual(state.panel, 'open');
    });
  });

  describe('Valid URL Patterns - Activity View', () => {
    it('/?view=activity - activity view default', () => {
      const sp = createMockSearchParams({ view: 'activity' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'activity');
    });

    it('/?view=activity&agent=bb-silver-castle - filtered by agent', () => {
      const sp = createMockSearchParams({ view: 'activity', agent: 'bb-silver-castle' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'activity');
      assert.strictEqual(state.agentId, 'bb-silver-castle');
    });

    it('/?view=activity&swarm=bb-buff - filtered by swarm', () => {
      const sp = createMockSearchParams({ view: 'activity', swarm: 'bb-buff' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'activity');
      assert.strictEqual(state.swarmId, 'bb-buff');
    });
  });

  describe('Invalid Param Handling', () => {
    it('/?view=invalid - invalid view defaults to social', () => {
      const sp = createMockSearchParams({ view: 'invalid' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'social');
    });

    it('/?view=graph&graphTab=invalid - invalid graphTab defaults to flow', () => {
      const sp = createMockSearchParams({ view: 'graph', graphTab: 'invalid' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.graphTab, 'flow');
    });

    it('/?panel=invalid - invalid panel defaults to open', () => {
      const sp = createMockSearchParams({ panel: 'invalid' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.panel, 'open');
    });

    it('/?task=invalid-id - invalid task ID still parsed (no validation)', () => {
      const sp = createMockSearchParams({ task: 'invalid-id' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.taskId, 'invalid-id');
    });
  });

  describe('URL Building - State to URL', () => {
    it('builds social view URL', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, { view: 'social' });
      assert.strictEqual(url, '/?view=social');
    });

    it('builds graph view with task URL', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, { view: 'graph', task: 'bb-buff.1' });
      assert.strictEqual(url, '/?view=graph&task=bb-buff.1');
    });

    it('builds swarm view with swarm param', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, { view: 'swarm', swarm: 'bb-buff' });
      assert.strictEqual(url, '/?view=swarm&swarm=bb-buff');
    });

    it('builds activity view with agent filter', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, { view: 'activity', agent: 'bb-silver-castle' });
      assert.strictEqual(url, '/?view=activity&agent=bb-silver-castle');
    });

    it('preserves existing params when adding new ones', () => {
      const sp = createMockSearchParams({ view: 'social' });
      const url = buildUrlParams(sp, { task: 'bb-buff.1' });
      assert.strictEqual(url, '/?view=social&task=bb-buff.1');
    });

    it('removes params when set to null', () => {
      const sp = createMockSearchParams({ view: 'social', task: 'bb-buff.1', panel: 'open' });
      const url = buildUrlParams(sp, { task: null, panel: 'closed' });
      assert.strictEqual(url, '/?view=social&panel=closed');
    });

    it('returns root when all params cleared', () => {
      const sp = createMockSearchParams({ view: 'social' });
      const url = buildUrlParams(sp, { view: null });
      assert.strictEqual(url, '/');
    });
  });

  describe('Complex URL Scenarios', () => {
    it('handles all params together', () => {
      const sp = createMockSearchParams({
        view: 'graph',
        task: 'bb-ui2.22',
        swarm: 'bb-ui2',
        panel: 'open',
        graphTab: 'overview',
        agent: 'bb-silver-castle'
      });
      const state = parseUrlState(sp);
      assert.strictEqual(state.view, 'graph');
      assert.strictEqual(state.taskId, 'bb-ui2.22');
      assert.strictEqual(state.swarmId, 'bb-ui2');
      assert.strictEqual(state.panel, 'open');
      assert.strictEqual(state.graphTab, 'overview');
      assert.strictEqual(state.agentId, 'bb-silver-castle');
    });

    it('empty string values treated as null/empty', () => {
      const sp = createMockSearchParams({ task: '', swarm: '' });
      const state = parseUrlState(sp);
      assert.strictEqual(state.taskId, '');
      assert.strictEqual(state.swarmId, '');
    });
  });

  describe('Deep Link Patterns - From Card Icons', () => {
    it('SocialCard Graph icon: /?view=graph&task={id}', () => {
      const sp = createMockSearchParams({});
      const url = buildUrlParams(sp, { view: 'graph', task: 'bb-ui2.33' });
      assert.strictEqual(url, '/?view=graph&task=bb-ui2.33');
      
      const parsed = parseUrlState(createMockSearchParams({ view: 'graph', task: 'bb-ui2.33' }));
      assert.strictEqual(parsed.view, 'graph');
      assert.strictEqual(parsed.taskId, 'bb-ui2.33');
    });

    it('SwarmCard Graph icon: /?view=graph&swarm={id}', () => {
      const url = buildUrlParams(createMockSearchParams({}), { view: 'graph', swarm: 'bb-buff' });
      assert.strictEqual(url, '/?view=graph&swarm=bb-buff');
    });

    it('SwarmCard Timeline icon: /?view=activity&swarm={id}', () => {
      const url = buildUrlParams(createMockSearchParams({}), { view: 'activity', swarm: 'bb-buff' });
      assert.strictEqual(url, '/?view=activity&swarm=bb-buff');
    });

    it('Agent avatar click: /?view=activity&agent={id}', () => {
      const url = buildUrlParams(createMockSearchParams({}), { view: 'activity', agent: 'bb-silver-castle' });
      assert.strictEqual(url, '/?view=activity&agent=bb-silver-castle');
    });
  });
});
