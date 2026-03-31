import { NextResponse } from 'next/server';

import { writeCoordEvent } from '../coord-events';

interface CoordEventsDeps {
  writeCoordEvent: typeof writeCoordEvent;
}

function parseBody(data: unknown): { projectRoot: string; event: unknown } | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (typeof record.projectRoot !== 'string' || !record.projectRoot.trim()) return null;
  return {
    projectRoot: record.projectRoot.trim(),
    event: record.event,
  };
}

export async function handleCoordEventsPost(
  request: Request,
  deps?: Partial<CoordEventsDeps>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: { classification: 'bad_args', message: 'projectRoot and event are required' } },
      { status: 400 },
    );
  }

  const writer = deps?.writeCoordEvent ?? writeCoordEvent;
  const result = await writer(parsed.event, { projectRoot: parsed.projectRoot });
  if (!result.ok) {
    const status = result.error.classification === 'bad_args' ? 400 : 500;
    return NextResponse.json(
      { ok: false, error: { classification: result.error.classification, message: result.error.message } },
      { status },
    );
  }

  return NextResponse.json({ ok: true, eventId: result.eventId });
}
