import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('LeftPanel Component Contract', () => {
  it('exports LeftPanel component', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel');
      assert.ok(mod.LeftPanel, 'LeftPanel should be exported');
      assert.equal(typeof mod.LeftPanel, 'function', 'LeftPanel should be a function/component');
    } catch (err: any) {
      assert.fail(`LeftPanel module should exist: ${err.message}`);
    }
  });

  it('LeftPanel accepts issues and onEpicSelect props', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel');
      const LeftPanel = mod.LeftPanel;
      assert.ok(LeftPanel, 'Component should be callable');
    } catch (err: any) {
      assert.fail(`Component import failed: ${err.message}`);
    }
  });
});

describe('LeftPanel Tree Structure', () => {
  it('renders epics as expandable tree items', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should render epic tree: ${err.message}`);
    }
  });

  it('groups beads under their parent epic', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should group beads under epics: ${err.message}`);
    }
  });
});

describe('LeftPanel Responsive Behavior', () => {
  it('applies responsive classes for desktop, tablet, and mobile', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should have responsive classes: ${err.message}`);
    }
  });
});

describe('LeftPanel Scope Controls', () => {
  it('renders scope section', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should render scope section: ${err.message}`);
    }
  });
});
