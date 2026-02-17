import test from 'node:test';
import assert from 'node:assert/strict';

import type { BeadDependency, BeadIssue } from '../../src/lib/types';
import { buildSocialCards } from '../../src/lib/social-cards';

function issue(overrides: Partial<BeadIssue>): BeadIssue {
  return {
    id: overrides.id ?? 'bb-x',
    title: overrides.title ?? 'Issue',
    description: overrides.description ?? null,
    status: overrides.status ?? 'open',
    priority: overrides.priority ?? 2,
    issue_type: overrides.issue_type ?? 'task',
    assignee: overrides.assignee ?? null,
    owner: overrides.owner ?? null,
    labels: overrides.labels ?? [],
    dependencies: overrides.dependencies ?? [],
    created_at: overrides.created_at ?? '2026-02-12T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-02-12T00:00:00Z',
    closed_at: overrides.closed_at ?? null,
    close_reason: overrides.close_reason ?? null,
    closed_by_session: overrides.closed_by_session ?? null,
    created_by: overrides.created_by ?? null,
    due_at: overrides.due_at ?? null,
    estimated_minutes: overrides.estimated_minutes ?? null,
    external_ref: overrides.external_ref ?? null,
    metadata: overrides.metadata ?? {},
  };
}

function dep(type: BeadDependency['type'], target: string): BeadDependency {
  return { type, target };
}

test('buildSocialCards transforms basic bead properties', () => {
  const beads = [
    issue({ id: 'bb-1', title: 'Test Task', status: 'in_progress', priority: 1 }),
    issue({ id: 'bb-2', title: 'Bug Fix', status: 'blocked', priority: 0 }),
    issue({ id: 'bb-3', title: 'Done', status: 'closed', priority: 3 }),
  ];

  const cards = buildSocialCards(beads);

  assert.equal(cards.length, 3);
  assert.equal(cards[0].id, 'bb-1');
  assert.equal(cards[0].title, 'Test Task');
  assert.equal(cards[0].status, 'in_progress');
  assert.equal(cards[0].priority, 'P1');
  assert.equal(cards[1].status, 'blocked');
  assert.equal(cards[1].priority, 'P0');
  assert.equal(cards[2].status, 'closed');
  assert.equal(cards[2].priority, 'P3');
});

test('buildSocialCards maps priority correctly', () => {
  const beads = [
    issue({ id: 'bb-1', priority: -1 }),
    issue({ id: 'bb-2', priority: 0 }),
    issue({ id: 'bb-3', priority: 1 }),
    issue({ id: 'bb-4', priority: 2 }),
    issue({ id: 'bb-5', priority: 3 }),
    issue({ id: 'bb-6', priority: 4 }),
    issue({ id: 'bb-7', priority: 10 }),
  ];

  const cards = buildSocialCards(beads);

  assert.equal(cards[0].priority, 'P0');
  assert.equal(cards[1].priority, 'P0');
  assert.equal(cards[2].priority, 'P1');
  assert.equal(cards[3].priority, 'P2');
  assert.equal(cards[4].priority, 'P3');
  assert.equal(cards[5].priority, 'P4');
  assert.equal(cards[6].priority, 'P4');
});

test('buildSocialCards computes unblocks (outgoing blocks)', () => {
  const beads = [
    issue({ id: 'bb-1', dependencies: [dep('blocks', 'bb-2'), dep('blocks', 'bb-3')] }),
    issue({ id: 'bb-2' }),
    issue({ id: 'bb-3' }),
  ];

  const cards = buildSocialCards(beads);
  const card1 = cards.find((c) => c.id === 'bb-1')!;

  assert.deepEqual(card1.unblocks.sort(), ['bb-2', 'bb-3']);
  assert.deepEqual(card1.blocks, []);
});

test('buildSocialCards computes blocks (incoming blocks)', () => {
  const beads = [
    issue({ id: 'bb-1' }),
    issue({ id: 'bb-2', dependencies: [dep('blocks', 'bb-1')] }),
    issue({ id: 'bb-3', dependencies: [dep('blocks', 'bb-1')] }),
  ];

  const cards = buildSocialCards(beads);
  const card1 = cards.find((c) => c.id === 'bb-1')!;

  assert.deepEqual(card1.blocks.sort(), ['bb-2', 'bb-3']);
  assert.deepEqual(card1.unblocks, []);
});

test('buildSocialCards ignores missing targets for blocks', () => {
  const beads = [
    issue({ id: 'bb-1', dependencies: [dep('blocks', 'bb-missing')] }),
  ];

  const cards = buildSocialCards(beads);

  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].unblocks, []);
  assert.deepEqual(cards[0].blocks, []);
});

test('buildSocialCards extracts agents from assignee', () => {
  const beads = [
    issue({ id: 'bb-1', assignee: 'agent-alpha' }),
    issue({ id: 'bb-2', assignee: 'agent-beta', metadata: { agentStatus: 'stale' } }),
    issue({ id: 'bb-3', assignee: null }),
  ];

  const cards = buildSocialCards(beads);

  assert.deepEqual(cards[0].agents, [{ name: 'agent-alpha', status: 'active' }]);
  assert.deepEqual(cards[1].agents, [{ name: 'agent-beta', status: 'stale' }]);
  assert.deepEqual(cards[2].agents, []);
});

test('buildSocialCards maps status correctly', () => {
  const beads = [
    issue({ id: 'bb-1', status: 'open' }),
    issue({ id: 'bb-2', status: 'in_progress' }),
    issue({ id: 'bb-3', status: 'blocked' }),
    issue({ id: 'bb-4', status: 'closed' }),
    issue({ id: 'bb-5', status: 'tombstone' }),
    issue({ id: 'bb-6', status: 'deferred' }),
    issue({ id: 'bb-7', status: 'pinned' }),
    issue({ id: 'bb-8', status: 'hooked' }),
  ];

  const cards = buildSocialCards(beads);

  assert.equal(cards[0].status, 'ready');
  assert.equal(cards[1].status, 'in_progress');
  assert.equal(cards[2].status, 'blocked');
  assert.equal(cards[3].status, 'closed');
  assert.equal(cards[4].status, 'closed');
  assert.equal(cards[5].status, 'ready');
  assert.equal(cards[6].status, 'ready');
  assert.equal(cards[7].status, 'ready');
});

test('buildSocialCards converts updated_at to lastActivity Date', () => {
  const beads = [
    issue({ id: 'bb-1', updated_at: '2026-02-15T12:30:00Z' }),
  ];

  const cards = buildSocialCards(beads);

  assert.ok(cards[0].lastActivity instanceof Date);
  assert.equal(cards[0].lastActivity.toISOString(), '2026-02-15T12:30:00.000Z');
});

test('buildSocialCards returns empty array for empty input', () => {
  const cards = buildSocialCards([]);
  assert.deepEqual(cards, []);
});

test('buildSocialCards ignores non-blocks dependencies', () => {
  const beads = [
    issue({ id: 'bb-1', dependencies: [dep('parent', 'bb-2'), dep('relates_to', 'bb-3')] }),
    issue({ id: 'bb-2' }),
    issue({ id: 'bb-3' }),
  ];

  const cards = buildSocialCards(beads);

  assert.deepEqual(cards[0].unblocks, []);
  assert.deepEqual(cards[0].blocks, []);
});
