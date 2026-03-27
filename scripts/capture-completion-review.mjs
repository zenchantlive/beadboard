import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/capture-completion-review.mjs <url>');
  process.exit(1);
}

const taskId = 'beadboard-ov2.4.1.4';
const completionTimestamp = new Date().toISOString();

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route('**/api/runtime/status', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      lifecycle: { status: 'running' },
    }),
  });
});

await page.route('**/api/runtime/orchestrator', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      data: null,
      lifecycle: { status: 'running' },
    }),
  });
});

await page.route('**/api/runtime/agents**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      agentStates: [],
    }),
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
          id: 'completion-event-1',
          projectId: 'users-jordanhindo-beadboard',
          kind: 'worker.completed',
          title: 'Engineer 01 completed',
          detail: 'Implemented completion click-through review handoff',
          timestamp: completionTimestamp,
          status: 'completed',
          actorLabel: 'Engineer 01',
          taskId,
          swarmId: 'beadboard-ov2',
          metadata: {
            workerId: 'worker-completion-1',
            agentInstanceId: 'engineer-01-abc123',
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
    body: JSON.stringify({
      ok: true,
      data: [],
    }),
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

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);

const completedIndicator = page.getByTestId('completed-event-indicator');
await completedIndicator.waitFor({ state: 'visible', timeout: 10000 });
await completedIndicator.click();
const afterPath = path.join('artifacts', 'completion-review-task-detail.png');
try {
  await page.waitForTimeout(300);
} finally {
  await page.screenshot({ path: afterPath, fullPage: false });
  console.log(`Captured ${afterPath}`);
  console.log(`Completion click current URL: ${page.url()}`);
}

const taskParam = new URL(page.url()).searchParams.get('task');
if (taskParam !== taskId) {
  throw new Error(`Expected task=${taskId}, received ${taskParam}`);
}

const drawerParam = new URL(page.url()).searchParams.get('drawer');
if (drawerParam !== null) {
  throw new Error(`Expected completed-task review handoff to avoid drawer=open, received drawer=${drawerParam}`);
}

const indicatorCount = await page.getByTestId('completed-event-indicator').count();
if (indicatorCount !== 0) {
  throw new Error('Expected completion indicator to clear after acknowledgement.');
}

await browser.close();
