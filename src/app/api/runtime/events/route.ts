import { NextResponse } from 'next/server';
import { embeddedPiDaemon } from '../../../../lib/embedded-daemon';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return NextResponse.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: embeddedPiDaemon.listEvents(projectRoot) });
}
