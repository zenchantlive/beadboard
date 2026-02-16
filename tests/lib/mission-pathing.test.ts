import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getAgentActiveMissions, 
  getActiveMissionCount,
  getMissionsByAgent,
  type SessionTaskCard, 
  type EpicBucket 
} from '../../src/lib/agent-sessions';

/**
 * Tests for bb-buff.3.3: Active Mission Pathing
 * 
 * These tests verify the mapping between working agents and their tasks.
 */

// Helper to create test data
function makeBucket(tasks: Partial<SessionTaskCard>[]): EpicBucket {
  return {
    epic: { id: 'epic-1', title: 'Test Epic', status: 'open' },
    tasks: tasks.map((t, i) => ({
      id: t.id || `task-${i}`,
      title: t.title || 'Test Task',
      epicId: 'epic-1',
      status: t.status || 'in_progress',
      sessionState: t.sessionState || 'active',
      owner: t.owner || null,
      lastActor: null,
      lastActivityAt: new Date().toISOString(),
      communication: { unreadCount: 0, pendingRequired: false, latestSnippet: null },
      ...t
    })) as SessionTaskCard[]
  };
}

test('getAgentActiveMissions returns tasks owned by agent', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: 'agent-alpha' },
      { id: 'task-2', owner: 'agent-beta' },
      { id: 'task-3', owner: 'agent-alpha' },
    ])
  ];
  
  const missions = getAgentActiveMissions(feed, 'agent-alpha');
  assert.equal(missions.length, 2);
  assert.equal(missions[0].id, 'task-1');
  assert.equal(missions[1].id, 'task-3');
});

test('getAgentActiveMissions excludes closed tasks', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: 'agent-alpha', status: 'in_progress' },
      { id: 'task-2', owner: 'agent-alpha', status: 'closed' },
    ])
  ];
  
  const missions = getAgentActiveMissions(feed, 'agent-alpha');
  assert.equal(missions.length, 1);
  assert.equal(missions[0].id, 'task-1');
});

test('getAgentActiveMissions returns empty array for unknown agent', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: 'agent-alpha' },
    ])
  ];
  
  const missions = getAgentActiveMissions(feed, 'unknown-agent');
  assert.equal(missions.length, 0);
});

test('getAgentActiveMissions returns empty array for null owner', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: null },
    ])
  ];
  
  const missions = getAgentActiveMissions(feed, 'agent-alpha');
  assert.equal(missions.length, 0);
});

test('getAgentActiveMissions works across multiple epics', () => {
  const bucket1 = makeBucket([{ id: 'task-1', owner: 'agent-alpha', epicId: 'epic-1' }]);
  const bucket2: EpicBucket = {
    epic: { id: 'epic-2', title: 'Epic 2', status: 'open' },
    tasks: [{
      id: 'task-2',
      title: 'Task in Epic 2',
      epicId: 'epic-2',
      status: 'in_progress',
      sessionState: 'active',
      owner: 'agent-alpha',
      lastActor: null,
      lastActivityAt: new Date().toISOString(),
      communication: { unreadCount: 0, pendingRequired: false, latestSnippet: null },
    }]
  };
  
  const missions = getAgentActiveMissions([bucket1, bucket2], 'agent-alpha');
  assert.equal(missions.length, 2);
});

test('getActiveMissionCount returns correct count', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: 'agent-alpha' },
      { id: 'task-2', owner: 'agent-alpha' },
      { id: 'task-3', owner: 'agent-beta' },
    ])
  ];
  
  assert.equal(getActiveMissionCount(feed, 'agent-alpha'), 2);
  assert.equal(getActiveMissionCount(feed, 'agent-beta'), 1);
  assert.equal(getActiveMissionCount(feed, 'unknown'), 0);
});

test('getMissionsByAgent groups all agents', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: 'agent-alpha' },
      { id: 'task-2', owner: 'agent-beta' },
      { id: 'task-3', owner: 'agent-alpha' },
      { id: 'task-4', owner: null }, // No owner
    ])
  ];
  
  const byAgent = getMissionsByAgent(feed);
  assert.deepEqual(Object.keys(byAgent).sort(), ['agent-alpha', 'agent-beta']);
  assert.equal(byAgent['agent-alpha'].length, 2);
  assert.equal(byAgent['agent-beta'].length, 1);
});

test('getMissionsByAgent excludes closed tasks', () => {
  const feed = [
    makeBucket([
      { id: 'task-1', owner: 'agent-alpha', status: 'in_progress' },
      { id: 'task-2', owner: 'agent-alpha', status: 'closed' },
    ])
  ];
  
  const byAgent = getMissionsByAgent(feed);
  assert.equal(byAgent['agent-alpha'].length, 1);
  assert.equal(byAgent['agent-alpha'][0].id, 'task-1');
});
