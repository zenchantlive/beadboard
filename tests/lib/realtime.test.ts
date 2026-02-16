import test from 'node:test';
import assert from 'node:assert/strict';

import { IssuesEventBus, toSseFrame } from '../../src/lib/realtime';

test('IssuesEventBus emits monotonically increasing IDs', () => {
  const bus = new IssuesEventBus();
  const seen: number[] = [];
  const unsubscribe = bus.subscribe((event) => seen.push(event.id));

  bus.emit('C:/Repo/One');
  bus.emit('C:/Repo/One');
  unsubscribe();

  assert.deepEqual(seen, [1, 2]);
});

test('IssuesEventBus filters by project root', () => {
  const bus = new IssuesEventBus();
  const one: number[] = [];
  const two: number[] = [];
  const stopOne = bus.subscribe((event) => one.push(event.id), { projectRoot: 'C:/Repo/One' });
  const stopTwo = bus.subscribe((event) => two.push(event.id), { projectRoot: 'D:/Repo/Two' });

  bus.emit('c:\\repo\\one');
  bus.emit('D:/Repo/Two');

  stopOne();
  stopTwo();

  assert.deepEqual(one, [1]);
  assert.deepEqual(two, [2]);
});

test('toSseFrame includes id, event name, and data payload', () => {
  const frame = toSseFrame({
    id: 9,
    projectRoot: 'C:\\Repo\\One',
    kind: 'changed',
    at: '2026-02-12T01:00:00.000Z',
  });

  assert.equal(frame.includes('id: 9'), true);
  assert.equal(frame.includes('event: issues'), true);
  assert.equal(frame.includes('"projectRoot":"C:\\\\Repo\\\\One"'), true);
});

test('toSseFrame uses telemetry event name for telemetry kind', () => {
  const frame = toSseFrame({
    id: 42,
    projectRoot: 'C:/Repo',
    kind: 'telemetry',
    at: new Date().toISOString(),
  });
  assert.ok(frame.includes('event: telemetry'), 'Should use telemetry event name');
  assert.ok(frame.includes('id: 42'), 'Should preserve ID');
});
