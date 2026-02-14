import { NextResponse } from 'next/server';
import path from 'node:path';
import { readIssuesFromDisk } from '../../../lib/read-issues';
import { activityEventBus } from '../../../lib/realtime';
import { buildSessionTaskFeed, getCommunicationSummary } from '../../../lib/agent-sessions';

function isValidProjectRoot(root: string): boolean {
  try {
    const resolved = path.resolve(root);
    if (!path.isAbsolute(resolved)) {
      return false;
    }
    // Prevent path traversal by ensuring resolved path stays within the project root
    const allowedBase = process.cwd();
    const relative = path.relative(allowedBase, resolved);
    // If "resolved" is outside "allowedBase", "relative" will start with ".."
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRootParam = url.searchParams.get('projectRoot');
  const projectRoot = projectRootParam ?? process.cwd();

  if (projectRootParam && !isValidProjectRoot(projectRoot)) {
    return NextResponse.json(
      { ok: false, error: { classification: 'validation', message: 'Invalid projectRoot path' } },
      { status: 400 }
    );
  }

  try {
    const issues = await readIssuesFromDisk({ projectRoot, preferBd: true });
    const activity = activityEventBus.getHistory(projectRoot);
    const communication = await getCommunicationSummary();

    const feed = buildSessionTaskFeed(issues, activity, communication);

    return NextResponse.json({ ok: true, feed });
  } catch (error) {
    console.error('[API/Sessions] Failed to load session feed:', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          classification: 'internal_error',
          message: 'An internal error occurred while loading the session feed.',
        },
      },
      { status: 500 },
    );
  }
}
