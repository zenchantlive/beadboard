import { NextResponse } from 'next/server';
import { embeddedPiDaemon } from '../../../../lib/embedded-daemon';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const projectRoot = typeof body?.projectRoot === 'string' ? body.projectRoot.trim() : '';

    if (!projectRoot) {
      return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
    }

    const orchestrator = embeddedPiDaemon.ensureOrchestrator(projectRoot);
    return NextResponse.json({ ok: true, data: orchestrator });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
