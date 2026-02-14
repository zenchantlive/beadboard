import { NextResponse } from 'next/server';
import path from 'node:path';
import { readIssuesFromDisk } from '../../../../../lib/read-issues';
import { activityEventBus } from '../../../../../lib/realtime';
import { getAgentMetrics } from '../../../../../lib/agent-sessions';

function isValidProjectRoot(root: string): boolean {
  try {
    const resolved = path.resolve(root);
    return path.isAbsolute(resolved);
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<Response> {
  const { agentId } = await params;
  const url = new URL(request.url);
  const projectRootParam = url.searchParams.get('projectRoot');
  const projectRoot = projectRootParam ?? process.cwd();

  if (projectRootParam && !isValidProjectRoot(projectRootParam)) {
    return NextResponse.json({ ok: false, error: 'Invalid projectRoot path' }, { status: 400 });
  }

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
