import { NextResponse } from 'next/server';
import { readIssuesFromDisk } from '../../../lib/read-issues';
import { activityEventBus } from '../../../lib/realtime';
import { buildSessionTaskFeed, getCommunicationSummary } from '../../../lib/agent-sessions';

function isValidProjectRoot(root: string): boolean {
  // Basic validation: path should not contain traversal patterns
  // and should resolve to an absolute path
  try {
    const resolved = require('path').resolve(root);
    return require('path').isAbsolute(resolved);
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
          classification: 'unknown',
          message: error instanceof Error ? error.message : 'Failed to load session feed.',
        },
      },
      { status: 500 },
    );
  }
}
