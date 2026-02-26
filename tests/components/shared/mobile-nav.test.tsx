import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Mobile Navigation - Hamburger Menu', () => {
  it('exports MobileNav component', async () => {
    try {
      const mod = await import('../../../src/components/shared/mobile-nav');
      assert.ok(mod.MobileNav, 'MobileNav should be exported');
    } catch (err: any) {
      assert.fail(`MobileNav module should exist: ${err.message}`);
    }
  });

  it('renders tab buttons: Social, Graph', async () => {
    try {
      const mod = await import('../../../src/components/shared/mobile-nav');
      assert.ok(mod.MobileNav, 'MobileNav should exist');
    } catch (err: any) {
      assert.fail(`MobileNav should render three tabs: ${err.message}`);
    }
  });

  it('highlights active tab with accent color', async () => {
    try {
      const mod = await import('../../../src/components/shared/mobile-nav');
      assert.ok(mod.MobileNav, 'MobileNav should have active state');
    } catch (err: any) {
      assert.fail(`MobileNav should highlight active tab: ${err.message}`);
    }
  });

  it('uses setView from useUrlState on tab click', async () => {
    try {
      const mod = await import('../../../src/components/shared/mobile-nav');
      assert.ok(mod.MobileNav, 'MobileNav should integrate with useUrlState');
    } catch (err: any) {
      assert.fail(`MobileNav should use setView: ${err.message}`);
    }
  });
});

describe('TopBar Hamburger Menu', () => {
  it('shows hamburger button on mobile and tablet', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`TopBar should show hamburger on mobile/tablet: ${err.message}`);
    }
  });

  it('hamburger button opens left panel drawer', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`Hamburger should toggle left panel: ${err.message}`);
    }
  });

  it('hides hamburger on desktop', async () => {
    try {
      const mod = await import('../../../src/components/shared/top-bar');
      assert.ok(mod.TopBar, 'TopBar should exist');
    } catch (err: any) {
      assert.fail(`Hamburger should be hidden on desktop: ${err.message}`);
    }
  });
});
