import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';
import type { LaunchSurface } from '../../../../lib/embedded-runtime';
import type { readIssuesFromDisk as ReadIssuesFromDisk } from '../../../../lib/read-issues';

export const dynamic = 'force-dynamic';

interface LaunchDeps {
  readIssues?: typeof ReadIssuesFromDisk;
}

function isLaunchSurface(value: string): value is LaunchSurface {
  return ['social', 'graph', 'swarm', 'sessions', 'activity', 'task'].includes(value);
}

export async function handleRuntimeLaunchPost(request: Request, deps: LaunchDeps = {}): Promise<Response> {
  try {
    const body = await request.json();
    const projectRoot = typeof body?.projectRoot === 'string' ? body.projectRoot.trim() : '';
    const taskId = typeof body?.taskId === 'string' ? body.taskId.trim() : '';
    const origin = typeof body?.origin === 'string' && isLaunchSurface(body.origin) ? body.origin : null;
    const swarmId = typeof body?.swarmId === 'string' ? body.swarmId : null;

    if (!projectRoot || !taskId || !origin) {
      return NextResponse.json({ ok: false, error: 'projectRoot, taskId, and origin are required' }, { status: 400 });
    }

    const read = deps.readIssues ?? (await import('../../../../lib/read-issues')).readIssuesFromDisk;
    const issues = await read({ projectRoot, preferBd: true });
    const issue = issues.find((entry) => entry.id === taskId);

    if (!issue) {
      return NextResponse.json({ ok: false, error: 'task not found' }, { status: 404 });
    }

    const lifecycle = await bbDaemon.ensureRunning();
    const result = await bbDaemon.launchFromIssue({
      projectRoot,
      issue,
      origin,
      swarmId,
    });

    return NextResponse.json({ ok: true, lifecycle, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleRuntimeLaunchPost(request);
}
