import { NextResponse } from 'next/server';
import {
  releaseAgentReservation,
  reserveAgentScope,
  statusAgentReservations,
  type ReservationCommandResponse,
} from '../../../../lib/agent-reservations';

type ApiError = { code: string; message: string };

function responseStatus<T>(result: ReservationCommandResponse<T>): number {
  if (result.ok) {
    return 200;
  }
  const code = result.error?.code ?? '';
  if (code === 'RELEASE_FORBIDDEN') {
    return 403;
  }
  if (code === 'AGENT_NOT_FOUND' || code === 'RESERVATION_NOT_FOUND') {
    return 404;
  }
  if (code === 'INTERNAL_ERROR') {
    return 500;
  }
  return 400;
}

function toError(result: ReservationCommandResponse<unknown>): ApiError {
  return {
    code: result.error?.code ?? 'UNKNOWN_ERROR',
    message: result.error?.message ?? 'Unknown error.',
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent') ?? undefined;
  const bead = searchParams.get('bead') ?? undefined;
  const result = await statusAgentReservations({ agent, bead });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: toError(result) }, { status: responseStatus(result) });
  }
  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = body as {
    agent?: string;
    scope?: string;
    bead?: string;
    ttl?: number;
    takeoverStale?: boolean;
  };

  const result = await reserveAgentScope({
    agent: parsed.agent ?? '',
    scope: parsed.scope ?? '',
    bead: parsed.bead ?? '',
    ttl: parsed.ttl,
    takeoverStale: parsed.takeoverStale,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: toError(result) }, { status: responseStatus(result) });
  }
  return NextResponse.json(result, { status: 200 });
}

export async function DELETE(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = body as { agent?: string; scope?: string };
  const result = await releaseAgentReservation({
    agent: parsed.agent ?? '',
    scope: parsed.scope ?? '',
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: toError(result) }, { status: responseStatus(result) });
  }
  return NextResponse.json(result, { status: 200 });
}
