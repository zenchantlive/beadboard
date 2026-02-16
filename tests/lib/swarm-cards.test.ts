import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSwarmCards, getSwarmCardSummary, type SwarmCard } from '../../src/lib/swarm-cards';
import type { BeadIssue } from '../../src/lib/types';

function makeBead(overrides: Partial<BeadIssue>): BeadIssue {
  return {
    id: overrides.id || 'bb-test',
    title: overrides.title || 'Test bead',
    description: null,
    status: overrides.status || 'open',
    priority: overrides.priority || 0,
    issue_type: overrides.issue_type || 'task',
    assignee: null,
    owner: null,
    labels: overrides.labels || [],
    dependencies: [],
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    closed_at: null,
    close_reason: null,
    closed_by_session: null,
    created_by: null,
    due_at: null,
    estimated_minutes: null,
    external_ref: null,
    metadata: {},
  };
}

function makeAgentBead(id: string, swarmId: string, updatedAt: string): BeadIssue {
  return makeBead({
    id,
    title: `Agent: ${id}`,
    issue_type: 'agent',
    labels: ['gt:agent', `swarm:${swarmId}`],
    updated_at: updatedAt,
  });
}

function makeEpicBead(id: string, title: string): BeadIssue {
  return makeBead({
    id,
    title,
    issue_type: 'epic',
  });
}

function makeTaskBead(id: string, swarmId: string, status: string, updatedAt: string): BeadIssue {
  return makeBead({
    id,
    title: `Task ${id}`,
    status: status as any,
    labels: [`swarm:${swarmId}`],
    updated_at: updatedAt,
  });
}

test('buildSwarmCards returns empty array for no beads', () => {
  const cards = buildSwarmCards([]);
  assert.equal(cards.length, 0);
});

test('buildSwarmCards groups beads by swarm label', () => {
  const now = new Date();
  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic1', 'Epic One'),
    makeTaskBead('bb-task1', 'bb-epic1', 'open', now.toISOString()),
    makeTaskBead('bb-task2', 'bb-epic1', 'open', now.toISOString()),
    makeTaskBead('bb-task3', 'bb-epic2', 'open', now.toISOString()),
  ];

  const cards = buildSwarmCards(beads, now);
  assert.equal(cards.length, 2);

  const epic1Card = cards.find((c) => c.swarmId === 'bb-epic1');
  assert.ok(epic1Card);
  assert.equal(epic1Card!.title, 'Epic One');
  assert.equal(epic1Card!.progress, 0);
});

test('buildSwarmCards calculates progress correctly', () => {
  const now = new Date();
  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic1', 'Epic'),
    makeTaskBead('bb-t1', 'bb-epic1', 'closed', now.toISOString()),
    makeTaskBead('bb-t2', 'bb-epic1', 'closed', now.toISOString()),
    makeTaskBead('bb-t3', 'bb-epic1', 'open', now.toISOString()),
    makeTaskBead('bb-t4', 'bb-epic1', 'open', now.toISOString()),
  ];

  const cards = buildSwarmCards(beads, now);
  const card = cards.find((c) => c.swarmId === 'bb-epic1');
  assert.ok(card);
  assert.equal(card!.progress, 50);
});

test('buildSwarmCards extracts agents from swarm', () => {
  const now = new Date();
  const recentActivity = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  
  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic1', 'Epic'),
    makeAgentBead('bb-agent1', 'bb-epic1', recentActivity),
    makeAgentBead('bb-agent2', 'bb-epic1', recentActivity),
    makeTaskBead('bb-task1', 'bb-epic1', 'open', now.toISOString()),
  ];

  const cards = buildSwarmCards(beads, now);
  const card = cards.find((c) => c.swarmId === 'bb-epic1');
  
  assert.ok(card);
  assert.equal(card!.agents.length, 2);
  assert.ok(card!.agents.some((a) => a.name === 'agent1'));
  assert.ok(card!.agents.some((a) => a.name === 'agent2'));
});

test('buildSwarmCards derives agent status from last activity', () => {
  const now = new Date();
  const activeTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const staleTime = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const stuckTime = new Date(now.getTime() - 40 * 60 * 1000).toISOString();
  const deadTime = new Date(now.getTime() - 70 * 60 * 1000).toISOString();

  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic1', 'Epic'),
    makeAgentBead('bb-active', 'bb-epic1', activeTime),
    makeAgentBead('bb-stale', 'bb-epic1', staleTime),
    makeAgentBead('bb-stuck', 'bb-epic1', stuckTime),
    makeAgentBead('bb-dead', 'bb-epic1', deadTime),
  ];

  const cards = buildSwarmCards(beads, now);
  const card = cards.find((c) => c.swarmId === 'bb-epic1');
  
  assert.ok(card);
  const activeAgent = card!.agents.find((a) => a.name === 'active');
  const staleAgent = card!.agents.find((a) => a.name === 'stale');
  const stuckAgent = card!.agents.find((a) => a.name === 'stuck');
  const deadAgent = card!.agents.find((a) => a.name === 'dead');

  assert.equal(activeAgent?.status, 'active');
  assert.equal(staleAgent?.status, 'stale');
  assert.equal(stuckAgent?.status, 'stuck');
  assert.equal(deadAgent?.status, 'dead');
});

