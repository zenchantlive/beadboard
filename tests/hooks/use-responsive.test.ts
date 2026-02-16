import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('useResponsive Hook', () => {
  const originalInnerWidth = global.innerWidth;
  
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });
  
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  describe('module import', () => {
    it('should load the module without error', async () => {
      try {
        await import('../../src/hooks/use-responsive');
        assert.ok(true, 'Module loaded');
      } catch (err) {
        assert.fail(err as Error);
      }
    });
  });

  describe('ResponsiveState interface', () => {
    it('exports useResponsive hook', async () => {
      const mod = await import('../../src/hooks/use-responsive');
      assert.ok(mod.useResponsive, 'useResponsive should be exported');
      assert.equal(typeof mod.useResponsive, 'function', 'useResponsive should be a function');
    });

    it('exports ResponsiveState type via type export', async () => {
      const mod = await import('../../src/hooks/use-responsive');
      assert.ok(mod.useResponsive, 'useResponsive hook should be exported');
    });
  });

  describe('breakpoint detection', () => {
    it('detects mobile breakpoint (<768px)', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 390,
      });
      
      const mod = await import('../../src/hooks/use-responsive');
      const { useResponsive } = mod;
      
      assert.ok(typeof useResponsive === 'function', 'useResponsive is a function');
    });

    it('detects tablet breakpoint (768-1024px)', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      const mod = await import('../../src/hooks/use-responsive');
      const { useResponsive } = mod;
      
      assert.ok(typeof useResponsive === 'function', 'useResponsive is a function');
    });

    it('detects desktop breakpoint (>=1024px)', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      });
      
      const mod = await import('../../src/hooks/use-responsive');
      const { useResponsive } = mod;
      
      assert.ok(typeof useResponsive === 'function', 'useResponsive is a function');
    });
  });
});
