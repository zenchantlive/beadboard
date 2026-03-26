import { bbDaemon } from '../../../../lib/bb-daemon';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');

  if (!projectRoot) {
    return Response.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  const count = bbDaemon.getBlockedCount(projectRoot);
  const events = bbDaemon.listBlockedEvents(projectRoot);

  return Response.json({ ok: true, data: { count, events } });
}

export async function DELETE(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const projectRoot = searchParams.get('projectRoot');
  const eventId = searchParams.get('eventId');

  if (!projectRoot) {
    return Response.json({ ok: false, error: 'projectRoot is required' }, { status: 400 });
  }

  if (!eventId) {
    return Response.json({ ok: false, error: 'eventId is required' }, { status: 400 });
  }

  bbDaemon.dismissBlocked(projectRoot, eventId);

  return Response.json({ ok: true });
}
