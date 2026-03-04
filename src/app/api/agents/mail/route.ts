import { NextResponse } from 'next/server';
import {
  ackAgentMessage,
  inboxAgentMessages,
  readAgentMessage,
  sendAgentMessage,
  type MailCommandResponse,
} from '../../../../lib/agent-mail';

type ApiError = { code: string; message: string };

function parseJsonBody<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as T;
}

function responseStatus<T>(result: MailCommandResponse<T>): number {
  if (result.ok) {
    return 200;
  }
  const code = result.error?.code ?? '';
  if (code === 'READ_FORBIDDEN' || code === 'ACK_FORBIDDEN') {
    return 403;
  }
  if (
    code === 'AGENT_NOT_FOUND' ||
    code === 'MESSAGE_NOT_FOUND' ||
    code === 'UNKNOWN_SENDER' ||
    code === 'UNKNOWN_RECIPIENT'
  ) {
    return 404;
  }
  if (code === 'INTERNAL_ERROR') {
    return 500;
  }
  return 400;
}

function toError(result: MailCommandResponse<unknown>): ApiError {
  return {
    code: result.error?.code ?? 'UNKNOWN_ERROR',
    message: result.error?.message ?? 'Unknown error.',
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get('agent') ?? '';
  const state = searchParams.get('state') ?? undefined;
  const bead = searchParams.get('bead') ?? undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  const result = await inboxAgentMessages({
    agent,
    state: state as 'unread' | 'read' | 'acked' | undefined,
    bead,
    limit,
  });

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

  const parsed = parseJsonBody<{
    from?: string;
    to?: string;
    bead?: string;
    category?: 'HANDOFF' | 'BLOCKED' | 'DECISION' | 'INFO';
    subject?: string;
    body?: string;
    thread?: string;
  }>(body);

  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: 'Request body must be an object.' } },
      { status: 400 },
    );
  }

  const result = await sendAgentMessage({
    from: parsed.from ?? '',
    to: parsed.to ?? '',
    bead: parsed.bead ?? '',
    category: (parsed.category ?? '') as 'HANDOFF' | 'BLOCKED' | 'DECISION' | 'INFO',
    subject: parsed.subject ?? '',
    body: parsed.body ?? '',
    thread: parsed.thread,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: toError(result) }, { status: responseStatus(result) });
  }
  return NextResponse.json(result, { status: 200 });
}

export async function PATCH(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = parseJsonBody<{ action?: string; agent?: string; message?: string }>(body);
  if (!parsed || !parsed.action) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ACTION', message: '`action` is required and must be read or ack.' } },
      { status: 400 },
    );
  }

  const action = parsed.action;
  if (action !== 'read' && action !== 'ack') {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ACTION', message: '`action` must be read or ack.' } },
      { status: 400 },
    );
  }

  const result =
    action === 'read'
      ? await readAgentMessage({ agent: parsed.agent ?? '', message: parsed.message ?? '' })
      : await ackAgentMessage({ agent: parsed.agent ?? '', message: parsed.message ?? '' });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: toError(result) }, { status: responseStatus(result) });
  }
  return NextResponse.json(result, { status: 200 });
}
