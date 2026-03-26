import { NextResponse } from 'next/server';
import { bbDaemon } from '../../../../lib/bb-daemon';
import { validateProjectRoot } from '../../../../lib/validate-project-root';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const result = validateProjectRoot(searchParams.get('projectRoot'));
  if (!result.valid) return result.error;

  const count = bbDaemon.getBlockedCount(result.projectRoot);
  const events = bbDaemon.listBlockedEvents(result.projectRoot);

  return NextResponse.json({ ok: true, data: { count, events } });
}

export async function DELETE(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const result = validateProjectRoot(searchParams.get('projectRoot'));
  if (!result.valid) return result.error;

  const eventId = searchParams.get('eventId');
  if (!eventId) {
    return NextResponse.json({ ok: false, error: 'eventId is required' }, { status: 400 });
  }

  bbDaemon.dismissBlocked(result.projectRoot, eventId);
  return NextResponse.json({ ok: true });
}
