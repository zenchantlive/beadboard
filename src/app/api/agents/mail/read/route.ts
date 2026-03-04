import { NextResponse } from 'next/server';
import { readAgentMessage } from '../../../../../lib/agent-mail';

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

  const parsed = body as { agent?: string; message?: string };
  const result = await readAgentMessage({
    agent: parsed.agent ?? '',
    message: parsed.message ?? '',
  });

  if (!result.ok) {
    const status = result.error?.code === 'READ_FORBIDDEN' ? 403 : result.error?.code === 'AGENT_NOT_FOUND' || result.error?.code === 'MESSAGE_NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { ok: false, error: { code: result.error?.code ?? 'UNKNOWN_ERROR', message: result.error?.message ?? 'Unknown error.' } },
      { status },
    );
  }
  return NextResponse.json(result, { status: 200 });
}
