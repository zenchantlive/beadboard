import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

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
  const issuesPath = path.join(beadsDir, 'issues.jsonl');
  await fs.mkdir(beadsDir, { recursive: true });
  await fs.writeFile(issuesPath, '', 'utf8');

  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 40 });

  const events: string[] = [];
  const stop = bus.subscribe((event) => {
    events.push(event.projectRoot);
  });

  await manager.startWatch(root);

  await fs.writeFile(issuesPath, `${JSON.stringify({ id: 'bb-1', title: 'watch' })}\n`, 'utf8');
  await new Promise((resolve) => setTimeout(resolve, 220));

  stop();
  await manager.stopAll();

  assert.equal(events.length >= 1, true);
});

test('IssuesWatchManager emits event after beads.db change', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-db-'));
  const beadsDir = path.join(root, '.beads');
  const dbPath = path.join(beadsDir, 'beads.db');
  await fs.mkdir(beadsDir, { recursive: true });
  await fs.writeFile(dbPath, 'seed', 'utf8');

  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 40 });

  const events: string[] = [];
  const stop = bus.subscribe((event) => {
    events.push(event.projectRoot);
  });

  await manager.startWatch(root);

  await fs.writeFile(dbPath, `seed-${Date.now()}`, 'utf8');
  await new Promise((resolve) => setTimeout(resolve, 220));

  stop();
  await manager.stopAll();

  assert.equal(events.length >= 1, true);
});

test('IssuesWatchManager emits event after beads.db-wal change', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-wal-'));
  const beadsDir = path.join(root, '.beads');
  const walPath = path.join(beadsDir, 'beads.db-wal');
  await fs.mkdir(beadsDir, { recursive: true });
  await fs.writeFile(walPath, 'seed', 'utf8');

  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 40 });

  const events: string[] = [];
  const stop = bus.subscribe((event) => {
    events.push(event.projectRoot);
  });

  await manager.startWatch(root);

  await fs.writeFile(walPath, `seed-${Date.now()}`, 'utf8');
  await new Promise((resolve) => setTimeout(resolve, 220));

  stop();
  await manager.stopAll();

  assert.equal(events.length >= 1, true);
});

test('IssuesWatchManager emits ActivityEvent on issue change', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-watch-activity-'));
  const beadsDir = path.join(root, '.beads');
  const issuesPath = path.join(beadsDir, 'issues.jsonl');
  
  await fs.mkdir(beadsDir, { recursive: true });
  
  // Initial state: 1 issue
  const issuev1 = { id: 'bb-1', title: 'Task A', status: 'open' };
  await fs.writeFile(issuesPath, JSON.stringify(issuev1) + '\n', 'utf8');

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

  // Modify issue: status change
  const issuev2 = { ...issuev1, status: 'in_progress' };
  await fs.writeFile(issuesPath, JSON.stringify(issuev2) + '\n', 'utf8');

  // Wait for debounce + processing
  await new Promise((resolve) => setTimeout(resolve, 300));

  stop();
  await manager.stopAll();

  // Expect status_changed for bb-1
  assert.ok(activities.includes('status_changed:bb-1'), `Expected status_changed event. Got: ${activities.join(', ')}`);
});
