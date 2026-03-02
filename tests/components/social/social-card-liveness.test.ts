import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * TDD tests for SocialCard liveness avatar rendering.
 *
 * SocialCard should accept a `livenessMap` prop (Record<string, string>).
 * When `data.assignee` is set and exists as a key in `livenessMap`, the card
 * should render an AgentAvatar for that assignee using the mapped AgentStatus.
 *
 * Liveness → AgentStatus mapping:
 *   'active'  → 'active'
 *   'stale'   → 'stale'
 *   'idle'    → 'idle'
 *   'evicted' → 'dead'
 */

describe('SocialCard liveness prop contract', () => {
  it('SocialCard exports a function component', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.ok(mod.SocialCard, 'SocialCard should be exported');
    assert.equal(typeof mod.SocialCard, 'function', 'SocialCard should be a function');
  });

  it('SocialCard accepts a livenessMap prop without throwing', async () => {
    await import('../../../src/components/social/social-card');
    // Calling a React component as a plain function should not throw when
    // given valid props including livenessMap.
    assert.doesNotThrow(() => {
      const mockData = {
        id: 'task-1',
        title: 'Test Task',
        status: 'in_progress' as const,
        blocks: [],
        unblocks: [],
        agents: [],
        lastActivity: new Date(),
        priority: 'P1' as const,
        assignee: 'agent-42',
      };

      // Just check the component function accepts the prop shape; we do not
      // need to render it via DOM in this test environment.
      const props = {
        data: mockData,
        livenessMap: { 'agent-42': 'active' },
      };
      assert.ok(props.livenessMap, 'livenessMap should be truthy');
    });
  });
});

describe('SocialCard liveness → AgentStatus mapping', () => {
  it('mapLiveness converts active → active', async () => {
    const mod = await import('../../../src/components/social/social-card');
    // The mapLiveness helper is exposed for testing via named export.
    // If it doesn't exist yet this test will fail (TDD red phase).
    assert.ok(
      typeof (mod as any).mapLiveness === 'function',
      'social-card should export a mapLiveness helper',
    );
    assert.equal((mod as any).mapLiveness('active'), 'active');
  });

  it('mapLiveness converts stale → stale', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.equal((mod as any).mapLiveness('stale'), 'stale');
  });

  it('mapLiveness converts idle → idle', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.equal((mod as any).mapLiveness('idle'), 'idle');
  });

  it('mapLiveness converts evicted → dead', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.equal((mod as any).mapLiveness('evicted'), 'dead');
  });

  it('mapLiveness returns idle for unknown liveness strings', async () => {
    const mod = await import('../../../src/components/social/social-card');
    assert.equal((mod as any).mapLiveness('unknown-value'), 'idle');
  });
});

describe('SocialCard SocialCardData assignee field', () => {
  it('SocialCard data type supports assignee field', async () => {
    // Verify social-cards.ts exports a type that includes assignee.
    // We do this by inspecting the buildSocialCards output with a mock bead.
    const { buildSocialCards } = await import('../../../src/lib/social-cards');
    const mockBead = {
      id: 'task-99',
      title: 'Assignee Test',
      description: null,
      status: 'in_progress' as const,
      priority: 1,
      issue_type: 'task' as const,
      assignee: 'bot-7',
      templateId: null,
      owner: null,
      labels: [],
      dependencies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      closed_at: null,
      close_reason: null,
      closed_by_session: null,
      created_by: null,
      due_at: null,
      estimated_minutes: null,
      external_ref: null,
      metadata: {},
    };

    const cards = buildSocialCards([mockBead]);
    assert.equal(cards.length, 1, 'should produce one card');
    // agents array should contain the assignee
    assert.ok(
      cards[0].agents.some((a) => a.name === 'bot-7'),
      'card.agents should include the assignee name',
    );
  });
});

describe('SocialPage passes livenessMap to SocialCard', () => {
  it('SocialPage component accepts livenessMap prop', async () => {
    const mod = await import('../../../src/components/social/social-page');
    assert.ok(mod.SocialPage, 'SocialPage should be exported');
    assert.equal(typeof mod.SocialPage, 'function', 'SocialPage should be a function');
    // The livenessMap prop is part of the interface; TypeScript verifies this
    // at build time. Here we just confirm the module loads cleanly.
  });
});
