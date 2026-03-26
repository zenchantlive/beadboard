import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  await bbDaemon.ensureRunning();
  return NextResponse.json({ ok: true, data: bbDaemon.listTurns(projectRoot) });
}
