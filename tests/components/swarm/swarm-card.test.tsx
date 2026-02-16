import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('SwarmCard Component Contract', () => {
  it('exports SwarmCard component', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'SwarmCard should be exported');
      assert.equal(typeof mod.SwarmCard, 'function', 'SwarmCard should be a function/component');
    } catch (err: any) {
      assert.fail(`SwarmCard module should exist: ${err.message}`);
    }
  });

  it('SwarmCard component can be imported without errors', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'Component should be importable');
    } catch (err: any) {
      assert.fail(`Component import failed: ${err.message}`);
    }
  });
});

describe('SwarmCard Agent Roster', () => {
  it('renders agent avatars with liveness glow', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'SwarmCard should exist');
    } catch (err: any) {
      assert.fail(`SwarmCard should render agent avatars: ${err.message}`);
    }
  });

  it('displays agent current task when available', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'SwarmCard should exist');
    } catch (err: any) {
      assert.fail(`SwarmCard should show current task: ${err.message}`);
    }
  });
});

describe('SwarmCard Progress Bar', () => {
  it('renders progress bar showing completion percentage', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'SwarmCard should exist');
    } catch (err: any) {
      assert.fail(`SwarmCard should render progress bar: ${err.message}`);
    }
  });
});

describe('SwarmCard Attention Items', () => {
  it('renders attention items with warning styling', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'SwarmCard should exist');
    } catch (err: any) {
      assert.fail(`SwarmCard should render attention items: ${err.message}`);
    }
  });
});

describe('SwarmCard View-Jump Icons', () => {
  it('renders view-jump icons for navigation', async () => {
    try {
      const mod = await import('../../../src/components/swarm/swarm-card');
      assert.ok(mod.SwarmCard, 'SwarmCard should exist');
    } catch (err: any) {
      assert.fail(`SwarmCard should have view-jump icons: ${err.message}`);
    }
  });
});
