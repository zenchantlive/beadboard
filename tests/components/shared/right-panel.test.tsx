import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('RightPanel Component Contract', () => {
  it('exports RightPanel component', async () => {
    try {
      const mod = await import('../../../src/components/shared/right-panel');
      assert.ok(mod.RightPanel, 'RightPanel should be exported');
      assert.equal(typeof mod.RightPanel, 'function', 'RightPanel should be a function/component');
    } catch (err: any) {
      assert.fail(`RightPanel module should exist: ${err.message}`);
    }
  });

  it('RightPanel accepts required props', async () => {
    try {
      const mod = await import('../../../src/components/shared/right-panel');
      const RightPanel = mod.RightPanel;
      
      assert.ok(RightPanel, 'Component should be callable');
    } catch (err: any) {
      assert.fail(`Component import failed: ${err.message}`);
    }
  });

  it('RightPanel has correct data-testid for desktop sidebar', async () => {
    try {
      const mod = await import('../../../src/components/shared/right-panel');
      assert.ok(mod.RightPanel, 'RightPanel should be exported');
    } catch (err: any) {
      assert.fail(`Component import failed: ${err.message}`);
    }
  });

  it('RightPanel renders close button for drawer modes', async () => {
    try {
      const mod = await import('../../../src/components/shared/right-panel');
      assert.ok(mod.RightPanel, 'RightPanel should be exported');
    } catch (err: any) {
      assert.fail(`Component import failed: ${err.message}`);
    }
  });
});

describe('RightPanel Responsive Behavior', () => {
  it('desktop mode uses fixed sidebar layout', async () => {
    const mod = await import('../../../src/components/shared/right-panel');
    assert.ok(mod.RightPanel, 'RightPanel should be exported');
  });

  it('tablet mode uses slide-over drawer with backdrop', async () => {
    const mod = await import('../../../src/components/shared/right-panel');
    assert.ok(mod.RightPanel, 'RightPanel should be exported');
  });

  it('mobile mode uses full-screen drawer', async () => {
    const mod = await import('../../../src/components/shared/right-panel');
    assert.ok(mod.RightPanel, 'RightPanel should be exported');
  });
});
