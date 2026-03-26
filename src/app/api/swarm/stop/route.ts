import { NextResponse } from 'next/server';
import { workerSessionManager } from '../../../../lib/worker-session-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const workerId = typeof body?.workerId === 'string' ? body.workerId.trim() : '';

    if (!workerId) {
      return NextResponse.json(
        { ok: false, error: 'workerId is required' },
        { status: 400 },
      );
    }

    const worker = workerSessionManager.getWorker(workerId);
    if (!worker) {
      return NextResponse.json(
        { ok: false, error: `Worker ${workerId} not found` },
        { status: 404 },
      );
    }

    if (worker.status !== 'spawning' && worker.status !== 'working') {
      return NextResponse.json(
        { ok: false, error: `Worker ${workerId} is not active (status: ${worker.status})` },
        { status: 400 },
      );
    }

    await workerSessionManager.terminateWorker(workerId);

    return NextResponse.json({ ok: true, workerId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
