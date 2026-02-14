import { NextResponse } from 'next/server';
import { readIssuesFromDisk } from '../../../../../lib/read-issues';
import { activityEventBus } from '../../../../../lib/realtime';
import { getAgentMetrics } from '../../../../../lib/agent-sessions';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<Response> {
  const { agentId } = await params;
  const url = new URL(request.url);
  const projectRoot = url.searchParams.get('projectRoot') ?? process.cwd();

  try {
    const issues = await readIssuesFromDisk({ projectRoot, preferBd: true });
    const activity = activityEventBus.getHistory(projectRoot);

    const metrics = await getAgentMetrics(agentId, issues, activity);

    return NextResponse.json({ ok: true, metrics });
  } catch (error) {
    console.error('[API/Agents/Stats] Failed:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
