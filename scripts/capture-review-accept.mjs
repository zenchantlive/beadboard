import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/capture-review-accept.mjs <url>');
  process.exit(1);
}

const taskId = 'beadboard-ov2.4.1.4';
const completionTimestamp = new Date().toISOString();
const reviewUrl = new URL(baseUrl);
reviewUrl.searchParams.set('task', taskId);
reviewUrl.searchParams.set('right', 'open');
reviewUrl.searchParams.set('panel', 'open');

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/runtime/status', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ lifecycle: { status: 'running' } }),
  });
});

await page.route('**/api/runtime/orchestrator', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data: null, lifecycle: { status: 'running' } }),
  });
});

await page.route('**/api/runtime/agents**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, agentStates: [] }),
  });
});

await page.route('**/api/runtime/events**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      data: [
        {
          id: 'completion-event-accept-1',
          projectId: 'users-jordanhindo-beadboard',
          kind: 'worker.completed',
          title: 'Engineer 01 completed',
          detail: 'Implemented completion review accept handoff',
          timestamp: completionTimestamp,
          status: 'completed',
          actorLabel: 'Engineer 01',
          taskId,
          swarmId: 'beadboard-ov2',
          metadata: {
            workerId: 'worker-completion-accept-1',
            agentInstanceId: 'engineer-01-accept-1',
          },
        },
      ],
    }),
  });
});

await page.route('**/api/runtime/turns**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data: [] }),
  });
});

await page.route('**/api/runtime/stream**', async (route) => {
  await route.fulfill({
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
    body: ': stub\n\n',
  });
});

await page.route('**/api/beads/comment', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, operation: 'comment' }),
  });
});

await page.goto(reviewUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);

if (new URL(page.url()).searchParams.get('task') !== taskId) {
  throw new Error('Expected review route to open for the completed task.');
}

const reviewPath = path.join('artifacts', 'completion-review-before-accept.png');
await page.screenshot({ path: reviewPath, fullPage: false });
console.log(`Captured ${reviewPath}`);

await page.getByRole('button', { name: 'Accept', exact: true }).click();
await page.waitForTimeout(500);

if (new URL(page.url()).searchParams.get('task') !== null) {
  throw new Error('Expected accept action to close the task review route.');
}

const acceptedPath = path.join('artifacts', 'completion-review-after-accept.png');
await page.waitForTimeout(300);
await page.screenshot({ path: acceptedPath, fullPage: false });
console.log(`Captured ${acceptedPath}`);

await browser.close();
