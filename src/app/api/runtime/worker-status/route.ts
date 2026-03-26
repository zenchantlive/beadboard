// src/app/api/runtime/worker-status/route.ts
import { NextResponse } from 'next/server';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const beadId = searchParams.get('beadId');
    const projectRoot = searchParams.get('projectRoot');

    if (!beadId) {
      return NextResponse.json({ ok: false, error: 'beadId required' }, { status: 400 });
    }

    // Find worker for this bead
    const workers = projectRoot
      ? workerSessionManager.listWorkers(projectRoot)
      : workerSessionManager.getAllWorkers();
    const worker = workers.find(w => w.beadId === beadId);

    if (!worker) {
      return NextResponse.json({
        ok: true,
        workerStatus: 'idle',
        agentTypeId: null,
      });
    }

    return NextResponse.json({
      ok: true,
      workerStatus: worker.status,
      workerDisplayName: worker.displayName,
      workerError: worker.error,
      agentTypeId: worker.agentTypeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
