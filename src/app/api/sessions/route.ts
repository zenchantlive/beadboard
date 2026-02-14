import { NextResponse } from 'next/server';
import { readIssuesFromDisk } from '../../../lib/read-issues';
import { activityEventBus } from '../../../lib/realtime';
import { buildSessionTaskFeed, getCommunicationSummary } from '../../../lib/agent-sessions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRoot = url.searchParams.get('projectRoot') ?? process.cwd();

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
