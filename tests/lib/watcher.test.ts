import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

import { IssuesEventBus, ActivityEventBus } from '../../src/lib/realtime';
import { IssuesWatchManager } from '../../src/lib/watcher';

test('IssuesWatchManager startWatch is idempotent per project', async () => {
  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 20 });

  await manager.startWatch('C:/Repo/One');
  await manager.startWatch('c:\\repo\\one');

  assert.equal(manager.getWatchedProjectCount(), 1);
  await manager.stopAll();
});

test('IssuesWatchManager emits event after file change in watched .beads path', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-'));
  const beadsDir = path.join(root, '.beads');

  await fs.mkdir(beadsDir, { recursive: true });

  // Initialize bd in temp dir
  execSync('bd init --prefix bb --force', { cwd: root, stdio: 'ignore' });

  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 40 });

  const events: string[] = [];
  const stop = bus.subscribe((event) => {
    events.push(event.projectRoot);
  });

  await manager.startWatch(root);

  // Wait for initial read to settle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create issue via bd to trigger a valid mutation
  execSync('bd create "Task watch" --id bb-1', { cwd: root, stdio: 'ignore' });

  let found = false;
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (events.length >= 1) {
      found = true;
      break;
    }
  }

  stop();
  await manager.stopAll();

  assert.equal(found, true, 'Expected event from file change');
});

test('IssuesWatchManager emits telemetry event after beads.db change (not issues)', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-db-'));
  const beadsDir = path.join(root, '.beads');
  const dbPath = path.join(beadsDir, 'beads.db');

  await fs.mkdir(beadsDir, { recursive: true });

  // Initialize bd to create valid db
  execSync('bd init --prefix bb --force', { cwd: root, stdio: 'ignore' });
  execSync('bd create "Task A" --id bb-1', { cwd: root, stdio: 'ignore' });

  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 40 });

  const events: Array<{ kind: string; changedPath?: string }> = [];
  const stop = bus.subscribe((event) => {
    events.push({ kind: event.kind, changedPath: event.changedPath });
  });

  await manager.startWatch(root);

  // Wait for initial read to settle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Touch beads.db directly without mutating issues to simulate a connection write/telemetry pulse
  await fs.appendFile(dbPath, ' ', 'utf8');

  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (events.length >= 1) {
      break;
    }
  }

  stop();
  await manager.stopAll();

  // REGRESSION: beads.db should emit 'telemetry', not 'issues'
  // This prevents the "typing interrupt" refresh loop during agent heartbeats
  assert.equal(events.length >= 1, true, 'Expected at least one event');
  const dbEvents = events.filter(e => e.changedPath?.includes('beads.db'));
  assert.ok(dbEvents.length > 0, 'Expected beads.db change event');
  for (const event of dbEvents) {
    assert.equal(event.kind, 'telemetry', `beads.db change should emit 'telemetry', got '${event.kind}'. This prevents refresh loops during agent heartbeats.`);
  }
});

test('IssuesWatchManager emits event after beads.db-wal change', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-wal-'));
  const beadsDir = path.join(root, '.beads');

  await fs.mkdir(beadsDir, { recursive: true });

  // Initialize bd in temp dir
  execSync('bd init --prefix bb --force', { cwd: root, stdio: 'ignore' });

  // Initial state: 1 issue via bd
  execSync('bd create "Task A" --id bb-1', { cwd: root, stdio: 'ignore' });

  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 40 });

  const events: string[] = [];
  const stop = bus.subscribe((event) => {
    events.push(event.projectRoot);
  });

  await manager.startWatch(root);

  // Wait for initial read to settle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Modify issue via bd: status change. This updates beads.db-wal
  execSync('bd update bb-1 --status in_progress', { cwd: root, stdio: 'ignore' });

  let found = false;
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (events.length >= 1) {
      found = true;
      break;
    }
  }

  stop();
  await manager.stopAll();

  assert.equal(found, true, 'Expected event from db-wal change');
});

test('IssuesWatchManager emits ActivityEvent on issue change', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-activity-'));
  const beadsDir = path.join(root, '.beads');

  await fs.mkdir(beadsDir, { recursive: true });

  // Initialize bd in temp dir
  execSync('bd init --prefix bb --force', { cwd: root, stdio: 'ignore' });

  // Initial state: 1 issue via bd
  execSync('bd create "Task A" --id bb-1', { cwd: root, stdio: 'ignore' });
  execSync('bd update bb-1 --status open', { cwd: root, stdio: 'ignore' });

  const issuesBus = new IssuesEventBus();
  const activityBus = new ActivityEventBus();
  const manager = new IssuesWatchManager({
    eventBus: issuesBus,
    activityBus,
    debounceMs: 50
  });

  const activities: string[] = [];
  const stop = activityBus.subscribe((e) => {
    activities.push(`${e.event.kind}:${e.event.beadId}`);
  });

  // Start watching (should load initial snapshot silently)
  await manager.startWatch(root);

  // Wait for initial read to settle
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Modify issue via bd: status change
  execSync('bd update bb-1 --status in_progress', { cwd: root, stdio: 'ignore' });

  // Wait for debounce + processing with retry loop
  let found = false;
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (activities.includes('status_changed:bb-1')) {
      found = true;
      break;
    }
  }

  stop();
  await manager.stopAll();

  // Expect status_changed for bb-1
  if (!found) {
    console.error('WATCHER FAIL. Activities found:', JSON.stringify(activities, null, 2));
  }
  assert.ok(found, `Expected status_changed event. Got: ${activities.join(', ')}`);
});
