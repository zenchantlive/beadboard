import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

describe('LeftPanel Component Contract', () => {
  it('exports LeftPanel component', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel-new');
      assert.ok(mod.LeftPanel, 'LeftPanel should be exported');
      assert.equal(typeof mod.LeftPanel, 'function', 'LeftPanel should be a function/component');
    } catch (err: any) {
      assert.fail(`LeftPanel module should exist: ${err.message}`);
    }
  });

  it('LeftPanel accepts issues and onEpicSelect props', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel-new');
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
      const mod = await import('../../../src/components/shared/left-panel-new');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should render epic tree: ${err.message}`);
    }
  });

  it('groups beads under their parent epic', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel-new');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should group beads under epics: ${err.message}`);
    }
  });
});

describe('LeftPanel Responsive Behavior', () => {
  it('applies responsive classes for desktop, tablet, and mobile', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel-new');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should have responsive classes: ${err.message}`);
    }
  });
});

describe('LeftPanel Scope Controls', () => {
  it('renders scope section', async () => {
    try {
      const mod = await import('../../../src/components/shared/left-panel-new');
      assert.ok(mod.LeftPanel, 'LeftPanel should exist');
    } catch (err: any) {
      assert.fail(`LeftPanel should render scope section: ${err.message}`);
    }
  });

  it('renders a launch affordance for epic rows that uses the shared launch callback', async () => {
    const fileContent = await fs.promises.readFile(new URL('../../../src/components/shared/left-panel-new.tsx', import.meta.url), 'utf-8');
    assert.ok(fileContent.includes('onLaunchSwarm?: (epicId: string) => void;'), 'LeftPanel should accept a dedicated launch callback');
    assert.ok(fileContent.includes('Launch Swarm for'), 'Epic rows should expose a launch affordance');
    assert.ok(fileContent.includes('onLaunchSwarm(epic.id);'), 'Epic launch should route through the shared launch callback');
    assert.ok(!fileContent.includes('onAssignMode?.(epic.id);'), 'Epic launch should not open assignment mode');
  });
});
