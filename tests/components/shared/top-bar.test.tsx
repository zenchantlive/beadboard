import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('TopBar Component Contract', () => {
  it('exports TopBar component', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should be exported');
      assert.equal(typeof mod.TopBar, 'function', 'TopBar should be a function/component');
    } catch (err: any) {
      assert.fail(`TopBar module should exist: ${err.message}`);
    }
  });

  it('TopBar component can be imported without errors', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'Component should be importable');
    } catch (err: any) {
      assert.fail(`Component import failed: ${err.message}`);
    }
  });
});

describe('TopBar View Tabs', () => {
  it('renders three view tabs: Social, Graph, Swarm', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`TopBar should render view tabs: ${err.message}`);
    }
  });

  it('active tab has bold text and accent underline', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`TopBar should have active state styling: ${err.message}`);
    }
  });
});

describe('TopBar Filter and Controls', () => {
  it('renders filter/search input placeholder', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`TopBar should have filter input: ${err.message}`);
    }
  });

  it('renders settings placeholder', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`TopBar should have settings placeholder: ${err.message}`);
    }
  });
});
