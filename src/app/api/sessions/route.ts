import { NextResponse } from 'next/server';
import { readIssuesFromDisk } from '../../../lib/read-issues';
import { activityEventBus } from '../../../lib/realtime';
import { buildSessionTaskFeed, getCommunicationSummary, getAgentLivenessMap, calculateIncursions } from '../../../lib/agent-sessions';
import { listAgents } from '../../../lib/agent-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const projectRoot = url.searchParams.get('projectRoot') ?? process.cwd();

  try {
    const issues = await readIssuesFromDisk({ projectRoot, preferBd: true });
    const activity = activityEventBus.getHistory(projectRoot);
    const communication = await getCommunicationSummary();
    const livenessMap = await getAgentLivenessMap(projectRoot, activity);
    const incursions = await calculateIncursions();
    const agentsResult = await listAgents({}, { projectRoot });

    const feed = buildSessionTaskFeed(issues, activity, communication, livenessMap);

    return NextResponse.json({ 
      ok: true, 
      feed, 
      livenessMap, 
      incursions,
      agents: agentsResult.data ?? []
    });
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
