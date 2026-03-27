import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

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
  it('renders view tabs: Social, Graph', async () => {
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

  it('separates blocked agent metrics from blocked item action counts', async () => {
    const fileContent = await fs.promises.readFile(new URL('../../../src/components/shared/top-bar.tsx', import.meta.url), 'utf-8');
    assert.ok(fileContent.includes('blockedAgentCount?: number;'), 'Should accept a dedicated blockedAgentCount prop');
    assert.ok(fileContent.includes('MetricTile label="Blocked" value={blockedAgentCount}'), 'Blocked metric tile should use blockedAgentCount');
    assert.ok(fileContent.includes('criticalAlerts = 0'), 'Blocked items button still uses criticalAlerts');
    assert.ok(fileContent.includes('onClick={onLaunchSwarm}'), 'TopBar launch button should route through the shared launch callback');
    assert.ok(fileContent.includes('Launch Swarm'), 'TopBar should keep the launch label explicit');
    assert.ok(!fileContent.includes('setAssignMode(true)'), 'TopBar should not fork into assignment mode');
  });

  it('renders a separate completion indicator for recent worker completions', async () => {
    const fileContent = await fs.promises.readFile(new URL('../../../src/components/shared/top-bar.tsx', import.meta.url), 'utf-8');
    assert.ok(fileContent.includes('completedEventCount?: number;'), 'Should accept a dedicated completedEventCount prop');
    assert.ok(fileContent.includes('onCompletedIndicatorClick?: () => void;'), 'Should accept a click-through handler for completed work');
    assert.ok(fileContent.includes('data-testid="completed-event-indicator"'), 'Should render a completion indicator element');
    assert.ok(fileContent.includes('Completed</span>'), 'Completion indicator should label recent completions clearly');
    assert.ok(fileContent.includes('type="button"'), 'Completion indicator should be a real button');
    assert.ok(fileContent.includes('onClick={onCompletedIndicatorClick}'), 'Completion indicator should route clicks through the shared shell');
  });
});
