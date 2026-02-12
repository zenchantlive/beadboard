import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { IssuesEventBus } from '../../src/lib/realtime';
import { IssuesWatchManager } from '../../src/lib/watcher';

test('IssuesWatchManager startWatch is idempotent per project', async () => {
  const bus = new IssuesEventBus();
  const manager = new IssuesWatchManager({ eventBus: bus, debounceMs: 20 });

  manager.startWatch('C:/Repo/One');
  manager.startWatch('c:\\repo\\one');

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

  manager.startWatch(root);

  await fs.writeFile(issuesPath, `${JSON.stringify({ id: 'bb-1', title: 'watch' })}\n`, 'utf8');
  await new Promise((resolve) => setTimeout(resolve, 220));

  stop();
  await manager.stopAll();

  assert.equal(events.length >= 1, true);
});
