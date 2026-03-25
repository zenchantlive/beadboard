// src/app/api/runtime/spawn/route.ts
import { NextResponse } from 'next/server';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectRoot, beadId, agentTypeId } = body;

    // Validate required fields
    if (!projectRoot) {
      return NextResponse.json(
        { ok: false, error: 'projectRoot is required' },
        { status: 400 }
      );
    }
    if (!beadId) {
      return NextResponse.json(
        { ok: false, error: 'beadId is required' },
        { status: 400 }
      );
    }
    if (!agentTypeId) {
      return NextResponse.json(
        { ok: false, error: 'agentTypeId is required' },
        { status: 400 }
      );
    }

    // Spawn worker via session manager
    const worker = await workerSessionManager.spawnWorker({
      projectRoot,
      taskId: beadId,
      taskContext: `Work on ${beadId}`,
      agentType: agentTypeId,
      beadId,
    });

    return NextResponse.json({
      ok: true,
      workerId: worker.id,
      displayName: worker.displayName,
      agentTypeId: worker.agentTypeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
