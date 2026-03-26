import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationTurnStore, makeTurnId, type ConversationTurn } from '../../src/lib/orchestrator-chat.js';
import { embeddedPiDaemon } from '../../src/lib/embedded-daemon.js';

// ─── ConversationTurnStore unit tests ───────────────────────────────────────

describe('ConversationTurnStore', () => {
  let store: ConversationTurnStore;

  beforeEach(() => {
    store = new ConversationTurnStore();
  });

  it('starts empty', () => {
    assert.deepEqual(store.listTurns(), []);
  });

  it('user message creates a user turn', () => {
    const turn: ConversationTurn = {
      id: makeTurnId('user'),
      role: 'user',
      text: 'Hello orchestrator',
      timestamp: new Date().toISOString(),
      status: 'complete',
    };
    store.appendTurn(turn);

    const turns = store.listTurns();
    assert.equal(turns.length, 1);
    assert.equal(turns[0].role, 'user');
    assert.equal(turns[0].text, 'Hello orchestrator');
  });

  it('assistant streaming creates one turn, not duplicates', () => {
    // Simulate message_start: create streaming turn
    store.appendTurn({
      id: makeTurnId('asst'),
      role: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),
      status: 'streaming',
    });

    // Simulate text_delta: update in place
    store.updateLastTurn((turn) => ({
      ...turn,
      text: turn.text + 'Hello',
    }));
    store.updateLastTurn((turn) => ({
      ...turn,
      text: turn.text + ' there',
    }));

    // Exactly one turn
    const turns = store.listTurns();
    assert.equal(turns.length, 1);
    assert.equal(turns[0].role, 'assistant');
    assert.equal(turns[0].text, 'Hello there');
    assert.equal(turns[0].status, 'streaming');
  });

  it('text_delta followed by text_done produces exactly one assistant turn', () => {
    // message_start
    store.appendTurn({
      id: makeTurnId('asst'),
      role: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),
      status: 'streaming',
    });

    // text_delta x2
    store.updateLastTurn((turn) => ({ ...turn, text: turn.text + 'Part 1. ' }));
    store.updateLastTurn((turn) => ({ ...turn, text: turn.text + 'Part 2.' }));

    // text_done: mark complete with final authoritative text
    store.updateLastTurn((turn) => ({
      ...turn,
      text: 'Part 1. Part 2.',
      status: 'complete',
      timestamp: new Date().toISOString(),
    }));

    const turns = store.listTurns();
    // Must be exactly ONE assistant turn — not two
    assert.equal(turns.length, 1);
    assert.equal(turns[0].role, 'assistant');
    assert.equal(turns[0].text, 'Part 1. Part 2.');
    assert.equal(turns[0].status, 'complete');
  });

  it('no artificial cap — supports more than 40 turns', () => {
    for (let i = 0; i < 50; i++) {
      store.appendTurn({
        id: makeTurnId(i % 2 === 0 ? 'user' : 'asst'),
        role: i % 2 === 0 ? 'user' : 'assistant',
        text: `Message ${i}`,
        timestamp: new Date().toISOString(),
        status: 'complete',
      });
    }
    assert.equal(store.listTurns().length, 50);
  });

  it('updateLastTurn is a no-op on an empty store', () => {
    assert.doesNotThrow(() => {
      store.updateLastTurn((turn) => ({ ...turn, text: 'should not crash' }));
    });
    assert.equal(store.listTurns().length, 0);
  });

  it('listTurns returns turns in append order', () => {
    store.appendTurn({ id: 'a', role: 'user', text: 'first', timestamp: new Date().toISOString() });
    store.appendTurn({ id: 'b', role: 'assistant', text: 'second', timestamp: new Date().toISOString() });
    store.appendTurn({ id: 'c', role: 'user', text: 'third', timestamp: new Date().toISOString() });

    const turns = store.listTurns();
    assert.equal(turns[0].text, 'first');
    assert.equal(turns[1].text, 'second');
    assert.equal(turns[2].text, 'third');
  });

  it('reset clears all turns', () => {
    store.appendTurn({ id: 'a', role: 'user', text: 'hi', timestamp: new Date().toISOString() });
    store.reset();
    assert.equal(store.listTurns().length, 0);
  });
});

// ─── EmbeddedPiDaemon turns integration tests ───────────────────────────────

describe('EmbeddedPiDaemon turns store', () => {
  const ROOT = '/test/project-turns';

  beforeEach(() => {
    embeddedPiDaemon.resetForTests();
  });

  it('listTurns returns empty array for unknown project', () => {
    assert.deepEqual(embeddedPiDaemon.listTurns('/no/such/project'), []);
  });

  it('appendTurn stores a turn for the project', () => {
    embeddedPiDaemon.appendTurn(ROOT, {
      id: 'u1',
      role: 'user',
      text: 'Deploy the app',
      timestamp: new Date().toISOString(),
      status: 'complete',
    });
    const turns = embeddedPiDaemon.listTurns(ROOT);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].text, 'Deploy the app');
  });

  it('updateCurrentTurn mutates the last turn without adding a new one', () => {
    embeddedPiDaemon.appendTurn(ROOT, {
      id: 'a1',
      role: 'assistant',
      text: '',
      timestamp: new Date().toISOString(),
      status: 'streaming',
    });

    embeddedPiDaemon.updateCurrentTurn(ROOT, (t) => ({ ...t, text: 'Hello!', status: 'complete' }));

    const turns = embeddedPiDaemon.listTurns(ROOT);
    assert.equal(turns.length, 1);
    assert.equal(turns[0].text, 'Hello!');
    assert.equal(turns[0].status, 'complete');
  });

  it('projects are isolated — turns for one project do not bleed into another', () => {
    const ROOT_A = '/test/proj-a';
    const ROOT_B = '/test/proj-b';

    embeddedPiDaemon.appendTurn(ROOT_A, {
      id: 'ua',
      role: 'user',
      text: 'Hello from A',
      timestamp: new Date().toISOString(),
      status: 'complete',
    });

    assert.equal(embeddedPiDaemon.listTurns(ROOT_A).length, 1);
    assert.equal(embeddedPiDaemon.listTurns(ROOT_B).length, 0);
  });

  it('worker events do not create chat turns (only appendTurn does)', () => {
    // Worker events go through appendEvent, not appendTurn
    embeddedPiDaemon.appendWorkerEvent(ROOT, 'worker-1', {
      kind: 'worker.spawned',
      title: 'Worker spawned',
      detail: 'Spawning worker-1',
    });

    // No turns should have been created
    assert.equal(embeddedPiDaemon.listTurns(ROOT).length, 0);
    // But the runtime event should exist
    const events = embeddedPiDaemon.listEvents(ROOT);
    assert.ok(events.some((e) => e.kind === 'worker.spawned'));
  });

  it('resetForTests clears turns', () => {
    embeddedPiDaemon.appendTurn(ROOT, {
      id: 'x1',
      role: 'user',
      text: 'hi',
      timestamp: new Date().toISOString(),
      status: 'complete',
    });
    embeddedPiDaemon.resetForTests();
    assert.equal(embeddedPiDaemon.listTurns(ROOT).length, 0);
  });
});
