import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/capture-swarm-bulk-cancel.mjs <url>');
  process.exit(1);
}

const swarmId = 'beadboard-ov2.8.3';
const now = new Date().toISOString();

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const json = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

await page.route('**/api/bd/health**', async (route) => {
  await route.fulfill(json({ ok: true, data: { version: 'stubbed' } }));
});

await page.route('**/api/beads/read**', async (route) => {
  await route.fulfill(json({
    ok: true,
    issues: [
      {
        id: swarmId,
        title: 'Add safe bulk-cancel control for active swarms',
        description: 'Guarded stop-all control for active swarm workers.',
        status: 'in_progress',
        priority: 3,
        issue_type: 'epic',
        assignee: null,
        templateId: null,
        owner: null,
        labels: ['swarm'],
        dependencies: [],
        created_at: now,
        updated_at: now,
        closed_at: null,
        close_reason: null,
        closed_by_session: null,
        created_by: null,
        due_at: null,
        estimated_minutes: null,
        external_ref: null,
        metadata: {},
      },
      {
        id: 'beadboard-ov2.8.3.1',
        title: 'Route active worker termination through a guarded bulk action',
        description: 'Stops only active workers.',
        status: 'in_progress',
        priority: 3,
        issue_type: 'task',
        assignee: 'engineer-01',
        templateId: null,
        owner: null,
        labels: ['swarm'],
        dependencies: [{ type: 'parent', target: swarmId }],
        created_at: now,
        updated_at: now,
        closed_at: null,
        close_reason: null,
        closed_by_session: null,
        created_by: null,
        due_at: null,
        estimated_minutes: null,
        external_ref: null,
        metadata: {},
      },
    ],
  }));
});

await page.route('**/api/swarm/list**', async (route) => {
  await route.fulfill(json({
    ok: true,
    data: {
      swarms: [
        {
          id: swarmId,
          title: 'Orchestrator v2 bulk-cancel',
          epic_id: swarmId,
          epic_title: 'Add safe bulk-cancel control for active swarms',
          status: 'active',
          coordinator: 'orchestrator',
          total_issues: 2,
          completed_issues: 0,
          active_issues: 2,
          progress_percent: 25,
        },
      ],
    },
  }));
});

await page.route('**/api/swarm/status**', async (route) => {
  await route.fulfill(json({
    ok: true,
    data: {
      epic_id: swarmId,
      epic_title: 'Add safe bulk-cancel control for active swarms',
      total_issues: 2,
      completed: [],
      active: [
        { id: 'beadboard-ov2.8.3.1', title: 'Route active worker termination through a guarded bulk action', status: 'working' },
        { id: 'beadboard-ov2.8.3.2', title: 'Add destructive confirmation guard and status copy', status: 'working' },
      ],
      ready: [],
      blocked: [],
      progress_percent: 25,
      active_count: 2,
      ready_count: 0,
      blocked_count: 0,
    },
  }));
});

await page.route('**/api/mission/graph**', async (route) => {
  await route.fulfill(json({
    ok: true,
    data: {
      nodes: [
        {
          id: swarmId,
          title: 'Add safe bulk-cancel control for active swarms',
          description: 'Guarded stop-all control for active swarm workers.',
          status: 'in_progress',
          priority: 3,
          issue_type: 'epic',
          assignee: null,
          templateId: null,
          owner: null,
          labels: ['swarm'],
          dependencies: [],
          created_at: now,
          updated_at: now,
          closed_at: null,
          close_reason: null,
          closed_by_session: null,
          created_by: null,
          due_at: null,
          estimated_minutes: null,
          external_ref: null,
          metadata: {},
        },
      ],
      edges: [],
    },
  }));
});

await page.route('**/api/runtime/status**', async (route) => {
  await route.fulfill(json({ lifecycle: { status: 'running' } }));
});

await page.route('**/api/runtime/orchestrator**', async (route) => {
  await route.fulfill(json({ ok: true, data: null, lifecycle: { status: 'running' } }));
});

await page.route('**/api/runtime/agents**', async (route) => {
  await route.fulfill(json({
    ok: true,
    status: {
      totalActive: 2,
      instances: [
        { id: 'worker-1', displayName: 'Engineer 01', status: 'working', currentBeadId: 'beadboard-ov2.8.3.1' },
        { id: 'worker-2', displayName: 'Engineer 02', status: 'working', currentBeadId: 'beadboard-ov2.8.3.2' },
      ],
      byType: { engineer: 2 },
    },
  }));
});

await page.route('**/api/runtime/agents/history**', async (route) => {
  await route.fulfill(json({ ok: true, instances: [] }));
});

await page.route('**/api/runtime/events**', async (route) => {
  await route.fulfill(json({ ok: true, data: [] }));
});

await page.route('**/api/runtime/turns**', async (route) => {
  await route.fulfill(json({ ok: true, data: [] }));
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

await page.route('**/api/events**', async (route) => {
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

await page.route('**/api/agents/mail/batch**', async (route) => {
  await route.fulfill(json({ ok: true, data: [] }));
});

await page.route('**/api/agents/reservations/batch**', async (route) => {
  await route.fulfill(json({ ok: true, data: [] }));
});

await page.route('**/api/activity**', async (route) => {
  await route.fulfill(json({ ok: true, data: [] }));
});

await page.route('**/api/swarm/stop-all**', async (route) => {
  await route.fulfill(json({
    ok: true,
    data: {
      swarmId,
      activeTaskIds: ['beadboard-ov2.8.3.1', 'beadboard-ov2.8.3.2'],
      confirmationPhrase: `STOP 2 ACTIVE WORKERS IN ${swarmId}`,
      matchedWorkers: [
        { workerId: 'worker-1', taskId: 'beadboard-ov2.8.3.1', status: 'working', displayName: 'Engineer 01' },
        { workerId: 'worker-2', taskId: 'beadboard-ov2.8.3.2', status: 'working', displayName: 'Engineer 02' },
      ],
      stoppedWorkerIds: ['worker-1', 'worker-2'],
      failedWorkers: [],
    },
  }));
});

const targetUrl = new URL(baseUrl);
targetUrl.searchParams.set('view', 'social');
targetUrl.searchParams.set('swarm', swarmId);
targetUrl.searchParams.set('right', 'open');
targetUrl.searchParams.set('skip', 'true');

await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(6000);

await page.locator('button').filter({ hasText: /Squad/ }).first().click({ timeout: 15000 });
await page.getByText('Destructive Action').waitFor({ state: 'visible', timeout: 15000 });
await page.getByLabel('Bulk cancel confirmation').fill(`STOP 2 ACTIVE WORKERS IN ${swarmId}`);
await page.getByRole('button', { name: 'Stop 2 active workers' }).waitFor({ state: 'visible', timeout: 15000 });

const outputPath = path.join('artifacts', 'swarm-bulk-cancel-right-panel.png');
await page.screenshot({ path: outputPath, fullPage: false });
console.log(`Captured ${outputPath}`);

await browser.close();