test('buildSwarmCards derives swarm health from agents', () => {
  const now = new Date();
  const activeTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const staleTime = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const deadTime = new Date(now.getTime() - 70 * 60 * 1000).toISOString();

  const activeBeads: BeadIssue[] = [
    makeEpicBead('bb-epic-active', 'Active'),
    makeAgentBead('bb-a1', 'bb-epic-active', activeTime),
    makeAgentBead('bb-a2', 'bb-epic-active', activeTime),
  ];

  const staleBeads: BeadIssue[] = [
    makeEpicBead('bb-epic-stale', 'Stale'),
    makeAgentBead('bb-s1', 'bb-epic-stale', staleTime),
    makeAgentBead('bb-s2', 'bb-epic-stale', staleTime),
  ];

  const deadBeads: BeadIssue[] = [
    makeEpicBead('bb-epic-dead', 'Dead'),
    makeAgentBead('bb-d1', 'bb-epic-dead', deadTime),
    makeAgentBead('bb-d2', 'bb-epic-dead', deadTime),
  ];

  const activeCards = buildSwarmCards(activeBeads, now);
  const staleCards = buildSwarmCards(staleBeads, now);
  const deadCards = buildSwarmCards(deadBeads, now);

  const activeCard = activeCards.find((c) => c.swarmId === 'bb-epic-active');
  const staleCard = staleCards.find((c) => c.swarmId === 'bb-epic-stale');
  const deadCard = deadCards.find((c) => c.swarmId === 'bb-epic-dead');

  assert.equal(activeCard?.health, 'active');
  assert.equal(staleCard?.health, 'stale');
  assert.equal(deadCard?.health, 'dead');
});

test('buildSwarmCards extracts attention items for blocked/in_progress tasks', () => {
  const now = new Date();
  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic1', 'Epic'),
    {
      ...makeTaskBead('bb-blocked', 'bb-epic1', 'blocked', now.toISOString()),
      title: 'Blocked task',
      priority: 10,
    },
    {
      ...makeTaskBead('bb-wip', 'bb-epic1', 'in_progress', now.toISOString()),
      title: 'Work in progress',
      priority: 5,
    },
    makeTaskBead('bb-open', 'bb-epic1', 'open', now.toISOString()),
    makeTaskBead('bb-closed', 'bb-epic1', 'closed', now.toISOString()),
  ];

  const cards = buildSwarmCards(beads, now);
  const card = cards.find((c) => c.swarmId === 'bb-epic1');
  
  assert.ok(card);
  assert.equal(card!.attentionItems.length, 2);
  assert.ok(card!.attentionItems[0].includes('bb-blocked'));
  assert.ok(card!.attentionItems[1].includes('bb-wip'));
});

test('buildSwarmCards sorts cards by lastActivity descending', () => {
  const now = new Date();
  const older = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const newer = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic-old', 'Old Epic'),
    makeEpicBead('bb-epic-new', 'New Epic'),
    makeTaskBead('bb-t1', 'bb-epic-old', 'open', older),
    makeTaskBead('bb-t2', 'bb-epic-new', 'open', newer),
  ];

  const cards = buildSwarmCards(beads, now);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].swarmId, 'bb-epic-new');
  assert.equal(cards[1].swarmId, 'bb-epic-old');
});

test('getSwarmCardSummary returns correct counts', () => {
  const cards: SwarmCard[] = [
    { swarmId: '1', title: 'A', agents: [], attentionItems: [], progress: 0, lastActivity: new Date(), health: 'active' },
    { swarmId: '2', title: 'B', agents: [], attentionItems: [], progress: 0, lastActivity: new Date(), health: 'active' },
    { swarmId: '3', title: 'C', agents: [], attentionItems: [], progress: 0, lastActivity: new Date(), health: 'stale' },
    { swarmId: '4', title: 'D', agents: [], attentionItems: [], progress: 0, lastActivity: new Date(), health: 'stuck' },
    { swarmId: '5', title: 'E', agents: [], attentionItems: [], progress: 0, lastActivity: new Date(), health: 'dead' },
  ];

  const summary = getSwarmCardSummary(cards);
  assert.equal(summary.total, 5);
  assert.equal(summary.active, 2);
  assert.equal(summary.stale, 1);
  assert.equal(summary.stuck, 1);
  assert.equal(summary.dead, 1);
});

test('buildSwarmCards handles swarm without epic', () => {
  const now = new Date();
  const beads: BeadIssue[] = [
    makeTaskBead('bb-task1', 'bb-orphan-swarm', 'open', now.toISOString()),
    makeAgentBead('bb-agent1', 'bb-orphan-swarm', now.toISOString()),
  ];

  const cards = buildSwarmCards(beads, now);
  const card = cards.find((c) => c.swarmId === 'bb-orphan-swarm');
  
  assert.ok(card);
  assert.equal(card!.title, 'Swarm bb-orphan-swarm');
});

test('buildSwarmCards ignores non-agent beads with swarm label when building agent roster', () => {
  const now = new Date();
  const beads: BeadIssue[] = [
    makeEpicBead('bb-epic1', 'Epic'),
    makeAgentBead('bb-agent1', 'bb-epic1', now.toISOString()),
    makeTaskBead('bb-task1', 'bb-epic1', 'open', now.toISOString()),
  ];

  const cards = buildSwarmCards(beads, now);
  const card = cards.find((c) => c.swarmId === 'bb-epic1');
  
  assert.ok(card);
  assert.equal(card!.agents.length, 1);
  assert.equal(card!.agents[0].name, 'agent1');
});