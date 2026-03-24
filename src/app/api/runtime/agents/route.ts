import { NextResponse } from 'next/server';
import { workerSessionManager, type WorkerSession } from '../../../../lib/worker-session-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  
  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot required' });
  }

  const workers = workerSessionManager.listWorkers(projectRoot);
  
  const instances = workers.map((w: WorkerSession) => ({
    id: w.agentInstanceId || w.id,
    agentTypeId: w.agentTypeId || 'unknown',
    displayName: w.displayName || `Worker ${w.id}`,
    status: w.status,
    currentBeadId: w.taskId,
    startedAt: w.createdAt,
    completedAt: w.completedAt,
    result: w.result,
    error: w.error,
  }));

  const byType: Record<string, number> = {};
  for (const w of workers) {
    const typeId = w.agentTypeId || 'unknown';
    byType[typeId] = (byType[typeId] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    status: {
      totalActive: workers.filter((w: WorkerSession) => w.status === 'working' || w.status === 'spawning').length,
      byType,
      instances,
    },
  });
}
