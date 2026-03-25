import { NextResponse } from 'next/server';
import { workerSessionManager, type WorkerSession } from '../../../../../lib/worker-session-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  
  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot required' });
  }

  // Get completed/failed workers as history
  const workers = workerSessionManager.listWorkers(projectRoot);
  const history = workers
    .filter((w: WorkerSession) => w.status === 'completed' || w.status === 'failed')
    .sort((a: WorkerSession, b: WorkerSession) => 
      new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    )
    .slice(0, 50)
    .map((w: WorkerSession) => ({
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

  return NextResponse.json({
    ok: true,
    instances: history,
  });
}
