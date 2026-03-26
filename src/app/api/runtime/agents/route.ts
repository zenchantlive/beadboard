import { NextResponse } from 'next/server';
import { summarizeAgentStates } from '../../../../lib/agent/state';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  
  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot required' });
  }

  const agentStates = workerSessionManager.listAgentStates(projectRoot);
  const summary = summarizeAgentStates(agentStates);
  const activeAgentStates = agentStates.filter((state) => state.status !== 'completed' && state.status !== 'failed');

  const instances = activeAgentStates.map((state) => ({
    id: state.agentId,
    agentTypeId: state.agentTypeId || 'unknown',
    displayName: state.label || state.agentId,
    status: state.status === 'launching' ? 'spawning' : state.status,
    currentBeadId: state.taskId || undefined,
    startedAt: state.lastEventAt || new Date(0).toISOString(),
    completedAt: state.status === 'completed' || state.status === 'failed' ? state.lastEventAt || undefined : undefined,
    result: state.result || undefined,
    error: state.error || undefined,
  }));

  const byType: Record<string, number> = {};
  for (const state of activeAgentStates) {
    const typeId = state.agentTypeId || 'unknown';
    byType[typeId] = (byType[typeId] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    status: {
      totalActive: activeAgentStates.length,
      byType,
      instances,
    },
    agentStates,
    summary,
  });
}
