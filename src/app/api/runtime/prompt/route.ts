import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const projectRoot = typeof body?.projectRoot === 'string' ? body.projectRoot.trim() : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!projectRoot || !text) {
      return NextResponse.json({ ok: false, error: 'projectRoot and text are required' }, { status: 400 });
    }

    await bbDaemon.ensureRunning();

    if (typeof (bbDaemon as any).prompt === 'function') {
      void (bbDaemon as any).prompt(projectRoot, text);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
